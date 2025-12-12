import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { SCREEN_TITLE } from '../../data/navigation'
import { locationsById, methodsById, nurseriesById, plantsById, usersById } from './data'
import type { CollectionRecord } from './types'

type Props = {
  record: CollectionRecord
  onBackPath?: string
}

function CollectionDetailScreen({ record, onBackPath }: Props) {
  const navigate = useNavigate()
  const plant = plantsById[record.plantId]
  const collector = usersById[record.collectorUserId]
  const collectionLocation = locationsById[record.collectionLocationId]
  const storageNursery = nurseriesById[record.storageNurseryId]
  const storageLocation = storageNursery ? locationsById[storageNursery.locationId] : undefined
  const method = record.methodId ? methodsById[record.methodId] : undefined

  const handleBack = () => {
    if (onBackPath) {
      navigate(onBackPath)
    } else {
      navigate(-1)
    }
  }

  const formatMaterial = (material: CollectionRecord['materials'][number]) => {
    const unitLabel = material.quantity.unit === 'kg' ? 'kg' : 'unidades'
    const typeLabel = material.materialType === 'seed' ? 'Semilla' : 'Esqueje'
    return `${material.quantity.value} ${unitLabel} · ${typeLabel}`
  }

  const formatAuditDate = (date: string) => {
    const parsed = new Date(date)
    return Number.isNaN(parsed.getTime())
      ? date
      : parsed.toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="relative flex items-center justify-center px-5 pb-4 pt-6">
          <button
            type="button"
            aria-label="Volver"
            onClick={handleBack}
            className="absolute left-4 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {record.code}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">
              {SCREEN_TITLE.collectionDetail}
            </h1>
            <p className="text-sm font-semibold text-brand-500">{record.date}</p>
          </div>
        </header>

        <div className="flex-1 space-y-6 px-5">
          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Material recolectado</h2>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-slate-400" />
            </div>
            <div className="mt-3 space-y-3 text-sm font-semibold text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span>Especie</span>
                <span>{plant?.commonName ?? plant?.scientificName ?? 'Sin especie'}</span>
              </div>
              <div className="space-y-2">
                {record.materials.map((material) => (
                  <div key={`${material.materialType}-${material.quantity.value}`} className="flex items-center justify-between">
                    <span>{material.materialType === 'seed' ? 'Semilla' : 'Esqueje'}</span>
                    <span>{formatMaterial(material)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Método</span>
                <span>{method?.name ?? 'No especificado'}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Recolector</span>
                <span>{collector?.fullName ?? 'No asignado'}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Estado</span>
                <span>
                  {record.status === 'stored'
                    ? 'Almacenado'
                    : record.status === 'used'
                      ? 'Usado'
                      : 'Desechado'}
                </span>
              </div>
              {record.notes && (
                <div className="border-t border-slate-100 pt-2 text-sm text-slate-700">
                  <p className="text-slate-500">Notas</p>
                  <p className="font-semibold text-slate-800">{record.notes}</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Ubicación</h2>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-slate-400" />
            </div>
            <div className="mt-3 space-y-3 text-sm font-semibold text-slate-700">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Recolección</p>
                <p>
                  {collectionLocation?.community ?? 'Sin comunidad'}, {collectionLocation?.department ?? '-'}, {collectionLocation?.country ?? '-'}
                </p>
                {collectionLocation?.zone && <p>Zona {collectionLocation.zone}</p>}
                {collectionLocation?.latitude !== undefined && collectionLocation?.longitude !== undefined && (
                  <p className="text-slate-500">
                    {collectionLocation.latitude}, {collectionLocation.longitude}
                  </p>
                )}
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Almacenamiento</p>
                <p>{storageNursery?.name ?? 'Sin vivero'}</p>
                <p className="text-slate-600">{storageLocation?.community ?? storageLocation?.department ?? '-'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Evidencia fotográfica</h2>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-slate-400" />
            </div>
            {record.photos.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {record.photos.map((photo) => (
                  <figure key={photo.id} className="space-y-1 text-center">
                    <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100">
                      <img
                        src={photo.url}
                        alt={photo.label}
                        className="h-20 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <figcaption className="text-xs font-semibold text-slate-600">
                      {photo.label}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-slate-600">Sin fotos todavía.</p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Icon name="info" className="h-4 w-4 text-brand-500" />
              <span>
                Obligatorio: {record.requiredPhotos.provided}/{record.requiredPhotos.total}
              </span>
            </div>
          </section>

          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <h2 className="text-lg font-extrabold text-brand-700">Código de trazabilidad</h2>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                readOnly
                value={record.traceCode}
                className="w-full bg-transparent outline-none"
              />
              <Icon name="qr" className="h-5 w-5 text-slate-400" />
            </div>
          </section>

          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <h2 className="text-lg font-extrabold text-brand-700">Historial de ediciones</h2>
            {record.auditTrail.length > 0 ? (
              <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                {record.auditTrail.map((edit) => (
                  <div key={`${edit.at}-${edit.description}`} className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>{formatAuditDate(edit.at)}</span>
                      <span>{usersById[edit.byUserId]?.fullName ?? edit.byUserId}</span>
                    </div>
                    <span className="text-sm text-slate-700">{edit.description}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-slate-600">Sin ediciones registradas.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default CollectionDetailScreen
