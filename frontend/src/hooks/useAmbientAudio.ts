import { useEffect, useRef, useState } from 'react'

type Signal = 'quiet' | 'presence' | 'speech'

interface Options {
  enabled: boolean
  onPresence: () => void
  onSpeech: () => void
}

export function useAmbientAudio({ enabled, onPresence, onSpeech }: Options) {
  const [db, setDb] = useState(-72)
  const [permission, setPermission] = useState<'pending' | 'ready' | 'denied'>('pending')
  const [signal, setSignal] = useState<Signal>('quiet')
  const callbacks = useRef({ onPresence, onSpeech })
  callbacks.current = { onPresence, onSpeech }

  useEffect(() => {
    if (!enabled) return
    let stream: MediaStream | undefined
    let context: AudioContext | undefined
    let frame = 0
    let timer = 0
    let presenceFrames = 0
    let speechFrames = 0
    let latched: Signal = 'quiet'

    const read = () => {
      if (!context) return
      const analyser = context.createAnalyser()
      const source = context.createMediaStreamSource(stream!)
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.72
      source.connect(analyser)
      const samples = new Float32Array(analyser.fftSize)

      const tick = () => {
        analyser.getFloatTimeDomainData(samples)
        let energy = 0
        for (const sample of samples) energy += sample * sample
        const rms = Math.sqrt(energy / samples.length)
        const nextDb = Math.max(-72, Math.min(0, 20 * Math.log10(rms || 0.00025)))
        setDb(nextDb)

        if (nextDb > -30) {
          speechFrames += 1
          presenceFrames = 0
        } else if (nextDb >= -42) {
          presenceFrames += 1
          speechFrames = 0
        } else if (nextDb < -50) {
          presenceFrames = 0
          speechFrames = 0
          if (latched !== 'quiet') {
            latched = 'quiet'
            setSignal('quiet')
          }
        }

        if (speechFrames >= 3 && latched !== 'speech') {
          latched = 'speech'
          setSignal('speech')
          callbacks.current.onSpeech()
        } else if (presenceFrames >= 3 && latched === 'quiet') {
          latched = 'presence'
          setSignal('presence')
          callbacks.current.onPresence()
        }
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    navigator.mediaDevices?.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((media) => {
        stream = media
        context = new AudioContext()
        setPermission('ready')
        read()
      })
      .catch(() => setPermission('denied'))

    const onPresenceEvent = () => callbacks.current.onPresence()
    window.addEventListener('bagdar:presence', onPresenceEvent)
    timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && permission === 'denied') setDb(-72)
    }, 3000)

    return () => {
      window.removeEventListener('bagdar:presence', onPresenceEvent)
      cancelAnimationFrame(frame)
      window.clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
      void context?.close()
    }
  }, [enabled])

  return { db, permission, signal }
}
