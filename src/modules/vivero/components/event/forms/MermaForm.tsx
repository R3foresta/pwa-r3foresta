import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../../../components/ConfirmDialog'
import Icon from '../../../../../components/Icon'
import { Button } from '../../../../../components/ui'
import { useAuth } from '../../../../../contexts/AuthContext'
import { LotesViveroService } from '../../../../../services/lotes-vivero.service'
import { clearDraft, loadDraft, saveDraft } from '../../../../../utils/formDraft'
import { addDaysLocalISO, todayLocalISO } from '../../../../../utils/validations/date'
import type {
  CausaMermaVivero,
  LoteViveroItem,
  RegistrarMermaResponse,
} from '../../../types/contracts'
import SurvivalBar from '../../SurvivalBar'
import CantidadStepper from '../CantidadStepper'
import EventoCTABar from '../EventoCTABar'
import FechaCard from '../FechaCard'
import FotosUploader from '../FotosUploader'
import type { Photo } from '../FotosUploader'
import ObservacionesCard from '../ObservacionesCard'

// No se reintenta automáticamente registrarMerma: el endpoint es append-only
// sin Idempotency-Key, así que un retry tras respuesta perdida crearía una
// segunda merma y descontaría saldo dos veces. El usuario espera con el
// overlay; si falla, decide manualmente si reintenta.

type Props = {
  lote: LoteViveroItem
  /**
   * Fecha del último EMBOLSADO del lote (de
   * `lote.ultimo_evento_por_tipo.EMBOLSADO?.fecha_evento` en el detalle).
   * Backend rechaza mermas con fecha anterior al embolsado (RN-VIV-10), así
   * que la usamos como límite inferior del rango. Null solo si el lote aún
   * no fue embolsado — en ese caso el tab MERMA no debería estar disponible;
   * caemos a `lote.fecha_inicio` como red de seguridad.
   */
  fechaEmbolsado: string | null
  onCompleted: () => void
}

const CAUSAS: { key: CausaMermaVivero; label: string; icon: string }[] = [
  { key: 'PLAGA', label: 'Plaga', icon: '🐛' },
  { key: 'ENFERMEDAD', label: 'Enfermedad', icon: '🦠' },
  { key: 'SEQUIA', label: 'Sequía', icon: '☀️' },
  { key: 'DANO_FISICO', label: 'Daño físico', icon: '🔨' },
  { key: 'MUERTE_NATURAL', label: 'Muerte natural', icon: '🥀' },
  { key: 'OTRO', label: 'Otro', icon: '❓' },
]

const SUBETAPA_LABEL: Record<NonNullable<LoteViveroItem['subetapa_actual']>, string> = {
  SOMBRA: 'Sombra',
  MEDIA_SOMBRA: 'Media sombra',
  SOL_DIRECTO: 'Sol directo',
}

function getEtapaLabel(lote: LoteViveroItem): string {
  if (lote.subetapa_actual) {
    return `Adaptabilidad · ${SUBETAPA_LABEL[lote.subetapa_actual]}`
  }
  return 'Embolsado'
}

const FORM_ID = 'vivero-merma-form'

type MermaDraft = {
  cantidad: string
  causa: CausaMermaVivero | ''
  fecha: string
  observaciones: string
}

const draftKey = (loteId: number) => `r3foresta:merma-draft:${loteId}`

function MermaForm({ lote, fechaEmbolsado, onCompleted }: Props) {
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const today = todayLocalISO()
  const tenDaysAgo = addDaysLocalISO(today, -10)
  // fechaMin = max(today-10, fechaEmbolsado ?? lote.fecha_inicio).
  // Backend rechaza si la merma es anterior al embolsado y a su vez exige
  // que no pase de 10 días en el pasado.
  const fechaPiso = fechaEmbolsado ?? lote.fecha_inicio
  const fechaMin = tenDaysAgo > fechaPiso ? tenDaysAgo : fechaPiso
  const fechaMax = today

  // El total embolsado: referencia "100%" para la barra de supervivencia.
  // Si por algún motivo viene null (no debería ya que MERMA exige embolsado
  // previo), caemos a saldoVivo para que ratio = 1.
  const plantasIniciales = lote.plantas_vivas_iniciales ?? lote.saldo_vivo_actual ?? 0

  // saldoOverride: tras una merma exitosa parcial, evitamos un refetch al backend
  // usando `saldo_vivo_despues` que ya viene en la respuesta. Si no hay override,
  // usamos el saldo del lote que recibimos del padre.
  const [saldoOverride, setSaldoOverride] = useState<number | null>(null)
  const saldoVivo = saldoOverride ?? lote.saldo_vivo_actual ?? 0

  // Hidratación desde localStorage. Si el saldo del backend cambió desde que
  // se guardó el borrador (otra persona registró merma desde otro dispositivo,
  // por ejemplo), clampamos `cantidad` al máximo actual de forma silenciosa —
  // el stepper ya muestra "Máx N" como guía visual.
  const initialSaldoVivo = lote.saldo_vivo_actual ?? 0
  const initialDraft = loadDraft<MermaDraft>(draftKey(lote.id))
  const clampedDraftCantidad = (() => {
    if (!initialDraft) return ''
    const n = Number(initialDraft.cantidad)
    if (!Number.isFinite(n) || n <= 0) return ''
    return String(Math.min(Math.trunc(n), initialSaldoVivo))
  })()

  const [cantidad, setCantidad] = useState(clampedDraftCantidad)
  const [causa, setCausa] = useState<CausaMermaVivero | ''>(initialDraft?.causa ?? '')
  const [fecha, setFecha] = useState(initialDraft?.fecha ?? today)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [observaciones, setObservaciones] = useState(initialDraft?.observaciones ?? '')
  const [showErrors, setShowErrors] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  type Step = 'form' | 'confirming' | 'submitting' | 'success' | 'closed'
  const [step, setStep] = useState<Step>('form')
  type MermaResultData = RegistrarMermaResponse['data']
  const [lastResult, setLastResult] = useState<MermaResultData | null>(null)

  const submitting = step === 'submitting'

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

  // Persistencia del borrador. Solo guardamos campos textuales (las fotos
  // necesitan IndexedDB; ver TODO en utils/formDraft.ts). Si el form quedó
  // totalmente vacío, borramos la clave para no dejar ruido.
  useEffect(() => {
    if (step !== 'form') return
    const key = draftKey(lote.id)
    const isEmpty =
      cantidad === '' && causa === '' && observaciones === '' && fecha === today
    if (isEmpty) {
      clearDraft(key)
      return
    }
    saveDraft<MermaDraft>(key, { cantidad, causa, fecha, observaciones })
  }, [cantidad, causa, fecha, observaciones, step, today, lote.id])

  const cantidadNum = Number(cantidad)
  const cantidadValid =
    Number.isFinite(cantidadNum) &&
    cantidadNum > 0 &&
    Number.isInteger(cantidadNum) &&
    cantidadNum <= saldoVivo

  const saldoDespues = cantidadValid ? saldoVivo - cantidadNum : saldoVivo
  const causaValid = causa !== ''
  const fechaValid = fecha >= fechaMin && fecha <= fechaMax
  const fotosValid = photos.length >= 1 && photos.length <= 5
  // Cuando la causa es OTRO no podemos identificar el motivo desde el enum;
  // exigimos observaciones para que el registro quede trazable. El backend
  // solo lo recomienda; nosotros lo forzamos en cliente.
  const requiereObservaciones = causa === 'OTRO'
  const observacionesValid = !requiereObservaciones || observaciones.trim().length > 0

  const canSubmit =
    cantidadValid &&
    causaValid &&
    fechaValid &&
    fotosValid &&
    observacionesValid &&
    !!authId &&
    !submitting

  const cantidadError = !cantidad
    ? 'Ingresá las plantas perdidas.'
    : !Number.isFinite(cantidadNum) || cantidadNum <= 0
      ? 'La cantidad debe ser mayor a 0.'
      : !Number.isInteger(cantidadNum)
        ? 'Solo se aceptan enteros.'
        : cantidadNum > saldoVivo
          ? `Máx ${saldoVivo} plantas (saldo vivo actual).`
          : null

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

  const resetForm = () => {
    setCantidad('')
    setCausa('')
    setFecha(today)
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      return []
    })
    setObservaciones('')
    setShowErrors(false)
    setSubmitError(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    if (!canSubmit) {
      setShowErrors(true)
      return
    }
    // Abrir dialog de confirmación; el POST se dispara solo si confirma.
    setSubmitError(null)
    setStep('confirming')
  }

  const runSubmit = async () => {
    setStep('submitting')
    setSubmitError(null)

    // Paso 1: upload de evidencias. Si falla, NO reintentamos automáticamente
    // (puede ser problema de archivo, no de red). El usuario ve el error y
    // decide manualmente.
    let evidenciaIds: number[]
    try {
      const upload = await LotesViveroService.uploadEvidenciasEvento(
        lote.id,
        'MERMA',
        {
          fotos: photos.map((photo) => photo.file),
          titulo: 'Merma de lote vivero',
          descripcion: observaciones.trim() || 'Evidencia de merma',
          metadata: { fuente: 'pwa-r3foresta', modulo: 'vivero', etapa: 'MERMA' },
          tomado_en: new Date().toISOString(),
        },
        authId,
      )
      evidenciaIds = upload.data.evidencia_ids
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'No pudimos subir las fotos. Probá de nuevo.',
      )
      setStep('form')
      return
    }

    // Paso 2: registrar la merma. Una sola llamada — sin retry automático.
    // El endpoint es append-only y no acepta Idempotency-Key todavía, así que
    // reintentar tras una respuesta perdida crearía una segunda merma y
    // descontaría saldo dos veces. Si falla, el usuario decide manualmente.
    const causaMerma = causa as CausaMermaVivero
    const payload = {
      fecha_evento: fecha,
      cantidad_afectada: cantidadNum,
      causa_merma: causaMerma,
      evidencia_ids: evidenciaIds,
      observaciones: observaciones.trim() || undefined,
    }

    try {
      const response = await LotesViveroService.registrarMerma(lote.id, payload, authId)
      const data = response.data
      setLastResult(data)
      clearDraft(draftKey(lote.id))
      if (data.lote_finalizado) {
        setStep('closed')
      } else {
        // Decisión de producto: para "Registrar otra merma" reutilizamos el
        // `saldo_vivo_despues` que ya viene en esta respuesta en vez de
        // refetchear el detalle del lote. Ahorra ~1s de latencia en el flujo
        // lineal de un solo usuario. Si otro actor mermó/despachó en paralelo
        // entre medio, el siguiente POST sería rechazado por el backend con
        // mensaje claro (falla ruidosamente, no silenciosamente).
        setSaldoOverride(data.saldo_vivo_despues)
        setStep('success')
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'No pudimos registrar la merma. Revisá tu conexión y volvé a intentar.',
      )
      setStep('form')
    }
  }

  // Auto-redirección tras cierre del lote (1.5 s) para que el usuario lea el
  // mensaje sin tener que tocar nada.
  useEffect(() => {
    if (step !== 'closed') return
    const timer = setTimeout(onCompleted, 1500)
    return () => clearTimeout(timer)
  }, [step, onCompleted])

  const handleRegistrarOtra = () => {
    resetForm()
    setLastResult(null)
    setStep('form')
  }

  const causaLabel = causa ? CAUSAS.find((c) => c.key === causa)?.label : ''
  const willCloseLote = cantidadValid && saldoDespues === 0

  const pendingMsg = !canSubmit && !submitting ? 'Completá los campos obligatorios' : undefined

  const etapaLabel = getEtapaLabel(lote)

  return (
    <>
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 pb-[230px]">
        {/* Header de etapa: ubica al usuario sobre dónde está mermando */}
        <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2.5 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
          <Icon name="leaf" className="h-4 w-4 shrink-0 text-brand-500" />
          <span>
            Mermando en <span className="font-extrabold">{etapaLabel}</span>
          </span>
        </div>

        {/* Warning destructivo */}
        <div className="flex items-start gap-2 rounded-2xl bg-warning-50 px-3 py-2.5 text-xs font-semibold text-warning-800 ring-1 ring-warning-200">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
          <span>
            Esta acción reduce el inventario vivo y no se puede revertir.
          </span>
        </div>

        {/* Antes / Después */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white px-3 py-3 shadow-soft ring-1 ring-black/5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
              Plantas antes
            </p>
            <p className="mt-1 text-2xl font-extrabold leading-none text-brand-700">
              {saldoVivo}
              <span className="ml-1 text-xs font-bold text-brand-500">plantas</span>
            </p>
          </div>
          <div
            className={`rounded-2xl px-3 py-3 shadow-soft ring-1 ${
              cantidadValid
                ? 'bg-danger-50 ring-danger-200'
                : 'bg-white ring-black/5'
            }`}
          >
            <p
              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                cantidadValid ? 'text-danger-700' : 'text-brand-500'
              }`}
            >
              Saldo después
            </p>
            <p
              className={`mt-1 text-2xl font-extrabold leading-none ${
                cantidadValid ? 'text-danger-700' : 'text-brand-300'
              }`}
            >
              {cantidadValid ? saldoDespues : '—'}
              {cantidadValid && (
                <span className="ml-1 text-xs font-bold text-danger-500">plantas</span>
              )}
            </p>
          </div>
        </div>

        {/* Cantidad perdida + barra de supervivencia dinámica */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <CantidadStepper
            value={cantidad}
            onChange={setCantidad}
            max={saldoVivo}
            min={0}
            label="Plantas perdidas"
            unit="plantas"
            quickPercentages={[10, 25, 50, 100]}
            bigStepSize={saldoVivo >= 50 ? 10 : undefined}
            showError={showErrors && !cantidadValid}
            errorMessage={cantidadError ?? undefined}
            disabled={submitting}
          />

          {/* Barra animada: refleja el saldo *después* de la merma. Sigue la
              regla "efecto/causa" — el stepper modifica, la barra responde. */}
          {plantasIniciales > 0 && (
            <div className="mt-4">
              <SurvivalBar
                alive={cantidadValid ? saldoDespues : saldoVivo}
                initial={plantasIniciales}
                showLabel
              />
              <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-brand-500">
                <span>{cantidadValid ? saldoDespues : saldoVivo} vivas</span>
                <span>de {plantasIniciales} embolsadas</span>
              </div>
            </div>
          )}

          {/* Warning: la merma vaciaría el lote. Aparece solo cuando la
              cantidad ingresada coincide con el saldo actual. */}
          {cantidadValid && saldoDespues === 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-danger-50 px-3 py-2.5 text-xs font-extrabold text-danger-700 ring-1 ring-danger-200">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
              <span>
                Esta merma cerrará el lote definitivamente. No quedarán plantas vivas.
              </span>
            </div>
          )}
        </section>

        {/* Causa */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-brand-700">Causa de la merma</p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-danger-500">
              Obligatorio
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CAUSAS.map((c) => {
              const isSelected = causa === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCausa(c.key)}
                  disabled={submitting}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-extrabold transition ${
                    isSelected
                      ? 'border-danger-300 bg-danger-50 text-danger-700 shadow-soft'
                      : 'border-brand-100 bg-white text-brand-700 hover:border-brand-200'
                  }`}
                >
                  <span className="text-base leading-none" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="flex-1 text-left">{c.label}</span>
                </button>
              )
            })}
          </div>
          {showErrors && !causaValid && (
            <p className="mt-2 text-xs font-semibold text-danger-500">
              Seleccioná una causa.
            </p>
          )}
        </section>

        {/* Fecha */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <FechaCard
            value={fecha}
            onChange={setFecha}
            min={fechaMin}
            max={fechaMax}
            showError={showErrors && !fechaValid}
            errorMessage="Fecha fuera de rango."
            disabled={submitting}
          />
        </section>

        {/* Fotos */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <FotosUploader
            photos={photos}
            onAdd={addPhotos}
            onRemove={removePhoto}
            required
            showError={showErrors && !fotosValid}
            errorMessage="Adjuntá al menos una foto de la merma."
            disabled={submitting}
          />
        </section>

        {/* Observaciones */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <ObservacionesCard
            value={observaciones}
            onChange={setObservaciones}
            disabled={submitting}
            required={requiereObservaciones}
            placeholder={
              requiereObservaciones
                ? 'Describí brevemente la causa (ej: heladas, robo, daño accidental, etc.)'
                : 'Notas adicionales del evento…'
            }
            showError={showErrors && !observacionesValid}
            errorMessage="Contá brevemente la causa para que quede registrada."
          />
        </section>

        {submitError && (
          <p className="whitespace-pre-line rounded-2xl bg-danger-50 px-3 py-2 text-center text-xs font-semibold text-danger-600 ring-1 ring-danger-200">
            {submitError}
          </p>
        )}
      </form>

      <EventoCTABar
        formId={FORM_ID}
        label="Confirmar merma"
        loading={submitting}
        loadingLabel="Registrando…"
        disabled={!canSubmit}
        hint={pendingMsg}
        variant="red"
      />

      {/* Dialog de confirmación previo al POST. Distingue entre merma parcial
          y merma total (que cerrará el lote). */}
      <ConfirmDialog
        open={step === 'confirming'}
        variant={willCloseLote ? 'danger' : 'default'}
        iconName="info"
        title={
          willCloseLote
            ? '⚠ Esta merma cerrará el lote definitivamente.'
            : `¿Registrar merma de ${cantidadNum} ${cantidadNum === 1 ? 'planta' : 'plantas'} por ${causaLabel}?`
        }
        description={
          willCloseLote
            ? 'Quedarán 0 plantas vivas y el lote pasará a finalizado.'
            : 'Esta acción no se puede deshacer.'
        }
        confirmLabel={willCloseLote ? 'Sí, cerrar el lote' : 'Confirmar'}
        cancelLabel="Cancelar"
        onConfirm={runSubmit}
        onCancel={() => setStep('form')}
      />

      {/* Overlay bloqueante durante el POST: previene doble submit y deja
          claro que el sistema está procesando. Sin Idempotency-Key en el
          backend, no podemos reintentar automáticamente sin riesgo de
          duplicar la merma. */}
      {step === 'submitting' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
            </div>
            <h2 className="text-base font-extrabold text-brand-700">Registrando merma…</h2>
            <p className="mt-1 text-sm font-semibold text-brand-500">
              No cierres la pantalla. Estamos guardando los datos.
            </p>
          </div>
        </div>
      )}

      {/* Overlay de éxito tras merma parcial: ofrece registrar otra sin
          navegar al detalle. */}
      {step === 'success' && lastResult && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 pt-8 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-success-50 text-success-600">
              <Icon name="check" className="h-5 w-5" />
            </div>
            <h2 className="text-base font-extrabold text-brand-700">Merma registrada</h2>
            <p className="mt-1 text-sm font-semibold text-brand-500">
              Se perdieron {lastResult.cantidad_perdida}{' '}
              {lastResult.cantidad_perdida === 1 ? 'planta' : 'plantas'}. Quedan{' '}
              {lastResult.saldo_vivo_despues}{' '}
              {lastResult.saldo_vivo_despues === 1 ? 'viva' : 'vivas'}.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="primary" fullWidth onClick={onCompleted}>
                Listo
              </Button>
              <Button variant="secondary" fullWidth onClick={handleRegistrarOtra}>
                Registrar otra merma
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay cálido tras cierre automático por pérdida total. Auto-
          redirige al detalle a los 1.5 s; sin botones para no interrumpir. */}
      {step === 'closed' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 pt-8 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-soft ring-1 ring-black/5">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Icon name="leaf" className="h-6 w-6" />
            </div>
            <h2 className="text-base font-extrabold text-brand-700">Lote finalizado</h2>
            <p className="mt-1 text-sm font-semibold text-brand-500">
              Ya no quedan plantas vivas. Gracias por mantener el registro al día.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default MermaForm
