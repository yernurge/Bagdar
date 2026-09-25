import { useState } from 'react'

export function DebugConsole({ onTurn }: { onTurn: (text: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <form
      className="debug-console"
      onSubmit={(event) => {
        event.preventDefault()
        const text = value.trim()
        if (!text) return
        onTurn(text)
        setValue('')
      }}
    >
      <label htmlFor="debug-turn">TECH LEAD FALLBACK · ENTER TO SEND</label>
      <input
        id="debug-turn"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Как пройти к набережной?"
        autoComplete="off"
      />
    </form>
  )
}
