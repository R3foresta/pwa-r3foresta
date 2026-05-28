import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../../../../components/Icon'
import { useAuth } from '../../../../../contexts/AuthContext'
import { LotesViveroService } from '../../../../../services/lotes-vivero.service'
import { formatUnidadCanonicaDisplay } from '../../../../../utils/recoleccionUnidad'
import { addDaysLocalISO, todayLocalISO } from '../../../../../utils/validations/date'
import type { LoteViveroItem } from '../../../types/contracts'
import CantidadStepper from '../CantidadStepper'
import EventoCTABar from '../EventoCTABar'
import FechaCard from '../FechaCard'
import FotosUploader from '../FotosUploader'
import type { Photo } from '../FotosUploader'
import ObservacionesCard from '../ObservacionesCard'

type Props = {
  lote: LoteViveroItem
  onCompleted: () => void
}

const FORM_ID = 'vivero-embolsado-form'

function maxOfDates(a: string, b: string): string {
  return a > b ? a : b
}

function EmbolsadoForm({ lote, onCompleted }: Props) {
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const today = todayLocalISO()
  const tipoMaterial = lote.tipo_material_snapshot
  const cap = tipoMaterial === 'ESQUEJE' ? lote.cantidad_inicial_en_proceso : null
  const softWarningThreshold =
    tipoMaterial === 'SEMILLA' ? lote.cantidad_inicial_en_proceso * 10 : null

  // fechaMin: no antes del inicio del lote NI más de 10 días antes de hoy
  const fechaMin = maxOfDates(lote.fecha_inicio, addDaysLocalISO(today, -10))
  const fechaMax = today

  const [cantidad, setCantidad] = useState('')
  const [fecha, setFecha] = useState(today)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [observaciones, setObservaciones] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Cleanup previews on unmount
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

  const cantidadNum = Number(cantidad)
  const cantidadValid =
    Number.isFinite(cantidadNum) &&
    cantidadNum > 0 &&
    Number.isInteger(cantidadNum) &&
    (cap === null || cantidadNum <= cap)

  const cantidadError = useMemo(() => {
    if (!cantidad) return 'Ingresá la cantidad de plantas vivas.'
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0)
      return 'La cantidad debe ser mayor a 0.'
    if (!Number.isInteger(cantidadNum)) return 'Solo se aceptan enteros.'
    if (cap !== null && cantidadNum > cap)
      return `Máx ${cap} plantas (origen ESQUEJE limita el total).`
    return null
  }, [cantidad, cantidadNum, cap])

  const showSoftWarning =
    softWarningThreshold !== null &&
    cantidadValid &&
    cantidadNum > softWarningThreshold

  const fechaValid = fecha && fecha >= fechaMin && fecha <= fechaMax
  const fotosValid = photos.length >= 1 && photos.length <= 5

  const canSubmit = cantidadValid && fechaValid && fotosValid && !!authId && !submitting

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const upload = await LotesViveroService.uploadEvidenciasEvento(
        lote.id,
        'EMBOLSADO',
        {
          fotos: photos.map((p) => p.file),
          titulo: 'Embolsado de lote vivero',
          descripcion: observaciones.trim() || 'Evidencia de embolsado',
          metadata: { fuente: 'pwa-r3foresta', modulo: 'vivero', etapa: 'EMBOLSADO' },
          tomado_en: new Date().toISOString(),
        },
        authId,
      )
      await LotesViveroService.registrarEmbolsado(
        lote.id,
        {
          fecha_evento: fecha,
          plantas_vivas_iniciales: cantidadNum,
          evidencia_ids: upload.data.evidencia_ids,
          observaciones: observaciones.trim() || undefined,
        },
        authId,
      )
      onCompleted()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar el embolsado.')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingMsg = !canSubmit && !submitting ? 'Completá los campos obligatorios' : undefined

  return (
    <>
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 pb-[230px]">
        {/* Contexto del lote */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Icon name="package" className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
                Material en proceso
              </p>
              <p className="text-base font-extrabold text-brand-700">
                {lote.cantidad_inicial_en_proceso}{' '}
                <span className="text-sm font-bold text-brand-500">
                  {formatUnidadCanonicaDisplay(
                    lote.unidad_medida_inicial,
                    lote.cantidad_inicial_en_proceso,
                  )}
                </span>{' '}
                <span className="text-xs font-semibold text-brand-400">· {tipoMaterial}</span>
              </p>
              <p className="mt-1 text-[11px] font-semibold text-brand-500">
                El embolsado inaugura el conteo oficial de plantas vivas.
              </p>
            </div>
          </div>
        </section>

        {/* Cantidad de plantas vivas */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <CantidadStepper
            value={cantidad}
            onChange={setCantidad}
            max={cap}
            min={0}
            label="Plantas vivas registradas"
            unit="plantas"
            quickPercentages={cap !== null ? [25, 50, 80, 100] : undefined}
            showError={showErrors && !cantidadValid}
            errorMessage={cantidadError ?? undefined}
            hint={
              cap !== null
                ? `Origen ESQUEJE: máx ${cap} plantas.`
                : 'Origen SEMILLA: ingresá la cantidad observada.'
            }
            disabled={submitting}
          />
          {showSoftWarning && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Cantidad inusualmente alta para {lote.cantidad_inicial_en_proceso} g de semillas.
                Verificá el conteo antes de confirmar.
              </span>
            </div>
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
            errorMessage={`Fecha entre ${fechaMin} y hoy (máx. 10 días atrás).`}
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
            errorMessage="Adjuntá al menos una foto del embolsado."
            disabled={submitting}
          />
        </section>

        {/* Observaciones */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <ObservacionesCard
            value={observaciones}
            onChange={setObservaciones}
            maxLength={1000}
            disabled={submitting}
          />
        </section>

        {submitError && (
          <p className="whitespace-pre-line rounded-2xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-600 ring-1 ring-red-200">
            {submitError}
          </p>
        )}
      </form>

      <EventoCTABar
        formId={FORM_ID}
        label="Confirmar embolsado"
        loading={submitting}
        loadingLabel="Registrando…"
        disabled={!canSubmit}
        hint={pendingMsg}
        variant="emerald"
      />
    </>
  )
}

export default EmbolsadoForm
