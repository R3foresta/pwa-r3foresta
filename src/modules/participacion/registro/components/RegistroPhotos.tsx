import { useEffect, useState } from 'react'
import PhotoUploader from '../../../../components/evidence/PhotoUploader'
import { Button, Card } from '../../../../components/ui'
import { RegistroParticipacionService } from '../../api/registro.api'
import type { RegistrationFile } from '../../commands/registrationDraftStore'
import type { RegistroIdentity } from '../../registroTypes'

type Props = { identity: RegistroIdentity | null; files: RegistrationFile[]; disabled: boolean; busy: boolean; onAdd: (files: File[]) => void; onRemove: (id: string) => void; onUpload: () => void; onRecover: () => void }

function PhotoCard({ photo, identity, disabled, onRemove }: { photo: RegistrationFile; identity: RegistroIdentity | null; disabled: boolean; onRemove: () => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const ready = photo.carga?.estado === 'DISPONIBLE' || photo.carga?.estado === 'VINCULADA'
  const actorId = identity?.actor_id
  const scopeId = identity?.subcampania_id
  const commandId = identity?.comando_id
  useEffect(() => {
    if (ready && actorId && scopeId && commandId) {
      const controller = new AbortController()
      RegistroParticipacionService.preview({ actor_id: actorId, subcampania_id: scopeId, comando_id: commandId }, photo.carga_id, controller.signal).then((response) => {
        if (!controller.signal.aborted) { setPreview(response.data.url); setPreviewError(false) }
      }).catch(() => { if (!controller.signal.aborted) setPreviewError(true) })
      return () => controller.abort()
    }
    const url = URL.createObjectURL(photo.file)
    let active = true
    // Este preview local no acredita carga ni validación del archivo.
    queueMicrotask(() => { if (active) { setPreview(url); setPreviewError(false) } })
    return () => { active = false; URL.revokeObjectURL(url) }
  }, [photo.carga_id, photo.file, ready, actorId, scopeId, commandId, refresh])
  return <article className="space-y-2 rounded-2xl border border-neutral-200 p-3">
    {preview && !previewError ? <img src={preview} alt={`Foto del trabajo: ${photo.file.name}`} onError={() => setPreviewError(true)} className="h-36 w-full rounded-xl object-cover" /> : <p className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">{previewError ? 'No se pudo mostrar la vista previa. El archivo conserva su estado de carga.' : 'Preparando vista previa…'}</p>}
    <p className="break-all text-sm font-bold text-brand-800">{photo.file.name}</p>
    <p className="text-xs text-neutral-600">{photo.file.type || 'Formato pendiente de verificación'} · {(photo.file.size / 1024 / 1024).toFixed(2)} MiB</p>
    <p className="text-xs font-semibold text-brand-700">{ready ? 'Disponible · validada por servidor' : photo.carga?.estado === 'RESERVADA' ? 'Carga reservada · resultado pendiente, consulta antes de reenviar' : 'Foto local · pendiente de carga y validación'}</p>
    {photo.carga && <p className="text-xs text-neutral-500">Carga: {photo.carga.creado_en}{photo.carga.expira_en ? ` · Vence: ${photo.carga.expira_en}` : ''}</p>}
    {photo.error && <p role="alert" className="text-sm text-danger-700">{photo.error}</p>}
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" disabled={disabled} onClick={onRemove}>Quitar {photo.file.name}</Button>{ready && previewError && <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setRefresh((value) => value + 1)}>Reintentar vista previa</Button>}</div>
  </article>
}

export default function RegistroPhotos({ identity, files, disabled, busy, onAdd, onRemove, onUpload, onRecover }: Props) {
  const ready = files.filter((photo) => (photo.carga?.estado === 'DISPONIBLE' || photo.carga?.estado === 'VINCULADA') && photo.carga.evidencia_id).length
  return <Card as="section" className="space-y-3">
    <h2 className="font-bold text-brand-800">Fotos del trabajo · {files.length}/10</h2>
    <p className="text-sm text-neutral-600">Entre 1 y 10 fotos propias. JPG/JPEG, PNG, WEBP, HEIC o HEIF; hasta 10 MiB por archivo. La miniatura local no acredita una carga válida.</p>
    {files.length < 10 && <PhotoUploader photos={[]} onAdd={onAdd} onRemove={() => undefined} max={10 - files.length} disabled={disabled} headerless />}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{files.map((photo) => <PhotoCard key={photo.carga_id} photo={photo} identity={identity} disabled={disabled} onRemove={() => onRemove(photo.carga_id)} />)}</div>
    <p className="text-xs font-semibold text-brand-700">{ready} foto(s) disponible(s) confirmada(s) por el servidor.</p>
    {files.length > 0 && <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={disabled || ready === files.length} loading={busy} onClick={onUpload}>Preparar y subir fotos pendientes</Button><Button variant="ghost" disabled={disabled || !identity} onClick={onRecover}>Comprobar cargas conservadas</Button></div>}
  </Card>
}
