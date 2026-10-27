import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui'
import { ImpactoService } from '../api/impacto.api'

type PhotoState = { url: string | null; loading: boolean; failed: boolean }

/** Carga la derivada JPEG con Bearer sin dejar el token ni una URL privada en el DOM. */
export default function OwnRecordPhoto({ registroId, evidenciaId, alt }: { registroId: string; evidenciaId: string; alt: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')
  const [retry, setRetry] = useState(0)
  const [photo, setPhoto] = useState<PhotoState>({ url: null, loading: true, failed: false })
  useEffect(() => {
    if (visible || !container.current) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '200px' })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [visible])
  useEffect(() => {
    if (!visible) return
    const controller = new AbortController()
    let objectUrl: string | null = null
    ImpactoService.imagenPropia(registroId, evidenciaId, controller.signal).then((blob) => {
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob)
      setPhoto({ url: objectUrl, loading: false, failed: false })
    }).catch(() => {
      if (!controller.signal.aborted) setPhoto({ url: null, loading: false, failed: true })
    })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [registroId, evidenciaId, retry, visible])
  return <div ref={container} className="relative h-full min-h-40 overflow-hidden rounded-2xl bg-neutral-50">
    {photo.failed ? <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 p-3 text-center"><p role="status" className="text-xs text-neutral-600">No se pudo cargar la foto.</p><Button size="sm" variant="secondary" onClick={() => { setPhoto({ url: null, loading: true, failed: false }); setRetry(value => value + 1) }}>Reintentar foto</Button></div> : <>
      {photo.loading && <p role="status" className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-neutral-500">{visible ? 'Cargando foto…' : 'Foto disponible'}</p>}
      {photo.url && <img src={photo.url} alt={alt} loading="lazy" className="h-full min-h-40 w-full object-cover" />}
    </>}
  </div>
}
