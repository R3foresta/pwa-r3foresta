import { useEffect, useRef, useState } from 'react'
import Icon from '../../../../../components/Icon'
import { useAuth } from '../../../../../contexts/AuthContext'
import { LotesViveroService } from '../../../../../services/lotes-vivero.service'
import { addDaysLocalISO, todayLocalISO } from '../../../../../utils/validations/date'
import type { CausaMermaVivero, LoteViveroItem } from '../../../types/contracts'
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

const CAUSAS: { key: CausaMermaVivero; label: string }[] = [
  { key: 'PLAGA', label: 'Plaga' },
  { key: 'ENFERMEDAD', label: 'Enfermedad' },
  { key: 'SEQUIA', label: 'Sequía' },
  { key: 'DANO_FISICO', label: 'Daño físico' },
  { key: 'MUERTE_NATURAL', label: 'Muerte natural' },
  { key: 'DESCARTE_CALIDAD', label: 'Descarte calidad' },
  { key: 'OTRO', label: 'Otro' },
]

const FORM_ID = 'vivero-merma-form'

function MermaForm({ lote, onCompleted }: Props) {
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const today = todayLocalISO()
  const tenDaysAgo = addDaysLocalISO(today, -10)
  const fechaMin = tenDaysAgo > lote.fecha_inicio ? tenDaysAgo : lote.fecha_inicio
  const fechaMax = today

  const saldoVivo = lote.saldo_vivo_actual ?? 0

  const [cantidad, setCantidad] = useState('')
  const [causa, setCausa] = useState<CausaMermaVivero | ''>('')
  const [fecha, setFecha] = useState(today)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [observaciones, setObservaciones] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
    cantidadNum <= saldoVivo

  const saldoDespues = cantidadValid ? saldoVivo - cantidadNum : saldoVivo
  const causaValid = causa !== ''
  const fechaValid = fecha >= fechaMin && fecha <= fechaMax
  const fotosValid = photos.length >= 1 && photos.length <= 5

  const canSubmit = cantidadValid && causaValid && fechaValid && fotosValid && !!authId && !submitting

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

      await LotesViveroService.registrarMerma(
        lote.id,
        {
          fecha_evento: fecha,
          cantidad_afectada: cantidadNum,
          causa_merma: causa as CausaMermaVivero,
          evidencia_ids: upload.data.evidencia_ids,
          observaciones: observaciones.trim() || undefined,
        },
        authId,
      )
      onCompleted()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar la merma.')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingMsg = !canSubmit && !submitting ? 'Completá los campos obligatorios' : undefined

  return (
    <>
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 pb-[230px]">
        {/* Warning destructivo */}
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
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
                ? 'bg-red-50 ring-red-200'
                : 'bg-white ring-black/5'
            }`}
          >
            <p
              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                cantidadValid ? 'text-red-700' : 'text-brand-500'
              }`}
            >
              Saldo después
            </p>
            <p
              className={`mt-1 text-2xl font-extrabold leading-none ${
                cantidadValid ? 'text-red-700' : 'text-brand-300'
              }`}
            >
              {cantidadValid ? saldoDespues : '—'}
              {cantidadValid && (
                <span className="ml-1 text-xs font-bold text-red-500">plantas</span>
              )}
            </p>
          </div>
        </div>

        {/* Cantidad perdida */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <CantidadStepper
            value={cantidad}
            onChange={setCantidad}
            max={saldoVivo}
            min={0}
            label="Plantas perdidas"
            unit="plantas"
            quickPercentages={[25, 50, 80, 100]}
            showError={showErrors && !cantidadValid}
            errorMessage={cantidadError ?? undefined}
            disabled={submitting}
          />
        </section>

        {/* Causa */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-brand-700">Causa de la merma</p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
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
                  className={`rounded-2xl border px-3 py-2.5 text-sm font-extrabold transition ${
                    isSelected
                      ? 'border-red-300 bg-red-50 text-red-700 shadow-soft'
                      : 'border-brand-100 bg-white text-brand-700 hover:border-brand-200'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
          {showErrors && !causaValid && (
            <p className="mt-2 text-xs font-semibold text-red-500">
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
          />
        </section>

        {submitError && (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-600 ring-1 ring-red-200">
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
    </>
  )
}

export default MermaForm
