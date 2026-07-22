import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import { MAX_DIAS_VIVERO } from '../../../config/vivero'
import { useAuth } from '../../../contexts/AuthContext'
import { useViveros } from '../../../hooks/useViveros'
import type { Recoleccion } from '../../../services/recolecciones.service'
import { RecoleccionesService } from '../../../services/recolecciones.service'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { formatUnidadCanonicaDisplay } from '../../../utils/recoleccionUnidad'
import { getUbicacionDisplay } from '../../../utils/ubicacion'
import {
  buildPastRange,
  clampDateToRange,
  todayLocalISO,
  validateDateInRange,
} from '../../../utils/validations/date'
import CantidadInputCard from '../components/event/CantidadInputCard'
import FechaCard from '../components/event/FechaCard'
import FotosUploader from '../components/event/FotosUploader'
import type { Photo } from '../components/event/FotosUploader'
import ObservacionesCard from '../components/event/ObservacionesCard'
import ProgressHeader from '../components/event/ProgressHeader'
import QuickPercentages from '../components/event/QuickPercentages'
import SaldoMeter from '../components/event/SaldoMeter'
import SectionCard from '../components/event/SectionCard'
import type { StepStatus } from '../components/event/SectionCard'
import type { TipoMaterialVivero, UnidadMedidaVivero } from '../types/contracts'
import { formatCantidadVivero } from '../utils/format'
import { isValidYmdDate, validateCantidadInicial } from '../utils/validators'

type UploadPhase = 'idle' | 'uploading' | 'creating'

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
    return formatCantidadVivero(Math.min(saldo, Math.max(1, rounded)), unidad)
  }
  const rounded = Math.round(raw * 10) / 10
  const normalized = rounded > 0 ? rounded : 0.1
  return formatCantidadVivero(Math.min(saldo, normalized), unidad)
}

const getRecoleccionLabel = (item: Recoleccion) =>
  item.nombre_comercial ||
  item.nombre_comun_principal ||
  item.planta?.nombre_comun_principal ||
  item.planta?.especie ||
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
    clampDateToRange(todayLocalISO(), fechaRange)
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

  const overSaldo =
    unidadMedida !== null &&
    saldoDisponible !== null &&
    Number.isFinite(cantidadValue) &&
    cantidadValue > saldoDisponible

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

  const addPhotos = (files: File[]) => {
    const next = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setPhotos((prev) => [...prev, ...next].slice(0, 5))
    setUploadedEvidenceIds(null)
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

      navigate(`/app/vivero/${createResponse.data.lote_vivero_id}`, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al registrar el lote.')
    } finally {
      setSubmitPhase('idle')
    }
  }

  const pendingCount = steps.filter((s) => !s.done).length
  const submittingLabel =
    submitPhase === 'uploading' ? 'Subiendo evidencias…' : 'Creando lote…'

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <ProgressHeader
        steps={steps}
        onBack={() => navigate('/app/vivero')}
        eyebrow="Nuevo lote · vivero"
        title="Inicio de lote"
      />

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
          <FechaCard
            headerless
            value={fechaInicio}
            onChange={setFechaInicio}
            min={fechaRange.min}
            max={fechaRange.max}
            showError={showErrors && validation.fecha}
            errorMessage="Selecciona una fecha en el rango permitido."
            disabled={isSubmitting}
          />
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
              <Button variant="secondary" size="sm" onClick={() => handleSelectVivero(null)}>
                Cambiar
              </Button>
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
              <span className="rounded-full bg-success-100 px-3 py-1 text-[11px] font-bold text-success-700">
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
            <div className="space-y-3 rounded-2xl border border-success-200 bg-success-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-extrabold text-success-900">
                    {getRecoleccionLabel(selectedRecoleccion)}
                  </p>
                  <p className="text-xs font-semibold text-success-700">
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
                <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-success-100">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
                    Saldo
                  </p>
                  <p className="mt-1 text-base font-extrabold text-brand-700">
                    {saldoDisponible !== null
                      ? `${formatCantidadVivero(saldoDisponible, unidadMedida)} ${formatUnidadCanonicaDisplay(unidadMedida, saldoDisponible)}`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-success-100">
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
                    ? `${formatCantidadVivero(item.saldo_actual, unidadItem)} ${formatUnidadCanonicaDisplay(unidadItem, item.saldo_actual)}`
                    : '—'

                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      isSelected
                        ? 'border-success-300 bg-success-50 text-success-900 shadow-soft'
                        : 'border-brand-100 bg-white text-brand-700 hover:border-brand-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recoleccion_id"
                      checked={isSelected}
                      onChange={() => handleSelectRecoleccion(item.id)}
                      className="mt-1 h-4 w-4 border-brand-200 text-success-600 focus:ring-success-200"
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
        >
          {!unidadMedida || saldoDisponible === null ? (
            <p className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
              Selecciona una recolección para habilitar la captura.
            </p>
          ) : (
            <div className="space-y-4">
              <CantidadInputCard
                value={cantidadInicio}
                onChange={handleCantidadChange}
                onBlur={handleCantidadBlur}
                unidadDisplay={formatUnidadCanonicaDisplay(unidadMedida)}
                label="Cantidad inicial en proceso"
                inputMode={unidadMedida === 'UNIDAD' ? 'numeric' : 'decimal'}
                placeholder={unidadMedida === 'G' ? '0.0' : '0'}
                hint={unidadMedida === 'UNIDAD' ? 'Solo enteros.' : 'Máximo 1 decimal.'}
                disabled={isSubmitting}
              />

              <SaldoMeter
                saldo={saldoDisponible}
                cantidad={Number.isFinite(cantidadValue) ? cantidadValue : 0}
                unidad={unidadMedida}
              />

              {overSaldo && (
                <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    La cantidad supera el saldo disponible (
                    {formatCantidadVivero(saldoDisponible, unidadMedida)}{' '}
                    {formatUnidadCanonicaDisplay(unidadMedida, saldoDisponible)}). Ajustá el valor
                    para continuar.
                  </span>
                </div>
              )}

              <QuickPercentages
                percentages={QUICK_PERCENTAGES}
                onApply={applyQuickPercentage}
                disabled={isSubmitting}
              />

              {showErrors && validation.cantidad && !overSaldo && (
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
                    ? 'bg-success-100 text-success-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {photos.length}/5
              </span>
            ) : undefined
          }
        >
          <FotosUploader
            headerless
            photos={photos}
            onAdd={addPhotos}
            onRemove={removePhoto}
            showError={showErrors && validation.fotos}
            errorMessage="Debes cargar entre 1 y 5 fotos para crear el lote."
            disabled={isSubmitting}
          />

          {uploadedEvidenceIds && uploadedEvidenceIds.length > 0 && (
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-success-50 px-3 py-2 text-xs font-bold text-success-700 ring-1 ring-success-100">
              <Icon name="check" className="h-3.5 w-3.5" />
              <span>Evidencias subidas. Listas para guardar.</span>
            </div>
          )}
        </SectionCard>

        {/* OBSERVACIONES (opcional, fuera del flujo principal) */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <ObservacionesCard
            value={observaciones}
            onChange={setObservaciones}
            maxLength={500}
            placeholder="Notas adicionales del inicio del lote…"
            disabled={isSubmitting}
          />
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
          {canSubmit || isSubmitting ? (
            /* CTA de envío a medida (barra fija; variante success no provista por
               <Button>): se mantiene nativa con type="submit" explícito. (gotcha §6.5) */
            <button
              type="submit"
              form="vivero-new-form"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success-600 px-4 py-3.5 text-base font-extrabold text-white shadow-soft transition hover:bg-success-700 disabled:cursor-progress disabled:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden
                  />
                  <span>{submittingLabel}</span>
                </>
              ) : (
                <>
                  <Icon name="check" className="h-4 w-4" />
                  <span>Registrar inicio de lote</span>
                </>
              )}
            </button>
          ) : null}
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
