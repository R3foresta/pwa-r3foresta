import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import Icon from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import {
  LotesViveroService,
  type AsignacionViveroResumen,
  type SubcampaniaResumen,
} from '../../../services/lotes-vivero.service'
import type { PropositoAsignacionVivero } from '../types/contracts'
import type { ViveroLotDetailView } from '../types/view-models'
import CantidadStepper from './event/CantidadStepper'
import {
  DISPATCH_FLOW_DESCRIPTION,
  DISPATCH_FLOW_LABEL,
  getDispatchFlowStatus,
} from '../utils/dispatchFlow'

type Props = {
  lote: ViveroLotDetailView
}

const PROPOSITOS: Array<{
  key: PropositoAsignacionVivero
  label: string
  hint: string
  tone: string
}> = [
  {
    key: 'PLANTACION_INICIAL',
    label: 'Inicial',
    hint: 'Reserva para plantar y avanzar la meta.',
    tone: 'emerald',
  },
  {
    key: 'REPOSICION',
    label: 'Reposicion',
    hint: 'Reserva para reemplazar arboles perdidos.',
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

function AssignmentMetric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2.5 py-2 text-center ring-1 ring-slate-100">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${danger ? 'text-red-600' : 'text-brand-700'}`}>
        {value}
      </p>
    </div>
  )
}

function ViveroLotAsignacionesTab({ lote }: Props) {
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const [asignaciones, setAsignaciones] = useState<AsignacionViveroResumen[]>([])
  const [subcampanias, setSubcampanias] = useState<SubcampaniaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [subcampaniaId, setSubcampaniaId] = useState('')
  const [proposito, setProposito] = useState<PropositoAsignacionVivero>('PLANTACION_INICIAL')
  const [cantidad, setCantidad] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<AsignacionViveroResumen | null>(null)

  const saldoVivo = lote.saldoVivoActual ?? 0
  const saldoReservadoBackend = lote.saldoAsignadoTotal ?? 0
  const saldoLibreBackend = lote.saldoVivoDisponibleAsignacion ?? saldoVivo
  const estadoLote = lote.estadoLote ?? 'ACTIVO'
  const loteActivo = estadoLote === 'ACTIVO'
  const flowStatus = getDispatchFlowStatus(lote)

  const saldoReservadoLocal = useMemo(
    () => asignaciones.reduce((total, asig) => total + numberOrZero(asig.saldo_asignado_disponible), 0),
    [asignaciones],
  )
  const saldoLibreVisible = Math.max(
    0,
    saldoVivo - Math.max(saldoReservadoBackend, saldoReservadoLocal),
  )
  const maxAsignable = Math.min(saldoLibreBackend, saldoLibreVisible)

  const cantidadNum = Number(cantidad)
  const cantidadValid =
    Number.isFinite(cantidadNum) &&
    Number.isInteger(cantidadNum) &&
    cantidadNum > 0 &&
    cantidadNum <= maxAsignable
  const subcampaniaValid = Number(subcampaniaId) > 0
  const canCreate =
    !!authId &&
    !submitting &&
    loteActivo &&
    maxAsignable > 0 &&
    subcampaniaValid &&
    cantidadValid

  const loadAsignaciones = () => {
    setLoading(true)
    LotesViveroService.listAsignaciones(lote.id)
      .then((data) => setAsignaciones(data))
      .catch((err) => setSubmitError(err instanceof Error ? err.message : 'Error al cargar asignaciones.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAsignaciones()
  }, [lote.id])

  useEffect(() => {
    LotesViveroService.listSubcampanias()
      .then((data) => {
        setSubcampanias(data)
        if (!subcampaniaId && data.length > 0) setSubcampaniaId(String(data[0].id))
      })
      .catch((err) => setSubmitError(err instanceof Error ? err.message : 'Error al cargar subcampanias.'))
  }, [])

  const cantidadError = !cantidad
    ? 'Ingresa la cantidad a reservar.'
    : !Number.isFinite(cantidadNum) || cantidadNum <= 0
      ? 'La cantidad debe ser mayor a 0.'
      : !Number.isInteger(cantidadNum)
        ? 'Solo se aceptan enteros.'
        : cantidadNum > maxAsignable
          ? `Max ${maxAsignable} plantas libres.`
          : null

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canCreate) {
      setShowErrors(true)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setSuccessMessage(null)
    try {
      await LotesViveroService.crearAsignacion(
        lote.id,
        {
          subcampania_id: Number(subcampaniaId),
          cantidad_asignada: cantidadNum,
          proposito,
        },
        authId,
      )
      setCantidad('')
      setShowErrors(false)
      setSuccessMessage('Reserva creada correctamente.')
      await LotesViveroService.listAsignaciones(lote.id).then(setAsignaciones)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la reserva.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setSubmitting(true)
    setSubmitError(null)
    setSuccessMessage(null)
    try {
      await LotesViveroService.cancelarAsignacion(lote.id, cancelTarget.id, authId)
      setSuccessMessage('Reserva cancelada. El saldo vuelve a estar libre.')
      setCancelTarget(null)
      await LotesViveroService.listAsignaciones(lote.id).then(setAsignaciones)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al cancelar la reserva.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon name="package" className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-brand-800">
              {DISPATCH_FLOW_LABEL[flowStatus]}
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">
              {DISPATCH_FLOW_DESCRIPTION[flowStatus]}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Vivo</p>
            <p className="mt-1 text-xl font-extrabold text-brand-800">{saldoVivo}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 px-3 py-3 ring-1 ring-amber-100">
            <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Reservado</p>
            <p className="mt-1 text-xl font-extrabold text-amber-800">
              {Math.max(saldoReservadoBackend, saldoReservadoLocal)}
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Libre</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-800">{maxAsignable}</p>
          </div>
        </div>
      </section>

      <form onSubmit={handleCreate} className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-brand-800">Crear reserva</p>
            <p className="text-[11px] font-semibold text-slate-500">
              Asignacion decide el destino del stock listo para despacho.
            </p>
          </div>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">
            Sin foto
          </span>
        </div>

        {!loteActivo && (
          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            El lote esta en estado {estadoLote} y no acepta nuevas reservas.
          </div>
        )}

        {maxAsignable <= 0 && loteActivo && (
          <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            No hay saldo libre para reservar.
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-brand-500">
            Subcampania destino
          </span>
          <select
            value={subcampaniaId}
            onChange={(event) => setSubcampaniaId(event.target.value)}
            disabled={submitting || subcampanias.length === 0}
            className={`w-full rounded-2xl border px-3 py-3 text-sm font-extrabold text-brand-700 outline-none transition ${
              showErrors && !subcampaniaValid
                ? 'border-red-300 bg-red-50'
                : 'border-brand-100 bg-white focus:border-brand-300'
            }`}
          >
            {subcampanias.length === 0 ? (
              <option value="">Sin subcampanias disponibles</option>
            ) : (
              subcampanias.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nombre}
                  {sub.estado ? ` - ${sub.estado}` : ''}
                </option>
              ))
            )}
          </select>
          {showErrors && !subcampaniaValid && (
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
                        : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
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
          label="Plantas a reservar"
          unit="plantas"
          quickPercentages={[25, 50, 80, 100]}
          bigStepSize={maxAsignable >= 50 ? 10 : undefined}
          showError={showErrors && !cantidadValid}
          errorMessage={cantidadError ?? undefined}
          disabled={submitting || maxAsignable <= 0 || !loteActivo}
        />

        <button
          type="submit"
          disabled={!canCreate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 py-3.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Icon name="check" className="h-4 w-4" />
          {submitting ? 'Guardando...' : 'Crear reserva'}
        </button>

        {successMessage && (
          <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            {successMessage}
          </p>
        )}
        {submitError && (
          <p className="whitespace-pre-line rounded-2xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-600 ring-1 ring-red-200">
            {submitError}
          </p>
        )}
      </form>

      {loading ? (
        <div className="rounded-3xl bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-black/5">
          Cargando desglose de asignaciones...
        </div>
      ) : asignaciones.length === 0 ? (
        <div className="rounded-3xl bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-black/5">
          No hay asignaciones activas registradas para este lote.
        </div>
      ) : (
        <div className="space-y-3">
          {asignaciones.map((asig) => {
            const saldoDisponible = numberOrZero(asig.saldo_asignado_disponible)
            const isExhausted = saldoDisponible === 0
            const hasMerma = numberOrZero(asig.cantidad_mermada) > 0
            const isReposicion = asig.proposito === 'REPOSICION'
            const canCancel = numberOrZero(asig.cantidad_consumida) === 0

            return (
              <article
                key={asig.id}
                className={`rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-100 ${
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
                            : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
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
                    <p className="mt-1 text-[11px] font-bold leading-snug text-slate-500">
                      {asig.campania_nombre || 'Sin campania'} - {formatDate(asig.fecha_asignacion)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Libre</p>
                    <p className="text-2xl font-extrabold text-emerald-700">{saldoDisponible}</p>
                  </div>
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Icon name="user" className="h-4 w-4 text-slate-400" />
                  <span>Coordinador: {asig.coordinador_nombre || 'Sin coordinador'}</span>
                </p>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <AssignmentMetric label="Asignado" value={numberOrZero(asig.cantidad_asignada)} />
                  <AssignmentMetric label="Consumido" value={numberOrZero(asig.cantidad_consumida)} />
                  <AssignmentMetric label="Devuelto" value={numberOrZero(asig.cantidad_devuelta)} />
                  <AssignmentMetric label="Mermado" value={numberOrZero(asig.cantidad_mermada)} danger={hasMerma} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                  <p className="text-[11px] font-bold leading-tight text-slate-600">
                    {canCancel
                      ? 'Reserva sin consumo. Se puede cancelar y liberar saldo.'
                      : 'Ya tiene consumo en plantacion; no se puede cancelar desde aqui.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCancelTarget(asig)}
                    disabled={!canCancel || submitting}
                    className="shrink-0 rounded-xl bg-white px-3 py-2 text-[11px] font-extrabold text-red-600 ring-1 ring-red-100 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:ring-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        variant="danger"
        iconName="info"
        title="Cancelar reserva"
        description="La asignacion pasara a devuelta y el saldo quedara libre para otras operaciones."
        confirmLabel="Si, cancelar"
        cancelLabel="Volver"
        loading={submitting}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}

export default ViveroLotAsignacionesTab
