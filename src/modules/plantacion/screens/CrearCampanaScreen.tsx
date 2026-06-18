import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import {
  CrearCampaniaStepDatos,
  CrearCampaniaStepOrganizaciones,
  CrearCampaniaStepResumen,
  ProgressDots,
} from '../components/CrearCampaniaSteps'
import type { Organizacion } from '../types/contracts'
import {
  validateCrearCampaniaStep,
  type CrearCampaniaFormValues,
} from '../utils/crearCampaniaForm'

function getStepLabel(step: number): string {
  if (step === 1) return 'Datos generales'
  if (step === 2) return 'Organizaciones'
  return 'Revisión'
}

function CrearCampanaScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
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
  const [orgLoading, setOrgLoading] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canCreate = (user?.rol ?? '').toUpperCase() === 'ADMIN'

  const organizacionesSeleccionadas = useMemo(
    () => organizaciones.filter((org) => values.organizacion_ids.includes(org.id)),
    [organizaciones, values.organizacion_ids],
  )

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
    setStepError(null)
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

  const goNext = () => {
    const validationError = validateCrearCampaniaStep(values, step)
    if (validationError) {
      setStepError(validationError)
      return
    }
    setStepError(null)
    setStep((current) => Math.min(3, current + 1))
  }

  const goBack = () => {
    setStepError(null)
    setSubmitError(null)
    if (step === 1) {
      navigate('/app/planting')
      return
    }
    setStep((current) => current - 1)
  }

  const handleSubmit = async () => {
    const validationError = validateCrearCampaniaStep(values, 1)
    if (validationError) {
      setStepError(validationError)
      setStep(1)
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
      navigate(`/app/planting/campanias/${campania.id}/subcampanias/new`, {
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
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-700 via-brand-700 to-brand-600" />
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
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] ring-1 ring-white/25">
                Paso {step} de 3
              </span>
            </div>
            <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
              Crear campaña
            </p>
            <h1 className="mt-1 text-[28px] font-extrabold leading-tight">
              {getStepLabel(step)}
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/80">
              La campaña es el contenedor estratégico. Lo operativo se define en sub-campañas.
            </p>
            <ProgressDots step={step} />
          </div>
        </header>

        <main className="flex-1 space-y-4 px-5 pt-4">
          {!canCreate && (
            <div className="rounded-3xl bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800 shadow-soft ring-1 ring-amber-100">
              Solo usuarios ADMIN pueden crear campañas.
            </div>
          )}

          {stepError && (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
              {stepError}
            </div>
          )}

          {step === 1 && <CrearCampaniaStepDatos values={values} onChange={updateValue} />}

          {step === 2 && (
            <CrearCampaniaStepOrganizaciones
              organizaciones={organizaciones}
              selectedIds={values.organizacion_ids}
              loading={orgLoading}
              error={orgError}
              query={orgQuery}
              onQueryChange={setOrgQuery}
              onToggle={toggleOrganizacion}
              onRetry={() => void loadOrganizaciones()}
            />
          )}

          {step === 3 && (
            <CrearCampaniaStepResumen
              values={values}
              organizacionesSeleccionadas={organizacionesSeleccionadas}
            />
          )}

          {submitError && (
            <div className="whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
              {submitError}
            </div>
          )}
        </main>

        <div className="px-5">
          <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99]"
              >
                Continuar
                <Icon name="chevron-right" className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canCreate || submitting}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-extrabold text-white shadow-soft transition active:scale-[0.99] ${
                  !canCreate || submitting
                    ? 'cursor-not-allowed bg-slate-400'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Icon name="check" className="h-5 w-5" />
                {submitting ? 'Creando campaña...' : 'Crear campaña y continuar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CrearCampanaScreen
