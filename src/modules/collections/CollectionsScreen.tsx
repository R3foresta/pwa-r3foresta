import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { materialFilterOptions } from './data'
import CollectionCard from './CollectionCard'
import { RecoleccionService } from '../../services/recoleccion.service'
import type { Recoleccion } from '../../services/recoleccion.service'

type MaterialFilterKey = (typeof materialFilterOptions)[number]['key']

function CollectionsScreen() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<MaterialFilterKey>('all')
  const [query, setQuery] = useState('')
  const [recolecciones, setRecolecciones] = useState<Recoleccion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const cargarRecolecciones = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const tipo_material = filter === 'all' ? undefined :
        filter === 'seed' ? 'SEMILLA' : 'ESTACA'
      
      console.log('🔄 Cargando recolecciones con filtros:', { page, tipo_material });
      
      const response = await RecoleccionService.list({
        page,
        limit: 20,
        tipo_material,
      })
      
      console.log('✅ Recolecciones recibidas:', response.data.length);
      setRecolecciones(response.data || [])
    } catch (err) {
      console.error('❌ Error cargando recolecciones:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar recolecciones')
      // Mostrar array vacío en caso de error para mejor UX
      setRecolecciones([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarRecolecciones()
  }, [page, filter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page === 1) {
        cargarRecolecciones()
      } else {
        setPage(1)
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [query])

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <div className="flex rounded-b-3xl bg-[#0f8351] mb-3 px-5 pb-12 pt-10 text-white shadow-soft">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/home')}
            className="left-4 top-5 mr-4 my-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="flex flex-col justify-center">
            <h1 className="mt-1 text-3xl font-extrabold leading-tight">Recolecciones</h1>
            <p className="text-sm font-medium text-white/90">
              Registro de material forestal
            </p>
          </div>
        </div>

        <div className="-mt-10 space-y-4 px-5">
          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-black/5">
            <Icon name="search" className="h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por ID, especie o comunidad..."
              className="w-full border-none bg-transparent text-base font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
              type="search"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            {materialFilterOptions.map((option) => {
              const isActive = filter === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'border-brand-500 bg-brand-500 text-white shadow-soft'
                      : 'border-brand-100 bg-white text-brand-600 hover:border-brand-300'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
              <div className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                Cargando recolecciones...
              </div>
            </div>
          )}
          
          {error && (
            <div className="rounded-3xl bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-600 shadow-soft ring-1 ring-red-200">
              ❌ {error}
              <button
                onClick={cargarRecolecciones}
                className="mt-2 rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200"
              >
                Reintentar
              </button>
            </div>
          )}
          
          {!loading && !error && (
            <div className="space-y-3">
              {recolecciones.map((recoleccion) => (
                <button
                  key={recoleccion.id}
                  type="button"
                  onClick={() => navigate(`/app/collections/${recoleccion.id}`)}
                  className="w-full text-left"
                >
                  <CollectionCard recoleccion={recoleccion} />
                </button>
              ))}
              {recolecciones.length === 0 && (
                <div className="rounded-3xl bg-white px-4 py-6 text-center shadow-soft ring-1 ring-black/5">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Icon name="package" className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-base font-bold text-slate-700">Sin recolecciones</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {query ? 'No se encontraron resultados' : 'Aún no tienes recolecciones registradas'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* <button
        type="button"
        aria-label="Nueva recolección"
        onClick={() => navigate('/app/collections/new')}
        className="fixed bottom-24 right-6 mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.98]"
      >
        <Icon name="plus" className="h-6 w-6" />
      </button> */}
    </div>
  )
}

export default CollectionsScreen
