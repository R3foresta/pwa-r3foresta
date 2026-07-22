import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { Button, SearchBar } from '../../../components/ui'
import { DEFAULT_VIVERO_LIST_LIMIT, DEFAULT_VIVERO_LIST_PAGE } from '../../../config/vivero'
import CollapsibleSection from '../components/CollapsibleSection'
import ViveroLotCard from '../components/ViveroLotCard'
import { useViveroLots } from '../hooks/useViveroLots'
import type { ViveroLotCardData } from '../types/view-models'
import { LotesViveroService, type SubcampaniaResumen } from '../../../services/lotes-vivero.service'

function getNextAction(lot: ViveroLotCardData): { label: string; path: string } | null {
  if (lot.estadoLote === 'FINALIZADO') return null
  if (lot.plantasVivasIniciales === null && lot.subetapaActual === null) {
    return { label: 'Registrar Embolsado', path: `/app/vivero/${lot.id}/event/embolsado` }
  }
  if (lot.subetapaActual === null) {
    return { label: 'Registrar Adaptabilidad', path: `/app/vivero/${lot.id}` }
  }
  return { label: 'Registrar Despacho', path: `/app/vivero/${lot.id}` }
}

function ViveroScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [onlyConStockEnVivero, setOnlyConStockEnVivero] = useState(false)
  const [onlyActiveAssignments, setOnlyActiveAssignments] = useState(false)
  const [selectedSubcampaniaId, setSelectedSubcampaniaId] = useState<string>('TODAS')
  const [subcampanias, setSubcampanias] = useState<SubcampaniaResumen[]>([])

  useEffect(() => {
    LotesViveroService.listSubcampanias()
      .then((data) => setSubcampanias(data))
      .catch((err) => console.error('Error al cargar subcampañas:', err))
  }, [])

  const { lots, loading, error, refetch } = useViveroLots({
    stageFilter: 'TODOS',
    searchQuery: query,
    page: DEFAULT_VIVERO_LIST_PAGE,
    limit: DEFAULT_VIVERO_LIST_LIMIT,
    subcampaniaId: selectedSubcampaniaId === 'TODAS' ? undefined : Number(selectedSubcampaniaId),
  })

  const filteredLots = lots.filter((lot) => {
    if (onlyConStockEnVivero) {
      const enVivero = lot.cantidadActual ?? 0
      if (enVivero <= 0) return false
    }
    if (onlyActiveAssignments) {
      if ((lot.cantidadAsignacionesActivas ?? 0) <= 0) return false
    }
    return true
  })

  const actionLots = filteredLots.filter((l) => l.estadoLote === 'ACTIVO')
  const passiveLots = filteredLots.filter((l) => l.estadoLote === 'FINALIZADO')

  return (
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        <div className="flex items-start gap-3 px-5 pt-10">
          {/* Botón sólo-ícono (volver): excepción documentada, se mantiene nativo. */}
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
          <div className="flex gap-2">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Buscar por código, especie, vivero..."
              className="flex-1"
            />
            {/* Toggle sólo-ícono de filtros: excepción documentada, se mantiene nativo. */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-soft ring-1 ring-black/5 transition ${
                showFilters ? 'bg-brand-700 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              <Icon name="filter" className="h-5 w-5" />
            </button>
          </div>

          {showFilters && (
            <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  FILTROS OPERATIVOS
                </p>
                {/* Chips de filtro con checkbox embebido: control a medida (no calza
                    en <Chip>/<Button>); tokens migrados. (gotcha §6.5) */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOnlyConStockEnVivero(!onlyConStockEnVivero)}
                    className="flex items-center gap-2 rounded-full border border-neutral-100 bg-neutral-50/50 px-4 py-2 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100/75"
                  >
                    <input
                      type="checkbox"
                      checked={onlyConStockEnVivero}
                      onChange={() => {}} // Controlled by button click
                      className="h-4 w-4 rounded border-neutral-300 text-success-600 focus:ring-success-500"
                    />
                    <span>Solo con stock en vivero</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyActiveAssignments(!onlyActiveAssignments)}
                    className="flex items-center gap-2 rounded-full border border-neutral-100 bg-neutral-50/50 px-4 py-2 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100/75"
                  >
                    <input
                      type="checkbox"
                      checked={onlyActiveAssignments}
                      onChange={() => {}} // Controlled by button click
                      className="h-4 w-4 rounded border-neutral-300 text-success-600 focus:ring-success-500"
                    />
                    <span>Solo con asignaciones activas</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 pt-2 border-t border-neutral-100">
                <span>Por Subcampaña:</span>
                <select
                  value={selectedSubcampaniaId}
                  onChange={(e) => setSelectedSubcampaniaId(e.target.value)}
                  className="rounded-full border border-neutral-200 bg-neutral-50/50 px-3 py-1.5 font-bold text-neutral-700 outline-none transition focus:border-success-500 focus:bg-white"
                >
                  <option value="TODAS">Todas</option>
                  {subcampanias.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* CTA de alta a medida (borde punteado + ícono + 2 líneas): no calza en
              <Button>; se mantiene a medida con tokens migrados. (gotcha §6.5) */}
          <button
            type="button"
            onClick={() => navigate('/app/vivero/new')}
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-success-200 bg-success-50 px-4 py-3 text-left text-success-800 shadow-soft transition hover:border-success-300 hover:bg-success-100"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-success-700 ring-1 ring-success-200">
              <Icon name="plus" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-extrabold">Nuevo lote de vivero</p>
              <p className="text-xs font-semibold text-success-700/80">
                Registrar inicio desde recolección validada
              </p>
            </div>
          </button>

          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-neutral-600 shadow-soft ring-1 ring-black/5">
              Cargando lotes de vivero...
            </div>
          )}

          {error && !loading && (
            <>
              <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-danger-500 shadow-soft ring-1 ring-black/5">
                {error}
              </div>
              <div className="flex justify-center">
                <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                  Reintentar carga
                </Button>
              </div>
            </>
          )}

          {!loading && !error && (
            <>
              {actionLots.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <span className="h-2 w-2 rounded-full bg-warning-400" />
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600">
                      Requieren acción ({actionLots.length})
                    </p>
                  </div>
                  {actionLots.map((lot) => {
                    const action = getNextAction(lot)
                    const isDespacho = action?.label === 'Registrar Despacho'
                    const enVivero = lot.cantidadActual ?? 0
                    const isDisabled = isDespacho && enVivero === 0

                    return (
                      <ViveroLotCard
                        key={lot.id}
                        lot={lot}
                        onClick={() => navigate(`/app/vivero/${lot.id}`)}
                        cta={
                          action
                            ? {
                                label: action.label,
                                onClick: () => navigate(action.path),
                                disabled: isDisabled,
                              }
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
                <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-neutral-600 shadow-soft ring-1 ring-black/5">
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
