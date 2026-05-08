import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'
import { MAX_DIAS_VIVERO } from '../../../config/vivero'
import { useAuth } from '../../../contexts/AuthContext'
import { useViveros } from '../../../hooks/useViveros'
import type { Recoleccion } from '../../../services/recolecciones.service'
import { RecoleccionesService } from '../../../services/recolecciones.service'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { getUbicacionDisplay } from '../../../utils/ubicacion'
import { buildPastRange, clampDateToRange, validateDateInRange } from '../../../utils/validations/date'
import type { TipoMaterialVivero, UnidadMedidaVivero } from '../types/contracts'
import { isValidYmdDate, validateCantidadInicial } from '../utils/validators'

type UploadPhase = 'idle' | 'uploading' | 'creating'
type Photo = { file: File; previewUrl: string }
type StepStatus = { done: boolean; active: boolean }

const QUICK_PERCENTAGES = [25, 50, 80, 100] as const

const longDateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const shortDateFmt = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : longDateFmt.format(date)
}

const formatShortDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : shortDateFmt.format(date)
}

const isTipoMaterialVivero = (value: string | null | undefined): value is TipoMaterialVivero =>
  value === 'SEMILLA' || value === 'ESQUEJE'

const isUnidadMedidaVivero = (value: string | null | undefined): value is UnidadMedidaVivero =>
  value === 'UNIDAD' || value === 'G'

const formatCantidad = (value: number, unidad: UnidadMedidaVivero) => {
  if (unidad === 'UNIDAD') return String(Math.trunc(value))
  return String(Number(value.toFixed(1)))
}

function sanitizeCantidad(value: string, unidad: UnidadMedidaVivero | null): string {
  if (!value) return ''
  let clean = value.trim().replace(',', '.')

  if (unidad === 'UNIDAD') {
    return clean.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
  }

  clean = clean.replace(/[^\d.]/g, '')
  if (clean.startsWith('.')) clean = `0${clean}`

  const dotIdx = clean.indexOf('.')
  if (dotIdx !== -1) {
    clean = clean.slice(0, dotIdx + 1) + clean.slice(dotIdx + 1).replace(/\./g, '').slice(0, 1)
  }

  clean = clean.replace(/^0+(?=\d)/, '')
  if (clean.startsWith('.')) clean = `0${clean}`
  return clean
}

function getCantidadSugerida(saldo: number, unidad: UnidadMedidaVivero, pct: number): string {
  const raw = (saldo * pct) / 100
  if (unidad === 'UNIDAD') {
    const rounded = Math.round(raw)
    return formatCantidad(Math.min(saldo, Math.max(1, rounded)), unidad)
  }
  const rounded = Math.round(raw * 10) / 10
  const normalized = rounded > 0 ? rounded : 0.1
  return formatCantidad(Math.min(saldo, normalized), unidad)
}

const getRecoleccionLabel = (item: Recoleccion) =>
  item.planta?.especie ||
  item.nombre_comercial ||
  item.nombre_cientifico ||
  `Recolección #${item.id}`

const isRecoleccionElegible = (item: Recoleccion) => {
  if (!isTipoMaterialVivero(item.tipo_material)) return false
  if (!item.codigo_trazabilidad?.trim()) return false
  const estadoRegistro = String(item.estado_registro ?? '').toUpperCase()
  const estadoOperativo = String(item.estado_operativo ?? '').toUpperCase()
  const saldoActual = Number(item.saldo_actual ?? 0)
  return (
    estadoRegistro === 'VALIDADO' &&
    estadoOperativo === 'ABIERTO' &&
    saldoActual > 0 &&
    isUnidadMedidaVivero(item.unidad_canonica)
  )
}

type SectionCardProps = {
  index: number
  total: number
  status: StepStatus
  icon: IconName
  title: string
  hint?: string
  badge?: React.ReactNode
  children: React.ReactNode
}

function SectionCard({ index, total, status, icon, title, hint, badge, children }: SectionCardProps) {
  const ringTone = status.done
    ? 'ring-emerald-100'
    : status.active
      ? 'ring-brand-200'
      : 'ring-black/5'
  const badgeTone = status.done
    ? 'bg-emerald-500 text-white'
    : status.active
      ? 'bg-brand-500 text-white'
      : 'bg-brand-50 text-brand-600'

  return (
    <section className={`overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ${ringTone}`}>
      <header className="flex items-start gap-3 px-4 pt-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${badgeTone}`}>
          <Icon name={status.done ? 'check' : icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Paso {index} · {total}
          </p>
          <h2 className="text-base font-extrabold leading-tight text-brand-700">{title}</h2>
          {hint && <p className="mt-0.5 text-xs font-semibold text-brand-500">{hint}</p>}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </header>
      <div className="px-4 pb-4 pt-3">{children}</div>
    </section>
  )
}

function ProgressHeader({
  steps,
  onBack,
}: {
  steps: StepStatus[]
  onBack: () => void
}) {
  const completed = steps.filter((s) => s.done).length
  return (
    <div className="sticky top-0 z-30 bg-[#eef2ed]/95 px-5 pb-4 pt-6 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-700 shadow-soft transition hover:bg-brand-50"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-500">
              Nuevo lote · vivero
            </p>
            <h1 className="truncate text-xl font-extrabold leading-tight text-brand-700">
              Inicio de lote
            </h1>
          </div>
          <div className="flex flex-col items-end leading-none">
            <span className="text-base font-extrabold text-brand-700">
              {completed}
              <span className="text-brand-400">/{steps.length}</span>
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-400">
              listos
            </span>
          </div>
        </div>
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s.done ? 'bg-emerald-500' : s.active ? 'bg-brand-500' : 'bg-brand-100'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SaldoMeter({
  saldo,
  cantidad,
  unidad,
}: {
  saldo: number
  cantidad: number
  unidad: UnidadMedidaVivero
}) {
  const ratio = saldo > 0 ? Math.max(0, cantidad / saldo) : 0
  const pct = Math.round(Math.min(1, ratio) * 100)
  const overLimit = ratio > 1
  const tone = overLimit
    ? 'bg-red-500'
    : ratio >= 0.9
      ? 'bg-amber-400'
      : ratio > 0
        ? 'bg-emerald-500'
        : 'bg-brand-200'

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between text-[11px] font-bold text-brand-500">
        <span>{overLimit ? 'Excede el saldo disponible' : `Usando ${pct}% del saldo`}</span>
        <span className="text-brand-700">
          {formatCantidad(Math.min(cantidad, saldo), unidad)} / {formatCantidad(saldo, unidad)} {unidad}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${tone}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  )
}

function ViveroNewScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const { viveros, loading: viveroLoading, error: viveroError } = useViveros()
  const [selectedViveroId, setSelectedViveroId] = useState<number | null>(null)

  const [recolecciones, setRecolecciones] = useState<Recoleccion[]>([])
  const [recoleccionLoading, setRecoleccionLoading] = useState(false)
  const [recoleccionError, setRecoleccionError] = useState<string | null>(null)
  const [selectedRecoleccionId, setSelectedRecoleccionId] = useState<number | null>(null)
  const [pickingRecoleccion, setPickingRecoleccion] = useState(true)

  const [cantidadInicio, setCantidadInicio] = useState('')

  const fechaRange = useMemo(() => buildPastRange(MAX_DIAS_VIVERO), [])

  const [fechaInicio, setFechaInicio] = useState(() =>
    clampDateToRange(new Date().toLocaleDateString('en-CA'), fechaRange)
  )

  const [observaciones, setObservaciones] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploadedEvidenceIds, setUploadedEvidenceIds] = useState<number[] | null>(null)

  const [showErrors, setShowErrors] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<UploadPhase>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const selectedRecoleccion = useMemo(
    () => recolecciones.find((item) => item.id === selectedRecoleccionId) ?? null,
    [recolecciones, selectedRecoleccionId],
  )

  const viveroSeleccionado = useMemo(
    () => viveros.find((v) => v.id === selectedViveroId),
    [selectedViveroId, viveros],
  )

  useEffect(() => {
    if (!selectedViveroId) {
      setRecolecciones([])
      setSelectedRecoleccionId(null)
      setPickingRecoleccion(true)
      return
    }

    let isMounted = true
    const load = async () => {
      try {
        setRecoleccionLoading(true)
        setRecoleccionError(null)
        const response = await RecoleccionesService.list({
          vivero_id: selectedViveroId,
          limit: 50,
        })
        if (isMounted) setRecolecciones(response.data || [])
      } catch (error) {
        if (isMounted) {
          setRecoleccionError(
            error instanceof Error ? error.message : 'Error al cargar recolecciones',
          )
        }
      } finally {
        if (isMounted) setRecoleccionLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [selectedViveroId])

  const recoleccionesDisponibles = useMemo(
    () => recolecciones.filter(isRecoleccionElegible),
    [recolecciones],
  )

  const unidadMedida = useMemo<UnidadMedidaVivero | null>(() => {
    if (!selectedRecoleccion) return null
    return isUnidadMedidaVivero(selectedRecoleccion.unidad_canonica)
      ? selectedRecoleccion.unidad_canonica
      : null
  }, [selectedRecoleccion])

  const saldoDisponible = useMemo(() => {
    if (!selectedRecoleccion) return null
    const value = Number(selectedRecoleccion.saldo_actual ?? NaN)
    return Number.isFinite(value) ? value : null
  }, [selectedRecoleccion])

  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(
    () => () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    },
    [],
  )

  const cantidadValue = Number(cantidadInicio)

  const cantidadValidation =
    selectedRecoleccion && unidadMedida
      ? validateCantidadInicial({
          cantidad: cantidadValue,
          unidad: unidadMedida,
          recoleccionTipoMaterial: selectedRecoleccion.tipo_material as TipoMaterialVivero,
          maxCantidad: saldoDisponible,
        })
      : { isValid: false, message: 'Selecciona una recolección válida.' }


  const fechaInicioCheck = validateDateInRange(fechaInicio, fechaRange)
  const validation = {
    auth: !authId,
    vivero: !selectedViveroId,
    recoleccion: !selectedRecoleccion,
    cantidad: !cantidadValidation.isValid,
    fecha: !fechaInicioCheck.isValid || !isValidYmdDate(fechaInicioCheck.normalized),
    fotos: photos.length < 1 || photos.length > 5,
  }

  const stepFlags = [
    !validation.fecha,
    !validation.vivero,
    !validation.recoleccion,
    !validation.cantidad,
    !validation.fotos,
  ]
  const firstPendingIdx = stepFlags.findIndex((done) => !done)
  const steps: StepStatus[] = stepFlags.map((done, idx) => ({
    done,
    active: !done && idx === firstPendingIdx,
  }))
  const stepStatus = (i: number) => steps[i] ?? { done: false, active: false }

  const isSubmitting = submitPhase !== 'idle'
  const canSubmit =
    !validation.auth &&
    !validation.vivero &&
    !validation.recoleccion &&
    !validation.cantidad &&
    !validation.fecha &&
    !validation.fotos &&
    !isSubmitting

  const handleSelectVivero = (id: number | null) => {
    setSelectedViveroId(id)
    setSelectedRecoleccionId(null)
    setCantidadInicio('')
    setPickingRecoleccion(true)
  }

  const handleSelectRecoleccion = (id: number) => {
    setSelectedRecoleccionId(id)
    setCantidadInicio('')
    setPickingRecoleccion(false)
  }

  const handleClearRecoleccion = () => {
    setSelectedRecoleccionId(null)
    setCantidadInicio('')
    setPickingRecoleccion(true)
  }

  const handleCantidadChange = (value: string) => {
    setCantidadInicio(sanitizeCantidad(value, unidadMedida))
  }

  const handleCantidadBlur = () => {
    if (!cantidadInicio || !unidadMedida) return
    if (unidadMedida === 'UNIDAD') {
      setCantidadInicio(sanitizeCantidad(cantidadInicio, unidadMedida))
      return
    }
    if (cantidadInicio.endsWith('.')) {
      setCantidadInicio(cantidadInicio.slice(0, -1))
    }
  }

  const applyQuickPercentage = (pct: number) => {
    if (!unidadMedida || saldoDisponible === null || saldoDisponible <= 0) return
    setCantidadInicio(getCantidadSugerida(saldoDisponible, unidadMedida, pct))
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    const next = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setPhotos((prev) => [...prev, ...next].slice(0, 5))
    setUploadedEvidenceIds(null)
    event.target.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return next
    })
    setUploadedEvidenceIds(null)
  }

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (isSubmitting) return
    if (!canSubmit || !selectedRecoleccion || !selectedViveroId || !unidadMedida) {
      setShowErrors(true)
      return
    }

    try {
      setSubmitError(null)
      setShowErrors(false)

      let evidenceIds = uploadedEvidenceIds
      if (!evidenceIds || evidenceIds.length === 0) {
        setSubmitPhase('uploading')
        const uploadResponse = await LotesViveroService.uploadEvidenciasPendientes(
          {
            fotos: photos.map((p) => p.file),
            titulo: 'Inicio de lote vivero',
            descripcion: observaciones.trim() || 'Evidencia de inicio del lote',
            metadata: { fuente: 'pwa-r3foresta', modulo: 'vivero', etapa: 'INICIO' },
            tomado_en: new Date().toISOString(),
          },
          authId,
        )

        if (!uploadResponse.evidencia_ids.length) {
          throw new Error('No se recibieron IDs de evidencia para crear el lote.')
        }

        evidenceIds = uploadResponse.evidencia_ids
        setUploadedEvidenceIds(uploadResponse.evidencia_ids)
      }

      setSubmitPhase('creating')
      const createResponse = await LotesViveroService.createLote(
        {
          recoleccion_id: selectedRecoleccion.id,
          vivero_id: selectedViveroId,
          fecha_inicio: fechaInicioCheck.normalized,
          fecha_evento: fechaInicioCheck.normalized,
          cantidad_inicial_en_proceso: cantidadValue,
          unidad_medida_inicial: unidadMedida,
          evidencia_ids: evidenceIds,
          observaciones: observaciones.trim() || undefined,
        },
        authId,
      )

      navigate(`/app/vivero/${createResponse.data.lote_vivero_id}`)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al registrar el lote.')
    } finally {
      setSubmitPhase('idle')
    }
  }

  const pendingCount = steps.filter((s) => !s.done).length
  const ctaLabel =
    submitPhase === 'uploading'
      ? 'Subiendo evidencias…'
      : submitPhase === 'creating'
        ? 'Creando lote…'
        : canSubmit
          ? 'Registrar inicio de lote'
          : 'Completa los pasos pendientes'

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <ProgressHeader steps={steps} onBack={() => navigate('/app/vivero')} />

      <form
        id="vivero-new-form"
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pb-[230px] pt-2"
      >
        {/* PASO 1 — FECHA */}
        <SectionCard
          index={1}
          total={5}
          status={stepStatus(0)}
          icon="date"
          title="Fecha de inicio"
          hint={`Entre ${formatShortDate(fechaRange.min)} y ${formatShortDate(fechaRange.max)}.`}
        >
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 transition ${
              showErrors && validation.fecha
                ? 'border-red-300 bg-red-50'
                : 'border-brand-100 bg-brand-50'
            }`}
          >
            <Icon name="date" className="h-5 w-5 shrink-0 text-brand-500" />
            <input
              type="date"
              value={fechaInicio}
              min={fechaRange.min}
              max={fechaRange.max}
              onChange={(event) => setFechaInicio(event.target.value)}
              className="w-full border-none bg-transparent py-3.5 text-base font-bold text-brand-700 outline-none"
            />
          </div>
          {showErrors && validation.fecha && (
            <p className="mt-2 text-xs font-semibold text-red-500">
              Selecciona una fecha en el rango permitido.
            </p>
          )}
        </SectionCard>

        {/* PASO 2 — VIVERO */}
        <SectionCard
          index={2}
          total={5}
          status={stepStatus(1)}
          icon="vivero"
          title="Vivero operativo"
          hint="Dónde se siembra este lote."
        >
          {viveroLoading ? (
            <p className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
              Cargando viveros…
            </p>
          ) : viveroError ? (
            <p className="rounded-2xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-600">
              {viveroError}
            </p>
          ) : viveroSeleccionado ? (
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-brand-50 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-extrabold text-brand-700">
                  {viveroSeleccionado.nombre}
                </p>
                <p className="text-xs font-semibold text-brand-500">
                  {viveroSeleccionado.codigo}
                </p>
                <div className="flex items-start gap-1.5 text-xs font-semibold text-brand-600">
                  <Icon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">
                    {getUbicacionDisplay(viveroSeleccionado.ubicacion)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectVivero(null)}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <select
                  value={selectedViveroId ?? ''}
                  onChange={(event) =>
                    handleSelectVivero(event.target.value ? Number(event.target.value) : null)
                  }
                  className={`w-full appearance-none rounded-2xl border px-4 py-3 pr-10 text-sm font-semibold outline-none transition ${
                    showErrors && validation.vivero
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-brand-100 bg-white text-brand-700 focus:border-brand-300'
                  }`}
                >
                  <option value="">Elige un vivero…</option>
                  {viveros.map((vivero) => (
                    <option key={vivero.id} value={vivero.id}>
                      {vivero.nombre} · {vivero.codigo}
                    </option>
                  ))}
                </select>
                <Icon
                  name="chevron-down"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500"
                />
              </div>
              {showErrors && validation.vivero && (
                <p className="text-xs font-semibold text-red-500">
                  Selecciona un vivero para continuar.
                </p>
              )}
            </div>
          )}
        </SectionCard>

        {/* PASO 3 — RECOLECCIÓN */}
        <SectionCard
          index={3}
          total={5}
          status={stepStatus(2)}
          icon="leaf"
          title="Recolección origen"
          hint="Origen validado con saldo disponible."
          badge={
            selectedRecoleccion && !pickingRecoleccion ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
                Lista
              </span>
            ) : undefined
          }
        >
          {!selectedViveroId ? (
            <p className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
              Primero elige un vivero para listar sus recolecciones.
            </p>
          ) : recoleccionLoading ? (
            <p className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
              Cargando recolecciones…
            </p>
          ) : recoleccionError ? (
            <p className="rounded-2xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-600">
              {recoleccionError}
            </p>
          ) : selectedRecoleccion && !pickingRecoleccion && unidadMedida ? (
            <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-extrabold text-emerald-900">
                    {getRecoleccionLabel(selectedRecoleccion)}
                  </p>
                  <p className="text-xs font-semibold text-emerald-700">
                    #{selectedRecoleccion.codigo_trazabilidad} · {formatDate(selectedRecoleccion.fecha)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearRecoleccion}
                  className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
                >
                  Quitar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-emerald-100">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
                    Saldo
                  </p>
                  <p className="mt-1 text-base font-extrabold text-brand-700">
                    {saldoDisponible !== null
                      ? `${formatCantidad(saldoDisponible, unidadMedida)} ${unidadMedida}`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-emerald-100">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
                    Tipo
                  </p>
                  <p className="mt-1 text-base font-extrabold text-brand-700">
                    {selectedRecoleccion.tipo_material}
                  </p>
                </div>
              </div>
            </div>
          ) : recoleccionesDisponibles.length === 0 ? (
            <p className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
              No hay recolecciones con saldo disponible en este vivero.
            </p>
          ) : (
            <div className="space-y-2">
              {recoleccionesDisponibles.map((item) => {
                const isSelected = selectedRecoleccionId === item.id
                const unidadItem = isUnidadMedidaVivero(item.unidad_canonica)
                  ? item.unidad_canonica
                  : null
                const saldoItem =
                  typeof item.saldo_actual === 'number' && unidadItem
                    ? `${formatCantidad(item.saldo_actual, unidadItem)} ${unidadItem}`
                    : '—'

                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-soft'
                        : 'border-brand-100 bg-white text-brand-700 hover:border-brand-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recoleccion_id"
                      checked={isSelected}
                      onChange={() => handleSelectRecoleccion(item.id)}
                      className="mt-1 h-4 w-4 border-brand-200 text-emerald-600 focus:ring-emerald-200"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-extrabold">
                          {getRecoleccionLabel(item)}
                        </p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-brand-600 ring-1 ring-brand-100">
                          #{item.codigo_trazabilidad}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-brand-500">
                        {formatDate(item.fecha)} · Saldo {saldoItem}
                      </p>
                      <p className="text-[11px] font-semibold text-brand-400">
                        {item.tipo_material} · {item.estado_registro ?? 'N/D'} /{' '}
                        {item.estado_operativo ?? 'N/D'}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {showErrors && validation.recoleccion && (
            <p className="mt-2 text-xs font-semibold text-red-500">
              Selecciona una recolección para continuar.
            </p>
          )}
        </SectionCard>

        {/* PASO 4 — CANTIDAD */}
        <SectionCard
          index={4}
          total={5}
          status={stepStatus(3)}
          icon="balance"
          title="Cantidad inicial"
          badge={
            unidadMedida ? (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">
                {unidadMedida}
              </span>
            ) : undefined
          }
        >
          {!unidadMedida || saldoDisponible === null ? (
            <p className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
              Selecciona una recolección para habilitar la captura.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-brand-100">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
                      Cantidad
                    </p>
                    <input
                      type="text"
                      inputMode={unidadMedida === 'UNIDAD' ? 'numeric' : 'decimal'}
                      value={cantidadInicio}
                      onChange={(event) => handleCantidadChange(event.target.value)}
                      onBlur={handleCantidadBlur}
                      placeholder={unidadMedida === 'G' ? '0.0' : '0'}
                      disabled={isSubmitting}
                      className="mt-1 w-full border-none bg-transparent text-4xl font-extrabold text-brand-700 outline-none placeholder:text-brand-200 disabled:opacity-50"
                    />
                  </div>
                  <span className="pb-2 text-base font-extrabold text-brand-500">
                    {unidadMedida}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-brand-500">
                  {unidadMedida === 'UNIDAD' ? 'Solo enteros.' : 'Máximo 1 decimal.'}
                </p>
              </div>

              <SaldoMeter
                saldo={saldoDisponible}
                cantidad={Number.isFinite(cantidadValue) ? cantidadValue : 0}
                unidad={unidadMedida}
              />

              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-500">
                  Atajos rápidos
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_PERCENTAGES.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyQuickPercentage(pct)}
                      disabled={isSubmitting}
                      className="rounded-2xl bg-white py-2.5 text-sm font-extrabold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {showErrors && validation.cantidad && (
                <p className="text-xs font-semibold text-red-500">
                  {cantidadValidation.message ?? 'Cantidad inválida.'}
                </p>
              )}
            </div>
          )}
        </SectionCard>

        {/* PASO 5 — EVIDENCIA */}
        <SectionCard
          index={5}
          total={5}
          status={stepStatus(4)}
          icon="photo"
          title="Evidencia obligatoria"
          hint="Adjunta entre 1 y 5 fotos del inicio del lote."
          badge={
            photos.length > 0 ? (
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                  photos.length >= 1 && photos.length <= 5
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {photos.length}/5
              </span>
            ) : undefined
          }
        >
          {photos.length === 0 ? (
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/60 px-4 py-5 text-center text-brand-700 transition hover:border-brand-300 hover:bg-brand-50">
              <Icon name="photo" className="h-7 w-7" />
              <span className="text-sm font-extrabold">Agregar fotos</span>
              <span className="text-[11px] font-semibold text-brand-500">
                JPG o PNG · hasta 5 archivos
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
              {photos.map((photo, index) => (
                <div
                  key={photo.previewUrl}
                  className="relative h-24 w-24 shrink-0 snap-start overflow-hidden rounded-2xl ring-1 ring-black/5"
                >
                  <img
                    src={photo.previewUrl}
                    alt={photo.file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-2 ring-white transition hover:bg-red-600"
                    aria-label="Quitar foto"
                  >
                    <Icon name="x" className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/60 text-brand-600 transition hover:border-brand-300 hover:bg-brand-50">
                  <Icon name="plus" className="h-6 w-6" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    Añadir
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {showErrors && validation.fotos && (
            <p className="mt-2 text-xs font-semibold text-red-500">
              Debes cargar entre 1 y 5 fotos para crear el lote.
            </p>
          )}

          {uploadedEvidenceIds && uploadedEvidenceIds.length > 0 && (
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
              <Icon name="check" className="h-3.5 w-3.5" />
              <span>Evidencias subidas. Listas para guardar.</span>
            </div>
          )}
        </SectionCard>

        {/* OBSERVACIONES (opcional, fuera del flujo principal) */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <Icon name="report" className="h-4 w-4 text-brand-500" />
            <p className="text-sm font-extrabold text-brand-700">Observaciones</p>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-brand-400">
              Opcional
            </span>
          </div>
          <textarea
            value={observaciones}
            onChange={(event) => setObservaciones(event.target.value.slice(0, 500))}
            placeholder="Notas adicionales del inicio del lote…"
            rows={3}
            className="mt-3 w-full resize-none rounded-2xl border border-brand-100 bg-white px-3 py-2 text-sm font-semibold text-brand-700 outline-none transition focus:border-brand-300"
          />
          <p className="mt-1 text-right text-[10px] font-semibold text-brand-400">
            {observaciones.length}/500
          </p>
        </section>

        {showErrors && validation.auth && (
          <p className="text-center text-xs font-semibold text-red-500">
            No hay sesión activa. Inicia sesión de nuevo.
          </p>
        )}

        {submitError && (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-600 ring-1 ring-red-200">
            {submitError}
          </p>
        )}
      </form>

      <div className="pointer-events-none fixed inset-x-0 bottom-[112px] z-40 px-5">
        <div className="pointer-events-auto mx-auto w-full max-w-md space-y-2 rounded-3xl bg-white/95 px-4 py-3 shadow-soft ring-1 ring-black/5 backdrop-blur">
          <button
            type="submit"
            form="vivero-new-form"
            aria-disabled={!canSubmit}
            disabled={!canSubmit}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-extrabold text-white shadow-soft transition ${
              canSubmit
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'cursor-not-allowed bg-brand-200 text-white/90'
            }`}
          >
            {isSubmitting ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden
              />
            ) : (
              <Icon name="check" className="h-4 w-4" />
            )}
            <span>{ctaLabel}</span>
          </button>
          {!isSubmitting && pendingCount > 0 && (
            <p className="text-center text-[11px] font-semibold text-brand-500">
              Falta{pendingCount === 1 ? '' : 'n'} {pendingCount} paso
              {pendingCount === 1 ? '' : 's'} por completar.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ViveroNewScreen
