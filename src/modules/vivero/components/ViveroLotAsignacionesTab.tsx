import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import {
  LotesViveroService,
  type AsignacionViveroResumen,
} from '../../../services/lotes-vivero.service'
import { PlantacionService } from '../../../services/plantacion.service'
import type { Campania, Subcampania } from '../../plantacion/types/contracts'
import type {
  DevolverAsignacionViveroResponseData,
  PropositoAsignacionVivero,
} from '../types/contracts'
import type { ViveroLotDetailView } from '../types/view-models'
import { todayLocalISO } from '../../../utils/validations/date'
import CantidadStepper from './event/CantidadStepper'
import FechaCard from './event/FechaCard'
import FotosUploader, { type Photo } from './event/FotosUploader'
import {
  DISPATCH_FLOW_DESCRIPTION,
  DISPATCH_FLOW_LABEL,
  getDispatchFlowStatus,
} from '../utils/dispatchFlow'

type Props = {
  lote: ViveroLotDetailView
  /**
   * Se llama tras una entrega exitosa para que el padre refresque el detalle
   * del lote (saldo vivo baja, y puede quedar FINALIZADO por entrega total).
   */
  onLoteChanged?: () => void
}

type AsignacionSuccess = {
  destino: string
  cantidad: number
  proposito: string
  loteFinalizado: boolean
}

type DevolucionSuccess = {
  destino: string
  cantidad: number
  loteReabierto: boolean
}

// Motivos frecuentes de devolucion (chips de acceso rapido). El texto sigue
// siendo editable para casos particulares.
const MOTIVOS_DEVOLUCION = [
  'Excedente no plantado',
  'Subcampania cancelada',
  'Error en la cantidad entregada',
  'Plantas devueltas por la subcampania',
]

const DEVOLUCION_FORM_ID = 'vivero-devolucion-form'

const PROPOSITOS: Array<{
  key: PropositoAsignacionVivero
  label: string
  hint: string
  tone: string
}> = [
  {
    key: 'PLANTACION_INICIAL',
    label: 'Inicial',
    hint: 'Entrega para plantar y avanzar la meta.',
    tone: 'emerald',
  },
  {
    key: 'REPOSICION',
    label: 'Reposicion',
    hint: 'Entrega para reemplazar arboles perdidos.',
    tone: 'amber',
  },
]

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'Sin fecha'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function numberOrZero(value?: number | null) {
  return Number.isFinite(value) ? Number(value) : 0
}

function sortAsignacionesNewestFirst(items: AsignacionViveroResumen[]) {
  return [...items].sort((a, b) => {
    const dateA = a.fecha_asignacion ? new Date(a.fecha_asignacion).getTime() : 0
    const dateB = b.fecha_asignacion ? new Date(b.fecha_asignacion).getTime() : 0
    if (dateA !== dateB) return dateB - dateA
    return Number(b.id) - Number(a.id)
  })
}

function AssignmentMetric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-2.5 py-2 text-center ring-1 ring-neutral-100">
      <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${danger ? 'text-red-600' : 'text-brand-700'}`}>
        {value}
      </p>
    </div>
  )
}

function AssignmentSuccessDialog({
  success,
  onClose,
}: {
  success: AsignacionSuccess | null
  onClose: () => void
}) {
  if (!success) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-success-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
        <div className="flex flex-col items-center space-y-5 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success-100 text-success-600">
            <Icon name="check" className="h-12 w-12" />
          </div>
          <div>
            <h2 id="assignment-success-title" className="text-2xl font-extrabold text-brand-900">
              Entrega registrada
            </h2>
            <p className="mt-2 text-sm font-semibold leading-snug text-neutral-600">
              Se entregaron las plantas a {success.destino} y bajaron del saldo vivo del lote.
            </p>
            <p className="mt-3 text-lg font-extrabold text-brand-800">
              {success.cantidad} plantas - {success.proposito}
            </p>
            {success.loteFinalizado && (
              <p className="mt-3 rounded-2xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
                Se entrego todo el stock: el lote quedo FINALIZADO.
              </p>
            )}
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={onClose}>
            Entendido
          </Button>
        </div>
      </div>
    </div>
  )
}

function DevolucionSuccessDialog({
  success,
  onClose,
}: {
  success: DevolucionSuccess | null
  onClose: () => void
}) {
  if (!success) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="devolucion-success-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
        <div className="flex flex-col items-center space-y-5 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <Icon name="package" className="h-12 w-12" />
          </div>
          <div>
            <h2 id="devolucion-success-title" className="text-2xl font-extrabold text-brand-900">
              Devolucion registrada
            </h2>
            <p className="mt-2 text-sm font-semibold leading-snug text-neutral-600">
              Se devolvieron las plantas de {success.destino} y volvieron al saldo vivo del lote.
            </p>
            <p className="mt-3 text-lg font-extrabold text-brand-800">
              +{success.cantidad} plantas al vivero
            </p>
            {success.loteReabierto && (
              <p className="mt-3 rounded-2xl bg-success-50 px-3 py-2 text-xs font-bold text-success-700 ring-1 ring-success-100">
                La devolucion reabrio el lote: vuelve a estado ACTIVO.
              </p>
            )}
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={onClose}>
            Entendido
          </Button>
        </div>
      </div>
    </div>
  )
}

function DevolucionDialog({
  asignacion,
  lote,
  authId,
  onClose,
  onDone,
}: {
  asignacion: AsignacionViveroResumen
  lote: ViveroLotDetailView
  authId: string
  onClose: () => void
  onDone: (
    result: DevolverAsignacionViveroResponseData,
    cantidad: number,
    destino: string,
  ) => void
}) {
  const maxDevolver = numberOrZero(asignacion.saldo_asignado_disponible)
  const destino = asignacion.subcampania_nombre || 'la subcampania'
  const today = todayLocalISO()
  const fechaMin =
    (asignacion.fecha_asignacion ? asignacion.fecha_asignacion.split('T')[0] : '') || '2020-01-01'
  const fechaMax = today

  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState(today)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const cantidadNum = Number(cantidad)
  const cantidadValid =
    Number.isFinite(cantidadNum) &&
    Number.isInteger(cantidadNum) &&
    cantidadNum > 0 &&
    cantidadNum <= maxDevolver
  const motivoValid = motivo.trim().length >= 3
  const fechaValid = !!fecha && fecha >= fechaMin && fecha <= fechaMax
  const canSubmit =
    !!authId && !submitting && maxDevolver > 0 && cantidadValid && motivoValid && fechaValid

  const cantidadError = !cantidad
    ? 'Ingresa la cantidad a devolver.'
    : !Number.isFinite(cantidadNum) || cantidadNum <= 0
      ? 'La cantidad debe ser mayor a 0.'
      : !Number.isInteger(cantidadNum)
        ? 'Solo se aceptan enteros.'
        : cantidadNum > maxDevolver
          ? `Max ${maxDevolver} plantas devolvibles.`
          : null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await LotesViveroService.devolverAsignacion(
        lote.id,
        asignacion.id,
        {
          cantidad_devuelta: cantidadNum,
          motivo_devolucion: motivo.trim(),
          fecha_devolucion: fecha,
        },
        authId,
      )
      onDone(result, cantidadNum, destino)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar la devolucion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="devolucion-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:px-4"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-sky-600">
              Devolver al vivero
            </p>
            <h2 id="devolucion-title" className="mt-1 truncate text-lg font-extrabold text-brand-800">
              {destino}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>

        <form
          id={DEVOLUCION_FORM_ID}
          onSubmit={handleSubmit}
          className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
        >
          <div className="flex items-start gap-2 rounded-2xl bg-sky-50 px-3 py-2.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            <span>
              La devolucion sube el saldo vivo del lote. Si el lote estaba FINALIZADO, puede reabrirse.
            </span>
          </div>

          <div className="rounded-2xl bg-neutral-50 px-3 py-2.5 ring-1 ring-neutral-100">
            <p className="text-[9px] font-black uppercase tracking-wider text-neutral-400">
              Disponible para devolver
            </p>
            <p className="mt-0.5 text-xl font-extrabold text-brand-800">{maxDevolver}</p>
          </div>

          <CantidadStepper
            value={cantidad}
            onChange={setCantidad}
            max={maxDevolver}
            min={0}
            label="Plantas a devolver"
            unit="plantas"
            quickPercentages={[25, 50, 100]}
            bigStepSize={maxDevolver >= 50 ? 10 : undefined}
            showError={showErrors && !cantidadValid}
            errorMessage={cantidadError ?? undefined}
            disabled={submitting || maxDevolver <= 0}
          />

          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-brand-500">
              Motivo de la devolucion
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {MOTIVOS_DEVOLUCION.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMotivo(preset)}
                  disabled={submitting}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 transition ${
                    motivo === preset
                      ? 'bg-brand-600 text-white ring-brand-600'
                      : 'bg-white text-brand-700 ring-brand-100 hover:bg-brand-50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value.slice(0, 500))}
              placeholder="Detalla por que se devuelven las plantas..."
              rows={3}
              disabled={submitting}
              className={`w-full resize-none rounded-2xl border px-3 py-2.5 text-sm font-semibold text-brand-700 outline-none transition ${
                showErrors && !motivoValid
                  ? 'border-red-300 bg-red-50'
                  : 'border-brand-100 bg-white focus:border-brand-300'
              }`}
            />
            {showErrors && !motivoValid && (
              <p className="mt-1 text-xs font-semibold text-red-500">Minimo 3 caracteres.</p>
            )}
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
            <FechaCard
              value={fecha}
              onChange={setFecha}
              min={fechaMin}
              max={fechaMax}
              label="Fecha de la devolucion"
              showError={showErrors && !fechaValid}
              errorMessage="Fecha fuera de rango."
              disabled={submitting}
            />
          </div>

          {submitError && (
            <p className="whitespace-pre-line rounded-2xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-600 ring-1 ring-red-200">
              {submitError}
            </p>
          )}
        </form>

        <footer className="grid grid-cols-2 gap-2 border-t border-neutral-100 px-5 pb-5 pt-3">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <button
            type="submit"
            form={DEVOLUCION_FORM_ID}
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-3 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <Icon name="package" className="h-4 w-4" />
            {submitting ? 'Devolviendo...' : 'Devolver al vivero'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function ViveroLotAsignacionesTab({ lote, onLoteChanged }: Props) {
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const [asignaciones, setAsignaciones] = useState<AsignacionViveroResumen[]>([])
  const [campanias, setCampanias] = useState<Campania[]>([])
  const [campaniaId, setCampaniaId] = useState('')
  const [subcampanias, setSubcampanias] = useState<Subcampania[]>([])
  const [subcampaniasLoading, setSubcampaniasLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [subcampaniaId, setSubcampaniaId] = useState('')
  const [proposito, setProposito] = useState<PropositoAsignacionVivero>('PLANTACION_INICIAL')
  const [cantidad, setCantidad] = useState('')
  const [fecha, setFecha] = useState(todayLocalISO())
  const [photos, setPhotos] = useState<Photo[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [assignmentSuccess, setAssignmentSuccess] = useState<AsignacionSuccess | null>(null)
  const [devolucionTarget, setDevolucionTarget] = useState<AsignacionViveroResumen | null>(null)
  const [devolucionSuccess, setDevolucionSuccess] = useState<DevolucionSuccess | null>(null)

  // Modelo fisico: asignar = entregar. El maximo entregable es el saldo vivo
  // actual del lote (ya no existe el calculo "vivo - reservado").
  const saldoVivo = lote.saldoVivoActual ?? 0
  const estadoLote = lote.estadoLote ?? 'ACTIVO'
  const loteActivo = estadoLote === 'ACTIVO'
  const flowStatus = getDispatchFlowStatus(lote)
  const maxAsignable = saldoVivo

  // Entregado a subcampanias (informativo). Preferimos el agregado del backend;
  // si no viene, sumamos lo asignado de las asignaciones activas como respaldo.
  const entregadoLocal = useMemo(
    () => asignaciones.reduce((total, asig) => total + numberOrZero(asig.cantidad_asignada), 0),
    [asignaciones],
  )
  const entregadoSubcampanias = lote.saldoAsignadoSubcampanias ?? entregadoLocal

  const today = todayLocalISO()
  const fechaMin = (lote.fechaInicio ? lote.fechaInicio.split('T')[0] : '') || '2020-01-01'
  const fechaMax = today

  const cantidadNum = Number(cantidad)
  const cantidadValid =
    Number.isFinite(cantidadNum) &&
    Number.isInteger(cantidadNum) &&
    cantidadNum > 0 &&
    cantidadNum <= maxAsignable
  const campaniaValid = Number(campaniaId) > 0
  const subcampaniaValid = Number(subcampaniaId) > 0
  const fotosValid = photos.length >= 1 && photos.length <= 5
  const fechaValid = !!fecha && fecha >= fechaMin && fecha <= fechaMax
  const canCreate =
    !!authId &&
    !submitting &&
    loteActivo &&
    maxAsignable > 0 &&
    campaniaValid &&
    subcampaniaValid &&
    cantidadValid &&
    fotosValid &&
    fechaValid

  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    },
    [],
  )

  const addPhotos = (files: File[]) => {
    const next = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setPhotos((prev) => [...prev, ...next].slice(0, 5))
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return next
    })
  }

  const clearPhotos = () => {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      return []
    })
  }

  const loadAsignaciones = () => {
    setLoading(true)
    LotesViveroService.listAsignaciones(lote.id)
      .then((data) => setAsignaciones(sortAsignacionesNewestFirst(data)))
      .catch((err) => setSubmitError(err instanceof Error ? err.message : 'Error al cargar asignaciones.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAsignaciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lote.id])

  // Paso 1: campañas disponibles como destino. La subcampaña real se elige
  // despues, ya filtrada por esta campaña (ver efecto siguiente).
  useEffect(() => {
    PlantacionService.listCampanias()
      .then((data) => setCampanias(data))
      .catch((err) => setSubmitError(err instanceof Error ? err.message : 'Error al cargar campañas.'))
  }, [])

  // Paso 2: subcampañas de la campaña elegida. Solo ACTIVA puede recibir
  // entregas fisicas (RN-PLA: las asignaciones no ocurren en BORRADOR).
  useEffect(() => {
    setSubcampaniaId('')
    if (!campaniaId) {
      setSubcampanias([])
      return
    }
    let active = true
    setSubcampaniasLoading(true)
    PlantacionService.listSubcampaniasByCampania(Number(campaniaId))
      .then((data) => {
        if (!active) return
        const activas = data.filter((sub) => sub.estado === 'ACTIVA')
        setSubcampanias(activas)
        if (activas.length > 0) setSubcampaniaId(String(activas[0].id))
      })
      .catch((err) => {
        if (active) setSubmitError(err instanceof Error ? err.message : 'Error al cargar subcampañas.')
      })
      .finally(() => {
        if (active) setSubcampaniasLoading(false)
      })
    return () => {
      active = false
    }
  }, [campaniaId])

  const cantidadError = !cantidad
    ? 'Ingresa la cantidad a entregar.'
    : !Number.isFinite(cantidadNum) || cantidadNum <= 0
      ? 'La cantidad debe ser mayor a 0.'
      : !Number.isInteger(cantidadNum)
        ? 'Solo se aceptan enteros.'
        : cantidadNum > maxAsignable
          ? `Max ${maxAsignable} plantas en vivero.`
          : null

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canCreate) {
      setShowErrors(true)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setAssignmentSuccess(null)
    try {
      const selectedSubcampania = subcampanias.find((sub) => sub.id === Number(subcampaniaId))
      const selectedProposito = PROPOSITOS.find((item) => item.key === proposito)

      // Paso 1 — subir la evidencia de la entrega y obtener los evidencia_ids.
      const upload = await LotesViveroService.uploadEvidenciasPendientes(
        {
          fotos: photos.map((p) => p.file),
          titulo: 'Entrega a subcampania',
          descripcion: `Entrega de ${cantidadNum} plantas a ${
            selectedSubcampania?.nombre || 'subcampania'
          }`,
          metadata: { fuente: 'pwa-r3foresta', modulo: 'vivero', etapa: 'ASIGNACION' },
          tomado_en: new Date().toISOString(),
        },
        authId,
      )

      // Paso 2 — registrar la entrega con la fecha y la evidencia.
      const result = await LotesViveroService.crearAsignacion(
        lote.id,
        {
          subcampania_id: Number(subcampaniaId),
          cantidad_asignada: cantidadNum,
          proposito,
          fecha_asignacion: fecha,
          evidencia_ids: upload.evidencia_ids,
        },
        authId,
      )

      setCantidad('')
      clearPhotos()
      setFecha(todayLocalISO())
      setShowErrors(false)
      setAssignmentSuccess({
        destino: selectedSubcampania?.nombre || 'la subcampania seleccionada',
        cantidad: cantidadNum,
        proposito: selectedProposito?.label || 'Inicial',
        loteFinalizado: result.lote_finalizado,
      })
      await LotesViveroService.listAsignaciones(lote.id).then((data) =>
        setAsignaciones(sortAsignacionesNewestFirst(data)),
      )
      // Refrescamos el detalle del lote: el saldo vivo bajo y puede haber
      // quedado FINALIZADO por entrega total.
      onLoteChanged?.()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar la entrega.')
    } finally {
      setSubmitting(false)
    }
  }

  // Devolucion fisica exitosa: el stock volvio al vivero (saldo vivo sube) y el
  // lote pudo reabrirse. Recargamos el desglose y refrescamos el detalle.
  const handleDevolucionDone = (
    result: DevolverAsignacionViveroResponseData,
    cantidad: number,
    destino: string,
  ) => {
    setDevolucionTarget(null)
    setDevolucionSuccess({ destino, cantidad, loteReabierto: result.lote_reabierto })
    void LotesViveroService.listAsignaciones(lote.id).then((data) =>
      setAsignaciones(sortAsignacionesNewestFirst(data)),
    )
    onLoteChanged?.()
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success-50 text-success-700">
            <Icon name="package" className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-brand-800">
              {DISPATCH_FLOW_LABEL[flowStatus]}
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-neutral-500">
              {DISPATCH_FLOW_DESCRIPTION[flowStatus]}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-success-50 px-3 py-3 ring-1 ring-success-100">
            <p className="text-[9px] font-black uppercase tracking-wider text-success-700">En vivero</p>
            <p className="mt-1 text-xl font-extrabold text-success-800">{saldoVivo}</p>
          </div>
          <div className="rounded-2xl bg-neutral-50 px-3 py-3 ring-1 ring-neutral-100">
            <p className="text-[9px] font-black uppercase tracking-wider text-neutral-500">
              Entregado a subcampanias
            </p>
            <p className="mt-1 text-xl font-extrabold text-brand-800">{entregadoSubcampanias}</p>
          </div>
        </div>
      </section>

      <form onSubmit={handleCreate} className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-brand-800">Entregar plantas</p>
            <p className="text-[11px] font-semibold text-neutral-500">
              Entregar baja el saldo vivo del lote y requiere evidencia.
            </p>
          </div>
          <span className="rounded-full bg-success-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-success-700 ring-1 ring-success-100">
            Con foto
          </span>
        </div>

        {!loteActivo && (
          <div className="rounded-2xl bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-600 ring-1 ring-neutral-200">
            El lote esta en estado {estadoLote} y no acepta nuevas entregas.
          </div>
        )}

        {maxAsignable <= 0 && loteActivo && (
          <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            No hay saldo vivo en el lote para entregar.
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-brand-500">
            Campaña destino
          </span>
          <select
            value={campaniaId}
            onChange={(event) => setCampaniaId(event.target.value)}
            disabled={submitting || campanias.length === 0}
            className={`w-full rounded-2xl border px-3 py-3 text-sm font-extrabold text-brand-700 outline-none transition ${
              showErrors && !campaniaValid
                ? 'border-red-300 bg-red-50'
                : 'border-brand-100 bg-white focus:border-brand-300'
            }`}
          >
            <option value="">
              {campanias.length === 0 ? 'Sin campañas disponibles' : 'Selecciona una campaña...'}
            </option>
            {campanias.map((camp) => (
              <option key={camp.id} value={camp.id}>
                {camp.nombre}
                {camp.codigo_trazabilidad ? ` - ${camp.codigo_trazabilidad}` : ''}
              </option>
            ))}
          </select>
          {showErrors && !campaniaValid && (
            <p className="mt-1 text-xs font-semibold text-red-500">Selecciona una campaña.</p>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-brand-500">
            Subcampania destino
          </span>
          <select
            value={subcampaniaId}
            onChange={(event) => setSubcampaniaId(event.target.value)}
            disabled={submitting || !campaniaValid || subcampaniasLoading || subcampanias.length === 0}
            className={`w-full rounded-2xl border px-3 py-3 text-sm font-extrabold text-brand-700 outline-none transition ${
              showErrors && !subcampaniaValid
                ? 'border-red-300 bg-red-50'
                : 'border-brand-100 bg-white focus:border-brand-300'
            }`}
          >
            {!campaniaValid ? (
              <option value="">Elige primero una campaña</option>
            ) : subcampaniasLoading ? (
              <option value="">Cargando subcampañas...</option>
            ) : subcampanias.length === 0 ? (
              <option value="">Sin subcampañas activas en esta campaña</option>
            ) : (
              subcampanias.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nombre}
                  {sub.estado ? ` - ${sub.estado}` : ''}
                </option>
              ))
            )}
          </select>
          {showErrors && campaniaValid && !subcampaniaValid && (
            <p className="mt-1 text-xs font-semibold text-red-500">Selecciona una subcampania.</p>
          )}
        </label>

        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-brand-500">
            Proposito
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PROPOSITOS.map((item) => {
              const selected = proposito === item.key
              const isReposicion = item.key === 'REPOSICION'
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setProposito(item.key)}
                  disabled={submitting}
                  className={`rounded-2xl px-3 py-2.5 text-left ring-1 transition ${
                    selected
                      ? isReposicion
                        ? 'bg-amber-50 text-amber-800 ring-amber-200'
                        : 'bg-success-50 text-success-800 ring-success-200'
                      : 'bg-white text-brand-700 ring-brand-100 hover:bg-brand-50'
                  }`}
                >
                  <p className="text-sm font-extrabold">{item.label}</p>
                  <p className="mt-0.5 text-[10px] font-semibold leading-snug opacity-80">
                    {item.hint}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <CantidadStepper
          value={cantidad}
          onChange={setCantidad}
          max={maxAsignable}
          min={0}
          label="Plantas a entregar"
          unit="plantas"
          quickPercentages={[25, 50, 80, 100]}
          bigStepSize={maxAsignable >= 50 ? 10 : undefined}
          showError={showErrors && !cantidadValid}
          errorMessage={cantidadError ?? undefined}
          disabled={submitting || maxAsignable <= 0 || !loteActivo}
        />

        <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
          <FechaCard
            value={fecha}
            onChange={setFecha}
            min={fechaMin}
            max={fechaMax}
            label="Fecha de la entrega"
            showError={showErrors && !fechaValid}
            errorMessage="Fecha fuera de rango."
            disabled={submitting}
          />
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
          <FotosUploader
            photos={photos}
            onAdd={addPhotos}
            onRemove={removePhoto}
            required
            showError={showErrors && !fotosValid}
            errorMessage="Adjunta al menos una foto de la entrega."
            disabled={submitting || !loteActivo}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={submitting}
          leftIcon="check"
          disabled={!canCreate}
        >
          {submitting ? 'Entregando...' : 'Entregar plantas'}
        </Button>

        {submitError && (
          <p className="whitespace-pre-line rounded-2xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-600 ring-1 ring-red-200">
            {submitError}
          </p>
        )}
      </form>

      {loading ? (
        <div className="rounded-3xl bg-white px-4 py-8 text-center text-sm font-semibold text-neutral-500 shadow-soft ring-1 ring-black/5">
          Cargando desglose de asignaciones...
        </div>
      ) : asignaciones.length === 0 ? (
        <div className="rounded-3xl bg-white px-4 py-8 text-center text-sm font-semibold text-neutral-500 shadow-soft ring-1 ring-black/5">
          No hay asignaciones activas registradas para este lote.
        </div>
      ) : (
        <div className="space-y-3">
          {asignaciones.map((asig) => {
            const saldoDisponible = numberOrZero(asig.saldo_asignado_disponible)
            const isExhausted = saldoDisponible === 0
            const hasMerma = numberOrZero(asig.cantidad_mermada) > 0
            const isReposicion = asig.proposito === 'REPOSICION'

            return (
              <article
                key={asig.id}
                className={`rounded-3xl bg-white p-5 shadow-soft ring-1 ring-neutral-100 ${
                  isExhausted ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ring-1 ${
                          isReposicion
                            ? 'bg-amber-50 text-amber-700 ring-amber-100'
                            : 'bg-success-50 text-success-700 ring-success-100'
                        }`}
                      >
                        {isReposicion ? 'REPOSICION' : 'INICIAL'}
                      </span>
                      {hasMerma && (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-red-700 ring-1 ring-red-100">
                          Afectada por merma
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold leading-tight text-brand-900">
                      {asig.subcampania_nombre || 'Subcampania sin nombre'}
                    </h3>
                    <p className="mt-1 text-[11px] font-bold leading-snug text-neutral-500">
                      {asig.campania_nombre || 'Sin campania'} - {formatDate(asig.fecha_asignacion)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Disponible</p>
                    <p className="text-2xl font-extrabold text-success-700">{saldoDisponible}</p>
                  </div>
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
                  <Icon name="user" className="h-4 w-4 text-neutral-400" />
                  <span>Coordinador: {asig.coordinador_nombre || 'Sin coordinador'}</span>
                </p>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <AssignmentMetric label="Entregado" value={numberOrZero(asig.cantidad_asignada)} />
                  <AssignmentMetric label="Consumido" value={numberOrZero(asig.cantidad_consumida)} />
                  <AssignmentMetric label="Devuelto" value={numberOrZero(asig.cantidad_devuelta)} />
                  <AssignmentMetric label="Mermado" value={numberOrZero(asig.cantidad_mermada)} danger={hasMerma} />
                </div>

                {/* Devolucion fisica: sube el saldo vivo del lote y puede reabrir
                    un lote FINALIZADO. Admite devolucion parcial mientras
                    saldo_asignado_disponible > 0 (ya no depende de lo consumido). */}
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-3 py-2.5 ring-1 ring-neutral-100">
                  <p className="text-[11px] font-bold leading-tight text-neutral-500">
                    {isExhausted
                      ? 'Sin saldo disponible para devolver.'
                      : `Podes devolver hasta ${saldoDisponible} plantas al vivero.`}
                  </p>
                  <button
                    type="button"
                    disabled={isExhausted}
                    onClick={() => setDevolucionTarget(asig)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-extrabold ring-1 transition ${
                      isExhausted
                        ? 'cursor-not-allowed bg-white text-neutral-400 ring-neutral-200'
                        : 'bg-white text-sky-700 ring-sky-200 hover:bg-sky-50'
                    }`}
                  >
                    Devolver al vivero
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <AssignmentSuccessDialog
        success={assignmentSuccess}
        onClose={() => setAssignmentSuccess(null)}
      />

      {devolucionTarget && (
        <DevolucionDialog
          asignacion={devolucionTarget}
          lote={lote}
          authId={authId}
          onClose={() => setDevolucionTarget(null)}
          onDone={handleDevolucionDone}
        />
      )}

      <DevolucionSuccessDialog
        success={devolucionSuccess}
        onClose={() => setDevolucionSuccess(null)}
      />
    </div>
  )
}

export default ViveroLotAsignacionesTab
