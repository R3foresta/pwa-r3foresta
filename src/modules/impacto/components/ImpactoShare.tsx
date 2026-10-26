import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui'

export default function ImpactoShare({ path }: { path: string; title: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const [fallback, setFallback] = useState(false)
  const [copying, setCopying] = useState(false)
  const busy = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const url = new URL(path, window.location.origin).href
  useEffect(() => {
    if (fallback) { input.current?.focus(); input.current?.select() }
  }, [fallback])
  function offerManualCopy() {
    setMessage('Selecciona y copia el enlace público.')
    setFallback(true)
    input.current?.focus()
    input.current?.select()
  }
  async function share() {
    if (busy.current) return
    busy.current = true
    setCopying(true)
    setMessage(null)
    setFallback(false)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setMessage('Enlace público copiado.')
      } else {
        offerManualCopy()
      }
    } catch {
      offerManualCopy()
    } finally {
      busy.current = false
      setCopying(false)
    }
  }
  return <div className="min-w-0 max-w-full space-y-2">
    <Button variant="ghost" size="sm" className="min-h-11" loading={copying} onClick={() => void share()}>{copying ? 'Copiando…' : 'Copiar enlace'}</Button>
    {message && <p role="status" className="text-xs text-neutral-600">{message}</p>}
    {fallback && <label className="block text-xs text-neutral-600">Enlace público<input ref={input} className="mt-1 w-full min-w-0 rounded-xl border border-neutral-200 p-3 text-base" readOnly value={url} onFocus={(event) => event.currentTarget.select()} /></label>}
  </div>
}
