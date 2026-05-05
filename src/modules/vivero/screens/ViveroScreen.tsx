import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { DEFAULT_VIVERO_LIST_LIMIT, DEFAULT_VIVERO_LIST_PAGE } from '../../../config/vivero'
import CollapsibleSection from '../components/CollapsibleSection'
import ViveroLotCard from '../components/ViveroLotCard'
import { useViveroLots } from '../hooks/useViveroLots'
import type { ViveroLotCardData } from '../types/view-models'

function getNextAction(lot: ViveroLotCardData): { label: string; path: string } | null {
  if (lot.estadoLote === 'FINALIZADO') return null
  if (lot.plantasVivasIniciales === null && lot.subetapaActual === null) {
    return { label: 'Registrar Embolsado', path: `/app/vivero/${lot.id}/event/new` }
  }
  if (lot.subetapaActual === null) {
    return { label: 'Registrar Adaptabilidad', path: `/app/vivero/${lot.id}` }
  }
  return { label: 'Registrar Despacho', path: `/app/vivero/${lot.id}` }
}

function ViveroScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const { lots, loading, error, refetch } = useViveroLots({
    stageFilter: 'TODOS',
    searchQuery: query,
    page: DEFAULT_VIVERO_LIST_PAGE,
    limit: DEFAULT_VIVERO_LIST_LIMIT,
  })

  const actionLots = lots.filter((l) => l.estadoLote === 'ACTIVO')
  const passiveLots = lots.filter((l) => l.estadoLote === 'FINALIZADO')

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        <div className="flex items-start gap-3 px-5 pt-10">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/home')}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Módulo vivero
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-brand-700">
              Lotes de vivero
            </h1>
          </div>
        </div>

        <div className="mt-5 space-y-4 px-5">
          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
            <Icon name="search" className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código, especie, vivero..."
              className="w-full border-none bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
              type="search"
            />
          </label>

          <button
            type="button"
            onClick={() => navigate('/app/vivero/new')}
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-emerald-800 shadow-soft transition hover:border-emerald-300 hover:bg-emerald-100"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-700 ring-1 ring-emerald-200">
              <Icon name="plus" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-extrabold">Nuevo lote de vivero</p>
              <p className="text-xs font-semibold text-emerald-700/80">
                Registrar inicio desde recolección validada
              </p>
            </div>
          </button>

          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
              Cargando lotes de vivero...
            </div>
          )}

          {error && !loading && (
            <>
              <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-red-500 shadow-soft ring-1 ring-black/5">
                {error}
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-brand-700 ring-1 ring-brand-200 transition hover:ring-brand-300"
                >
                  Reintentar carga
                </button>
              </div>
            </>
          )}

          {!loading && !error && (
            <>
              {actionLots.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600">
                      Requieren acción ({actionLots.length})
                    </p>
                  </div>
                  {actionLots.map((lot) => {
                    const action = getNextAction(lot)
                    return (
                      <ViveroLotCard
                        key={lot.id}
                        lot={lot}
                        onClick={() => navigate(`/app/vivero/${lot.id}`)}
                        cta={
                          action
                            ? { label: action.label, onClick: () => navigate(action.path) }
                            : undefined
                        }
                      />
                    )
                  })}
                </div>
              )}

              {passiveLots.length > 0 && (
                <CollapsibleSection
                  title={`Finalizados (${passiveLots.length})`}
                  defaultOpen={actionLots.length === 0}
                >
                  <div className="space-y-2">
                    {passiveLots.map((lot) => (
                      <ViveroLotCard
                        key={lot.id}
                        lot={lot}
                        compact
                        onClick={() => navigate(`/app/vivero/${lot.id}`)}
                      />
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {lots.length === 0 && (
                <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
                  {query ? 'No se encontraron lotes con ese criterio.' : 'No hay lotes registrados.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ViveroScreen
