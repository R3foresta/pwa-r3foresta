import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog'
import CrudHeader from '../../components/crud/CrudHeader'
import { OrganizacionesService } from '../../services/organizaciones.service'
import type { Organizacion, OrganizacionFormInput } from './types'
import OrganizacionForm from './components/OrganizacionForm'

type ApiError = Error & { status?: number }

function EditarOrganizacionScreen() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [organizacion, setOrganizacion] = useState<Organizacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const cargar = useCallback(async () => {
    if (!id) {
      setLoadError('ID de organización inválido.')
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)
    setNotFound(false)

    try {
      const data = await OrganizacionesService.getOrganizacion(id)
      setOrganizacion(data)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError?.status === 404) {
        setNotFound(true)
        setOrganizacion(null)
        return
      }
      setLoadError(apiError?.message || 'No se pudo cargar la organización.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const handleSubmit = async (input: OrganizacionFormInput) => {
    if (!id || submitting) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      await OrganizacionesService.updateOrganizacion(id, input)
      navigate('/app/organizaciones', {
        state: { successMessage: 'Organización actualizada correctamente.' },
      })
    } catch (err) {
      const apiError = err as ApiError
      if (apiError?.status === 409) {
        setSubmitError('Ya existe una organización con ese nombre.')
      } else if (apiError?.status === 400) {
        setSubmitError(apiError.message || 'Revisa los campos obligatorios.')
      } else {
        setSubmitError(apiError?.message || 'No se pudo actualizar la organización.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleBorrar = async () => {
    if (!id || actionLoading) return
    setActionLoading(true)
    setSubmitError(null)

    try {
      const result = await OrganizacionesService.borrarOrganizacion(id)
      navigate('/app/organizaciones', {
        state: { successMessage: result.message },
      })
    } catch (err) {
      const apiError = err as ApiError
      setSubmitError(apiError?.message || 'No se pudo borrar o desactivar la organización.')
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
      await OrganizacionesService.reactivarOrganizacion(id)
      navigate('/app/organizaciones', {
        state: { successMessage: 'Organización reactivada correctamente.' },
      })
    } catch (err) {
      const apiError = err as ApiError
      setSubmitError(apiError?.message || 'No se pudo reactivar la organización.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
        <CrudHeader title="Editar organización" backTo="/app/organizaciones" />
        <section className="rounded-2xl bg-white px-4 py-6 text-center text-sm font-semibold text-brand-600 shadow-soft ring-1 ring-black/5">
          Cargando organización...
        </section>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
        <CrudHeader title="Editar organización" backTo="/app/organizaciones" />
        <section className="rounded-2xl bg-white px-4 py-6 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-base font-semibold text-brand-700">Organización no encontrada</p>
          <button
            type="button"
            onClick={() => navigate('/app/organizaciones')}
            className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Volver al listado
          </button>
        </section>
      </div>
    )
  }

  if (loadError || !organizacion) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
        <CrudHeader title="Editar organización" backTo="/app/organizaciones" />
        <section className="rounded-2xl bg-red-50 px-4 py-4 text-center shadow-soft ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">
            {loadError || 'No se pudo cargar la organización.'}
          </p>
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
        title="Editar organización"
        subtitle={organizacion.nombre}
        backTo="/app/organizaciones"
      />

      {!organizacion.activo && (
        <section className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 shadow-soft ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-700">
            Esta organización está inactiva. No aparece en selectores operativos hasta que la reactives.
          </p>
        </section>
      )}

      <OrganizacionForm
        key={organizacion.id}
        mode="edit"
        initial={organizacion}
        submitting={submitting}
        submitError={submitError}
        onSubmit={handleSubmit}
      />

      <div className="mt-4">
        {organizacion.activo ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={actionLoading || submitting}
            className="w-full rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading ? 'Procesando...' : 'Eliminar o desactivar organización'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleReactivar()}
            disabled={actionLoading || submitting}
            className="w-full rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-soft ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading ? 'Reactivando...' : 'Reactivar organización'}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar o desactivar esta organización?"
        description={`Si "${organizacion.nombre}" no tiene campañas asociadas se eliminará. Si tiene campañas asociadas, quedará inactiva y podrás reactivarla más adelante.`}
        confirmLabel="Sí, continuar"
        cancelLabel="Cancelar"
        variant="danger"
        iconName="trash"
        loading={actionLoading}
        onConfirm={() => void handleBorrar()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default EditarOrganizacionScreen
