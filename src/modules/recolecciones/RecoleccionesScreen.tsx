import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Button, Card, Chip, SearchBar } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import type { Recoleccion } from '../../services/recolecciones.service'
import { useOperationalAccess } from '../accesos/capabilitiesContext'
import { canMaintain, hasViveroCapability } from '../accesos/accessPolicy'
import { useRecolecciones, type MaterialFilter } from './hooks/useRecolecciones'
import RecoleccionCard from './RecoleccionCard'
import { getRecoleccionFormActions, resolveEstadoOperativo } from './recoleccionStatus'

function RecoleccionesScreen() {
  const navigate = useNavigate()
  const { m1, m2 } = useOperationalAccess()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<MaterialFilter>('all')
  const [showClosed, setShowClosed] = useState(false)
  const [page, setPage] = useState(1)
  const { items, pagination, loading, error, retry } = useRecolecciones(
    query, filter, page, user?.id, localStorage.getItem('authToken'),
  )
  const canValidate = m2.status === 'ready' && hasViveroCapability(m2.data, 'recibir_y_validar')
  const canEdit = (item: Recoleccion) => getRecoleccionFormActions(item,
    m1.status === 'ready' && canMaintain(m1.data, user?.id, item.usuario_id) ? user : null,
  ).canEdit
  const selectFilter = (value: MaterialFilter) => {
    setFilter(value)
    setPage(1)
  }

  const openItems = items.filter(item => resolveEstadoOperativo(item) === 'ABIERTO')
  const closedItems = items.filter(item => resolveEstadoOperativo(item) === 'CERRADO')
  const unknownItems = items.filter(item => resolveEstadoOperativo(item) === null)
  const hasResults = items.length > 0

  const counts = [
    `${openItems.length} abiertas`,
    closedItems.length > 0 && `${closedItems.length} sin saldo en origen`,
    unknownItems.length > 0 && `${unknownItems.length} con saldo no disponible`,
  ].filter(Boolean).join(' · ')
  const pageSummary = pagination && pagination.totalPages > 1 ? `${counts} en esta página` : counts
  const subtitle = loading ? 'Cargando registros...' : error ? 'Error al cargar registros' : pageSummary

  return (
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <header className="mb-3 flex flex-wrap rounded-b-3xl bg-brand-600 px-5 pb-12 pt-10 text-white shadow-soft min-[400px]:flex-nowrap">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/home')}
            className="mr-4 my-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold leading-tight min-[440px]:text-3xl">Recolecciones</h1>
            <p className="text-sm font-medium text-white/90">{subtitle}</p>
          </div>
          {canValidate && (
            <div className="mt-3 flex w-full justify-end min-[400px]:my-auto min-[400px]:ml-2 min-[400px]:w-auto min-[400px]:shrink-0">
              <Button
                variant="secondary"
                size="sm"
                leftIcon="check"
                onClick={() => navigate('/app/collections/validate')}
                className="shrink-0 rounded-full"
              >
                Recepción
              </Button>
            </div>
          )}
        </header>

        <div className="-mt-10 space-y-4 px-5">
          <SearchBar
            value={query}
            onChange={value => { setQuery(value); setPage(1) }}
            placeholder="Buscar por código, especie o ubicación"
            ariaLabel="Buscar recolecciones por código, especie o ubicación"
          />

          <div
            role="group"
            aria-label="Filtrar recolecciones por tipo de material"
            className="flex flex-wrap gap-3"
          >
            <Chip selected={filter === 'all'} onClick={() => selectFilter('all')}>
              Todos
            </Chip>
            <Chip selected={filter === 'SEMILLA'} onClick={() => selectFilter('SEMILLA')}>
              Semilla
            </Chip>
            <Chip selected={filter === 'ESQUEJE'} onClick={() => selectFilter('ESQUEJE')}>
              Esqueje
            </Chip>
          </div>

          {loading && (
            <Card role="status" aria-live="polite" className="text-center text-sm font-semibold text-neutral-600">
              Cargando recolecciones...
            </Card>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-3xl bg-danger-50 px-4 py-6 text-center text-sm font-semibold text-danger-700 shadow-soft ring-1 ring-danger-200"
            >
              <p>{error}</p>
              <Button
                variant="danger"
                size="sm"
                onClick={retry}
                className="mt-3 rounded-xl"
              >
                Reintentar
              </Button>
            </div>
          )}

          {!loading && !error && hasResults && (
            <>
              {openItems.length > 0 ? (
                <div className="space-y-3">
                  {openItems.map((item) => (
                    <RecoleccionCard
                      key={item.id}
                      recoleccion={item}
                      canEdit={canEdit(item)}
                    />
                  ))}
                </div>
              ) : unknownItems.length === 0 ? (
                <Card padding="lg" className="text-center">
                  <p className="text-base font-bold text-neutral-700">No hay recolecciones abiertas</p>
                  <p className="mt-1 text-sm font-medium text-neutral-500">
                    Abre «Sin saldo en origen» para consultar las recolecciones que ya no tienen saldo.
                  </p>
                </Card>
              ) : null}

              {unknownItems.map(item => <RecoleccionCard key={item.id} recoleccion={item} canEdit={canEdit(item)} />)}

              {closedItems.length > 0 && (
                <section className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowClosed((previous) => !previous)}
                    aria-expanded={showClosed}
                    aria-controls="recolecciones-cerradas"
                    className="flex w-full items-center justify-between rounded-3xl bg-white px-4 py-4 text-left shadow-soft ring-1 ring-black/5 transition hover:bg-neutral-50"
                  >
                    <span className="text-sm font-extrabold text-brand-700">
                      Sin saldo en origen ({closedItems.length})
                    </span>
                    <Icon
                      name="chevron-down"
                      className={`h-4 w-4 text-brand-500 transition-transform duration-200 ${showClosed ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showClosed && (
                    <div id="recolecciones-cerradas" className="space-y-3">
                      {closedItems.map((item) => (
                        <RecoleccionCard
                          key={item.id}
                          recoleccion={item}
                          compact
                          canEdit={canEdit(item)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {!loading && !error && !hasResults && (
            <Card padding="lg" className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                <Icon name="package" className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-base font-bold text-neutral-700">No hay recolecciones</p>
              <p className="mt-1 text-sm font-medium text-neutral-500">
                {query.trim() || filter !== 'all' ? 'No hay coincidencias con los filtros.' : page > 1 ? 'No hay registros en esta página.' : 'Aún no existen registros.'}
              </p>
            </Card>
          )}
          {pagination && (pagination.totalPages > 1 || page > 1) && (
            <nav aria-label="Páginas de recolecciones" className="flex items-center justify-between gap-2">
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</Button>
              <span className="text-sm">Página {page}</span>
              <Button variant="secondary" disabled={!pagination.hasNextPage} onClick={() => setPage(value => value + 1)}>Siguiente</Button>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecoleccionesScreen
