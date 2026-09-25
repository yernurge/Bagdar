import { useEffect, useMemo } from 'react'
import type { Copy } from '../i18n'
import type { Scene } from '../types'

interface Props {
  scene: Scene
  lang: string
  copy: Copy
  position: number
  auto: boolean
  onPosition: (position: number) => void
  onComplete: () => void
}

export function SceneView({ scene, lang, copy, position, auto, onPosition, onComplete }: Props) {
  const text = useMemo(() => scene.texts[lang] ?? scene.texts[lang.split('-')[0]] ?? scene.texts.ru ?? Object.values(scene.texts)[0], [lang, scene.texts])

  useEffect(() => {
    if (!auto) return
    const startedAt = Date.now()
    let completed = false
    const timer = window.setInterval(() => {
      const progress = Math.min(100, ((Date.now() - startedAt) / 6000) * 100)
      onPosition(progress)
      if (progress >= 100) {
        window.clearInterval(timer)
        if (!completed) {
          completed = true
          onComplete()
        }
      }
    }, 50)
    return () => window.clearInterval(timer)
  }, [auto, scene.place_id, onComplete, onPosition])

  return (
    <main className="scene-view">
      <div className="scene-view__visual">
        <img src={scene.modern_url} alt="Қазіргі көрініс" />
        <div className="scene-view__historic" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <img src={scene.historic_url} alt="Тарихи көрініс" />
        </div>
        <div className="scene-view__divider" style={{ left: `${position}%` }}><span /></div>
        <div className="scene-view__labels"><span>{copy.then}</span><span>{copy.now}</span></div>
      </div>
      <aside className="scene-view__copy">
        <div className="scene-view__badge">{copy.artistic}</div>
        <h1>{text?.title}</h1>
        <p>{text?.body}</p>
        <small>{scene.attribution}</small>
      </aside>
    </main>
  )
}
