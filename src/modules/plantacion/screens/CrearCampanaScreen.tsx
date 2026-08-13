import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import heroCanopy from '../../../assets/home/hero-canopy.webp'
import Icon from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import {
  CrearCampaniaFormFields,
  OrganizacionSelector,
} from '../components/CrearCampaniaForm'
import type { Organizacion } from '../types/contracts'
import {
  validateCrearCampaniaForm,
  type CrearCampaniaFormValues,
} from '../utils/crearCampaniaForm'

function CrearCampanaScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [values, setValues] = useState<CrearCampaniaFormValues>({
    nombre: '',
    tipo: '',
    descripcion: '',
    fecha_estimada_inicio: '',
    fecha_estimada_fin: '',
    organizacion_ids: [],
  })
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([])
  const [orgQuery, setOrgQuery] = useState('')
  const [orgSelectorOpen, setOrgSelectorOpen] = useState(false)
  const [orgLoading, setOrgLoading] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canCreate = (user?.rol ?? '').toUpperCase() === 'ADMIN'

  const loadOrganizaciones = async () => {
    try {
      setOrgLoading(true)
      setOrgError(null)
      const data = await PlantacionService.listOrganizaciones({ activo: true })
      setOrganizaciones(data)
    } catch (loadError) {
      setOrganizaciones([])
      setOrgError(
        loadError instanceof Error ? loadError.message : 'No se pudieron cargar organizaciones.',
      )
    } finally {
      setOrgLoading(false)
    }
  }

  useEffect(() => {
    void loadOrganizaciones()
  }, [])

  const updateValue = <K extends keyof CrearCampaniaFormValues>(
    key: K,
    value: CrearCampaniaFormValues[K],
  ) => {
    setFormError(null)
    setSubmitError(null)
    setValues((current) => ({ ...current, [key]: value }))
  }

  const toggleOrganizacion = (id: number) => {
    setValues((current) => {
      const exists = current.organizacion_ids.includes(id)
      return {
        ...current,
        organizacion_ids: exists
          ? current.organizacion_ids.filter((currentId) => currentId !== id)
          : [...current.organizacion_ids, id],
      }
    })
  }

  const goBack = () => {
    setFormError(null)
    setSubmitError(null)
    navigate('/app/planting')
  }

  const handleSubmit = async () => {
    const validationError = validateCrearCampaniaForm(values)
    if (validationError) {
      setFormError(validationError)
      return
    }
    if (!values.tipo) return

    try {
      setSubmitting(true)
      setSubmitError(null)
      const campania = await PlantacionService.createCampania(
        {
          nombre: values.nombre,
          tipo: values.tipo,
          descripcion: values.descripcion,
          fecha_estimada_inicio: values.fecha_estimada_inicio,
          fecha_estimada_fin: values.fecha_estimada_fin,
          organizacion_ids: values.organizacion_ids,
        },
        user?.auth_id,
      )
      navigate(`/app/planting/campanias/${campania.id}`, {
        replace: true,
        state: { campania },
      })
    } catch (submitErrorValue) {
      setSubmitError(
        submitErrorValue instanceof Error
          ? submitErrorValue.message
          : 'No se pudo crear la campaña.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
          <img
            src={heroCanopy}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-700/90 via-brand-700/85 to-brand-700" />
          <div className="relative px-5 pb-5 pt-6">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                aria-label="Volver"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              >
                <Icon name="arrow-left" className="h-5 w-5" />
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] ring-1 ring-white/25">
                <Icon name="planting" className="h-3.5 w-3.5" />
                Campaña general
              </span>
            </div>
            <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
              Crear campaña
            </p>
            <h1 className="mt-1 text-[28px] font-extrabold leading-tight">Datos generales</h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/80">
              Cada campaña tiene subcampañas.
            </p>
          </div>
        </header>

        <main className="flex-1 space-y-4 px-5 pt-4">
          {!canCreate && (
            <div className="rounded-3xl bg-warning-50 px-4 py-4 text-sm font-semibold text-warning-800 shadow-soft ring-1 ring-warning-100">
              Solo usuarios ADMIN pueden crear campañas para cada comunidad.
            </div>
          )}

          {formError && (
            <div className="rounded-2xl bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-800 ring-1 ring-warning-100">
              {formError}
            </div>
          )}

          <CrearCampaniaFormFields
            values={values}
            onChange={updateValue}
            organizationSelector={
              <OrganizacionSelector
                organizaciones={organizaciones}
                selectedIds={values.organizacion_ids}
                loading={orgLoading}
                error={orgError}
                query={orgQuery}
                open={orgSelectorOpen}
                onOpen={() => setOrgSelectorOpen(true)}
                onClose={() => setOrgSelectorOpen(false)}
                onQueryChange={setOrgQuery}
                onToggle={toggleOrganizacion}
                onRetry={() => void loadOrganizaciones()}
              />
            }
          />

          {submitError && (
            <div className="whitespace-pre-line rounded-2xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700 ring-1 ring-danger-200">
              {submitError}
            </div>
          )}
        </main>

        <div className="px-5">
          <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-brand-50 via-brand-50/95 to-transparent px-5 pb-5 pt-3">
            {/* CTA de confirmación en verde success: `success` no es variante de
                <Button> (que usa el verde brand); se mantiene a medida con tokens
                migrados para preservar el verde de acción. (gotcha §6.6) */}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canCreate || submitting}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-extrabold text-white shadow-soft transition active:scale-[0.99] ${
                !canCreate || submitting
                  ? 'cursor-not-allowed bg-neutral-400'
                  : 'bg-success-600 hover:bg-success-700'
              }`}
            >
              <Icon name="check" className="h-5 w-5" />
              {submitting ? 'Creando campaña...' : 'Crear campaña'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CrearCampanaScreen
