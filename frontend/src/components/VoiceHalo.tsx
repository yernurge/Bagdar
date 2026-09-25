import type { KioskPhase } from '../types'

interface Props {
  phase: KioskPhase
  db: number
  label: string
  transcript?: string
}

export function VoiceHalo({ phase, db, label, transcript }: Props) {
  const intensity = Math.max(0, Math.min(1, (db + 52) / 42))
  const active = phase === 'recording' || phase === 'processing'

  return (
    <div className={`voice-halo ${active ? 'is-active' : ''} phase-${phase}`} style={{ '--voice-level': intensity } as React.CSSProperties}>
      <div className="voice-lens">
        <div className="voice-caustic" />
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path d="M18 4.5a6 6 0 0 0-6 6v7a6 6 0 0 0 12 0v-7a6 6 0 0 0-6-6Z" />
          <path d="M8.5 17.5a9.5 9.5 0 0 0 19 0M18 27v5M13 32h10" />
        </svg>
      </div>
      <div className="voice-copy">
        <span>{label}</span>
        {transcript && <strong>{transcript}</strong>}
      </div>
      <div className="waveform" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--bar': index } as React.CSSProperties} />)}
      </div>
    </div>
  )
}
