interface Props {
  screenId?: string
  lang: string
  live?: boolean
}

export function Brand({ screenId, lang, live = true }: Props) {
  return (
    <header className="brandbar">
      <div className="brandmark" aria-label="BaGdar">
        <svg viewBox="0 0 42 42" aria-hidden="true">
          <path d="M21 3 36.5 12v18L21 39 5.5 30V12Z" />
          <path d="M14 27.5V15l13.5 6.2L14 27.5Z" />
        </svg>
        <span>BaGdar</span>
      </div>
      <div className="brandmeta">
        {screenId && <span className="screen-code">{screenId}</span>}
        <span className="language-code">{lang.toUpperCase()}</span>
        <span className={`live-dot ${live ? 'is-live' : ''}`} aria-label={live ? 'В сети' : 'Не в сети'} />
      </div>
    </header>
  )
}
