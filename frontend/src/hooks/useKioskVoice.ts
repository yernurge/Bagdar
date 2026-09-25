import { useEffect, useRef, useState } from 'react'
import type { VoiceTurn } from '../types'

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

type RecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
}

interface Options {
  enabled: boolean
  acceptSpeech: boolean
  preferRecordedAudio: boolean
  locale: string
  onWake: () => void
  onSpeechStart: () => void
  onTurn: (turn: VoiceTurn) => void
  onError: () => void
}

const WAKE_THRESHOLD = -42
const SPEECH_THRESHOLD = -30
const HYSTERESIS_DB = 8
const FRAMES_TO_TRIGGER = 3
const SILENCE_MS = 1200

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(blob)
  })
}

export function useKioskVoice({ enabled, acceptSpeech, preferRecordedAudio, locale, onWake, onSpeechStart, onTurn, onError }: Options) {
  const [db, setDb] = useState(-72)
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const callbacks = useRef({ acceptSpeech, onWake, onSpeechStart, onTurn, onError })

  useEffect(() => {
    callbacks.current = { acceptSpeech, onWake, onSpeechStart, onTurn, onError }
  }, [acceptSpeech, onWake, onSpeechStart, onTurn, onError])

  useEffect(() => {
    if (!enabled) return

    let active = true
    let animationFrame = 0
    let audioContext: AudioContext | null = null
    let stream: MediaStream | null = null
    let recognition: SpeechRecognitionLike | null = null
    let recorder: MediaRecorder | null = null
    let chunks: Blob[] = []
    let speaking = false
    let wakeFrames = 0
    let speechFrames = 0
    let lastLoudAt = 0
    let cooldownUntil = 0
    let speechStartedAt = 0
    let transcript = ''

    const finishRecorder = () => {
      if (recorder?.state === 'recording') recorder.stop()
    }

    const finishRecognition = () => {
      try {
        recognition?.stop()
      } catch {
        // Recognition may already be stopped by the browser.
      }
    }

    const finishTurn = () => {
      if (!speaking) return
      speaking = false
      cooldownUntil = performance.now() + 1200
      if (recognition) finishRecognition()
      else finishRecorder()
    }

    const startTurn = () => {
      if (!callbacks.current.acceptSpeech || speaking || performance.now() < cooldownUntil || window.speechSynthesis?.speaking) return
      speaking = true
      speechStartedAt = performance.now()
      transcript = ''
      chunks = []
      lastLoudAt = performance.now()
      callbacks.current.onSpeechStart()

      const Recognition = preferRecordedAudio ? undefined : window.SpeechRecognition ?? window.webkitSpeechRecognition
      if (Recognition) {
        recognition = new Recognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = locale === 'auto' ? '' : locale
        recognition.onresult = (event) => {
          transcript = Array.from(event.results)
            .map((result) => result[0]?.transcript ?? '')
            .join(' ')
            .trim()
        }
        recognition.onerror = () => callbacks.current.onError()
        recognition.onend = () => {
          recognition = null
          speaking = false
          cooldownUntil = performance.now() + 1200
          if (!active) return
          const text = transcript.trim()
          if (text) callbacks.current.onTurn({ text })
          else callbacks.current.onError()
        }
        try {
          recognition.start()
          return
        } catch {
          recognition = null
        }
      }

      if (!stream || typeof MediaRecorder === 'undefined') {
        speaking = false
        callbacks.current.onError()
        return
      }

      recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onerror = () => callbacks.current.onError()
      recorder.onstop = async () => {
        const mime = recorder?.mimeType || 'audio/webm'
        const blob = new Blob(chunks, { type: mime })
        recorder = null
        if (!active) return
        if (!blob.size) return callbacks.current.onError()
        callbacks.current.onTurn({ audio_b64: await blobToBase64(blob), mime })
      }
      recorder.start(200)
    }

    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }
        stream = mediaStream
        setPermission('granted')
        audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 1024
        audioContext.createMediaStreamSource(mediaStream).connect(analyser)
        const data = new Float32Array(analyser.fftSize)

        const analyse = () => {
          if (!active) return
          analyser.getFloatTimeDomainData(data)
          const rms = Math.sqrt(data.reduce((sum, sample) => sum + sample * sample, 0) / data.length)
          const level = Math.max(-72, 20 * Math.log10(rms || 0.00001))
          setDb(level)

          const isWakeSound = level > WAKE_THRESHOLD && (level <= SPEECH_THRESHOLD || !callbacks.current.acceptSpeech)
          wakeFrames = isWakeSound ? wakeFrames + 1 : level < WAKE_THRESHOLD - HYSTERESIS_DB || level > SPEECH_THRESHOLD ? 0 : wakeFrames
          speechFrames = level > SPEECH_THRESHOLD ? speechFrames + 1 : level < SPEECH_THRESHOLD - HYSTERESIS_DB ? 0 : speechFrames

          if (wakeFrames >= FRAMES_TO_TRIGGER) {
            callbacks.current.onWake()
            wakeFrames = 0
          }
          if (speechFrames >= FRAMES_TO_TRIGGER) {
            lastLoudAt = performance.now()
            startTurn()
            speechFrames = 0
          }
          if (speaking && (performance.now() - lastLoudAt >= SILENCE_MS || performance.now() - speechStartedAt >= 14500)) finishTurn()

          animationFrame = requestAnimationFrame(analyse)
        }

        analyse()
      })
      .catch(() => {
        setPermission('denied')
        callbacks.current.onError()
      })

    return () => {
      active = false
      cancelAnimationFrame(animationFrame)
      recognition?.abort()
      if (recorder?.state === 'recording') recorder.stop()
      stream?.getTracks().forEach((track) => track.stop())
      void audioContext?.close()
    }
  }, [enabled, locale, preferRecordedAudio])

  return { db, permission }
}
