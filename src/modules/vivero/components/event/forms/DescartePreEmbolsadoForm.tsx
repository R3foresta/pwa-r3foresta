import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../../../components/ConfirmDialog'
import Icon from '../../../../../components/Icon'
import { useAuth } from '../../../../../contexts/AuthContext'
import { LotesViveroService } from '../../../../../services/lotes-vivero.service'
import { formatUnidadCanonicaDisplay } from '../../../../../utils/recoleccionUnidad'
import { todayLocalISO } from '../../../../../utils/validations/date'
import type {
  CausaDescartePreEmbolsado,
  LoteViveroDetalle,
} from '../../../types/contracts'
import EventoCTABar from '../EventoCTABar'
import FechaCard from '../FechaCard'
import FotosUploader from '../FotosUploader'
import type { Photo } from '../FotosUploader'
import ObservacionesCard from '../ObservacionesCard'

type Props = {
  lote: LoteViveroDetalle
  onCompleted: () => void
}

const FORM_ID = 'vivero-descarte-pre-embolsado-form'

const CAUSAS: { key: CausaDescartePreEmbolsado; label: string; description: string }[] = [
  {
    key: 'NO_GERMINACION',
    label: 'No germinación',
    description: 'La semilla no germinó.',
  },
  {
    key: 'NO_ENRAIZAMIENTO',
    label: 'No enraizamiento',
    description: 'El esqueje no formó raíces.',
  },
  {
    key: 'CONTAMINACION',
    label: 'Contaminación',
    description: 'Hongos, bacterias u otro agente.',
  },
  {
    key: 'PERDIDA_TOTAL_MATERIAL',
    label: 'Pérdida total',
    description: 'El material en proceso se perdió por completo.',
  },
  {
    key: 'MATERIAL_NO_VIABLE',
    label: 'Material no viable',
    description: 'El material ya no puede continuar.',
  },
  {
    key: 'DANO_PRE_EMBOLSADO',
    label: 'Daño pre-embolsado',
    description: 'Daño antes de formar plantas vivas.',
  },
  {
    key: 'OTRO',
    label: 'Otro',
    description: 'Causa no incluida en la lista.',
  },
]

function getCausaLabel(causa: CausaDescartePreEmbolsado | ''): string {
  if (!causa) return ''
  return CAUSAS.find((item) => item.key === causa)?.label ?? causa.replaceAll('_', ' ')
}

function puedeDescartar(lote: LoteViveroDetalle): boolean {
  return (
    lote.estado_lote === 'ACTIVO' &&
    lote.ultimo_evento_por_tipo.INICIO !== null &&
    lote.ultimo_evento_por_tipo.EMBOLSADO === null &&
    lote.ultimo_evento_por_tipo.DESCARTE_PRE_EMBOLSADO === null
  )
}

function DescartePreEmbolsadoForm({ lote, onCompleted }: Props) {
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const today = todayLocalISO()
  const fechaMin = lote.fecha_inicio
  const fechaMax = today
  const cantidadMaterial = lote.cantidad_inicial_en_proceso
  const unidad = lote.unidad_medida_inicial

  const [fecha, setFecha] = useState(today)
  const [causa, setCausa] = useState<CausaDescartePreEmbolsado | ''>('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [observaciones, setObservaciones] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  type Step = 'form' | 'confirming' | 'submitting' | 'done'
  const [step, setStep] = useState<Step>('form')
  const submitting = step === 'submitting'

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

  useEffect(() => {
    if (step !== 'done') return
    const timer = setTimeout(onCompleted, 1200)
    return () => clearTimeout(timer)
  }, [step, onCompleted])

  const actionAvailable = puedeDescartar(lote)
  const causaValid = causa !== ''
  const fechaValid = fecha >= fechaMin && fecha <= fechaMax
  const fotosValid = photos.length >= 1 && photos.length <= 5
  const cantidadValid = Number.isFinite(cantidadMaterial) && cantidadMaterial > 0

  const canSubmit =
    actionAvailable &&
    causaValid &&
    fechaValid &&
    fotosValid &&
    cantidadValid &&
    !!authId &&
    !submitting

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    if (!canSubmit) {
      setShowErrors(true)
      return
    }
    setSubmitError(null)
    setStep('confirming')
  }

  const runSubmit = async () => {
    if (!causa) return

    setStep('submitting')
    setSubmitError(null)

    let evidenciaIds: number[]
    try {
      const upload = await LotesViveroService.uploadEvidenciasEvento(
        lote.id,
        'DESCARTE_PRE_EMBOLSADO',
        {
          fotos: photos.map((photo) => photo.file),
          titulo: 'Descarte pre-embolsado de lote vivero',
          descripcion: observaciones.trim() || 'Evidencia de descarte pre-embolsado',
          metadata: {
            fuente: 'pwa-r3foresta',
            modulo: 'vivero',
            etapa: 'DESCARTE_PRE_EMBOLSADO',
          },
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

    try {
      await LotesViveroService.registrarDescartePreEmbolsado(
        lote.id,
        {
          fecha_evento: fecha,
          cantidad_material_afectado: cantidadMaterial,
          unidad_medida_evento: unidad,
          causa_descarte_pre_embolsado: causa,
          evidencia_ids: evidenciaIds,
          observaciones: observaciones.trim() || undefined,
        },
        authId,
      )
      setStep('done')
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'No pudimos registrar el descarte pre-embolsado.',
      )
      setStep('form')
    }
  }

  const pendingMsg = !canSubmit && !submitting ? 'Completá los campos obligatorios' : undefined
  const causaLabel = getCausaLabel(causa)

  return (
    <>
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 pb-[230px]">
        <div className="flex items-start gap-2 rounded-2xl bg-danger-50 px-3 py-2.5 text-xs font-semibold text-danger-700 ring-1 ring-danger-200">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
          <span>
            Este evento descarta todo el material en proceso y finaliza el lote. No registra
            plantas vivas ni merma de saldo vivo.
          </span>
        </div>

        {!actionAvailable && (
          <p className="rounded-2xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200">
            El lote no está disponible para descarte pre-embolsado.
          </p>
        )}

        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning-50 text-warning-700">
              <Icon name="package" className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
                Material afectado
              </p>
              <p className="text-base font-extrabold text-brand-700">
                {cantidadMaterial}{' '}
                <span className="text-sm font-bold text-brand-500">
                  {formatUnidadCanonicaDisplay(unidad, cantidadMaterial)}
                </span>
              </p>
              <p className="mt-1 text-[11px] font-semibold text-brand-500">
                Cantidad total del inicio. No permite descarte parcial.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-brand-700">Causa del descarte</p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-danger-500">
              Obligatorio
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {CAUSAS.map((item) => {
              const isSelected = causa === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCausa(item.key)}
                  disabled={submitting}
                  className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                    isSelected
                      ? 'border-danger-300 bg-danger-50 text-danger-700 shadow-soft'
                      : 'border-brand-100 bg-white text-brand-700 hover:border-brand-200'
                  }`}
                >
                  <span className="block text-sm font-extrabold">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold opacity-75">
                    {item.description}
                  </span>
                </button>
              )
            })}
          </div>
          {showErrors && !causaValid && (
            <p className="mt-2 text-xs font-semibold text-danger-500">Seleccioná una causa.</p>
          )}
        </section>

        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <FechaCard
            value={fecha}
            onChange={setFecha}
            min={fechaMin}
            max={fechaMax}
            showError={showErrors && !fechaValid}
            errorMessage={`Fecha entre ${fechaMin} y hoy.`}
            disabled={submitting}
          />
        </section>

        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <FotosUploader
            photos={photos}
            onAdd={addPhotos}
            onRemove={removePhoto}
            required
            showError={showErrors && !fotosValid}
            errorMessage="Adjuntá al menos una foto del descarte pre-embolsado."
            disabled={submitting}
          />
        </section>

        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <ObservacionesCard
            value={observaciones}
            onChange={setObservaciones}
            maxLength={1000}
            disabled={submitting}
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
        label="Confirmar descarte"
        loading={submitting}
        loadingLabel="Registrando..."
        disabled={!canSubmit}
        hint={pendingMsg}
        variant="red"
      />

      <ConfirmDialog
        open={step === 'confirming'}
        variant="danger"
        iconName="trash"
        title="Confirmar descarte pre-embolsado"
        description={`Se descartarán ${cantidadMaterial} ${formatUnidadCanonicaDisplay(
          unidad,
          cantidadMaterial,
        )} por ${causaLabel}. El lote quedará finalizado.`}
        confirmLabel="Sí, descartar y cerrar"
        cancelLabel="Cancelar"
        onConfirm={runSubmit}
        onCancel={() => setStep('form')}
      />

      {step === 'submitting' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-danger-600" />
            </div>
            <h2 className="text-base font-extrabold text-brand-700">
              Registrando descarte...
            </h2>
            <p className="mt-1 text-sm font-semibold text-brand-500">
              Estamos guardando el evento y el cierre del lote.
            </p>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 pt-8 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-soft ring-1 ring-black/5">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Icon name="check" className="h-6 w-6" />
            </div>
            <h2 className="text-base font-extrabold text-brand-700">Lote finalizado</h2>
            <p className="mt-1 text-sm font-semibold text-brand-500">
              El descarte pre-embolsado quedó registrado.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default DescartePreEmbolsadoForm
