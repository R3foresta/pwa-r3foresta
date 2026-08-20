import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Button, Card, Chip, SearchBar } from '../../components/ui'
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
  const canValidate = userRol === 'ADMIN' || userRol === 'VALIDADOR'

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
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <header className="mb-3 flex rounded-b-3xl bg-brand-600 px-5 pb-12 pt-10 text-white shadow-soft">
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
            <Button
              variant="secondary"
              size="sm"
              leftIcon="check"
              onClick={() => navigate('/app/collections/validate')}
              className="my-auto ml-2 shrink-0 rounded-full"
            >
              Validar
            </Button>
          )}
        </header>

        <div className="-mt-10 space-y-4 px-5">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por código, especie o ubicación"
            ariaLabel="Buscar recolecciones por código, especie o ubicación"
          />

          <div
            role="group"
            aria-label="Filtrar recolecciones por tipo de material"
            className="flex flex-wrap gap-3"
          >
            <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
              Todos
            </Chip>
            <Chip selected={filter === 'SEMILLA'} onClick={() => setFilter('SEMILLA')}>
              Semilla
            </Chip>
            <Chip selected={filter === 'ESQUEJE'} onClick={() => setFilter('ESQUEJE')}>
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
                onClick={() => void loadRecolecciones(query, filter)}
                className="mt-3 rounded-xl"
              >
                Reintentar
              </Button>
            </div>
          )}

          {!loading && !error && hasResults && (
            <div className="space-y-3">
              {items.map((item) => (
                <Link
                  key={item.id}
                  to={`/app/collections/${item.id}`}
                  className="block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                >
                  <RecoleccionCard recoleccion={item} />
                </Link>
              ))}
            </div>
          )}

          {!loading && !error && !hasResults && (
            <Card padding="lg" className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                <Icon name="package" className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-base font-bold text-neutral-700">No hay recolecciones</p>
              <p className="mt-1 text-sm font-medium text-neutral-500">
                {query.trim() ? 'No hay coincidencias con la búsqueda.' : 'Aún no existen registros.'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecoleccionesScreen
