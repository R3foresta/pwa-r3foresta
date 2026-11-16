import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui'
import type { ViveroEventPhoto } from '../types/view-models'

export default function EvidencePhoto({ photo, onOpen, onRenew, renewing = false }: {
  photo: ViveroEventPhoto
  onOpen?: () => void
  onRenew: () => void
  renewing?: boolean
}) {
  // Se remonta por URL desde el contenedor público para reiniciar carga/error.
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [expired, setExpired] = useState(() => photo.expiraEn !== null && photo.expiraEn <= Date.now())
  useEffect(() => {
    if (photo.expiraEn === null) return
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, photo.expiraEn - Date.now()))
    return () => window.clearTimeout(timer)
  }, [photo.expiraEn])
  const unavailable = !photo.url || failed || expired
  const unavailableMessage = expired ? 'El acceso temporal a esta foto venció.'
    : photo.estadoUrl === 'ERROR_FIRMA' ? 'No se pudo firmar el acceso a esta foto.'
    : photo.estadoUrl === 'ERROR_URL' ? 'No se pudo obtener el enlace de esta foto.'
    : 'No se pudo mostrar esta foto.'
  const preview = unavailable ? (
    <p className="flex min-h-24 items-center justify-center p-4 text-xs text-neutral-600" role="status">
      {renewing ? 'Consultando fotos…' : unavailableMessage}
    </p>
  ) : (
    <>
      {!loaded && <p role="status" className="p-2 text-xs text-neutral-500">Cargando foto…</p>}
      <img src={photo.url!} alt={photo.titulo} referrerPolicy="no-referrer" className="max-h-96 w-full object-contain" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    </>
  )
  return (
    <div className="overflow-hidden rounded-2xl bg-neutral-50 ring-1 ring-neutral-200">
      {onOpen && !unavailable ? <button type="button" aria-label={`Ampliar ${photo.titulo}`} className="block w-full" onClick={onOpen}>{preview}</button> : preview}
      <div className="space-y-1 p-3 text-xs text-neutral-600">
        <p className="font-bold text-brand-900">{photo.titulo}</p>
        <p>{photo.fecha}</p>
        <p>{photo.mimeType ?? 'Tipo no disponible'} · {photo.tamanoBytes == null ? 'Peso no disponible' : `${typeof photo.tamanoBytes === 'number' ? photo.tamanoBytes.toLocaleString('es-BO') : photo.tamanoBytes} bytes`}</p>
        {photo.expiraEn !== null && !expired && <p>Acceso temporal</p>}
        {unavailable && <Button variant="secondary" size="sm" onClick={onRenew} disabled={renewing}>{renewing ? 'Consultando…' : 'Renovar acceso a fotos'}</Button>}
      </div>
    </div>
  )
}
