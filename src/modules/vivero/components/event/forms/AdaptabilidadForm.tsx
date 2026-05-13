import { useEffect, useRef, useState } from 'react'
import Icon from '../../../../../components/Icon'
import { useAuth } from '../../../../../contexts/AuthContext'
import { LotesViveroService } from '../../../../../services/lotes-vivero.service'
import { todayLocalISO } from '../../../../../utils/validations/date'
import type { LoteViveroItem, SubetapaAdaptabilidad } from '../../../types/contracts'
import EventoCTABar from '../EventoCTABar'
import FechaCard from '../FechaCard'
import FotosUploader from '../FotosUploader'
import type { Photo } from '../FotosUploader'
import ObservacionesCard from '../ObservacionesCard'

type Props = {
  lote: LoteViveroItem
  onCompleted: () => void
}

const FORM_ID = 'vivero-adaptabilidad-form'

const SUBETAPAS: { key: SubetapaAdaptabilidad; label: string; hint: string }[] = [
  { key: 'SOMBRA', label: 'Sombra', hint: 'Ambiente protegido del sol' },
  { key: 'MEDIA_SOMBRA', label: 'Media sombra', hint: 'Exposición parcial' },
  { key: 'SOL_DIRECTO', label: 'Sol directo', hint: 'Exposición plena' },
]

function AdaptabilidadForm({ lote, onCompleted }: Props) {
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const today = todayLocalISO()
  const fechaMin = lote.fecha_inicio
  const fechaMax = today

  const [subetapa, setSubetapa] = useState<SubetapaAdaptabilidad | ''>('')
  const [fecha, setFecha] = useState(fechaMin > today ? today : today)
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

  const subetapaValid = subetapa !== ''
  const subetapaIsNew = subetapaValid && subetapa !== lote.subetapa_actual
  const fechaValid = fecha >= fechaMin && fecha <= fechaMax
  const canSubmit = subetapaValid && subetapaIsNew && fechaValid && !!authId && !submitting

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
      const upload =
        photos.length > 0
          ? await LotesViveroService.uploadEvidenciasEvento(
              lote.id,
              'ADAPTABILIDAD',
              {
                fotos: photos.map((photo) => photo.file),
                titulo: 'Adaptabilidad de lote vivero',
                descripcion: observaciones.trim() || 'Evidencia de adaptabilidad',
                metadata: {
                  fuente: 'pwa-r3foresta',
                  modulo: 'vivero',
                  etapa: 'ADAPTABILIDAD',
                },
                tomado_en: new Date().toISOString(),
              },
              authId,
            )
          : null

      await LotesViveroService.registrarAdaptabilidad(
        lote.id,
        {
          fecha_evento: fecha,
          subetapa_destino: subetapa as SubetapaAdaptabilidad,
          evidencia_ids: upload?.data.evidencia_ids,
          observaciones: observaciones.trim() || undefined,
        },
        authId,
      )
      onCompleted()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar la adaptabilidad.')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingMsg = !canSubmit && !submitting
    ? subetapaValid && !subetapaIsNew
      ? 'Elegí una subetapa distinta a la actual'
      : 'Completá los campos obligatorios'
    : undefined

  return (
    <>
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 pb-[230px]">
        {/* Banner informativo */}
        <div className="flex items-start gap-2 rounded-2xl bg-sky-50 px-3 py-2.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          <span>
            La adaptabilidad mueve todo el lote a una nueva subetapa. No afecta el saldo vivo
            ({lote.saldo_vivo_actual ?? 0} plantas).
          </span>
        </div>

        {/* Subetapa destino */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-brand-700">Nueva subetapa</p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
              Obligatorio
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {SUBETAPAS.map((s) => {
              const isSelected = subetapa === s.key
              const isCurrent = s.key === lote.subetapa_actual
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSubetapa(s.key)}
                  disabled={submitting}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-brand-300 bg-brand-50 text-brand-700 shadow-soft'
                      : 'border-brand-100 bg-white text-brand-700 hover:border-brand-200'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold">{s.label}</p>
                    <p className="text-[11px] font-semibold text-brand-500">{s.hint}</p>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Actual
                    </span>
                  )}
                  {isSelected && !isCurrent && (
                    <Icon name="check" className="h-5 w-5 text-brand-600" />
                  )}
                </button>
              )
            })}
          </div>
          {showErrors && !subetapaValid && (
            <p className="mt-2 text-xs font-semibold text-red-500">
              Seleccioná la subetapa destino.
            </p>
          )}
          {showErrors && subetapaValid && !subetapaIsNew && (
            <p className="mt-2 text-xs font-semibold text-amber-600">
              El lote ya está en esa subetapa.
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

        {/* Fotos opcionales */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <FotosUploader
            photos={photos}
            onAdd={addPhotos}
            onRemove={removePhoto}
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
        label="Confirmar adaptabilidad"
        loading={submitting}
        loadingLabel="Registrando…"
        disabled={!canSubmit}
        hint={pendingMsg}
        variant="brand"
      />
    </>
  )
}

export default AdaptabilidadForm
