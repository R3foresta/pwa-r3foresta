import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CrudHeader from '../../components/crud/CrudHeader'
import FlashMessage from '../../components/crud/FlashMessage'
import { selectWrapperClasses } from '../../components/crud/form-classes'
import SearchBar from '../../components/crud/SearchBar'
import Icon from '../../components/Icon'
import { getInitials } from '../plantacion/utils/userAvatar'
import { OrganizacionesService } from '../../services/organizaciones.service'
import type {
  Organizacion,
  OrganizacionesPagination,
  TipoOrganizacion,
} from './types'
import { TIPO_ORGANIZACION_LABEL, TIPOS_ORGANIZACION } from './types'

const PAGE_LIMIT = 20

const DEFAULT_PAGINATION: OrganizacionesPagination = {
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
}

type OrganizacionCardProps = {
  organizacion: Organizacion
  onClick: () => void
}

function OrganizacionCard({ organizacion, onClick }: OrganizacionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-soft ring-1 ring-black/5 transition active:scale-[0.99]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 ring-1 ring-brand-100">
        {organizacion.logo_url ? (
          <img
            src={organizacion.logo_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-extrabold text-brand-500">
            {getInitials(organizacion.nombre, { fallback: '?' })}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-extrabold text-brand-700">
          {organizacion.nombre}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wide text-brand-400">
          {TIPO_ORGANIZACION_LABEL[organizacion.tipo] ?? organizacion.tipo}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${
            organizacion.activo
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-slate-100 text-slate-600 ring-slate-200'
          }`}
        >
          {organizacion.activo ? 'Activa' : 'Inactiva'}
        </span>
        <Icon name="chevron-down" className="h-4 w-4 -rotate-90 text-brand-300" />
      </div>
    </button>
  )
}

function OrganizacionesScreen() {
  const navigate = useNavigate()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const requestCounterRef = useRef(0)

  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [tipo, setTipo] = useState<TipoOrganizacion | ''>('')
  const [incluirInactivas, setIncluirInactivas] = useState(false)

  const [items, setItems] = useState<Organizacion[]>([])
  const [pagination, setPagination] = useState<OrganizacionesPagination>(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  const visibleItems = useMemo(() => {
    const normalizedQuery = qDebounced.toLowerCase()
    if (!normalizedQuery) return items
    return items.filter((item) => {
      const tipoLabel = TIPO_ORGANIZACION_LABEL[item.tipo] ?? item.tipo
      return (
        item.nombre.toLowerCase().includes(normalizedQuery) ||
        tipoLabel.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [items, qDebounced])

  useEffect(() => {
    const timer = setTimeout(() => setQDebounced(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const cargar = useCallback(
    async (mode: 'replace' | 'append') => {
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
        const response = await OrganizacionesService.listOrganizaciones({
          tipo: tipo || undefined,
          incluirInactivas,
          activo: incluirInactivas ? undefined : true,
        })

        if (requestId !== requestCounterRef.current) return

        setPagination(response.pagination ?? DEFAULT_PAGINATION)
        setItems((prev) => {
          if (mode === 'replace') return response.data ?? []
          const map = new Map<number, Organizacion>()
          prev.forEach((item) => map.set(item.id, item))
          ;(response.data ?? []).forEach((item) => map.set(item.id, item))
          return Array.from(map.values())
        })
      } catch (err) {
        if (requestId !== requestCounterRef.current) return
        const message = err instanceof Error ? err.message : 'Error al cargar organizaciones.'
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
    [incluirInactivas, tipo],
  )

  useEffect(() => {
    void cargar('replace')
  }, [cargar])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || loading || loadingMore || Boolean(error) || !pagination.hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first?.isIntersecting) {
          void cargar('append')
        }
      },
      { root: null, rootMargin: '160px 0px', threshold: 0.1 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [cargar, error, loading, loadingMore, pagination.hasNextPage, pagination.page])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-6 text-brand-700">
      <CrudHeader
        title="Organizaciones"
        subtitle="Instituciones asociadas a campañas y plantación"
        backTo="/app/home"
      />

      <FlashMessage />

      <div className="mb-4 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/app/organizaciones/nueva')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600"
        >
          <Icon name="plus" className="h-4 w-4" />
          Nueva organización
        </button>

        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Buscar organización por nombre..."
        />

        <div className={selectWrapperClasses(false)}>
          <select
            value={tipo}
            onChange={(event) => setTipo(event.target.value as TipoOrganizacion | '')}
            aria-label="Filtrar por tipo de organización"
            className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="">Todos los tipos</option>
            {TIPOS_ORGANIZACION.map((item) => (
              <option key={item} value={item}>
                {TIPO_ORGANIZACION_LABEL[item]}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
        </div>

        <label className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-black/5">
          <input
            type="checkbox"
            checked={incluirInactivas}
            onChange={(event) => setIncluirInactivas(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
          />
          Mostrar organizaciones inactivas
        </label>
      </div>

      {loading && (
        <section className="rounded-2xl bg-white px-4 py-6 text-center text-sm font-semibold text-brand-600 shadow-soft ring-1 ring-black/5">
          Cargando organizaciones...
        </section>
      )}

      {!loading && error && (
        <section className="rounded-2xl bg-red-50 px-4 py-4 text-center shadow-soft ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void cargar('replace')}
            className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200"
          >
            Reintentar
          </button>
        </section>
      )}

      {!loading && !error && visibleItems.length === 0 && (
        <section className="rounded-2xl bg-white px-4 py-8 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-brand-700">
            {qDebounced || tipo
              ? 'No hay organizaciones que coincidan con los filtros.'
              : 'Sin organizaciones registradas todavía.'}
          </p>
          {!qDebounced && !tipo && (
            <button
              type="button"
              onClick={() => navigate('/app/organizaciones/nueva')}
              className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Registrar la primera organización
            </button>
          )}
        </section>
      )}

      {!loading && !error && visibleItems.length > 0 && (
        <>
          <section className="space-y-3">
            {visibleItems.map((organizacion) => (
              <OrganizacionCard
                key={organizacion.id}
                organizacion={organizacion}
                onClick={() => navigate(`/app/organizaciones/${organizacion.id}/editar`)}
              />
            ))}
          </section>

          {loadingMore && (
            <p className="py-4 text-center text-xs font-semibold text-brand-500">
              Cargando más organizaciones...
            </p>
          )}

          {loadMoreError && (
            <section className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-center shadow-soft ring-1 ring-red-200">
              <p className="text-xs font-semibold text-red-700">{loadMoreError}</p>
              <button
                type="button"
                onClick={() => void cargar('append')}
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

export default OrganizacionesScreen
