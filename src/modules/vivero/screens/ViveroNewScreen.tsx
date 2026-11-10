import { WebAuthnService } from '../../../services/webauthn.service'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import { canAtVivero, exactId, sameId } from '../../accesos/accessPolicy'
import { useOrigenes } from '../hooks/useOrigenes'
import { esMaterialHabilitado, esOrigenAptoParaInicio, type OrigenMaterial } from '../api/origenes.api'
import EstadoOrigenMaterial from '../components/EstadoOrigenMaterial'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Button } from '../../../components/ui'
import { DECIMALES_GRAMOS_INICIO, MAX_DIAS_VIVERO } from '../../../config/vivero'
import { useAuth } from '../../../contexts/AuthContext'
import { useViveros } from '../../../hooks/useViveros'
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
import PhotoUploader from '../../../components/evidence/PhotoUploader'
import type { Photo } from '../../../components/evidence/PhotoUploader'
import ObservacionesCard from '../components/event/ObservacionesCard'
import ProgressHeader from '../components/event/ProgressHeader'
import QuickPercentages from '../components/event/QuickPercentages'
import SaldoMeter from '../components/event/SaldoMeter'
import SectionCard from '../components/event/SectionCard'
import type { StepStatus } from '../components/event/SectionCard'
import type { TipoMaterialVivero, UnidadMedidaVivero } from '../types/contracts'
import { formatCantidadVivero } from '../utils/format'
import { cantidadMaximaInicio, isValidYmdDate, saldoEnUnidadMinima, validateCantidadInicial } from '../utils/validators'

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

const isUnidadMedidaVivero = (value: string | null | undefined): value is UnidadMedidaVivero =>
  value === 'UNIDAD' || value === 'G'

function normalizeCantidad(value: string): string {
  const texto = value.trim().replace(',', '.')
  return texto.startsWith('.') ? `0${texto}` : texto
}

const getRecoleccionLabel = (item: OrigenMaterial) => item.nombre_comercial_snapshot || item.nombre_cientifico_snapshot || `Recolección #${item.recoleccion_id}`

function ViveroNewScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const catalog = useViveros()
  const { m2 } = useOperationalAccess()
  const viveros = catalog.viveros.filter(item => canAtVivero(m2.status === 'ready' ? m2.data : null, item.id, 'operar'))
  const viveroLoading = catalog.loading, viveroError = catalog.error
  const [selectedViveroId, setSelectedViveroId] = useState<string | null>(null)

  const [originPage, setOriginPage] = useState(1)
  const [originVersion, setOriginVersion] = useState(0)
  const viveroAutorizado = selectedViveroId && viveros.some(vivero => sameId(vivero.id, selectedViveroId))
    ? selectedViveroId : null
  const origins = useOrigenes(user?.id ?? null, viveroAutorizado, originPage, originVersion, true)
  const recolecciones = origins.items, recoleccionLoading = origins.loading, recoleccionError = origins.error
  const [selectedRecoleccionId, setSelectedRecoleccionId] = useState<string | null>(null)
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
  const [confirming, setConfirming] = useState(false)
  const [needsObservation, setNeedsObservation] = useState(false)
  const submissionStarted = useRef(false)
  const mounted = useRef(true)
  const confirmationToken = useRef<string | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const selectedRecoleccion = useMemo(
    () => recolecciones.find((item) => item.recoleccion_id === selectedRecoleccionId && esOrigenAptoParaInicio(item)) ?? null,
    [recolecciones, selectedRecoleccionId],
  )

  const viveroSeleccionado = useMemo(
    () => viveros.find((v) => sameId(v.id, selectedViveroId)),
    [selectedViveroId, viveros],
  )

  const recoleccionesDisponibles = recolecciones.filter(esOrigenAptoParaInicio)
  const recoleccionesPendientes = recolecciones.filter(item => !esOrigenAptoParaInicio(item))

  const unidadMedida = useMemo<UnidadMedidaVivero | null>(() => {
    if (!selectedRecoleccion) return null
    return isUnidadMedidaVivero(selectedRecoleccion.unidad_canonica)
      ? selectedRecoleccion.unidad_canonica
      : null
  }, [selectedRecoleccion])

  const saldoRegistrado = selectedRecoleccion
    ? selectedRecoleccion.saldo_actual_exacto ?? String(selectedRecoleccion.saldo_actual)
    : null
  const saldoDisponible = saldoRegistrado !== null && unidadMedida
    ? saldoEnUnidadMinima(saldoRegistrado, unidadMedida)
    : null

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

  const cantidadValidation =
    selectedRecoleccion && unidadMedida
      ? validateCantidadInicial({
          cantidad: cantidadInicio,
          unidad: unidadMedida,
          recoleccionTipoMaterial: selectedRecoleccion.tipo_material as TipoMaterialVivero,
          maxCantidad: saldoDisponible,
        })
      : { isValid: false, cantidad: null, message: 'Selecciona una recolección válida.' }
  const cantidadValidada = cantidadValidation.cantidad

  const fechaInicioCheck = validateDateInRange(fechaInicio, fechaRange)
  const validation = {
    auth: !authId,
    vivero: !selectedViveroId,
    recoleccion: !selectedRecoleccion,
    cantidad: !cantidadValidation.isValid,
    fecha: !fechaInicioCheck.isValid || !isValidYmdDate(fechaInicioCheck.normalized),
    fotos: photos.length < 1 || photos.length > 5,
  }

  const overSaldo = saldoDisponible !== null && cantidadValidada !== null && cantidadValidada > saldoDisponible

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
    !isSubmitting && !needsObservation

  const handleSelectVivero = (id: string | null) => {
    if (submissionStarted.current) return
    setSelectedViveroId(id)
    setUploadedEvidenceIds(null)
    setOriginPage(1)
    setSelectedRecoleccionId(null)
    setCantidadInicio('')
    setPickingRecoleccion(true)
  }

  const handleSelectRecoleccion = (id: string) => {
    if (submissionStarted.current) return
    setSelectedRecoleccionId(id)
    setCantidadInicio('')
    setPickingRecoleccion(false)
  }

  const handleClearRecoleccion = () => {
    if (submissionStarted.current) return
    setSelectedRecoleccionId(null)
    setCantidadInicio('')
    setPickingRecoleccion(true)
  }

  const handleCantidadBlur = () => {
    if (unidadMedida === 'G' && cantidadInicio.endsWith('.')) {
      setCantidadInicio(cantidadInicio.slice(0, -1))
    }
  }

  const applyQuickPercentage = (pct: number) => {
    if (!unidadMedida || saldoDisponible === null || saldoDisponible <= 0n) return
    const proporcion = (saldoDisponible * BigInt(pct) + 50n) / 100n
    const maximo = cantidadMaximaInicio(unidadMedida)
    const sugerida = proporcion > maximo ? maximo : proporcion
    setCantidadInicio(formatCantidadVivero(sugerida > 0n ? sugerida : 1n, unidadMedida))
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

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (isSubmitting || confirming) return
    if (!canSubmit || !selectedRecoleccion || !selectedViveroId || !unidadMedida) {
      setShowErrors(true)
      return
    }

    confirmationToken.current = WebAuthnService.getToken()
    if (!confirmationToken.current) { setSubmitError('Recupera tu sesión antes de confirmar el inicio.'); return }
    setSubmitError(null)
    setShowErrors(false)
    setConfirming(true)
  }

  const runSubmit = async () => {
    if (
      submissionStarted.current ||
      !confirming ||
      !canSubmit ||
      !selectedRecoleccion ||
      !selectedViveroId ||
      !unidadMedida ||
      cantidadValidada === null
    ) return
    const current = () => mounted.current && WebAuthnService.getToken() === confirmationToken.current
    if (!current()) return
    submissionStarted.current = true
    let creating = false
    setConfirming(false)

    try {
      setSubmitError(null)
      setShowErrors(false)

      let evidenceIds = uploadedEvidenceIds
      if (!evidenceIds || evidenceIds.length === 0) {
        setSubmitPhase('uploading')
        const uploadResponse = await LotesViveroService.uploadEvidenciasPendientes(
          {
            vivero_id: selectedViveroId,
            fotos: photos.map((p) => p.file),
            titulo: 'Inicio de lote vivero',
            descripcion: observaciones.trim() || 'Evidencia de inicio del lote',
            metadata: { fuente: 'pwa-r3foresta', modulo: 'vivero', etapa: 'INICIO' },
            tomado_en: new Date().toISOString(),
          },
          authId,
        )

        if (!current()) return
        if (!uploadResponse.evidencia_ids.length) {
          throw new Error('No se recibieron IDs de evidencia para crear el lote.')
        }

        evidenceIds = uploadResponse.evidencia_ids
        setUploadedEvidenceIds(uploadResponse.evidencia_ids)
      }

      if (!current()) return
      setSubmitPhase('creating')
      creating = true
      const createResponse = await LotesViveroService.createLote(
        {
          recoleccion_id: selectedRecoleccion.recoleccion_id,
          vivero_id: selectedViveroId,
          fecha_inicio: fechaInicioCheck.normalized,
          fecha_evento: fechaInicioCheck.normalized,
          cantidad_inicial_en_proceso: formatCantidadVivero(cantidadValidada, unidadMedida),
          unidad_medida_inicial: unidadMedida,
          evidencia_ids: evidenceIds,
          observaciones: observaciones.trim() || undefined,
        },
        authId,
      )

      if (!current()) return
      navigate(`/app/vivero/${exactId(createResponse.data.lote_vivero_id)}`, { replace: true })
    } catch (error) {
      if (!current()) return
      if (creating) setNeedsObservation(true)
      setSubmitError(error instanceof Error ? error.message : 'Error al registrar el lote.')
    } finally {
      submissionStarted.current = false
      if (current()) setSubmitPhase('idle')
    }
  }

  const pendingCount = steps.filter((s) => !s.done).length
  const submittingLabel =
    submitPhase === 'uploading' ? 'Subiendo evidencias…' : 'Creando lote…'

  return (
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <ProgressHeader
        steps={steps}
        onBack={() => navigate('/app/vivero')}
        eyebrow="Nuevo lote · vivero"
        title="Inicio de lote"
      />

      {needsObservation && <div role="alert" className="mx-auto max-w-md space-y-2 p-5 text-sm"><p>El alta no quedó confirmada. Consulta los lotes antes de volver a iniciar: la operación puede haberse guardado.</p><Button onClick={() => navigate('/app/vivero')}>Consultar lotes actuales</Button></div>}
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
            <p className="rounded-2xl bg-danger-50 px-3 py-3 text-sm font-semibold text-danger-600">
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
              <Button variant="secondary" size="sm" disabled={isSubmitting} onClick={() => handleSelectVivero(null)}>
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <select
                  value={selectedViveroId ?? ''}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    handleSelectVivero(event.target.value ? exactId(event.target.value) : null)
                  }
                  className={`w-full appearance-none rounded-2xl border px-4 py-3 pr-10 text-sm font-semibold outline-none transition ${
                    showErrors && validation.vivero
                      ? 'border-danger-300 bg-danger-50 text-danger-700'
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
                <p className="text-xs font-semibold text-danger-500">
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
          hint="Elige un origen con saldo habilitado para iniciar el lote."
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
          ) : !viveroAutorizado ? (
            <p className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
              No se pudo comprobar tu acceso a este vivero.
            </p>
          ) : recoleccionLoading ? (
            <p className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
              Cargando recolecciones…
            </p>
          ) : recoleccionError ? (
            <div className="space-y-2 rounded-2xl bg-danger-50 px-3 py-3 text-sm font-semibold text-danger-600">
              <p role="alert">{recoleccionError}</p>
              <Button type="button" variant="secondary" onClick={() => setOriginVersion(value => value + 1)}>Reintentar orígenes</Button>
            </div>
          ) : selectedRecoleccion && !pickingRecoleccion && unidadMedida ? (
            <div className="space-y-3 rounded-2xl border border-success-200 bg-success-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-extrabold text-success-900">
                    {getRecoleccionLabel(selectedRecoleccion)}
                  </p>
                  <p className="text-xs font-semibold text-success-700">
                    #{selectedRecoleccion.codigo_trazabilidad?.trim() || selectedRecoleccion.recoleccion_id} · {formatDate(selectedRecoleccion.fecha)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting} onClick={handleClearRecoleccion}
                  className="rounded-full bg-white px-3 py-1 text-xs font-bold text-danger-600 ring-1 ring-danger-200 transition hover:bg-danger-50"
                >
                  Quitar
                </button>
              </div>
              <EstadoOrigenMaterial origen={selectedRecoleccion} />
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-success-100">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
                    Saldo
                  </p>
                  <p className="mt-1 text-base font-extrabold text-brand-700">
                    {saldoRegistrado !== null
                      ? `${saldoRegistrado} ${formatUnidadCanonicaDisplay(unidadMedida, Number(saldoRegistrado))}`
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
          ) : (
            <div className="space-y-3">
              {origins.pagination?.total === 0 && (
                <p className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
                  No hay recolecciones validadas con saldo en este vivero.
                </p>
              )}
              {recoleccionesDisponibles.length > 0 && <h3 className="text-sm font-bold text-brand-700">Material disponible para iniciar lote</h3>}
              {recoleccionesDisponibles.map((item) => {
                const isSelected = selectedRecoleccionId === item.recoleccion_id
                const unidadItem = isUnidadMedidaVivero(item.unidad_canonica)
                  ? item.unidad_canonica
                  : null
                const saldoItem = unidadItem
                  ? `${item.saldo_actual_exacto ?? item.saldo_actual} ${formatUnidadCanonicaDisplay(unidadItem, item.saldo_actual)}`
                  : '—'

                return (
                  <label
                    key={item.recoleccion_id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      isSelected
                        ? 'border-success-300 bg-success-50 text-success-900 shadow-soft'
                        : 'border-brand-100 bg-white text-brand-700 hover:border-brand-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recoleccion_id"
                      disabled={isSubmitting}
                      checked={isSelected}
                      onChange={() => handleSelectRecoleccion(item.recoleccion_id)}
                      className="mt-1 h-4 w-4 border-brand-200 text-success-600 focus:ring-success-200"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-extrabold">
                          {getRecoleccionLabel(item)}
                        </p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-brand-600 ring-1 ring-brand-100">
                          #{item.codigo_trazabilidad?.trim() || item.recoleccion_id}
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
              {recoleccionesPendientes.length > 0 && (
                <section aria-label="Orígenes bloqueados para INICIO" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <h3 className="text-sm font-bold text-amber-900">Material que aún no puede iniciar un lote</h3>
                  {recoleccionesPendientes.map(item => (
                    <div key={item.recoleccion_id} className="space-y-1 rounded-xl bg-white p-3 text-sm">
                      <p className="font-semibold">{getRecoleccionLabel(item)} · #{item.codigo_trazabilidad?.trim() || item.recoleccion_id}</p>
                      <p>Saldo registrado: {item.saldo_actual_exacto ?? item.saldo_actual} {item.unidad_canonica}</p>
                      <EstadoOrigenMaterial origen={item} />
                      {esMaterialHabilitado(item) && <p>{item.motivo_no_inicio ?? 'No se pudieron comprobar los requisitos de INICIO.'}</p>}
                    </div>
                  ))}
                </section>
              )}
              {origins.pagination && origins.pagination.total > 0 && recolecciones.length === 0 && (
                <p className="text-sm">La página quedó vacía. Vuelve a la página anterior para consultar el saldo actual.</p>
              )}
            </div>
          )}

          {showErrors && validation.recoleccion && (
            <p className="mt-2 text-xs font-semibold text-danger-500">
              Selecciona una recolección para continuar.
            </p>
          )}
          {origins.pagination && !selectedRecoleccion && <div className="mt-3 flex items-center justify-between gap-2 text-sm"><Button variant="secondary" disabled={originPage === 1} onClick={() => setOriginPage(value => value - 1)}>Anterior</Button><span>Página {originPage}</span><Button variant="secondary" disabled={originPage * 20 >= origins.pagination.total} onClick={() => setOriginPage(value => value + 1)}>Siguiente</Button></div>}
        </SectionCard>

        {/* PASO 4 — CANTIDAD */}
        <SectionCard
          index={4}
          total={5}
          status={stepStatus(3)}
          icon="balance"
          title="Cantidad inicial"
        >
          {!unidadMedida || saldoRegistrado === null || saldoDisponible === null ? (
            <p className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
              Selecciona una recolección para habilitar la captura.
            </p>
          ) : (
            <div className="space-y-4">
              <CantidadInputCard
                value={cantidadInicio}
                onChange={value => setCantidadInicio(normalizeCantidad(value))}
                onBlur={handleCantidadBlur}
                unidadDisplay={formatUnidadCanonicaDisplay(unidadMedida)}
                label="Cantidad inicial en proceso"
                inputMode={unidadMedida === 'UNIDAD' ? 'numeric' : 'decimal'}
                placeholder={unidadMedida === 'G' ? '0.0' : '0'}
                hint={unidadMedida === 'UNIDAD' ? 'Solo enteros.' : `Hasta ${DECIMALES_GRAMOS_INICIO} decimales.`}
                disabled={isSubmitting}
              />

              <SaldoMeter
                saldo={saldoDisponible}
                saldoRegistrado={saldoRegistrado}
                cantidad={cantidadValidada ?? 0n}
                unidad={unidadMedida}
              />

              {overSaldo && (
                <div className="flex items-start gap-2 rounded-2xl bg-danger-50 px-3 py-2.5 text-xs font-bold text-danger-700 ring-1 ring-danger-200">
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    La cantidad supera el saldo disponible (
                    {saldoRegistrado}{' '}
                    {formatUnidadCanonicaDisplay(unidadMedida, Number(saldoRegistrado))}). Ajustá el valor
                    para continuar.
                  </span>
                </div>
              )}

              <QuickPercentages
                percentages={QUICK_PERCENTAGES}
                onApply={applyQuickPercentage}
                disabled={isSubmitting}
              />

              {(showErrors || cantidadInicio.length > 0) && validation.cantidad && !overSaldo && (
                <p className="text-xs font-semibold text-danger-500">
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
                    : 'bg-danger-100 text-danger-700'
                }`}
              >
                {photos.length}/5
              </span>
            ) : undefined
          }
        >
          <PhotoUploader
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
          <p className="text-center text-xs font-semibold text-danger-500">
            No hay sesión activa. Inicia sesión de nuevo.
          </p>
        )}

        {submitError && (
          <p className="rounded-2xl bg-danger-50 px-3 py-2 text-center text-xs font-semibold text-danger-600 ring-1 ring-danger-200">
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

      <ConfirmDialog
        open={confirming}
        title="Confirmar inicio de lote"
        description="Revisá el origen y el material que entrará en proceso. El registro será definitivo."
        confirmLabel="Crear lote e iniciar"
        onConfirm={runSubmit}
        onCancel={() => setConfirming(false)}
      >
        <dl className="mt-4 max-h-[45vh] space-y-2 overflow-y-auto rounded-2xl bg-brand-50 px-4 py-3 text-sm ring-1 ring-brand-100">
          {[
            ['Recolección origen', selectedRecoleccion?.codigo_trazabilidad?.trim() || selectedRecoleccion?.recoleccion_id || '—'],
            ['Vivero', viveroSeleccionado?.nombre ?? '—'],
            ['Evento', 'INICIO'],
            ['Cantidad y unidad', `${cantidadInicio} ${unidadMedida ?? ''}`],
            ['Fecha', fechaInicioCheck.normalized],
            ['Responsable del registro', [user?.nombre, user?.apellido].filter(Boolean).join(' ') || authId],
            ['Evidencia', `${photos.length} foto${photos.length === 1 ? '' : 's'}`],
            ['Efecto esperado', 'Consume material de Recolección y crea material en proceso; aún no registra plantas vivas.'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="shrink-0 font-semibold text-brand-500">{label}</dt>
              <dd className="text-right font-bold text-brand-700">{value}</dd>
            </div>
          ))}
        </dl>
      </ConfirmDialog>
    </div>
  )
}

export default ViveroNewScreen
