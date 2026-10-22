import { useState } from 'react'
import { Button } from '../../../components/ui'

export default function ImpactoShare({ path }: { path: string; title: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const [fallback, setFallback] = useState(false)
  const url = new URL(path, window.location.origin).href
  async function share() {
    setFallback(false)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setMessage('Enlace público copiado.')
      } else {
        setMessage('Selecciona y copia el enlace público.')
        setFallback(true)
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return
      setMessage('Selecciona y copia el enlace público.')
      setFallback(true)
    }
  }
  return <div className="space-y-2">
    <Button variant="ghost" size="sm" onClick={() => void share()}>Copiar enlace</Button>
    {message && <p role="status" className="text-xs text-neutral-600">{message}</p>}
    {fallback && <label className="block text-xs text-neutral-600">Enlace público<input className="mt-1 w-full rounded-xl border border-neutral-200 p-2" readOnly value={url} onFocus={(event) => event.currentTarget.select()} /></label>}
  </div>
}
