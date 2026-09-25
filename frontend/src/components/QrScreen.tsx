import { QRCodeSVG } from 'qrcode.react'
import type { Copy } from '../i18n'
import type { PlaceDetail, QrResponse } from '../types'

interface Props {
  qr: QrResponse
  place: PlaceDetail | null
  remaining: number
  copy: Copy
}

export function QrScreen({ qr, place, remaining, copy }: Props) {
  return (
    <main className="qr-screen screen-enter">
      <div className="qr-ambient qr-ambient-one" />
      <div className="qr-ambient qr-ambient-two" />
      <section className="qr-copy">
        <span className="eyebrow"><i />{copy.carry}</span>
        <h1>{copy.scan}</h1>
        <p>{place?.name}</p>
        <div className="qr-countdown"><span style={{ '--remaining': remaining / 60 } as React.CSSProperties} /><b>{remaining}</b><small>сек</small></div>
      </section>
      <section className="qr-card glass-panel">
        <div className="qr-code-wrap">
          <QRCodeSVG value={qr.url} size={430} level="M" bgColor="transparent" fgColor="#102321" marginSize={2} />
        </div>
        <p>{copy.qrHint}</p>
        <span>bagdar · aktau</span>
      </section>
    </main>
  )
}
