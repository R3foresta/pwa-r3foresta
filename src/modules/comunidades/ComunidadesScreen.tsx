import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarComunidades } from '../../api/comunidades.api'
import { FlashMessage, PageHeader, SearchBar } from '../../components/ui'
import Icon from '../../components/Icon'
import type { ApiListComunidades, ComunidadCard } from '../../tipos/comunidades'

const DEFAULT_LIMIT = 20
const DEFAULT_PAGINATION: ApiListComunidades['pagination'] = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
}

function buildRuta(comunidad: ComunidadCard): string {
  return [
    comunidad.pais?.nombre,
    comunidad.nivel1?.nombre,
    comunidad.nivel2?.nombre,
    comunidad.nivel3?.nombre,
    comunidad.nivel4?.nombre,
  ]
    .filter(Boolean)
    .join(' / ')
}

type CardProps = {
  comunidad: ComunidadCard
  onEdit: (id: number) => void
}

function ComunidadCardItem({ comunidad, onEdit }: CardProps) {
  const ruta = buildRuta(comunidad)
  const isActive = comunidad.activo
  return (
    <button
      type="button"
      onClick={() => onEdit(comunidad.id)}
      className="w-full rounded-2xl bg-white px-4 py-4 text-left shadow-soft ring-1 ring-black/5 transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 overflow-hidden">
          <h3 className="truncate text-base font-extrabold text-brand-700">{comunidad.nombre}</h3>
          <p className="truncate text-xs font-medium text-brand-500">
            {ruta || 'Sin ruta disponible'}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            isActive
              ? 'bg-success-50 text-success-700 ring-success-200'
              : 'bg-neutral-100 text-neutral-600 ring-neutral-200'
          }`}
        >
          {isActive ? 'Activa' : 'Inactiva'}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs font-semibold text-brand-600">
        <span>{isActive ? 'Editar' : 'Editar / reactivar'}</span>
        <Icon name="chevron-down" className="h-3.5 w-3.5 -rotate-90" />
      </div>
    </button>
  )
}

function ComunidadesScreen() {
  const navigate = useNavigate()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const requestCounterRef = useRef(0)

  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [incluirInactivas, setIncluirInactivas] = useState(false)

  const [items, setItems] = useState<ComunidadCard[]>([])
  const [pagination, setPagination] =
    useState<ApiListComunidades['pagination']>(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setQDebounced(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const cargar = useCallback(
    async (pageToLoad: number, mode: 'replace' | 'append') => {
      const requestId = ++requestCounterRef.current

      if (mode === 'replace') {
        setLoading(true)
        setError(null)
        setLoadMoreError(null)
      } else {
        setLoadingMore(true)
        setLoadMoreError(null)
      }

      try {
        const response = await listarComunidades({
          paisId: 'BO',
          q: qDebounced || undefined,
          page: pageToLoad,
          limit: DEFAULT_LIMIT,
          incluirInactivas,
        })

        if (requestId !== requestCounterRef.current) return

        setPagination(response.pagination ?? DEFAULT_PAGINATION)
        setItems((prev) => {
          if (mode === 'replace') return response.data ?? []
          const map = new Map<number, ComunidadCard>()
          prev.forEach((item) => map.set(item.id, item))
          ;(response.data ?? []).forEach((item) => map.set(item.id, item))
          return Array.from(map.values())
        })
      } catch (err) {
        if (requestId !== requestCounterRef.current) return
        const message = err instanceof Error ? err.message : 'Error al cargar comunidades.'
        if (mode === 'replace') {
          setError(message)
          setItems([])
          setPagination(DEFAULT_PAGINATION)
        } else {
          setLoadMoreError(message)
        }
      } finally {
        if (requestId === requestCounterRef.current) {
          if (mode === 'replace') setLoading(false)
          else setLoadingMore(false)
        }
      }
    },
    [qDebounced, incluirInactivas],
  )

  useEffect(() => {
    void cargar(1, 'replace')
  }, [cargar])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || loading || loadingMore || Boolean(error) || !pagination.hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first?.isIntersecting) {
          void cargar(pagination.page + 1, 'append')
        }
      },
      { root: null, rootMargin: '160px 0px', threshold: 0.1 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [cargar, error, loading, loadingMore, pagination.hasNextPage, pagination.page])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
      <PageHeader
        title="Comunidades"
        subtitle="Listado de comunidades registradas"
        backTo="/app/home"
      />

      <FlashMessage />

      <div className="mb-4 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/app/comunidades/nueva')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600"
        >
          <Icon name="plus" className="h-4 w-4" />
          Nueva comunidad
        </button>

        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Buscar comunidad por nombre..."
        />

        <label className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-black/5">
          <input
            type="checkbox"
            checked={incluirInactivas}
            onChange={(event) => setIncluirInactivas(event.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-400"
          />
          Mostrar comunidades inactivas
        </label>
      </div>

      {loading && (
        <section className="rounded-2xl bg-white px-4 py-6 text-center text-sm font-semibold text-brand-600 shadow-soft ring-1 ring-black/5">
          Cargando comunidades...
        </section>
      )}

      {!loading && error && (
        <section className="rounded-2xl bg-danger-50 px-4 py-4 text-center shadow-soft ring-1 ring-danger-200">
          <p className="text-sm font-semibold text-danger-700">{error}</p>
          <button
            type="button"
            onClick={() => void cargar(1, 'replace')}
            className="mt-3 rounded-xl bg-danger-100 px-3 py-2 text-xs font-semibold text-danger-700 transition hover:bg-danger-200"
          >
            Reintentar
          </button>
        </section>
      )}

      {!loading && !error && items.length === 0 && (
        <section className="rounded-2xl bg-white px-4 py-8 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-brand-700">
            {qDebounced
              ? 'No hay comunidades que coincidan con tu búsqueda.'
              : 'Sin comunidades registradas todavía.'}
          </p>
          {!qDebounced && (
            <button
              type="button"
              onClick={() => navigate('/app/comunidades/nueva')}
              className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Registrar la primera comunidad
            </button>
          )}
        </section>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <section className="space-y-3">
            {items.map((comunidad) => (
              <ComunidadCardItem
                key={comunidad.id}
                comunidad={comunidad}
                onEdit={(id) => navigate(`/app/comunidades/${id}/editar`)}
              />
            ))}
          </section>

          {loadingMore && (
            <p className="py-4 text-center text-xs font-semibold text-brand-500">
              Cargando más comunidades...
            </p>
          )}

          {loadMoreError && (
            <section className="mt-3 rounded-2xl bg-danger-50 px-4 py-3 text-center shadow-soft ring-1 ring-danger-200">
              <p className="text-xs font-semibold text-danger-700">{loadMoreError}</p>
              <button
                type="button"
                onClick={() => void cargar(pagination.page + 1, 'append')}
                className="mt-2 rounded-xl bg-danger-100 px-3 py-2 text-xs font-semibold text-danger-700 transition hover:bg-danger-200"
              >
                Reintentar carga
              </button>
            </section>
          )}

          <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
        </>
      )}
    </div>
  )
}

export default ComunidadesScreen
