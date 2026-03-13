import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import {
  RecoleccionesService,
  type Recoleccion,
  type TipoMaterialCanonico,
} from '../../services/recolecciones.service'
import { useAuth } from '../../contexts/AuthContext'
import RecoleccionCard from './RecoleccionCard'

type MaterialFilter = 'all' | TipoMaterialCanonico

function RecoleccionesScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<Recoleccion[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<MaterialFilter>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userRol = (user?.rol ?? '').toUpperCase()
  const canValidate = userRol === 'GENERAL' || userRol === 'ADMIN'

  const loadRecolecciones = async (searchValue: string, filterValue: MaterialFilter) => {
    try {
      setLoading(true)
      setError(null)

      const response = await RecoleccionesService.list({
        page: 1,
        limit: 30,
        q: searchValue.trim() || undefined,
        tipo_material: filterValue === 'all' ? undefined : filterValue,
      })

      setItems(response.data)
    } catch (loadError) {
      setItems([])
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar recolecciones.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadRecolecciones(query, filter)
    }, 350)

    return () => {
      clearTimeout(timeout)
    }
  }, [query, filter])

  const hasResults = items.length > 0

  const subtitle = useMemo(() => {
    if (loading) {
      return 'Cargando registros...'
    }
    if (error) {
      return 'Error al cargar registros'
    }
    return `${items.length} registros encontrados`
  }, [error, items.length, loading])

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <header className="mb-3 flex rounded-b-3xl bg-[#0f8351] px-5 pb-12 pt-10 text-white shadow-soft">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/home')}
            className="mr-4 my-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold leading-tight">Recolecciones</h1>
            <p className="text-sm font-medium text-white/90">{subtitle}</p>
          </div>
          {canValidate && (
            <button
              type="button"
              onClick={() => navigate('/app/collections/validate')}
              className="my-auto ml-2 flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-sm font-extrabold text-amber-900 transition hover:bg-amber-300 active:scale-[0.97]"
            >
              <Icon name="check" className="h-4 w-4" />
              Validar
            </button>
          )}
        </header>

        <div className="-mt-10 space-y-4 px-5">
          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-black/5">
            <Icon name="search" className="h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por código, especie o ubicación"
              className="w-full border-none bg-transparent text-base font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
              type="search"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                filter === 'all'
                  ? 'border-brand-500 bg-brand-500 text-white shadow-soft'
                  : 'border-brand-100 bg-white text-brand-600 hover:border-brand-300'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilter('SEMILLA')}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                filter === 'SEMILLA'
                  ? 'border-brand-500 bg-brand-500 text-white shadow-soft'
                  : 'border-brand-100 bg-white text-brand-600 hover:border-brand-300'
              }`}
            >
              Semilla
            </button>
            <button
              type="button"
              onClick={() => setFilter('ESQUEJE')}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                filter === 'ESQUEJE'
                  ? 'border-brand-500 bg-brand-500 text-white shadow-soft'
                  : 'border-brand-100 bg-white text-brand-600 hover:border-brand-300'
              }`}
            >
              Esqueje
            </button>
          </div>

          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
              Cargando recolecciones...
            </div>
          )}

          {error && (
            <div className="rounded-3xl bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadRecolecciones(query, filter)}
                className="mt-3 rounded-xl bg-red-100 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && hasResults && (
            <div className="space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/app/collections/${item.id}`)}
                  className="w-full text-left"
                >
                  <RecoleccionCard recoleccion={item} />
                </button>
              ))}
            </div>
          )}

          {!loading && !error && !hasResults && (
            <div className="rounded-3xl bg-white px-4 py-8 text-center shadow-soft ring-1 ring-black/5">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Icon name="package" className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-base font-bold text-slate-700">No hay recolecciones</p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {query.trim() ? 'No hay coincidencias con la búsqueda.' : 'Aún no existen registros.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-label="Nueva recolección"
        onClick={() => navigate('/app/collections/new')}
        className="fixed bottom-24 right-6 mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.98]"
      >
        <Icon name="plus" className="h-6 w-6" />
      </button>
    </div>
  )
}

export default RecoleccionesScreen
