import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Badge, statusVariant } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { RecoleccionesService, type Recoleccion } from '../../services/recolecciones.service'
import { formatUnidadCanonicaDisplay } from '../../utils/recoleccionUnidad'
import {
  getUbicacionCoords,
  getUbicacionDisplay,
  getUbicacionDivision,
} from '../../utils/ubicacion'
import { resolveEstadoOperativo, resolveEstadoRegistro } from './recoleccionStatus'

// ─── Modal de rechazo ────────────────────────────────────────────────────────

interface RejectModalProps {
  recoleccion: Recoleccion
  onConfirm: (motivo: string) => void
  onCancel: () => void
  loading: boolean
}

function RejectModal({ recoleccion, onConfirm, onCancel, loading }: RejectModalProps) {
  const [motivo, setMotivo] = useState('')
  const isValid = motivo.trim().length >= 10

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-100">
            <Icon name="info" className="h-5 w-5 text-danger-600" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-neutral-800">Rechazar recolección</h2>
            <p className="text-xs font-medium text-neutral-500">{recoleccion.codigo_trazabilidad}</p>
          </div>
        </div>

        <p className="mb-3 text-sm font-medium text-neutral-600">
          Explica el motivo del rechazo. El recolector podrá corregir y reenviar.
        </p>

        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Las fotos no son legibles. Por favor volver a subir con mejor iluminación."
          maxLength={500}
          rows={4}
          className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800 outline-none ring-0 transition focus:border-danger-400 focus:ring-2 focus:ring-danger-100"
        />
        <p className="mt-1 text-right text-xs text-neutral-400">{motivo.length}/500</p>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-2xl border border-neutral-200 bg-white py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(motivo.trim())}
            disabled={!isValid || loading}
            className="flex-1 rounded-2xl bg-danger-600 py-3 text-sm font-bold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Rechazando...' : 'Rechazar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tarjeta pendiente ───────────────────────────────────────────────────────

interface PendingCardProps {
  item: Recoleccion
  onApprove: () => void
  onReject: () => void
  isActioning: boolean
}

function PendingCard({ item, onApprove, onReject, isActioning }: PendingCardProps) {
  const [expanded, setExpanded] = useState(false)

  const fechaFormateada = item.fecha
    ? new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'

  const plantaNombre =
    item.nombre_comun_principal ??
    item.nombre_comercial ??
    item.planta?.nombre_comun_principal ??
    item.planta?.especie ??
    '—'
  const nombreCientifico = item.nombre_cientifico ?? item.planta?.nombre_cientifico ?? null

  const ubicacionDisplay = getUbicacionDisplay(item.ubicacion)
  const ubicacionDivision = getUbicacionDivision(item.ubicacion)
  const ubicacionCoords = getUbicacionCoords(item.ubicacion)
  const estadoRegistro = resolveEstadoRegistro(item)
  const estadoOperativo = resolveEstadoOperativo(item)
  const cantidadActual = item.saldo_actual ?? 0
  const unidadDisplay = formatUnidadCanonicaDisplay(item.unidad_canonica, cantidadActual)

  const evidencias = item.fotos ?? []
  const fotoPrincipal = evidencias.find((f) => f.es_principal) ?? evidencias[0] ?? null
  const imageUrl = fotoPrincipal?.url ?? null

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5">

      {/* ── Cuerpo clickable para expandir detalle ───────────────── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 text-left transition hover:bg-neutral-50/60 active:bg-neutral-100/60"
      >
        <div className="flex gap-3">
          {/* ─ Datos principales ─ */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {item.codigo_trazabilidad}
            </p>
            <h3 className="truncate text-lg font-extrabold text-neutral-800">{plantaNombre}</h3>
            <p className="truncate text-sm italic text-neutral-500">
              {nombreCientifico ?? 'Sin nombre científico'}
            </p>

            <div className="mt-3 space-y-1 text-sm font-semibold text-neutral-600">
              <p className="flex items-center gap-2">
                <Icon name="package" className="h-4 w-4 shrink-0 text-brand-500" />
                {cantidadActual} {unidadDisplay}
              </p>
              <p className="flex items-center gap-2">
                <Icon name="date" className="h-4 w-4 shrink-0 text-brand-500" />
                {fechaFormateada}
              </p>
              <p className="flex items-center gap-2">
                <Icon name="pin" className="h-4 w-4 shrink-0 text-brand-500" />
                <span className="truncate">{ubicacionDisplay}</span>
              </p>
            </div>
          </div>

          {/* ─ Thumbnail ─ */}
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={plantaNombre}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Icon name="photo" className="h-8 w-8 text-neutral-400" />
              </div>
            )}
          </div>
        </div>

        {/* ─ Badges + indicador de expansión ─ */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={item.tipo_material === 'SEMILLA' ? 'success' : item.tipo_material === 'ESQUEJE' ? 'warning' : 'neutral'}>
            {item.tipo_material}
          </Badge>
          <Badge variant={statusVariant(estadoRegistro)}>{estadoRegistro}</Badge>
          <Badge variant={statusVariant(estadoOperativo)}>{estadoOperativo}</Badge>
          <Badge variant="neutral">Evidencias: {evidencias.length}</Badge>
          <Icon
            name="chevron-down"
            className={`ml-auto h-4 w-4 text-neutral-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* ── Detalle expandible ───────────────────────────────────── */}
      {expanded && (
        <div className="space-y-3 border-t border-neutral-100 px-4 pb-4 pt-3">

          {/* Material */}
          <section className="rounded-2xl bg-brand-50 p-4 ring-1 ring-black/5">
            <h2 className="text-base font-extrabold text-brand-700">Material</h2>
            <div className="mt-3 space-y-2 text-sm font-semibold text-neutral-700">
              <p className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Nombre comercial</span>
                <span className="text-right">{plantaNombre}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Nombre científico</span>
                <span className="text-right italic">{nombreCientifico ?? 'No disponible'}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Tipo material</span>
                <span>{item.tipo_material}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Saldo actual</span>
                <span>
                  {cantidadActual} {unidadDisplay}
                </span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Estado registro</span>
                <Badge variant={statusVariant(estadoRegistro)}>{estadoRegistro}</Badge>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Estado operativo</span>
                <Badge variant={statusVariant(estadoOperativo)}>{estadoOperativo}</Badge>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Método</span>
                <span className="text-right">{item.metodo?.nombre ?? 'No disponible'}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Vivero</span>
                <span className="text-right">{item.vivero?.nombre ?? 'No disponible'}</span>
              </p>
              {item.observaciones && (
                <p className="flex flex-col gap-1">
                  <span className="text-neutral-500">Observaciones</span>
                  <span className="text-sm text-neutral-700">{item.observaciones}</span>
                </p>
              )}
              {item.especie_nueva && (
                <div className="flex items-center gap-2 rounded-xl bg-warning-50 px-3 py-2 ring-1 ring-warning-200">
                  <span className="text-sm">⭐</span>
                  <p className="text-xs font-bold text-warning-800">
                    Especie nueva — requiere revisión adicional
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Ubicación */}
          <section className="rounded-2xl bg-brand-50 p-4 ring-1 ring-black/5">
            <h2 className="text-base font-extrabold text-brand-700">Ubicación</h2>
            <div className="mt-3 space-y-1 text-sm font-semibold text-neutral-700">
              <p>{ubicacionDisplay}</p>
              {ubicacionDivision && <p className="text-neutral-600">{ubicacionDivision}</p>}
              {ubicacionCoords && <p className="text-xs text-neutral-500">{ubicacionCoords}</p>}
            </div>
          </section>

          {/* Evidencias */}
          <section className="rounded-2xl bg-brand-50 p-4 ring-1 ring-black/5">
            <h2 className="text-base font-extrabold text-brand-700">
              Evidencias ({evidencias.length})
            </h2>
            {evidencias.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {evidencias.map((foto, idx) => (
                  <a
                    key={foto.id ?? idx}
                    href={foto.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-24 overflow-hidden rounded-2xl bg-neutral-200">
                      <img
                        src={foto.url}
                        alt={foto.titulo ?? `Foto ${idx + 1}`}
                        className="h-full w-full object-cover transition hover:opacity-90"
                        loading="lazy"
                      />
                    </div>
                    <p className="mt-1 text-center text-[11px] font-semibold text-neutral-500">
                      {foto.titulo ?? `Foto ${idx + 1}`}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-neutral-500">
                No hay evidencias registradas.
              </p>
            )}
          </section>

          {/* Auditoría */}
          <section className="rounded-2xl bg-brand-50 p-4 ring-1 ring-black/5">
            <h2 className="text-base font-extrabold text-brand-700">Auditoría</h2>
            <div className="mt-3 space-y-2 text-sm font-semibold text-neutral-700">
              <p className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Recolector</span>
                <span className="text-right">
                  {item.usuario?.nombre ?? item.usuario?.username ?? 'No disponible'}
                </span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Creado en</span>
                <span className="text-right">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString('es-BO', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'No disponible'}
                </span>
              </p>
              {item.fecha_validacion && (
                <p className="flex items-center justify-between gap-4">
                  <span className="text-neutral-500">Validado en</span>
                  <span className="text-right">
                    {new Date(item.fecha_validacion).toLocaleString('es-BO', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </p>
              )}
            </div>
          </section>

        </div>
      )}

      {/* ── Acciones ─────────────────────────────────────────────── */}
      <div className="flex gap-2 border-t border-neutral-100 px-4 py-3">
        <button
          type="button"
          onClick={onReject}
          disabled={isActioning}
          className="flex-1 rounded-xl border border-danger-200 bg-danger-50 py-2.5 text-sm font-bold text-danger-700 transition hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Rechazar
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={isActioning}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-success-600 py-2.5 text-sm font-bold text-white transition hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isActioning ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Validando...</span>
            </>
          ) : (
            'Aprobar'
          )}
        </button>
      </div>
    </article>
  )
}

// ─── Pantalla principal ──────────────────────────────────────────────────────

function RecoleccionesValidacionScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<Recoleccion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Recoleccion | null>(null)
  const [rejectLoading, setRejectLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const userRol = (user?.rol ?? '').toUpperCase()
  const canValidate = userRol === 'ADMIN' || userRol === 'VALIDADOR'

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await RecoleccionesService.getPendingValidation({ page: 1, limit: 50 })
      setItems(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las recolecciones pendientes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canValidate) {
      navigate('/app/collections', { replace: true })
    }
  }, [canValidate, navigate])

  useEffect(() => {
    if (!canValidate) {
      return
    }
    void load()
  }, [canValidate])

  if (!canValidate) {
    return null
  }

  const handleApprove = async (item: Recoleccion) => {
    setActioningId(item.id)
    try {
      await RecoleccionesService.approve(item.id)
      showToast(`Recolección ${item.codigo_trazabilidad} aprobada y NFT acuñado.`, 'success')
      setItems((prev) => prev.filter((r) => r.id !== item.id))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al aprobar la recolección.', 'error')
    } finally {
      setActioningId(null)
    }
  }

  const handleRejectConfirm = async (motivo: string) => {
    if (!rejectTarget) return
    setRejectLoading(true)
    try {
      await RecoleccionesService.reject(rejectTarget.id, motivo)
      showToast(`Recolección ${rejectTarget.codigo_trazabilidad} rechazada.`, 'success')
      setItems((prev) => prev.filter((r) => r.id !== rejectTarget.id))
      setRejectTarget(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al rechazar la recolección.', 'error')
    } finally {
      setRejectLoading(false)
    }
  }

  const subtitle = loading
    ? 'Cargando...'
    : error
      ? 'Error al cargar'
      : `${items.length} pendiente${items.length !== 1 ? 's' : ''}`

  return (
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        {/* Header */}
        <header className="mb-3 flex rounded-b-3xl bg-brand-600 px-5 pb-12 pt-10 text-white shadow-soft">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/collections')}
            className="mr-4 my-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold leading-tight">Validar</h1>
            <p className="text-sm font-medium text-white/90">{subtitle}</p>
          </div>
        </header>

        <div className="-mt-10 space-y-4 px-5">
          {/* Nota informativa */}
          <div className="rounded-2xl bg-warning-50 px-4 py-3 ring-1 ring-warning-200">
            <p className="text-xs font-semibold text-warning-800">
              Al aprobar se generará el NFT en blockchain, lo cual puede tardar unos segundos.
              Al rechazar el recolector podrá corregir y reenviar.
            </p>
          </div>

          {/* Estado de carga */}
          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-neutral-600 shadow-soft ring-1 ring-black/5">
              Cargando recolecciones pendientes...
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="rounded-3xl bg-danger-50 px-4 py-6 text-center text-sm font-semibold text-danger-700 shadow-soft ring-1 ring-danger-200">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 rounded-xl bg-danger-100 px-4 py-2 text-xs font-bold text-danger-700 transition hover:bg-danger-200"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Lista de pendientes */}
          {!loading && !error && items.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => (
                <PendingCard
                  key={item.id}
                  item={item}
                  onApprove={() => void handleApprove(item)}
                  onReject={() => setRejectTarget(item)}
                  isActioning={actioningId === item.id}
                />
              ))}
            </div>
          )}

          {/* Vacío */}
          {!loading && !error && items.length === 0 && (
            <div className="rounded-3xl bg-white px-4 py-10 text-center shadow-soft ring-1 ring-black/5">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
                <Icon name="check" className="h-8 w-8 text-success-500" />
              </div>
              <p className="text-base font-bold text-neutral-700">Todo al día</p>
              <p className="mt-1 text-sm font-medium text-neutral-500">
                No hay recolecciones pendientes de validación.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de rechazo */}
      {rejectTarget && (
        <RejectModal
          recoleccion={rejectTarget}
          onConfirm={(motivo) => void handleRejectConfirm(motivo)}
          onCancel={() => setRejectTarget(null)}
          loading={rejectLoading}
        />
      )}

      {/* Toast de resultado */}
      {toastMsg && (
        <div
          className={`fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-2xl transition-all ${
            toastMsg.type === 'success' ? 'bg-success-600' : 'bg-danger-600'
          }`}
        >
          {toastMsg.text}
        </div>
      )}
    </div>
  )
}

export default RecoleccionesValidacionScreen
