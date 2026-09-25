import { useEffect, useRef, useState } from 'react'

interface FaceDetectorLike {
  detect(source: HTMLVideoElement): Promise<unknown[]>
}

type FaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike

declare global {
  interface Window {
    FaceDetector?: FaceDetectorConstructor
  }
  interface WindowEventMap {
    'bagdar:presence': CustomEvent<{ present: boolean }>
  }
}

export function usePersonPresence(enabled: boolean, onArrival: () => void) {
  const [present, setPresent] = useState(false)
  const [cameraState, setCameraState] = useState<'off' | 'starting' | 'active' | 'unsupported' | 'denied'>('off')
  const arrival = useRef(onArrival)
  const presentRef = useRef(false)

  useEffect(() => { arrival.current = onArrival }, [onArrival])

  const updatePresence = (next: boolean) => {
    if (next && !presentRef.current) arrival.current()
    presentRef.current = next
    setPresent(next)
  }

  useEffect(() => {
    const receiveHardwarePresence = (event: CustomEvent<{ present: boolean }>) => updatePresence(Boolean(event.detail?.present))
    window.addEventListener('bagdar:presence', receiveHardwarePresence)
    return () => window.removeEventListener('bagdar:presence', receiveHardwarePresence)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setCameraState('off')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported')
      return
    }

    let active = true
    let timer = 0
    let stream: MediaStream | null = null
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    const detector = window.FaceDetector ? new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 }) : null
    const canvas = document.createElement('canvas')
    canvas.width = 96
    canvas.height = 54
    const context = canvas.getContext('2d', { willReadFrequently: true })
    let previousFrame: Uint8ClampedArray | null = null
    let motionPresenceUntil = 0
    setCameraState('starting')

    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360, facingMode: 'user' }, audio: false })
      .then(async (mediaStream) => {
        if (!active) return mediaStream.getTracks().forEach((track) => track.stop())
        stream = mediaStream
        video.srcObject = mediaStream
        await video.play()
        setCameraState('active')

        const detect = async () => {
          if (!active) return
          try {
            if (detector) {
              const faces = await detector.detect(video)
              updatePresence(faces.length > 0)
            } else if (context) {
              context.drawImage(video, 0, 0, canvas.width, canvas.height)
              const frame = context.getImageData(0, 0, canvas.width, canvas.height).data
              if (previousFrame) {
                let difference = 0
                for (let index = 0; index < frame.length; index += 16) difference += Math.abs(frame[index] - previousFrame[index])
                const averageDifference = difference / (frame.length / 16)
                if (averageDifference > 7) motionPresenceUntil = Date.now() + 15_000
                updatePresence(Date.now() < motionPresenceUntil)
              }
              previousFrame = new Uint8ClampedArray(frame)
            }
          } catch {
            updatePresence(false)
          }
          timer = window.setTimeout(detect, 1000)
        }
        void detect()
      })
      .catch(() => setCameraState('denied'))

    return () => {
      active = false
      window.clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }
  }, [enabled])

  return { present, cameraState }
}
