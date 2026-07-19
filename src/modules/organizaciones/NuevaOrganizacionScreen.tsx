import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CrudHeader from '../../components/crud/CrudHeader'
import { OrganizacionesService } from '../../services/organizaciones.service'
import type { OrganizacionFormInput } from './types'
import OrganizacionForm from './components/OrganizacionForm'

type ApiError = Error & { status?: number }

function NuevaOrganizacionScreen() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (input: OrganizacionFormInput) => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      await OrganizacionesService.createOrganizacion(input)
      navigate('/app/organizaciones', {
        state: { successMessage: 'Organización creada correctamente.' },
      })
    } catch (err) {
      const apiError = err as ApiError
      if (apiError?.status === 409) {
        setSubmitError('Ya existe una organización con ese nombre.')
      } else if (apiError?.status === 400) {
        setSubmitError(apiError.message || 'Revisa los campos obligatorios.')
      } else {
        setSubmitError(apiError?.message || 'No se pudo crear la organización.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
      <CrudHeader
        title="Nueva organización"
        subtitle="Registra una institución aliada o responsable"
        backTo="/app/organizaciones"
      />

      <OrganizacionForm
        mode="create"
        submitting={submitting}
        submitError={submitError}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default NuevaOrganizacionScreen
