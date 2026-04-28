import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { DEFAULT_VIVERO_LIST_LIMIT, DEFAULT_VIVERO_LIST_PAGE } from '../../../config/vivero'
import ViveroLotCard from '../components/ViveroLotCard'
import { useViveroLots } from '../hooks/useViveroLots'
import { STAGE_FILTERS, type StageFilter } from '../utils/stageFilters'

function ViveroScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<StageFilter>('TODOS')
  const page = DEFAULT_VIVERO_LIST_PAGE
  const limit = DEFAULT_VIVERO_LIST_LIMIT
  const { lots, loading: loadingLots, error: errorLots, refetch } = useViveroLots({
    stageFilter,
    searchQuery: query,
    page,
    limit,
  })

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
            <h1 className="text-3xl font-extrabold leading-tight text-brand-700">Lotes de vivero</h1>
            <p className="text-sm font-semibold text-brand-500">Registro y trazabilidad</p>
          </div>
        </div>

        <div className="mt-6 space-y-5 px-5">
          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-black/5">
            <Icon name="search" className="h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por código, especie, vivero..."
              className="w-full border-none bg-transparent text-base font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
              type="search"
            />
          </label>

          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            {STAGE_FILTERS.map((item) => {
              const isActive = stageFilter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStageFilter(item.key)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-brand-700 ring-1 ring-brand-100 hover:ring-brand-200'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate('/app/vivero/new')}
            className="flex w-full items-start gap-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 px-4 py-4 text-left text-emerald-800 shadow-soft transition hover:border-emerald-300 hover:bg-emerald-100"
          >
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-700 ring-1 ring-emerald-200">
              <Icon name="plus" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold">Nuevo lote de vivero</p>
              <p className="text-sm font-semibold text-emerald-700/80">
                Registrar inicio desde recolección validada
              </p>
            </div>
          </button>

          <div className="space-y-4">
            {loadingLots && (
              <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
                Cargando lotes de vivero...
              </div>
            )}

            {errorLots && !loadingLots && (
              <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-red-500 shadow-soft ring-1 ring-black/5">
                {errorLots}
              </div>
            )}

            {!loadingLots &&
              !errorLots &&
              lots.map((lot) => (
                <ViveroLotCard key={lot.id} lot={lot} onClick={() => navigate(`/app/vivero/${lot.id}`)} />
              ))}

            {!loadingLots && !errorLots && lots.length === 0 && (
              <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
                No se encontraron lotes con ese criterio de búsqueda.
              </div>
            )}

            {errorLots && !loadingLots && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-brand-700 ring-1 ring-brand-200 transition hover:ring-brand-300"
                >
                  Reintentar carga
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViveroScreen
