import { useClock } from '../hooks/useClock'
import type { Copy } from '../i18n'

export function SleepScreen({ copy }: { copy: Copy }) {
  const now = useClock()
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' }).format(now)

  return (
    <main className="sleep-screen screen-enter">
      <div className="sleep-horizon" />
      <div className="sleep-orbit orbit-one" /><div className="sleep-orbit orbit-two" />
      <section className="sleep-time">
        <span>Каспийское время</span>
        <h1>{time}</h1>
        <p>{date}</p>
      </section>
      <div className="wake-hint glass-panel"><i /><span>{copy.wake}</span></div>
    </main>
  )
}
