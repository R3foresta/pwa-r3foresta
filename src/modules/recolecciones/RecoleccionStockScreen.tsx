import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Button, Card } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import RecoleccionStockMetrics from './components/RecoleccionStockMetrics'
import RecoleccionStockPanel from './components/RecoleccionStockPanel'
import { useRecoleccionStock } from './hooks/useRecoleccionStock'

function RecoleccionStockScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = (user?.rol ?? '').toUpperCase() === 'ADMIN'
  const { items, loading, error, refresh } = useRecoleccionStock(isAdmin)
  const totals = useMemo(
    () =>
      items.reduce(
        (result, item) => ({
          gramos: result.gramos + item.gramos_disponibles,
          unidades: result.unidades + item.unidades_disponibles,
          pendientes: result.pendientes + item.pendientes_validacion,
        }),
        { gramos: 0, unidades: 0, pendientes: 0 },
      ),
    [items],
  )

  if (!isAdmin) {
    return <Navigate to="/app/home" replace />
  }

  return (
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <header className="mb-3 flex rounded-b-3xl bg-brand-600 px-5 pb-12 pt-10 text-white shadow-soft">
          <button
            type="button"
            aria-label="Volver al inicio"
            onClick={() => navigate('/app/home')}
            className="mr-4 my-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
              Dashboard global
            </p>
            <h1 className="text-3xl font-extrabold leading-tight">Stock de semillas</h1>
            <p className="text-sm font-medium text-white/90">
              {items.length} {items.length === 1 ? 'planta activa' : 'plantas activas'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="my-auto ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Actualizar stock"
          >
            <Icon name="refresh" className="h-4 w-4" />
          </button>
        </header>

        <div className="-mt-10 space-y-7 px-5">
          <RecoleccionStockMetrics
            gramos={totals.gramos}
            unidades={totals.unidades}
            pendientes={totals.pendientes}
          />

          {loading && (
            <Card
              role="status"
              aria-live="polite"
              className="text-center text-sm font-semibold text-neutral-600"
            >
              Cargando inventario global...
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
                onClick={() => void refresh()}
                className="mt-3 rounded-xl"
              >
                Reintentar
              </Button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <Card padding="lg" className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                <Icon name="leaf" className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-base font-bold text-neutral-700">
                No hay plantas activas registradas
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-500">
                Las plantas activas aparecerán aquí aunque todavía tengan saldo cero.
              </p>
            </Card>
          )}

          {!loading && !error && items.length > 0 && (
            <RecoleccionStockPanel items={items} />
          )}
        </div>
      </div>
    </div>
  )
}

export default RecoleccionStockScreen
