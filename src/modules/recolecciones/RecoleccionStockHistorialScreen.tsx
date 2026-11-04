import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Button, Card } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { formatStockUnits, formatStockWeight } from '../../config/recoleccionStock'
import { RecoleccionRequestError } from '../../services/recolecciones.service'
import StockHistorialCard from './components/StockHistorialCard'
import { useStockHistorial } from './hooks/useStockHistorial'

function positiveInteger(value: string | undefined | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function messageForError(error: unknown) {
  if (error instanceof RecoleccionRequestError && error.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  if (error instanceof RecoleccionRequestError && error.status === 403) return 'No tienes acceso a este historial.'
  if (error instanceof RecoleccionRequestError && error.status === 404) return 'No se encontró esta especie.'
  return 'No se pudo cargar la información. Revisa tu conexión e intenta de nuevo.'
}

function StockHistorialContent({ plantaId, page, actorId, token }: { plantaId: number; page: number; actorId: string; token: string }) {
  const { logout } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const { history, stock, retryHistory, retryStock } = useStockHistorial(plantaId, page, actorId, token)
  const goToPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next)
  }

  return (
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col pb-32">
        <header className="rounded-b-3xl bg-brand-600 px-5 pb-8 pt-10 text-white shadow-soft">
          <Link to="/app/collections/stock" aria-label="Volver al stock de semillas" className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            <Icon name="arrow-left" className="h-5 w-5" />
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">Stock de semillas</p>
          <h1 className="text-2xl font-extrabold">Historial por especie</h1>
        </header>
        <main className="space-y-5 px-4 pt-5 sm:px-5">
          {history.status === 'loading' && <Card role="status" aria-live="polite">Cargando historial...</Card>}
          {history.status === 'error' && (
            <Card role="alert">
              <p>{messageForError(history.error)}</p>
              {history.error instanceof RecoleccionRequestError && history.error.status === 401
                ? <Link className="mt-3 inline-block font-bold underline" to="/auth/login" onClick={logout}>Iniciar sesión</Link>
                : <Button className="mt-3" onClick={retryHistory}>Reintentar</Button>}
            </Card>
          )}
          {history.status === 'success' && (
            <>
              <Card>
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-brand-600">
                    {history.value.planta.imagen_url && history.value.planta.imagen_url !== failedImage
                      ? <img src={history.value.planta.imagen_url} alt="" className="h-full w-full object-cover" onError={() => setFailedImage(history.value.planta.imagen_url)} />
                      : <Icon name="leaf" className="h-7 w-7" />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-extrabold">{history.value.planta.nombre_comun_principal || history.value.planta.especie}</h2>
                    <p className="break-words text-sm italic text-brand-600">{history.value.planta.nombre_cientifico || history.value.planta.especie}</p>
                    {history.value.planta.variedad && <p className="break-words text-sm text-neutral-500">{history.value.planta.variedad}</p>}
                  </div>
                </div>
                <h3 className="mt-5 font-bold">Disponibilidad actual</h3>
                {stock.status === 'loading' && <p role="status" className="mt-2 text-sm">Cargando disponibilidad...</p>}
                {stock.status === 'error' && (
                  <div role="alert" className="mt-2 text-sm">
                    <p>Disponibilidad no disponible. {messageForError(stock.error)}</p>
                    <button type="button" className="mt-2 font-bold underline" onClick={retryStock}>Reintentar consulta</button>
                  </div>
                )}
                {stock.status === 'success' && (stock.value ? (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-neutral-500">Gramos</p><p className="font-extrabold">{formatStockWeight(stock.value.gramos_disponibles)}</p></div>
                    <div><p className="text-xs text-neutral-500">Unidades</p><p className="font-extrabold">{formatStockUnits(stock.value.unidades_disponibles)}</p></div>
                  </div>
                ) : <p className="mt-2 text-sm text-neutral-600">Disponibilidad no disponible para esta especie.</p>)}
              </Card>
              <section aria-labelledby="historial-title">
                <h2 id="historial-title" className="text-lg font-extrabold">Recolecciones validadas</h2>
                <p className="mt-1 text-sm text-neutral-600">Incluye recolecciones abiertas y cerradas de todos los recolectores.</p>
                <p className="mt-1 text-sm font-semibold">Total: {history.value.pagination.total}</p>
                {history.value.data.length === 0 ? (
                  <Card className="mt-3"><p>No hay recolecciones validadas para esta especie en esta página.</p></Card>
                ) : (
                  <div className="mt-3 space-y-3">
                    {history.value.data.map(item => <StockHistorialCard key={item.id} item={item} plantaId={plantaId} page={page} />)}
                  </div>
                )}
                <nav aria-label="Paginación del historial" className="mt-4 grid grid-cols-2 items-center gap-2 min-[430px]:grid-cols-[1fr_auto_1fr]">
                  <Button className="row-start-2 justify-self-start min-[430px]:row-start-1" variant="secondary" disabled={!history.value.pagination.hasPrevPage} onClick={() => goToPage(page - 1)}>Anterior</Button>
                  <span className="col-span-2 row-start-1 text-center text-sm font-semibold min-[430px]:col-span-1">Página {page} de {Math.max(1, history.value.pagination.totalPages)}</span>
                  <Button className="row-start-2 justify-self-end min-[430px]:row-start-1" variant="secondary" disabled={!history.value.pagination.hasNextPage} onClick={() => goToPage(page + 1)}>Siguiente</Button>
                </nav>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default function RecoleccionStockHistorialScreen() {
  const { user } = useAuth()
  const { plantaId: rawId } = useParams()
  const [params] = useSearchParams()
  const plantaId = positiveInteger(rawId)
  const page = params.has('page') ? positiveInteger(params.get('page')) : 1
  const token = localStorage.getItem('authToken')
  if ((user?.rol ?? '').toUpperCase() !== 'ADMIN') return <Navigate to="/app/home" replace />
  if (!plantaId || !page) return <div role="alert" className="p-5">Especie o página inválida. <Link to="/app/collections/stock" className="underline">Volver al stock</Link></div>
  if (!token) return <div role="alert" className="p-5">Tu sesión expiró. <Link to="/auth/login" className="underline">Iniciar sesión</Link></div>
  return <StockHistorialContent plantaId={plantaId} page={page} actorId={user?.id ?? ''} token={token} />
}
