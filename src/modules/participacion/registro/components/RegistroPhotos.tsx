import { useEffect, useState } from 'react'
import { Check, LoaderCircle, X } from 'lucide-react'
import PhotoUploader from '../../../../components/evidence/PhotoUploader'
import { Button, Card } from '../../../../components/ui'
import { RegistroParticipacionService } from '../../api/registro.api'
import type { RegistrationFile } from '../../commands/registrationDraftStore'
import type { RegistroIdentity } from '../../registroTypes'

type Props = { identity: RegistroIdentity | null; files: RegistrationFile[]; disabled: boolean; busy: boolean; onAdd: (files: File[]) => void; onRemove: (id: string) => void; onUpload: () => void }

function PhotoCard({ photo, index, identity, disabled, busy, onRemove }: { photo: RegistrationFile; index: number; identity: RegistroIdentity | null; disabled: boolean; busy: boolean; onRemove: () => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [localError, setLocalError] = useState(false)
  const [remotePreview, setRemotePreview] = useState<string | null>(null)
  const [remoteError, setRemoteError] = useState(false)
  const ready = (photo.carga?.estado === 'DISPONIBLE' || photo.carga?.estado === 'VINCULADA') && photo.carga.evidencia_id !== null
  const actorId = identity?.actor_id
  const scopeId = identity?.subcampania_id
  const commandId = identity?.comando_id
  useEffect(() => {
    const url = URL.createObjectURL(photo.file)
    let active = true
    queueMicrotask(() => { if (active) setPreview(url) })
    return () => { active = false; URL.revokeObjectURL(url) }
  }, [photo.file])
  useEffect(() => {
    // El original local da feedback inmediato. Sólo pedir el derivado cuando
    // el navegador no puede visualizarlo (p. ej. HEIC); nunca acredita la carga.
    if (!localError || !ready || !actorId || !scopeId || !commandId) return
    const controller = new AbortController()
    RegistroParticipacionService.preview({ actor_id: actorId, subcampania_id: scopeId, comando_id: commandId }, photo.carga_id, controller.signal)
      .then((response) => { if (!controller.signal.aborted) setRemotePreview(response.data.url) })
      .catch(() => { if (!controller.signal.aborted) setRemoteError(true) })
    return () => controller.abort()
  }, [localError, ready, actorId, scopeId, commandId, photo.carga_id])
  const source = localError ? remotePreview : preview
  return <article className="min-w-0 space-y-1.5">
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
      {source && !remoteError ? <img src={source} alt={`Foto ${index + 1} del trabajo`} onError={() => localError ? setRemoteError(true) : setLocalError(true)} className="h-full w-full object-cover" /> : <p className="flex h-full items-center justify-center p-3 text-center text-xs text-neutral-600">{localError ? 'Vista previa no disponible' : 'Preparando foto…'}</p>}
      <button type="button" disabled={disabled} onClick={onRemove} aria-label={`Quitar foto ${index + 1}`} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-sm disabled:opacity-40"><X className="h-4 w-4" aria-hidden="true" /></button>
      <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-brand-800">
        {ready ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
        {ready ? 'Lista' : photo.error ? 'Revisar' : busy ? 'Subiendo…' : 'Pendiente'}
      </span>
    </div>
    {photo.error && <p role="alert" className="text-xs text-danger-700">Foto {index + 1}: {photo.error}</p>}
  </article>
}

export default function RegistroPhotos({ identity, files, disabled, busy, onAdd, onRemove, onUpload }: Props) {
  const ready = files.filter((photo) => (photo.carga?.estado === 'DISPONIBLE' || photo.carga?.estado === 'VINCULADA') && photo.carga.evidencia_id !== null).length
  return <Card as="section" className="space-y-3">
    <div className="flex items-center justify-between gap-2"><h2 className="font-bold text-brand-800">Fotos del trabajo</h2><span className="text-sm text-neutral-500">{files.length}/10</span></div>
    <p className="text-sm text-neutral-600">Añade al menos una foto. Se subirá automáticamente.</p>
    {files.length > 0 && <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">{files.map((photo, index) => <PhotoCard key={photo.carga_id} photo={photo} index={index} identity={identity} disabled={disabled} busy={busy} onRemove={() => onRemove(photo.carga_id)} />)}</div>}
    {files.length < 10 && <PhotoUploader photos={[]} onAdd={onAdd} onRemove={() => undefined} max={10 - files.length} disabled={disabled} headerless compact={files.length > 0} />}
    {files.length > 0 && <p role="status" className="text-sm font-semibold text-brand-700">{ready === files.length ? `${ready === 1 ? 'Foto lista' : `${ready} fotos listas`}` : busy ? `Subiendo fotos · ${ready} de ${files.length} listas` : `${ready} de ${files.length} fotos listas`}</p>}
    {files.length > 0 && !busy && ready < files.length && <Button variant="secondary" disabled={disabled} onClick={onUpload}>Reintentar fotos pendientes</Button>}
    {files.length > 0 && <details className="text-xs text-neutral-500"><summary className="cursor-pointer py-1">Detalles de las fotos</summary><ul className="mt-2 space-y-2">{files.map((photo, index) => <li key={photo.carga_id} className="break-words">Foto {index + 1}: {photo.file.name} · {photo.file.type} · {(photo.file.size / 1024 / 1024).toFixed(2)} MiB{photo.carga && <> · Fecha: {photo.carga.creado_en}</>}</li>)}</ul></details>}
  </Card>
}
