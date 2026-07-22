import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/ui'
import { PlantasService } from '../../services/plantas.service'
import type { PlantaFormInput, TipoPlantaCatalogo } from '../../types/plantas.types'
import PlantaForm from './components/PlantaForm'

type ApiError = Error & { status?: number }

function NuevaPlantaScreen() {
  const navigate = useNavigate()
  const [tipos, setTipos] = useState<TipoPlantaCatalogo[]>([])
  const [loadingTipos, setLoadingTipos] = useState(true)
  const [tiposError, setTiposError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    PlantasService.getTiposPlantas()
      .then((data) => {
        if (cancelled) return
        setTipos(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'No se pudo cargar el catálogo de tipos.'
        setTiposError(message)
      })
      .finally(() => {
        if (!cancelled) setLoadingTipos(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (input: PlantaFormInput) => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await PlantasService.createPlanta(input)
      navigate('/app/plantas', {
        state: { successMessage: 'Especie creada correctamente.' },
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
        setSubmitError(apiError?.message || 'No se pudo crear la especie.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
      <PageHeader
        title="Nueva especie"
        subtitle="Registra una especie en el catálogo botánico"
        backTo="/app/plantas"
      />

      {loadingTipos ? (
        <section className="rounded-2xl bg-white px-4 py-6 text-center text-sm font-semibold text-brand-600 shadow-soft ring-1 ring-black/5">
          Cargando catálogo de tipos...
        </section>
      ) : tiposError ? (
        <section className="rounded-2xl bg-danger-50 px-4 py-4 text-center shadow-soft ring-1 ring-danger-200">
          <p className="text-sm font-semibold text-danger-700">{tiposError}</p>
        </section>
      ) : (
        <PlantaForm
          mode="create"
          tiposPlantas={tipos}
          submitting={submitting}
          submitError={submitError}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

export default NuevaPlantaScreen
