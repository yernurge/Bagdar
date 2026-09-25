import { MapView } from './MapView'
import { VoiceHalo } from './VoiceHalo'
import type { Config, KioskPhase, PlaceSummary } from '../types'
import type { Copy } from '../i18n'

interface Props {
  config: Config
  places: PlaceSummary[]
  phase: KioskPhase
  db: number
  transcript: string
  answer: string
  copy: Copy
  suggestions: { id: number; name: string }[]
  gesturePrompt: boolean
}

export function CatalogScreen({ config, places, phase, db, transcript, answer, copy, suggestions, gesturePrompt }: Props) {
  const voiceLabel = phase === 'recording'
    ? copy.listening
    : phase === 'processing'
      ? copy.processing
      : phase === 'error_speech'
        ? copy.repeat
        : copy.prompt

  return (
    <main className="catalog-screen screen-enter">
      <div className="catalog-map">
        <MapView config={config} places={places} />
      </div>
      <div className="catalog-wash" />
      <section className="catalog-content">
        <div className="hero-copy">
          <span className="eyebrow"><i />{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{answer || copy.prompt}</p>
          {suggestions.length > 0 && (
            <div className="spoken-list" aria-label="Предложенные места">
              {suggestions.map((item, index) => (
                <span key={item.id}><b>{String(index + 1).padStart(2, '0')}</b>{item.name}</span>
              ))}
            </div>
          )}
        </div>
        <VoiceHalo phase={phase} db={db} label={voiceLabel} transcript={transcript} />
      </section>
      <aside className="catalog-index glass-panel">
        <div className="index-head"><span>{copy.nearby}</span><b>{String(places.length).padStart(2, '0')}</b></div>
        <div className="index-flow">
          {places.slice(0, 5).map((place, index) => (
            <div className="index-row" key={place.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><strong>{place.name}</strong><small>{place.summary}</small></div>
            </div>
          ))}
        </div>
        <div className="index-note">{copy.catalogNote}</div>
      </aside>
      {gesturePrompt && <div className="gesture-prompt glass-panel">{copy.gesture}</div>}
    </main>
  )
}
