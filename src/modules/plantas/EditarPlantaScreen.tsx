import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog'
import CrudHeader from '../../components/crud/CrudHeader'
import { PlantasService } from '../../services/plantas.service'
import type {
  PlantaCatalogo,
  PlantaFormInput,
  TipoPlantaCatalogo,
} from '../../types/plantas.types'
import PlantaForm from './components/PlantaForm'

type ApiError = Error & { status?: number }

function EditarPlantaScreen() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [planta, setPlanta] = useState<PlantaCatalogo | null>(null)
  const [tipos, setTipos] = useState<TipoPlantaCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const cargar = useCallback(async () => {
    if (!id) {
      setLoadError('ID de especie inválido.')
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    setNotFound(false)
    try {
      const [plantaData, tiposData] = await Promise.all([
        PlantasService.getPlanta(id),
        PlantasService.getTiposPlantas(),
      ])
      setPlanta(plantaData)
      setTipos(tiposData)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError?.status === 404) {
        setNotFound(true)
        return
      }
      setLoadError(apiError?.message || 'No se pudo cargar la especie.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const handleSubmit = async (input: PlantaFormInput) => {
    if (!id || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await PlantasService.updatePlanta(id, input)
      navigate('/app/plantas', {
        state: { successMessage: 'Especie actualizada correctamente.' },
      })
    } catch (err) {
      const apiError = err as ApiError
      if (apiError?.status === 409) {
        setSubmitError('Ya existe una especie con ese nombre científico y variedad.')
      } else if (apiError?.status === 404) {
        setSubmitError('El tipo de planta seleccionado ya no existe.')
      } else if (apiError?.status === 400) {
        setSubmitError(apiError.message || 'Revisa los campos obligatorios.')
      } else {
        setSubmitError(apiError?.message || 'No se pudo actualizar la especie.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDesactivar = async () => {
    if (!id || actionLoading) return
    setActionLoading(true)
    setSubmitError(null)
    try {
      await PlantasService.desactivarPlanta(id)
      navigate('/app/plantas', {
        state: { successMessage: 'Especie desactivada correctamente.' },
      })
    } catch (err) {
      const apiError = err as ApiError
      setSubmitError(apiError?.message || 'No se pudo desactivar la especie.')
    } finally {
      setActionLoading(false)
      setConfirmOpen(false)
    }
  }

  const handleReactivar = async () => {
    if (!id || actionLoading) return
    setActionLoading(true)
    setSubmitError(null)
    try {
      await PlantasService.reactivarPlanta(id)
      navigate('/app/plantas', {
        state: { successMessage: 'Especie reactivada correctamente.' },
      })
    } catch (err) {
      const apiError = err as ApiError
      setSubmitError(apiError?.message || 'No se pudo reactivar la especie.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
        <CrudHeader title="Editar especie" backTo="/app/plantas" />
        <section className="rounded-2xl bg-white px-4 py-6 text-center text-sm font-semibold text-brand-600 shadow-soft ring-1 ring-black/5">
          Cargando especie...
        </section>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
        <CrudHeader title="Editar especie" backTo="/app/plantas" />
        <section className="rounded-2xl bg-white px-4 py-6 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-base font-semibold text-brand-700">Especie no encontrada</p>
          <button
            type="button"
            onClick={() => navigate('/app/plantas')}
            className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Volver al listado
          </button>
        </section>
      </div>
    )
  }

  if (loadError || !planta) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
        <CrudHeader title="Editar especie" backTo="/app/plantas" />
        <section className="rounded-2xl bg-red-50 px-4 py-4 text-center shadow-soft ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">{loadError || 'No se pudo cargar la especie.'}</p>
          <button
            type="button"
            onClick={() => void cargar()}
            className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200"
          >
            Reintentar
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
      <CrudHeader
        title="Editar especie"
        subtitle={planta.nombre_comun_principal || planta.especie}
        backTo="/app/plantas"
      />

      {!planta.activo && (
        <section className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 shadow-soft ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-700">
            Esta especie está inactiva. No aparece en los selectores hasta que la reactives.
          </p>
        </section>
      )}

      <PlantaForm
        mode="edit"
        initial={planta}
        tiposPlantas={tipos}
        submitting={submitting}
        submitError={submitError}
        onSubmit={handleSubmit}
      />

      <div className="mt-4">
        {planta.activo ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={actionLoading || submitting}
            className="w-full rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading ? 'Desactivando...' : 'Desactivar especie'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleReactivar()}
            disabled={actionLoading || submitting}
            className="w-full rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-soft ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading ? 'Reactivando...' : 'Reactivar especie'}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Desactivar esta especie?"
        description={`"${planta.nombre_comun_principal || planta.especie}" dejará de aparecer en los selectores. Podrás reactivarla más adelante.`}
        confirmLabel="Sí, desactivar"
        cancelLabel="Cancelar"
        variant="danger"
        iconName="trash"
        loading={actionLoading}
        onConfirm={() => void handleDesactivar()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default EditarPlantaScreen
