import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import heroCanopy from '../../../assets/home/hero-canopy.jpg'
import Icon from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import { CrearCampaniaFormFields } from '../components/CrearCampaniaForm'
import {
  TIPO_CAMPANIA_VALUES,
  type Campania,
  type Subcampania,
  type TipoCampania,
} from '../types/contracts'
import {
  validateCrearCampaniaForm,
  type CrearCampaniaFormValues,
} from '../utils/crearCampaniaForm'

function toDateInput(value?: string | null): string {
  if (!value) return ''
  return value.length >= 10 ? value.slice(0, 10) : value
}

function isValidTipo(value: unknown): value is TipoCampania {
  return (
    typeof value === 'string' &&
    (TIPO_CAMPANIA_VALUES as string[]).includes(value)
  )
}

function areFormValuesEqual(
  a: CrearCampaniaFormValues,
  b: CrearCampaniaFormValues,
): boolean {
  if (a.nombre !== b.nombre) return false
  if (a.tipo !== b.tipo) return false
  if (a.descripcion !== b.descripcion) return false
  if (a.fecha_estimada_inicio !== b.fecha_estimada_inicio) return false
  if (a.fecha_estimada_fin !== b.fecha_estimada_fin) return false
  if (a.organizacion_ids.length !== b.organizacion_ids.length) return false
  for (let i = 0; i < a.organizacion_ids.length; i += 1) {
    if (a.organizacion_ids[i] !== b.organizacion_ids[i]) return false
  }
  return true
}

function EditarCampanaScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { campaniaId } = useParams()
  const numericCampaniaId = Number(campaniaId)
  const hasValidCampaniaId = Number.isFinite(numericCampaniaId) && numericCampaniaId > 0

  const [loading, setLoading] = useState(hasValidCampaniaId)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [campania, setCampania] = useState<Campania | null>(null)
  const [subcampanias, setSubcampanias] = useState<Subcampania[]>([])
  const [values, setValues] = useState<CrearCampaniaFormValues>({
    nombre: '',
    tipo: '',
    descripcion: '',
    fecha_estimada_inicio: '',
    fecha_estimada_fin: '',
    organizacion_ids: [],
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const initialValuesRef = useRef<CrearCampaniaFormValues | null>(null)

  const canEdit = (user?.rol ?? '').toUpperCase() === 'ADMIN'
  const tipoLocked = subcampanias.length > 0

  useEffect(() => {
    if (!hasValidCampaniaId) {
      setLoadError('ID de campaña inválido.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([
      PlantacionService.getCampania(numericCampaniaId),
      PlantacionService.listSubcampaniasByCampania(numericCampaniaId),
    ])
      .then(([campaniaResult, subsResult]) => {
        if (cancelled) return
        setCampania(campaniaResult)
        setSubcampanias(subsResult)
        const nextValues: CrearCampaniaFormValues = {
          nombre: campaniaResult.nombre ?? '',
          tipo: isValidTipo(campaniaResult.tipo) ? campaniaResult.tipo : '',
          descripcion: campaniaResult.descripcion ?? '',
          fecha_estimada_inicio: toDateInput(campaniaResult.fecha_estimada_inicio),
          fecha_estimada_fin: toDateInput(campaniaResult.fecha_estimada_fin),
          organizacion_ids:
            campaniaResult.organizacion_ids ??
            campaniaResult.organizaciones?.map((org) => org.id) ??
            [],
        }
        initialValuesRef.current = nextValues
        setValues(nextValues)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(
          error instanceof Error ? error.message : 'No se pudo cargar la campaña.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hasValidCampaniaId, numericCampaniaId])

  const updateValue = <K extends keyof CrearCampaniaFormValues>(
    key: K,
    value: CrearCampaniaFormValues[K],
  ) => {
    setFormError(null)
    setSubmitError(null)
    setValues((current) => ({ ...current, [key]: value }))
  }

  const isDirty = useMemo(() => {
    if (!initialValuesRef.current) return false
    return !areFormValuesEqual(values, initialValuesRef.current)
  }, [values])

  const goBack = () => {
    if (campania) {
      navigate(`/app/planting/campanias/${campania.id}`)
      return
    }
    navigate('/app/planting')
  }

  const handleSubmit = async () => {
    if (!campania) return

    const validationError = validateCrearCampaniaForm(values)
    if (validationError) {
      setFormError(validationError)
      return
    }
    if (!values.tipo) return

    try {
      setSubmitting(true)
      setSubmitError(null)
      const updated = await PlantacionService.updateCampania(
        campania.id,
        {
          nombre: values.nombre,
          tipo: tipoLocked ? undefined : (values.tipo as TipoCampania),
          descripcion: values.descripcion,
          fecha_estimada_inicio: values.fecha_estimada_inicio,
          fecha_estimada_fin: values.fecha_estimada_fin,
        },
        user?.auth_id,
      )
      navigate(`/app/planting/campanias/${updated.id}`, {
        replace: true,
        state: { campania: updated },
      })
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo actualizar la campaña.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
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
                <Icon name="file" className="h-3.5 w-3.5" />
                Editar campaña
              </span>
            </div>
            <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
              {campania?.codigo_trazabilidad ?? 'Cargando…'}
            </p>
            <h1 className="mt-1 text-[26px] font-extrabold leading-tight">
              {campania?.nombre ?? 'Campaña'}
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/80">
              Actualiza los datos generales. Las organizaciones se gestionan por separado.
            </p>
          </div>
        </header>

        <main className="flex-1 space-y-4 px-5 pt-4">
          {!canEdit && (
            <div className="rounded-3xl bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800 shadow-soft ring-1 ring-amber-100">
              Solo usuarios ADMIN pueden editar campañas.
            </div>
          )}

          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
              Cargando campaña...
            </div>
          )}

          {loadError && !loading && (
            <div className="rounded-3xl bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200">
              {loadError}
            </div>
          )}

          {campania && !loading && !loadError && (
            <>
              {formError && (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
                  {formError}
                </div>
              )}

              <CrearCampaniaFormFields
                values={values}
                onChange={updateValue}
                organizationSelector={null}
                tipoLocked={tipoLocked}
                tipoLockedReason={
                  tipoLocked
                    ? 'No se puede cambiar el tipo porque la campaña ya tiene sub-campañas asociadas.'
                    : undefined
                }
              />

              {submitError && (
                <div className="whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                  {submitError}
                </div>
              )}
            </>
          )}
        </main>

        {campania && !loading && !loadError && (
          <div className="px-5">
            <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canEdit || submitting || !isDirty}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-extrabold text-white shadow-soft transition active:scale-[0.99] ${
                  !canEdit || submitting || !isDirty
                    ? 'cursor-not-allowed bg-slate-400'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Icon name="check" className="h-5 w-5" />
                {submitting
                  ? 'Guardando cambios...'
                  : isDirty
                    ? 'Guardar cambios'
                    : 'Sin cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditarCampanaScreen
