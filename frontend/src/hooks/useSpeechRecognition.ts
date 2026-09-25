import { useEffect, useRef, useState } from 'react'

interface RecognitionEventLike extends Event {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

interface RecognitionErrorLike extends Event {
  error: string
}

interface RecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: RecognitionErrorLike) => void) | null
  onend: (() => void) | null
}

type RecognitionConstructor = new () => RecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
}

interface Options {
  active: boolean
  language: string
  onComplete: (text: string) => void
  onNoSpeech: () => void
}

export function useSpeechRecognition({ active, language, onComplete, onNoSpeech }: Options) {
  const [interim, setInterim] = useState('')
  const [supported] = useState(() => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
  const callbacks = useRef({ onComplete, onNoSpeech })
  callbacks.current = { onComplete, onNoSpeech }

  useEffect(() => {
    if (!active || !supported) return
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Constructor) return

    const recognition = new Constructor()
    let transcript = ''
    let finished = false
    let silenceTimer = 0
    const hardTimeout = window.setTimeout(() => {
      if (!finished) recognition.stop()
    }, 15000)

    const complete = () => {
      if (finished) return
      finished = true
      window.clearTimeout(silenceTimer)
      window.clearTimeout(hardTimeout)
      const value = transcript.trim()
      setInterim('')
      if (value) callbacks.current.onComplete(value)
      else callbacks.current.onNoSpeech()
    }

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = language
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      let live = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) transcript += ` ${result[0].transcript}`
        else live += result[0].transcript
      }
      setInterim(`${transcript} ${live}`.trim())
      window.clearTimeout(silenceTimer)
      silenceTimer = window.setTimeout(() => recognition.stop(), 1200)
    }
    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') transcript = ''
    }
    recognition.onend = complete

    try {
      recognition.start()
    } catch {
      callbacks.current.onNoSpeech()
    }

    return () => {
      finished = true
      window.clearTimeout(silenceTimer)
      window.clearTimeout(hardTimeout)
      recognition.abort()
    }
  }, [active, language, supported])

  return { interim, supported }
}
