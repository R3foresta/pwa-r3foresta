import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { formatUnidadCanonicaDisplay } from '../../../utils/recoleccionUnidad'
import CollapsibleSection from '../components/CollapsibleSection';
import StageTimeline from '../components/StageTimeline'
import type { StageTimelineItem } from '../components/StageTimeline'
import SurvivalBar from '../components/SurvivalBar'
import type { ViveroLotDetailView } from '../types/view-models'

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha'
  const datePart = value.includes('T') ? value.split('T')[0] : value
  const parts = datePart.split('-').map(p => parseInt(p, 10))
  if (parts.length !== 3 || parts.some(isNaN)) return value
  
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('es-ES', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  })
}

function buildTimeline(detail: ViveroLotDetailView): StageTimelineItem[] {
  const hasEmbolsado = detail.plantasVivasIniciales !== null
  const hasAdaptabilidad = detail.subetapaActual !== null
  const hasFinalizado = detail.estadoLote === 'FINALIZADO'
  const hasDespacho =
    hasFinalizado &&
    (detail.motivoCierre === 'DESPACHO_TOTAL' || detail.motivoCierre === 'MIXTO')

  const adaptSubStates = hasEmbolsado
    ? [
        { key: 'SOMBRA', label: 'Sombra', active: detail.subetapaActual === 'SOMBRA' },
        {
          key: 'MEDIA_SOMBRA',
          label: 'Media sombra',
          active: detail.subetapaActual === 'MEDIA_SOMBRA',
        },
        {
          key: 'SOL_DIRECTO',
          label: 'Sol directo',
          active: detail.subetapaActual === 'SOL_DIRECTO',
        },
      ]
    : undefined

  return [
    {
      key: 'INICIO',
      label: 'Inicio',
      done: true,
      active: false,
      date: detail.fechaInicio,
    },
    {
      key: 'EMBOLSADO',
      label: 'Embolsado',
      done: hasEmbolsado,
      active: !hasEmbolsado && !hasFinalizado,
      date: null,
    },
    // MERMA queda fuera del StageTimeline porque no es una etapa secuencial:
    // puede ocurrir N veces durante EMBOLSADO o ADAPTABILIDAD, y marcarla
    // como "done" sería engañoso. El recuento y detalle de cada merma vive
    // en la sección "Historial de mermas" (ver TODO(sprint-historial) abajo).
    {
      key: 'ADAPTABILIDAD',
      label: 'Adaptabilidad',
      done: hasAdaptabilidad && hasFinalizado,
      active: hasAdaptabilidad && !hasFinalizado,
      date: null,
      subStates: hasEmbolsado ? adaptSubStates : undefined,
    },
    {
      key: 'DESPACHO',
      label: 'Despacho',
      done: hasDespacho,
      active: false,
      date: null,
    },
    {
      key: 'CIERRE',
      label: 'Cierre',
      done: hasFinalizado,
      active: false,
      date: hasFinalizado ? detail.updatedAt : null,
    },
  ]
}

function getNextActionInfo(
  detail: ViveroLotDetailView,
): { label: string; iconName: IconName; path: string } | null {
  if (detail.estadoLote === 'FINALIZADO') return null
  if (detail.plantasVivasIniciales === null)
    return {
      label: 'Registrar Embolsado',
      iconName: 'package',
      path: `/app/vivero/${detail.id}/event/embolsado`,
    }
  if (detail.subetapaActual === null)
    return {
      label: 'Registrar Adaptabilidad',
      iconName: 'leaf',
      path: `/app/vivero/${detail.id}/event/adaptabilidad`,
    }
  return {
    label: 'Registrar Despacho',
    iconName: 'planting',
    path: `/app/vivero/${detail.id}/event/despacho`,
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs font-semibold text-brand-500">{label}</span>
      <span className="text-right text-xs font-bold text-brand-700">{value}</span>
    </div>
  )
}

function ViveroDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [detail, setDetail] = useState<ViveroLotDetailView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('Lote de vivero no encontrado.')
      setLoading(false)
      return
    }
    const lotId = Number(id)
    if (!Number.isFinite(lotId) || lotId <= 0) {
      setError('ID de lote inválido.')
      setLoading(false)
      return
    }

    let isMounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await LotesViveroService.getDetail(lotId)
        if (isMounted) setDetail(data)
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Error al cargar el lote.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [id])

  const timeline = useMemo(() => (detail ? buildTimeline(detail) : []), [detail])
  const nextActionInfo = useMemo(() => (detail ? getNextActionInfo(detail) : null), [detail])
  const canRegisterMerma = useMemo(
    () => detail?.estadoLote === 'ACTIVO' && detail?.plantasVivasIniciales !== null,
    [detail],
  )

  const plantasIniciales = detail?.plantasVivasIniciales ?? null
  const saldoVivo = detail?.saldoVivoActual ?? plantasIniciales
  const hasEmbolsado = plantasIniciales !== null
  const muertas =
    hasEmbolsado && saldoVivo !== null
      ? Math.max(0, plantasIniciales - saldoVivo)
      : null
  const unidadOrigenLabel = formatUnidadCanonicaDisplay(
    detail?.unidadMedidaInicial,
    detail?.cantidadInicialEnProceso,
  )

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 pb-28">
        <div className="rounded-3xl bg-white px-6 py-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-brand-600">Cargando lote...</p>
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 pb-28">
        <div className="rounded-3xl bg-white px-6 py-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-red-500">{error ?? 'Lote no encontrado'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        {/* Header */}
        <header className="flex items-start gap-3 px-5 pt-10">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              {detail.codigo}
            </p>
            <h1 className="truncate text-2xl font-extrabold leading-tight text-brand-700">
              {detail.especie}
            </h1>
            <p className="text-sm font-semibold text-brand-500">
              {detail.viveroNombre} · {detail.diasDesdeInicio}d
            </p>
          </div>
        </header>

        <div className="mt-5 space-y-4 px-5">
          {nextActionInfo ? (
            <button
              type="button"
              onClick={() => navigate(nextActionInfo.path)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-700 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.98]"
            >
              <Icon name={nextActionInfo.iconName} className="h-5 w-5" />
              <span>{nextActionInfo.label}</span>
            </button>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-100 py-4 text-base font-extrabold text-emerald-700 ring-1 ring-emerald-200">
              <Icon name="check" className="h-5 w-5" />
              <span>Proceso completado</span>
            </div>
          )}

          {/* CTA secundario destructivo: visible solo cuando el lote tiene
              saldo vivo. Color rojo para comunicar al usuario de campo que
              es una acción que reduce inventario. */}
          {canRegisterMerma && saldoVivo !== null && saldoVivo > 0 && (
            <button
              type="button"
              onClick={() => navigate(`/app/vivero/${detail.id}/event/merma`)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-300 bg-red-50 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100 active:scale-[0.98]"
            >
              <Icon name="info" className="h-4 w-4" />
              <span>Registrar Merma</span>
            </button>
          )}

          {/* Supervivencia / estado del lote */}
          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
            {hasEmbolsado ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-brand-700">Supervivencia</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                    {detail.diasDesdeInicio} días
                  </span>
                </div>

                {/* Hero: plantas vivas */}
                <div className="mb-4 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">Plantas vivas</p>
                    <p className="mt-0.5 text-3xl font-extrabold leading-none text-emerald-700">
                      {saldoVivo ?? 0}
                      <span className="ml-1 text-base font-bold text-emerald-600">plantas</span>
                    </p>
                  </div>
                  <Icon name="leaf" className="h-10 w-10 text-emerald-300" />
                </div>

                {/* Métricas: consumido | iniciales | muertas */}
                <div className="mb-4 grid grid-cols-3 divide-x divide-brand-100">
                  <div className="pr-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
                      De recolección
                    </p>
                    <p className="mt-1 text-base font-extrabold leading-tight text-brand-700">
                      {detail.cantidadInicialEnProceso}
                      <span className="ml-1 text-xs font-bold text-brand-500">
                        {unidadOrigenLabel}
                      </span>
                    </p>
                  </div>
                  <div className="px-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
                      Embolsadas
                    </p>
                    <p className="mt-1 text-base font-extrabold leading-tight text-brand-700">
                      {plantasIniciales ?? '—'}
                      <span className="ml-1 text-xs font-bold text-brand-500">plantas</span>
                    </p>
                  </div>
                  <div className="pl-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
                      Muertas
                    </p>
                    <p className="mt-1 text-base font-extrabold leading-tight text-red-600">
                      {muertas ?? 0}
                      <span className="ml-1 text-xs font-bold text-red-400">plantas</span>
                    </p>
                  </div>
                </div>

                <SurvivalBar alive={saldoVivo} initial={plantasIniciales} showLabel />
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-brand-700">Material en proceso</p>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                    Pendiente embolsado
                  </span>
                </div>

                <div className="mb-4 flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
                  <div>
                    <p className="text-xs font-semibold text-brand-500">De la recolección</p>
                    <p className="mt-0.5 text-3xl font-extrabold leading-none text-brand-700">
                      {detail.cantidadInicialEnProceso}
                      <span className="ml-1 text-base font-bold text-brand-500">
                        {unidadOrigenLabel}
                      </span>
                    </p>
                  </div>
                  <Icon name="package" className="h-10 w-10 text-brand-300" />
                </div>

                <p className="rounded-2xl bg-brand-50/60 px-3 py-2.5 text-xs font-semibold text-brand-600">
                  El conteo oficial de plantas vivas se inaugura cuando se registre el embolsado.
                </p>
              </>
            )}
          </div>

          {/* Timeline de etapas */}
          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
            <p className="mb-4 text-sm font-semibold text-brand-700">Etapas</p>
            <StageTimeline
              stages={timeline}
              imagenUrl={detail.plantaImagenUrl}
              mermaAction={null}
            />
          </div>

          {/* TODO(sprint-historial): seccion "Historial de mermas" que consume
              GET /api/lotes-vivero/:id/merma (existe en backend, falta consumer
              en frontend — ver lotes-vivero.api.ts). Idealmente migrar al
              endpoint unificado GET /:id/timeline cuando se implemente. */}

          {/* Cantidades detalle */}
          <CollapsibleSection title="Cantidades" defaultOpen>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">
                  Material consumido
                </p>
                <p className="mt-0.5 font-extrabold text-brand-700">
                  {detail.cantidadInicialEnProceso} {detail.unidadMedidaInicial}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">
                  Plantas embolsadas
                </p>
                <p className="mt-0.5 font-extrabold text-brand-700">
                  {detail.plantasVivasIniciales !== null
                    ? `${detail.plantasVivasIniciales} plantas`
                    : 'Pendiente'}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">
                  Saldo vivo actual
                </p>
                <p className="mt-0.5 font-extrabold text-brand-700">
                  {detail.saldoVivoActual !== null
                    ? `${detail.saldoVivoActual} plantas`
                    : 'Pendiente'}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">
                  Stock vivo actual
                </p>
                <p className="mt-0.5 font-extrabold text-brand-700">
                  {detail.stockVivoActual !== null
                    ? `${detail.stockVivoActual} plantas`
                    : 'Pendiente'}
                </p>
              </div>
            </div>
            {detail.estadoLote === 'ACTIVO' && detail.plantasVivasIniciales === null && (
              <p className="mt-2 text-xs font-semibold text-brand-400">
                El conteo en plantas se inaugura en el embolsado.
              </p>
            )}
          </CollapsibleSection>

          {/* Datos de origen */}
          {/* TODO(estructural — fuera de P1): esta sección mezcla origen
              (recolección, comunidad, tipo material) con metadatos del lote
              (vivero, responsable, fechas). Cuando se rediseñe, partir en 2. */}
          <CollapsibleSection title="Datos de origen">
            <div className="divide-y divide-brand-50">
              <InfoRow
                label="Recolección"
                value={
                  detail.recoleccionFecha
                    ? `${detail.recoleccionCodigo} · ${formatDate(detail.recoleccionFecha)}`
                    : detail.recoleccionCodigo
                }
              />
              <InfoRow label="Tipo material" value={detail.recoleccionTipoMaterial} />
              <InfoRow
                label="Comunidad origen"
                value={detail.nombreComunidadOrigen ?? 'Sin registrar'}
              />
              <InfoRow label="Vivero" value={`${detail.viveroNombre} (${detail.viveroCodigo})`} />
              <InfoRow
                label="Responsable"
                value={
                  detail.responsableUsername
                    ? `${detail.responsableNombre} (@${detail.responsableUsername})`
                    : detail.responsableNombre
                }
              />
              <InfoRow label="Fecha inicio" value={formatDate(detail.fechaInicio)} />
              <InfoRow label="Actualizado" value={formatDateTime(detail.updatedAt)} />
            </div>
          </CollapsibleSection>

          {/* Datos de planta */}
          {/* TODO(p1.5 — banner de cierre): cuando el flujo de cierre del backend
              esté completamente implementado, agregar arriba del scroll un banner
              prominente con el motivoCierre cuando estadoLote === 'FINALIZADO'.
              Color por tipo: emerald=DESPACHO_TOTAL · red=PERDIDA_TOTAL · amber=MIXTO. */}
          <CollapsibleSection title="Datos de planta">
            {detail.plantaImagenUrl && (
              <div className="mb-3 overflow-hidden rounded-2xl">
                <img
                  src={detail.plantaImagenUrl}
                  alt={detail.especie}
                  className="h-36 w-full object-cover"
                />
              </div>
            )}
            <div className="divide-y divide-brand-50">
              <InfoRow label="Especie" value={detail.especie} />
              <InfoRow label="Nombre científico" value={detail.nombreCientifico} />
              <InfoRow label="Nombre comercial" value={detail.nombreComercial} />
              <InfoRow label="Variedad" value={detail.variedad ?? 'N/D'} />
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}

export default ViveroDetailScreen
