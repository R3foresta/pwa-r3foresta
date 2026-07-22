import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlashMessage, PageHeader, SearchBar } from '../../components/ui'
import Icon from '../../components/Icon'
import { PlantasService } from '../../services/plantas.service'
import type { PlantaCatalogo, PlantasPagination } from '../../types/plantas.types'
import { withImageVersion } from '../../utils/imageUrl'

const PAGE_LIMIT = 20

const DEFAULT_PAGINATION: PlantasPagination = {
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
}

type PlantaCardProps = {
  planta: PlantaCatalogo
  onClick: () => void
}

function PlantaCard({ planta, onClick }: PlantaCardProps) {
  const titulo = planta.nombre_comun_principal || planta.especie
  const inicial = (titulo || '?').trim().charAt(0).toUpperCase()
  const imageUrl = withImageVersion(planta.imagen_url, planta.updated_at)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-soft ring-1 ring-black/5 transition active:scale-[0.99]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 ring-1 ring-brand-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={titulo}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-lg font-extrabold text-brand-500">{inicial}</span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-base font-extrabold text-brand-700">{titulo}</p>
        <p className="truncate text-xs italic text-brand-500">{planta.nombre_cientifico}</p>
        {planta.tipo_planta && (
          <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-brand-400">
            {planta.tipo_planta}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${
            planta.activo
              ? 'bg-success-50 text-success-700 ring-success-200'
              : 'bg-neutral-100 text-neutral-600 ring-neutral-200'
          }`}
        >
          {planta.activo ? 'Activa' : 'Inactiva'}
        </span>
        <Icon name="chevron-down" className="h-4 w-4 -rotate-90 text-brand-300" />
      </div>
    </button>
  )
}

function PlantasScreen() {
  const navigate = useNavigate()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const requestCounterRef = useRef(0)

  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [incluirInactivas, setIncluirInactivas] = useState(false)

  const [items, setItems] = useState<PlantaCatalogo[]>([])
  const [pagination, setPagination] = useState<PlantasPagination>(DEFAULT_PAGINATION)
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
        const response = await PlantasService.listPlantas({
          q: qDebounced || undefined,
          page: pageToLoad,
          limit: PAGE_LIMIT,
          incluir_inactivas: incluirInactivas,
        })

        if (requestId !== requestCounterRef.current) return

        setPagination(response.pagination ?? DEFAULT_PAGINATION)
        setItems((prev) => {
          if (mode === 'replace') return response.data ?? []
          const map = new Map<number, PlantaCatalogo>()
          prev.forEach((item) => map.set(item.id, item))
          ;(response.data ?? []).forEach((item) => map.set(item.id, item))
          return Array.from(map.values())
        })
      } catch (err) {
        if (requestId !== requestCounterRef.current) return
        const message = err instanceof Error ? err.message : 'Error al cargar el catálogo.'
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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-6 text-brand-700">
      <PageHeader
        title="Catálogo de plantas"
        subtitle="Especies disponibles para el sistema"
        backTo="/app/home"
      />

      <FlashMessage />

      <div className="mb-4 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/app/plantas/nueva')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600"
        >
          <Icon name="plus" className="h-4 w-4" />
          Nueva especie
        </button>

        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Buscar por nombre, especie o sinónimo..."
        />

        <label className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-black/5">
          <input
            type="checkbox"
            checked={incluirInactivas}
            onChange={(event) => setIncluirInactivas(event.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-400"
          />
          Mostrar especies inactivas
        </label>
      </div>

      {loading && (
        <section className="rounded-2xl bg-white px-4 py-6 text-center text-sm font-semibold text-brand-600 shadow-soft ring-1 ring-black/5">
          Cargando catálogo...
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
            {qDebounced ? 'No hay especies que coincidan con tu búsqueda.' : 'Sin especies registradas todavía.'}
          </p>
          {!qDebounced && (
            <button
              type="button"
              onClick={() => navigate('/app/plantas/nueva')}
              className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Registrar la primera especie
            </button>
          )}
        </section>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <section className="space-y-3">
            {items.map((planta) => (
              <PlantaCard
                key={planta.id}
                planta={planta}
                onClick={() => navigate(`/app/plantas/${planta.id}/editar`)}
              />
            ))}
          </section>

          {loadingMore && (
            <p className="py-4 text-center text-xs font-semibold text-brand-500">
              Cargando más especies...
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

export default PlantasScreen
