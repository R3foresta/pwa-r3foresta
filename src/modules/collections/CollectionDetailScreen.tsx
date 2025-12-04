import Icon from '../../components/Icon'
import { SCREEN_TITLE } from '../../data/navigation'
import type { CollectionRecord } from './types'

type Props = {
  record: CollectionRecord
  onBack: () => void
}

function CollectionDetailScreen({ record, onBack }: Props) {
  const detail = record.detail

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="relative flex items-center justify-center px-5 pb-4 pt-6">
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
            className="absolute left-4 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {record.id}
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
                <span>Semillas</span>
                <span>{detail?.seedQuantity ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Esquejes</span>
                <span>{detail?.cuttingQuantity ?? '—'}</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Ubicación</h2>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-slate-400" />
            </div>
            <div className="mt-3 space-y-1 text-sm font-semibold text-slate-700">
              <p>
                {detail?.locationFull.country}, {detail?.locationFull.region}
              </p>
              <p>Comunidad {detail?.locationFull.community}</p>
              <p>Zona {detail?.locationFull.zone ?? '-'}</p>
            </div>
            {detail?.mapSnapshot && (
              <div className="mt-3 overflow-hidden rounded-2xl">
                <img
                  src={detail.mapSnapshot}
                  alt="Mapa de ubicación"
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Evidencia fotográfica</h2>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-slate-400" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {detail?.photos.map((photo: { url: string; label: string }) => (
                <figure key={photo.url} className="space-y-1 text-center">
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
            {detail && (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Icon name="info" className="h-4 w-4 text-brand-500" />
                <span>
                  Obligatorio: {detail.requiredPhotos.provided}/{detail.requiredPhotos.total}
                </span>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <h2 className="text-lg font-extrabold text-brand-700">Código de trazabilidad</h2>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                readOnly
                value={detail?.traceCode ?? record.id}
                className="w-full bg-transparent outline-none"
              />
              <Icon name="qr" className="h-5 w-5 text-slate-400" />
            </div>
          </section>

          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <h2 className="text-lg font-extrabold text-brand-700">Historial de ediciones</h2>
            <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
              {(detail?.edits ?? []).map((edit: { date: string; description: string }) => (
                <div key={`${edit.date}-${edit.description}`} className="flex gap-3">
                  <span className="min-w-[96px] text-slate-500">{edit.date}</span>
                  <span>{edit.description}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default CollectionDetailScreen
