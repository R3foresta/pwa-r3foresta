import { useEffect, useRef, useState } from 'react'
import Icon from '../../../../../components/Icon'
import { useAuth } from '../../../../../contexts/AuthContext'
import { LotesViveroService } from '../../../../../services/lotes-vivero.service'
import SelectorComunidad from '../../../../comunidades/SelectorComunidad'
import type { ComunidadCard } from '../../../../../tipos/comunidades'
import { todayLocalISO } from '../../../../../utils/validations/date'
import type { DestinoTipoVivero, LoteViveroItem } from '../../../types/contracts'
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

const DESTINOS: { key: DestinoTipoVivero; label: string; hint: string }[] = [
  { key: 'PLANTACION_PROPIA', label: 'Plantación propia', hint: 'Terreno operado por R3foresta' },
  { key: 'DONACION_COMUNIDAD', label: 'Donación a comunidad', hint: 'Entrega vinculada a una comunidad' },
  { key: 'VENTA', label: 'Venta', hint: 'Salida comercial' },
  { key: 'OTRO', label: 'Otro', hint: 'Detallar en referencia' },
]

const FORM_ID = 'vivero-despacho-form'
const DEFAULT_PAIS_ID = 1

function DespachoForm({ lote, onCompleted }: Props) {
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const today = todayLocalISO()
  const fechaMin = lote.fecha_inicio
  const fechaMax = today
  const saldoVivo = lote.saldo_vivo_actual ?? 0

  const [cantidad, setCantidad] = useState('')
  const [destino, setDestino] = useState<DestinoTipoVivero | ''>('')
  const [referencia, setReferencia] = useState('')
  const [comunidad, setComunidad] = useState<ComunidadCard | null>(null)
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
  const finalizaLote = cantidadValid && saldoDespues === 0

  const destinoValid = destino !== ''
  const referenciaValid = referencia.trim().length >= 3
  const requiereComunidad = destino === 'DONACION_COMUNIDAD'
  const comunidadValid = !requiereComunidad || comunidad !== null
  const fechaValid = fecha >= fechaMin && fecha <= fechaMax
  const fotosValid = photos.length >= 1 && photos.length <= 5

  const canSubmit =
    cantidadValid &&
    destinoValid &&
    referenciaValid &&
    comunidadValid &&
    fechaValid &&
    fotosValid &&
    !!authId &&
    !submitting

  const cantidadError = !cantidad
    ? 'Ingresá las plantas a despachar.'
    : !Number.isFinite(cantidadNum) || cantidadNum <= 0
      ? 'La cantidad debe ser mayor a 0.'
      : !Number.isInteger(cantidadNum)
        ? 'Solo se aceptan enteros.'
        : cantidadNum > saldoVivo
          ? `Máx ${saldoVivo} plantas (saldo vivo).`
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
      // TODO(backend-anomalía): RF-VIV-05 exige evidencia obligatoria en despacho,
      // pero el contrato actual de `RegistrarDespachoRequest` NO incluye
      // `evidencia_ids`. Tampoco existe `POST /lotes-vivero/:id/despacho/evidencias-pendientes`.
      // Por ahora las fotos del FotosUploader quedan en estado local y se descartan al confirmar.
      // Confirmar con backend si es olvido o decisión.
      await LotesViveroService.registrarDespacho(
        lote.id,
        {
          fecha_evento: fecha,
          cantidad_afectada: cantidadNum,
          destino_tipo: destino as DestinoTipoVivero,
          destino_referencia: referencia.trim(),
          comunidad_destino_id: requiereComunidad ? comunidad?.id : undefined,
          observaciones: observaciones.trim() || undefined,
        },
        authId,
      )
      onCompleted()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar el despacho.')
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
            Esta acción reduce el inventario vivo del lote. Los despachos parciales son
            permitidos.
            {finalizaLote && ' Saldo en 0 finaliza automáticamente el lote.'}
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
              finalizaLote
                ? 'bg-slate-50 ring-slate-200'
                : cantidadValid
                  ? 'bg-emerald-50 ring-emerald-200'
                  : 'bg-white ring-black/5'
            }`}
          >
            <p
              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                finalizaLote ? 'text-slate-600' : cantidadValid ? 'text-emerald-700' : 'text-brand-500'
              }`}
            >
              Saldo después
            </p>
            <p
              className={`mt-1 text-2xl font-extrabold leading-none ${
                finalizaLote ? 'text-slate-700' : cantidadValid ? 'text-emerald-700' : 'text-brand-300'
              }`}
            >
              {cantidadValid ? saldoDespues : '—'}
              {cantidadValid && (
                <span
                  className={`ml-1 text-xs font-bold ${
                    finalizaLote ? 'text-slate-500' : 'text-emerald-500'
                  }`}
                >
                  plantas
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Cantidad a despachar */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <CantidadStepper
            value={cantidad}
            onChange={setCantidad}
            max={saldoVivo}
            min={0}
            label="Plantas a despachar"
            unit="plantas"
            quickPercentages={[25, 50, 80, 100]}
            showError={showErrors && !cantidadValid}
            errorMessage={cantidadError ?? undefined}
            disabled={submitting}
          />
        </section>

        {/* Tipo de destino */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-brand-700">Tipo de destino</p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
              Obligatorio
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {DESTINOS.map((d) => {
              const isSelected = destino === d.key
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDestino(d.key)}
                  disabled={submitting}
                  className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left transition ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-soft'
                      : 'border-brand-100 bg-white text-brand-700 hover:border-brand-200'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold">{d.label}</p>
                    <p className="text-[11px] font-semibold text-brand-500">{d.hint}</p>
                  </div>
                  {isSelected && <Icon name="check" className="h-5 w-5 text-emerald-600" />}
                </button>
              )
            })}
          </div>
          {showErrors && !destinoValid && (
            <p className="mt-2 text-xs font-semibold text-red-500">
              Seleccioná el tipo de destino.
            </p>
          )}
        </section>

        {/* Comunidad destino (solo si DONACION_COMUNIDAD) */}
        {requiereComunidad && (
          <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
            <SelectorComunidad
              paisId={DEFAULT_PAIS_ID}
              valueId={comunidad?.id}
              onChange={setComunidad}
              label="Comunidad destino"
              placeholder="Buscar comunidad…"
              error={showErrors && !comunidadValid}
              disabled={submitting}
            />
            {showErrors && !comunidadValid && (
              <p className="mt-2 text-xs font-semibold text-red-500">
                Seleccioná una comunidad.
              </p>
            )}
          </section>
        )}

        {/* Referencia */}
        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-brand-700">Referencia del destino</p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
              Obligatorio
            </span>
          </div>
          <input
            type="text"
            value={referencia}
            onChange={(event) => setReferencia(event.target.value.slice(0, 200))}
            placeholder="Nombre de la plantación, beneficiario, comprador…"
            disabled={submitting}
            className={`w-full rounded-2xl border px-3 py-2.5 text-sm font-semibold text-brand-700 outline-none transition ${
              showErrors && !referenciaValid
                ? 'border-red-300 bg-red-50'
                : 'border-brand-100 bg-white focus:border-brand-300'
            }`}
          />
          {showErrors && !referenciaValid && (
            <p className="mt-2 text-xs font-semibold text-red-500">
              Mínimo 3 caracteres.
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
            errorMessage="Adjuntá al menos una foto del despacho."
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
        label={finalizaLote ? 'Confirmar y cerrar lote' : 'Confirmar despacho'}
        loading={submitting}
        loadingLabel="Registrando…"
        disabled={!canSubmit}
        hint={pendingMsg}
        variant="emerald"
      />
    </>
  )
}

export default DespachoForm
