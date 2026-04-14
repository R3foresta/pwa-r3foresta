import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import {
  RecoleccionesService,
  type EvidenciaTrazabilidad,
  type Recoleccion,
} from '../../services/recolecciones.service'
import { getUbicacionCoords, getUbicacionDisplay, getUbicacionDivision } from '../../utils/ubicacion'
import {
  estadoOperativoBadgeClass,
  estadoRegistroBadgeClass,
  resolveEstadoOperativo,
  resolveEstadoRegistro,
} from './recoleccionStatus'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'No disponible'
  }

  return new Date(value).toLocaleString('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function RecoleccionDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [recoleccion, setRecoleccion] = useState<Recoleccion | null>(null)
  const [evidenciasFallback, setEvidenciasFallback] = useState<EvidenciaTrazabilidad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submittingToValidation, setSubmittingToValidation] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showValidationPopup, setShowValidationPopup] = useState(false)

  useEffect(() => {
    const parsedId = Number(id)
    if (!Number.isFinite(parsedId)) {
      setError('ID de recolección inválido.')
      setLoading(false)
      return
    }

    let mounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [recoleccionResponse, evidenciasResponse] = await Promise.all([
          RecoleccionesService.getById(parsedId),
          RecoleccionesService.getEvidenciasByRecoleccion(parsedId),
        ])

        if (!mounted) {
          return
        }

        setRecoleccion(recoleccionResponse.data)
        setEvidenciasFallback(evidenciasResponse.data)
      } catch (loadError) {
        if (!mounted) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el detalle.')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      mounted = false
    }
  }, [id])

  const evidencias = useMemo(() => {
    if (recoleccion?.evidencias && recoleccion.evidencias.length > 0) {
      return recoleccion.evidencias
    }
    return evidenciasFallback
  }, [evidenciasFallback, recoleccion?.evidencias])

  const handleSubmitForValidation = async () => {
    if (!recoleccion) {
      return
    }

    try {
      setSubmittingToValidation(true)
      setActionMessage(null)
      await RecoleccionesService.submit(recoleccion.id)

      const refreshed = await RecoleccionesService.getById(recoleccion.id)
      setRecoleccion(refreshed.data)
      setShowValidationPopup(true)
    } catch (submitError) {
      setActionMessage({
        type: 'error',
        text:
          submitError instanceof Error
            ? submitError.message
            : 'No se pudo enviar la recolección a validación.',
      })
    } finally {
      setSubmittingToValidation(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-brand-700">Cargando detalle...</p>
        </div>
      </div>
    )
  }

  if (error || !recoleccion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] px-5">
        <div className="rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-lg font-bold text-slate-800">No se pudo cargar la recolección</p>
          <p className="mt-1 text-sm text-slate-600">{error || 'Registro no encontrado.'}</p>
          <button
            type="button"
            onClick={() => navigate('/app/collections')}
            className="mt-4 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Volver al listado
          </button>
        </div>
      </div>
    )
  }

  // TODO: (VERIFICAR) Acá estámos usando algo pasado. Tenemos que usar los datos directamente de la tabla planta. Ver de donde se están trayendo los daots.
  const plantaNombre =
    recoleccion.planta?.nombre_comun_principal ||
    recoleccion.nombre_comun_principal ||
    recoleccion.planta?.especie ||
    recoleccion.nombre_comercial ||
    'Sin nombre comercial'
  const nombreCientifico = recoleccion.planta?.nombre_cientifico || recoleccion.nombre_cientifico

  const ubicacionDisplay = getUbicacionDisplay(recoleccion.ubicacion)
  const ubicacionDivision = getUbicacionDivision(recoleccion.ubicacion)
  const ubicacionCoords = getUbicacionCoords(recoleccion.ubicacion)
  const estadoRegistro = resolveEstadoRegistro(recoleccion)
  const estadoOperativo = resolveEstadoOperativo(recoleccion.cantidad_inicial_canonica)
  const isBorrador = estadoRegistro === 'BORRADOR'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="relative px-5 pb-4 pt-6 text-center">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/collections')}
            className="absolute left-4 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>

          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {recoleccion.codigo_trazabilidad}
          </p>
          <h1 className="text-2xl font-extrabold text-brand-700">Detalle de Recolección</h1>
          <p className="text-sm font-semibold text-brand-500">{formatDate(recoleccion.fecha)}</p>
        </header>

        <div className="space-y-4 px-5 pb-8">
          <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            <h2 className="text-lg font-extrabold text-brand-700">Material</h2>
            <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Nombre comercial</span>
                <span className="text-right">{plantaNombre}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Nombre científico</span>
                <span className="text-right italic">{nombreCientifico || 'No disponible'}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Tipo material</span>
                <span>{recoleccion.tipo_material}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Cantidad</span>
                <span>
                  {recoleccion.cantidad_inicial_canonica} {recoleccion.unidad_canonica}
                </span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Estado registro</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${estadoRegistroBadgeClass(
                    estadoRegistro,
                  )}`}
                >
                  {estadoRegistro}
                </span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Estado operativo</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${estadoOperativoBadgeClass(
                    estadoOperativo,
                  )}`}
                >
                  {estadoOperativo}
                </span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Método</span>
                <span className="text-right">{recoleccion.metodo?.nombre || 'No disponible'}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Vivero</span>
                <span className="text-right">{recoleccion.vivero?.nombre || 'No disponible'}</span>
              </p>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            <h2 className="text-lg font-extrabold text-brand-700">Ubicación</h2>
            <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
              <p>{ubicacionDisplay}</p>
              {ubicacionDivision && <p className="text-slate-600">{ubicacionDivision}</p>}
              {ubicacionCoords && <p className="text-xs text-slate-500">{ubicacionCoords}</p>}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Evidencias ({evidencias.length})</h2>
            </div>

            {evidencias.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {evidencias.map((evidencia) => {
                  const imageUrl = evidencia.public_url ?? null

                  return (
                    <div key={evidencia.id} className="space-y-1">
                      <div className="h-24 overflow-hidden rounded-2xl bg-slate-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={evidencia.titulo || `Evidencia ${evidencia.id}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon name="photo" className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <p className="text-center text-[11px] font-semibold text-slate-500">{evidencia.titulo || `#${evidencia.id}`}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-slate-500">No hay evidencias registradas.</p>
            )}
          </section>

          <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            <h2 className="text-lg font-extrabold text-brand-700">Auditoría</h2>
            <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Creado en</span>
                <span className="text-right">{formatDateTime(recoleccion.created_at)}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Validado en</span>
                <span className="text-right">{formatDateTime(recoleccion.fecha_validacion)}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Responsable</span>
                <span className="text-right">{recoleccion.usuario?.nombre || recoleccion.usuario?.username || 'No disponible'} {recoleccion.usuario?.apellido}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Usuario</span>
                <span className="text-right">{recoleccion.usuario?.username || 'No disponible'}</span>
              </p>
            </div>

            {isBorrador && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/app/collections/new?editId=${recoleccion.id}`)}
                    className="rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-100"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmitForValidation()}
                    disabled={submittingToValidation}
                    className="rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingToValidation ? 'Enviando...' : 'Validar'}
                  </button>
                </div>

                {actionMessage && (
                  <p
                    className={`text-xs font-semibold ${
                      actionMessage.type === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {actionMessage.text}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {showValidationPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-black/5">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Icon name="check" className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">Envío exitoso</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              La recolección se envió a validar correctamente.
            </p>
            <button
              type="button"
              onClick={() => setShowValidationPopup(false)}
              className="mt-4 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecoleccionDetailScreen
