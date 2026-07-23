import { useEffect, useRef, useState } from 'react'
import Icon from '../../../../../components/Icon'
import { Button } from '../../../../../components/ui'
import { useAuth } from '../../../../../contexts/AuthContext'
import { LotesViveroService } from '../../../../../services/lotes-vivero.service'
import { PlantacionService } from '../../../../../services/plantacion.service'
import type { Campania, Subcampania } from '../../../../plantacion/types/contracts'
import { todayLocalISO } from '../../../../../utils/validations/date'
import type { LoteViveroItem, PropositoAsignacionVivero } from '../../../types/contracts'
import CantidadStepper from '../CantidadStepper'
import EventoCTABar from '../EventoCTABar'
import FechaCard from '../FechaCard'
import FotosUploader, { type Photo } from '../FotosUploader'

type Props = {
  lote: LoteViveroItem
  /**
   * Se llama al cerrar el diálogo de éxito. El caller (ViveroEventScreen) navega
   * de vuelta al detalle abriendo la pestaña `Asignaciones`, que vuelve a
   * consultar el saldo y el listado ya actualizados.
   */
  onCompleted: () => void
}

type AsignacionSuccess = {
  destino: string
  cantidad: number
  proposito: string
  loteFinalizado: boolean
}

const FORM_ID = 'vivero-asignacion-form'

const PROPOSITOS: Array<{
  key: PropositoAsignacionVivero
  label: string
  hint: string
}> = [
  {
    key: 'PLANTACION_INICIAL',
    label: 'Inicial',
    hint: 'Entrega para plantar y avanzar la meta.',
  },
  {
    key: 'REPOSICION',
    label: 'Reposicion',
    hint: 'Entrega para reemplazar arboles perdidos.',
  },
]

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
            Ver asignaciones
          </Button>
        </div>
      </div>
    </div>
  )
}

function AsignacionForm({ lote, onCompleted }: Props) {
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  // Modelo fisico: asignar = entregar. El maximo entregable es el saldo vivo
  // actual del lote (ya no existe el calculo "vivo - reservado").
  const saldoVivo = lote.saldo_vivo_actual ?? 0
  const estadoLote = lote.estado_lote ?? 'ACTIVO'
  const loteActivo = estadoLote === 'ACTIVO'
  const maxAsignable = saldoVivo
  // Entregado a subcampanias (informativo): ya salio del vivero al asignar.
  const entregadoSubcampanias = lote.saldo_asignado_subcampanias ?? 0

  const today = todayLocalISO()
  const fechaMin = (lote.fecha_inicio ? lote.fecha_inicio.split('T')[0] : '') || '2020-01-01'
  const fechaMax = today

  const [campanias, setCampanias] = useState<Campania[]>([])
  const [campaniaId, setCampaniaId] = useState('')
  const [subcampanias, setSubcampanias] = useState<Subcampania[]>([])
  const [subcampaniasLoading, setSubcampaniasLoading] = useState(false)
  const [subcampaniaId, setSubcampaniaId] = useState('')
  const [proposito, setProposito] = useState<PropositoAsignacionVivero>('PLANTACION_INICIAL')
  const [cantidad, setCantidad] = useState('')
  const [fecha, setFecha] = useState(today)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [assignmentSuccess, setAssignmentSuccess] = useState<AsignacionSuccess | null>(null)

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

  const saldoDespues = cantidadValid ? saldoVivo - cantidadNum : saldoVivo
  const finalizaLote = cantidadValid && saldoDespues === 0

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

  // Paso 1: campañas disponibles como destino. La subcampaña real se elige
  // despues, ya filtrada por esta campaña (ver efecto siguiente).
  useEffect(() => {
    PlantacionService.listCampanias()
      .then((data) => setCampanias(data))
      .catch((err) =>
        setSubmitError(err instanceof Error ? err.message : 'Error al cargar campañas.'),
      )
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
        if (active)
          setSubmitError(err instanceof Error ? err.message : 'Error al cargar subcampañas.')
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar la entrega.')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingMsg =
    !canCreate && !submitting
      ? !loteActivo
        ? `El lote esta ${estadoLote} y no acepta nuevas entregas.`
        : maxAsignable <= 0
          ? 'No hay saldo vivo en el lote para entregar.'
          : 'Completa los campos obligatorios'
      : undefined

  return (
    <>
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 pb-[230px]">
        <div className="flex items-start gap-2 rounded-2xl bg-success-50 px-3 py-2.5 text-xs font-semibold text-success-800 ring-1 ring-success-200">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
          <span>
            Asignacion a subcampania: es una entrega fisica que descuenta de inmediato el saldo
            vivo del vivero. Requiere campania, subcampania y foto.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-success-50 px-3 py-3 shadow-soft ring-1 ring-success-200">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-success-700">
              En vivero
            </p>
            <p className="mt-1 text-xl font-extrabold leading-none text-success-700">{saldoVivo}</p>
          </div>
          <div className="rounded-2xl bg-white px-3 py-3 shadow-soft ring-1 ring-black/5">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-brand-500">
              Entregado a subcampanias
            </p>
            <p className="mt-1 text-xl font-extrabold leading-none text-brand-700">
              {entregadoSubcampanias}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white px-3 py-3 shadow-soft ring-1 ring-black/5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
            Saldo vivo despues
          </p>
          <p className="mt-1 text-2xl font-extrabold leading-none text-brand-700">
            {cantidadValid ? saldoDespues : '-'}
          </p>
        </div>

        {!loteActivo && (
          <div className="rounded-2xl bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-600 ring-1 ring-neutral-200">
            El lote esta en estado {estadoLote} y no acepta nuevas entregas.
          </div>
        )}

        {maxAsignable <= 0 && loteActivo && (
          <div className="rounded-2xl bg-warning-50 px-3 py-2 text-xs font-bold text-warning-800 ring-1 ring-warning-200">
            No hay saldo vivo en el lote para entregar.
          </div>
        )}

        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
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
                  ? 'border-danger-300 bg-danger-50'
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
              <p className="mt-1 text-xs font-semibold text-danger-500">Selecciona una campaña.</p>
            )}
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-brand-500">
              Subcampania destino
            </span>
            <select
              value={subcampaniaId}
              onChange={(event) => setSubcampaniaId(event.target.value)}
              disabled={
                submitting || !campaniaValid || subcampaniasLoading || subcampanias.length === 0
              }
              className={`w-full rounded-2xl border px-3 py-3 text-sm font-extrabold text-brand-700 outline-none transition ${
                showErrors && !subcampaniaValid
                  ? 'border-danger-300 bg-danger-50'
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
              <p className="mt-1 text-xs font-semibold text-danger-500">
                Selecciona una subcampania.
              </p>
            )}
          </label>
        </section>

        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
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
                        ? 'bg-warning-50 text-warning-800 ring-warning-200'
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
        </section>

        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
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
        </section>

        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
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
        </section>

        <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <FotosUploader
            photos={photos}
            onAdd={addPhotos}
            onRemove={removePhoto}
            required
            showError={showErrors && !fotosValid}
            errorMessage="Adjunta al menos una foto de la entrega."
            disabled={submitting || !loteActivo}
          />
        </section>

        {finalizaLote && (
          <div className="flex items-start gap-2 rounded-2xl bg-danger-50 px-3 py-2.5 text-xs font-extrabold text-danger-700 ring-1 ring-danger-200">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
            <span>Esta entrega dejara el lote en 0 y lo cerrara automaticamente.</span>
          </div>
        )}

        {submitError && (
          <p className="whitespace-pre-line rounded-2xl bg-danger-50 px-3 py-2 text-center text-xs font-semibold text-danger-600 ring-1 ring-danger-200">
            {submitError}
          </p>
        )}
      </form>

      <EventoCTABar
        formId={FORM_ID}
        label={finalizaLote ? 'Entregar y cerrar lote' : 'Confirmar entrega'}
        loading={submitting}
        loadingLabel="Entregando..."
        disabled={!canCreate}
        hint={pendingMsg}
        variant="emerald"
      />

      <AssignmentSuccessDialog
        success={assignmentSuccess}
        onClose={() => {
          setAssignmentSuccess(null)
          onCompleted()
        }}
      />
    </>
  )
}

export default AsignacionForm
