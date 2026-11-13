import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import PhotoUploader, { type Photo } from '../../../components/evidence/PhotoUploader'
import { Button, Card } from '../../../components/ui'
import { getImageFileValidationError } from '../../../utils/imageValidation'
import type { DetalleRecepcion, EntradaRecepcion } from './recepcion.contract'

const hoyRecepcion = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

export type RecepcionDraft = Omit<EntradaRecepcion, 'comando_id' | 'evidencia_ids'>

type Props = {
  origen: DetalleRecepcion
  actor: string
  busy: boolean
  viveroNombre?: string
  onConfirm: (entrada: RecepcionDraft, fotos: File[]) => Promise<void>
  onCancel: () => void
}

export default function RecepcionForm({ origen, actor, viveroNombre, busy, onConfirm, onCancel }: Props) {
  const [fecha, setFecha] = useState(hoyRecepcion)
  const [photos, setPhotos] = useState<Photo[]>([])
  const photosRef = useRef<Photo[]>([])
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const disabled = busy || confirm

  useEffect(() => () => {
    photosRef.current.forEach(photo => URL.revokeObjectURL(photo.previewUrl))
  }, [])

  const addPhotos = (files: File[]) => {
    const valid = files.filter(file => !getImageFileValidationError(file) && file.size <= 15 * 1024 * 1024)
    setError(valid.length === files.length ? null : 'Cada foto debe ser una imagen soportada de hasta 15 MiB.')
    const next = [...photosRef.current, ...valid.slice(0, 5 - photosRef.current.length).map(file => ({ file, previewUrl: URL.createObjectURL(file) }))]
    photosRef.current = next
    setPhotos(next)
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photosRef.current[index].previewUrl)
    const next = photosRef.current.filter((_, current) => current !== index)
    photosRef.current = next
    setPhotos(next)
  }

  return <form className="space-y-4" onSubmit={event => {
    event.preventDefault()
    setError(null)
    if (!fecha || fecha < origen.fecha_recoleccion || fecha > hoyRecepcion()) {
      setError('La recepción debe estar entre la fecha de recolección y hoy en Bolivia.')
      return
    }
    if (photos.length < 1 || photos.length > 5) {
      setError('Adjunta de 1 a 5 fotos nuevas de la recepción.')
      return
    }
    setConfirm(true)
  }}>
    <Card className="space-y-4">
      <h2 className="text-lg font-extrabold text-brand-700">Confirmar material recibido</h2>
      <p className="text-sm font-semibold text-neutral-600">Al confirmar la recepción física, la recolección también queda validada. Comprueba la cantidad declarada por el recolector. Si el material no corresponde, vuelve a la ficha y recházala con el motivo.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold text-neutral-600">Cantidad declarada<input readOnly value={origen.cantidad_declarada} className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-700" /></label>
        <label className="block text-sm font-semibold text-neutral-600">Unidad<input readOnly value={origen.unidad_declarada} className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-700" /></label>
      </div>
      <p className="text-sm text-neutral-600">Vivero de recepción: <strong>{viveroNombre ?? `Vivero ${origen.vivero_id}`}</strong></p>
      <p className="text-sm text-neutral-600">Receptor: <strong>{actor}</strong></p>
      <label className="block text-sm font-semibold text-neutral-600">Fecha física de recepción<input type="date" required min={origen.fecha_recoleccion} max={hoyRecepcion()} value={fecha} disabled={disabled} onChange={event => setFecha(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" /></label>
    </Card>
    <Card className="space-y-3">
      <div role="group" aria-label="Fotos de recepción"><PhotoUploader photos={photos} label="Fotos de la recepción" max={5} required disabled={disabled} onAdd={addPhotos} onRemove={removePhoto} /></div>
      <p className="text-xs font-semibold text-neutral-500">De 1 a 5 fotos nuevas · hasta 15 MiB por archivo. Las fotos de recolección se conservan por separado.</p>
    </Card>
    {error && <p role="alert" className="rounded-2xl bg-danger-50 p-4 text-sm font-semibold text-danger-700">{error}</p>}
    <Button type="submit" fullWidth disabled={busy} loading={busy}>Recibir y validar</Button>
    <Button variant="secondary" fullWidth disabled={busy} onClick={onCancel}>Cancelar recepción</Button>
    <ConfirmDialog open={confirm} title="Confirmar recepción" confirmLabel="Recibir y validar" loading={busy} onCancel={() => setConfirm(false)} onConfirm={() => {
      setConfirm(false)
      void onConfirm({ revision_esperada: origen.revision, cantidad_recibida: origen.cantidad_declarada, unidad_recibida: origen.unidad_declarada, fecha_recepcion: fecha }, photos.map(photo => photo.file))
    }}>
      <div className="mt-3 space-y-2 text-sm font-semibold text-neutral-600">
        <p>Recolección {origen.codigo_trazabilidad} · {origen.tipo_material}</p>
        <p>{origen.cantidad_declarada} {origen.unidad_declarada} · {fecha} · {photos.length} foto(s)</p>
        <p>{viveroNombre ?? `Vivero ${origen.vivero_id}`} · Receptor: {actor}</p>
        <p>Confirmo la recepción física total conforme. La ficha quedará validada y su saldo estará habilitado para operar.</p>
      </div>
    </ConfirmDialog>
  </form>
}
