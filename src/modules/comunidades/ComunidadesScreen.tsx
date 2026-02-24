import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listarComunidades } from '../../api/comunidades.api'
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

type ComunidadesLocationState = {
  successMessage?: string
}

function ComunidadCardItem({ comunidad, onEdit }: CardProps) {
  const ruta = buildRuta(comunidad)
  const isActive = comunidad.activo

  return (
    <article className="rounded-2xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-brand-700">{comunidad.nombre}</h3>
          <p className="text-xs font-medium text-brand-500">{ruta || 'Sin ruta disponible'}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-slate-100 text-slate-600 ring-slate-200'
          }`}
        >
          {isActive ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(comunidad.id)}
          className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100"
        >
          Editar
        </button>
      </div>
    </article>
  )
}

function ComunidadesScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const requestCounterRef = useRef(0)

  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [items, setItems] = useState<ComunidadCard[]>([])
  const [pagination, setPagination] =
    useState<ApiListComunidades['pagination']>(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [flashMessage, setFlashMessage] = useState<string | null>(null)

  useEffect(() => {
    const state = location.state as ComunidadesLocationState | null
    if (!state?.successMessage) {
      return
    }

    setFlashMessage(state.successMessage)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!flashMessage) {
      return
    }

    const timer = setTimeout(() => {
      setFlashMessage(null)
    }, 4000)

    return () => clearTimeout(timer)
  }, [flashMessage])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setQDebounced(q.trim())
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [q])

  const cargarComunidades = useCallback(
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
          incluirInactivas: false,
        })

        if (requestId !== requestCounterRef.current) {
          return
        }

        const incoming = response.data ?? []
        const nextPagination = response.pagination ?? DEFAULT_PAGINATION

        setPagination(nextPagination)
        setItems((prev) => {
          if (mode === 'replace') {
            return incoming
          }

          const map = new Map<number, ComunidadCard>()
          prev.forEach((item) => map.set(item.id, item))
          incoming.forEach((item) => map.set(item.id, item))
          return Array.from(map.values())
        })
      } catch (err) {
        if (requestId !== requestCounterRef.current) {
          return
        }

        const message =
          err instanceof Error ? err.message : 'Error al cargar comunidades.'

        if (mode === 'replace') {
          setError(message)
          setItems([])
          setPagination(DEFAULT_PAGINATION)
        } else {
          setLoadMoreError(message)
        }
      } finally {
        if (requestId !== requestCounterRef.current) {
          return
        }

        if (mode === 'replace') {
          setLoading(false)
        } else {
          setLoadingMore(false)
        }
      }
    },
    [qDebounced],
  )

  useEffect(() => {
    void cargarComunidades(1, 'replace')
  }, [cargarComunidades])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || loading || loadingMore || Boolean(error) || !pagination.hasNextPage) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first?.isIntersecting) {
          void cargarComunidades(pagination.page + 1, 'append')
        }
      },
      { root: null, rootMargin: '160px 0px', threshold: 0.1 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [cargarComunidades, error, loading, loadingMore, pagination.hasNextPage, pagination.page])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
      <header className="relative mb-4 flex items-center gap-4">
        <button
          type="button"
          aria-label="Volver"
          onClick={() => navigate('/app')}
          className="left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-500">Sección</p>
          <div className="text-2xl font-semibold tracking-tight text-brand-700">Comunidades/Localidades</div>
          <p className="text-xs font-medium text-brand-500">
            Listado de comunidades/localidades registradas
          </p>
        </div>
      </header>

      {flashMessage && (
        <section className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 shadow-soft ring-1 ring-emerald-200">
          <p className="text-sm font-semibold text-emerald-700">{flashMessage}</p>
        </section>
      )}

      <div className="mb-4 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/app/comunidades/nueva')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600"
        >
          <Icon name="plus" className="h-4 w-4" />
          Nueva comunidades/localidades
        </button>

        <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
          <Icon name="search" className="h-5 w-5 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar comunidades/localidades..."
            className="w-full border-none bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
          />
        </label>
      </div>

      {loading && (
        <section className="rounded-2xl bg-white px-4 py-6 text-center text-sm font-semibold text-brand-600 shadow-soft ring-1 ring-black/5">
          Cargando comunidades/localidades...
        </section>
      )}

      {!loading && error && (
        <section className="rounded-2xl bg-red-50 px-4 py-4 text-center shadow-soft ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void cargarComunidades(1, 'replace')}
            className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200"
          >
            Reintentar
          </button>
        </section>
      )}

      {!loading && !error && items.length === 0 && (
        <section className="rounded-2xl bg-white px-4 py-6 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-brand-700">No hay comunidades registradas</p>
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
              Cargando mas comunidades...
            </p>
          )}

          {loadMoreError && (
            <section className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-center shadow-soft ring-1 ring-red-200">
              <p className="text-xs font-semibold text-red-700">{loadMoreError}</p>
              <button
                type="button"
                onClick={() => void cargarComunidades(pagination.page + 1, 'append')}
                className="mt-2 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200"
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
