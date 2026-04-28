import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../../components/Icon'
import ViveroLotCard from '../components/ViveroLotCard'
import { mapLoteToCardData, mapLoteToDetailView } from '../mappers/lote.mapper'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import type { LoteViveroItem } from '../types/contracts'

type StageKey = 'INICIO' | 'EMBOLSADO' | 'ADAPTABILIDAD' | 'DESPACHO' | 'CIERRE'

type StageItem = {
  key: StageKey
  label: string
  done: boolean
  date: string | null
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatQuantity(value: number | null, unit: string) {
  if (value === null) return 'Pendiente'
  return `${value} ${unit}`
}

function buildVisualStages(detail: ReturnType<typeof mapLoteToDetailView>): StageItem[] {
  const hasEmbolsadoData =
    detail.plantasVivasIniciales !== null ||
    detail.saldoVivoActual !== null ||
    detail.stockVivoActual !== null ||
    detail.subetapaActual !== null

  const hasAdaptabilidadData = detail.subetapaActual !== null
  const hasDespachoData =
    detail.estadoLote === 'FINALIZADO' &&
    (detail.motivoCierre === 'DESPACHO_TOTAL' || detail.motivoCierre === 'MIXTO')
  const hasCierreData = detail.estadoLote === 'FINALIZADO'

  return [
    {
      key: 'INICIO',
      label: 'Inicio',
      done: true,
      date: detail.fechaInicio,
    },
    {
      key: 'EMBOLSADO',
      label: 'Embolsado',
      done: hasEmbolsadoData,
      date: null,
    },
    {
      key: 'ADAPTABILIDAD',
      label: 'Adaptabilidad',
      done: hasAdaptabilidadData,
      date: null,
    },
    {
      key: 'DESPACHO',
      label: 'Despacho',
      done: hasDespachoData,
      date: null,
    },
    {
      key: 'CIERRE',
      label: 'Cierre',
      done: hasCierreData,
      date: hasCierreData ? detail.updatedAt : null,
    },
  ]
}

function getNextStageCta(stages: StageItem[]) {
  const firstPending = stages.find((stage) => !stage.done)
  if (!firstPending) return 'Proceso completado'

  switch (firstPending.key) {
    case 'EMBOLSADO':
      return 'Registrar Embolsado'
    case 'ADAPTABILIDAD':
      return 'Registrar Adaptabilidad'
    case 'DESPACHO':
      return 'Registrar Despacho'
    case 'CIERRE':
      return 'Finalizar lote'
    case 'INICIO':
    default:
      return 'Continuar proceso'
  }
}

function ViveroDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [lot, setLot] = useState<LoteViveroItem | null>(null)
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
    const loadLot = async () => {
      try {
        setLoading(true)
        setError(null)
        setLot(null)
        const response = await LotesViveroService.getById(lotId)
        if (isMounted) {
          setLot(response)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar el lote.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadLot()
    return () => {
      isMounted = false
    }
  }, [id])

  const detail = useMemo(() => (lot ? mapLoteToDetailView(lot) : null), [lot])
  const summaryCard = useMemo(() => (lot ? mapLoteToCardData(lot) : null), [lot])
  const visualStages = useMemo(() => (detail ? buildVisualStages(detail) : []), [detail])
  const nextStageCta = useMemo(() => getNextStageCta(visualStages), [visualStages])

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 pb-28 text-center text-brand-700">
        <div className="rounded-3xl bg-white px-6 py-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-brand-600">Cargando lote...</p>
        </div>
      </div>
    )
  }

  if (!detail || !summaryCard) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 pb-28 text-center text-brand-700">
        <div className="rounded-3xl bg-white px-6 py-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-red-500">{error ?? 'Lote no encontrado'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        <header className="flex items-start gap-3 px-5 pt-10">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Lote {detail.codigo}
            </p>
            <h1 className="text-2xl font-extrabold leading-tight text-brand-700">{detail.especie}</h1>
            <p className="text-sm font-semibold text-brand-500">Detalle del lote de vivero</p>
          </div>
        </header>

        <div className="mt-6 space-y-5 px-5">
          <ViveroLotCard lot={summaryCard} />

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
            <p className="text-sm font-semibold text-brand-700">Estado del proceso</p>
            <div className="mt-4 grid grid-cols-[1.1fr,0.9fr] gap-4">
              <div className="space-y-4">
                {visualStages.map((stage) => (
                  <div key={stage.key} className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        stage.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Icon name="check" className="h-5 w-5" />
                    </div>
                    <div>
                      <p
                        className={`text-lg font-extrabold ${
                          stage.done ? 'text-brand-700' : 'text-brand-400'
                        }`}
                      >
                        {stage.label}
                      </p>
                      <p className="text-xs font-semibold text-brand-500">{formatDate(stage.date)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                {detail.plantaImagenUrl ? (
                  <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
                    <img
                      src={detail.plantaImagenUrl}
                      alt={`Planta ${detail.especie}`}
                      className="h-36 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-2xl bg-brand-50 text-sm font-semibold text-brand-500 ring-1 ring-dashed ring-brand-200">
                    Sin imagen
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/app/vivero/${detail.id}/event/new`)}
                  disabled={nextStageCta === 'Proceso completado'}
                  className="w-full rounded-2xl bg-amber-200 px-3 py-2.5 text-sm font-extrabold text-brand-800 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                >
                  {nextStageCta}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/app/vivero/${detail.id}/update`)}
                  className="w-full rounded-2xl bg-white px-3 py-2.5 text-sm font-bold text-brand-700 ring-1 ring-brand-200 transition hover:ring-brand-300"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/app/vivero/${detail.id}/update`)}
                  className="w-full rounded-2xl bg-white px-3 py-2.5 text-sm font-bold text-brand-700 ring-1 ring-brand-200 transition hover:ring-brand-300"
                >
                  Subir imagen
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-semibold text-brand-500">
              Las fechas intermedias se completarán cuando se habilite el endpoint de timeline de eventos.
            </p>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-3">
            <p className="text-sm font-semibold text-brand-700">Estado operativo</p>
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-brand-600">
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Estado lote</p>
                <p className="text-brand-700">{detail.estadoLote}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Subetapa</p>
                <p className="text-brand-700">{detail.subetapaActual ?? 'Sin definir'}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Motivo cierre</p>
                <p className="text-brand-700">{detail.motivoCierre ?? 'No aplica'}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Días desde inicio</p>
                <p className="text-brand-700">{detail.diasDesdeInicio}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-3">
            <p className="text-sm font-semibold text-brand-700">Cantidades</p>
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-brand-600">
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">
                  Cantidad inicial en proceso
                </p>
                <p className="text-brand-700">
                  {detail.cantidadInicialEnProceso} {detail.unidadMedidaInicial}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">
                  Plantas vivas iniciales
                </p>
                <p className="text-brand-700">
                  {formatQuantity(detail.plantasVivasIniciales, detail.unidadMedidaInicial)}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Saldo vivo actual</p>
                <p className="text-brand-700">
                  {formatQuantity(detail.saldoVivoActual, detail.unidadMedidaInicial)}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Stock vivo actual</p>
                <p className="text-brand-700">
                  {formatQuantity(detail.stockVivoActual, detail.unidadMedidaInicial)}
                </p>
              </div>
            </div>
            <p className="text-xs font-semibold text-brand-500">
              Nota: en lotes recién iniciados, el saldo vivo puede venir como pendiente hasta embolsado.
            </p>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="info" className="h-5 w-5 text-brand-600" />
              <p className="text-sm font-semibold text-brand-700">Datos de origen</p>
            </div>
            <div className="space-y-2 text-sm font-semibold text-brand-600">
              <p>
                <span className="text-brand-500">Recolección: </span>
                {detail.recoleccionCodigo}
              </p>
              <p>
                <span className="text-brand-500">Tipo material: </span>
                {detail.recoleccionTipoMaterial}
              </p>
              <p>
                <span className="text-brand-500">Vivero: </span>
                {detail.viveroNombre} ({detail.viveroCodigo})
              </p>
              <p>
                <span className="text-brand-500">Responsable: </span>
                {detail.responsableNombre}
                {detail.responsableUsername ? ` (@${detail.responsableUsername})` : ''}
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-3">
            <p className="text-sm font-semibold text-brand-700">Datos de planta</p>
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-brand-600">
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Especie</p>
                <p className="text-brand-700">{detail.especie}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Nombre científico</p>
                <p className="text-brand-700">{detail.nombreCientifico}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Nombre comercial</p>
                <p className="text-brand-700">{detail.nombreComercial}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Variedad</p>
                <p className="text-brand-700">{detail.variedad ?? 'N/D'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-2 text-sm font-semibold text-brand-600">
            <p>
              <span className="text-brand-500">Fecha inicio: </span>
              {formatDate(detail.fechaInicio)}
            </p>
            <p>
              <span className="text-brand-500">Creado en: </span>
              {formatDateTime(detail.createdAt)}
            </p>
            <p>
              <span className="text-brand-500">Actualizado en: </span>
              {formatDateTime(detail.updatedAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViveroDetailScreen
