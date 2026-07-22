import { type FormEvent, useEffect, useState } from 'react'
import { Field, ImageUploader, inputClasses, selectWrapperClasses } from '../../../components/ui'
import Icon from '../../../components/Icon'
import type { PlantaCatalogo, PlantaFormInput, TipoPlantaCatalogo } from '../../../types/plantas.types'
import { withImageVersion } from '../../../utils/imageUrl'

type Mode = 'create' | 'edit'

type FormState = {
  especie: string
  nombre_cientifico: string
  variedad: string
  tipo_planta_id: number
  nombre_comun_principal: string
  nombres_comunes: string
  notas: string
}

type Errors = Partial<Record<keyof FormState | 'imagen' | 'general', string>>

type Props = {
  mode: Mode
  initial?: PlantaCatalogo | null
  tiposPlantas: TipoPlantaCatalogo[]
  submitting: boolean
  submitError: string | null
  onSubmit: (input: PlantaFormInput) => void
}

const EMPTY_FORM: FormState = {
  especie: '',
  nombre_cientifico: '',
  variedad: '',
  tipo_planta_id: 0,
  nombre_comun_principal: '',
  nombres_comunes: '',
  notas: '',
}

function buildInitialForm(initial: PlantaCatalogo | null | undefined): FormState {
  if (!initial) return EMPTY_FORM
  return {
    especie: initial.especie || '',
    nombre_cientifico: initial.nombre_cientifico || '',
    variedad: initial.variedad || '',
    tipo_planta_id: initial.tipo_planta_id || 0,
    nombre_comun_principal: initial.nombre_comun_principal || '',
    nombres_comunes: initial.nombres_comunes || '',
    notas: initial.notas || '',
  }
}

function PlantaForm({ mode, initial, tiposPlantas, submitting, submitError, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(buildInitialForm(initial))
  const [imagen, setImagen] = useState<File | null>(null)
  const [imagenError, setImagenError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})

  useEffect(() => {
    setForm(buildInitialForm(initial))
  }, [initial])

  const validate = (): Errors => {
    const next: Errors = {}
    if (!form.especie.trim()) next.especie = 'La especie es obligatoria.'
    if (!form.nombre_cientifico.trim()) next.nombre_cientifico = 'El nombre científico es obligatorio.'
    if (!form.variedad.trim()) next.variedad = 'La variedad es obligatoria.'
    if (!form.tipo_planta_id) next.tipo_planta_id = 'Selecciona un tipo.'
    if (imagenError) next.imagen = imagenError
    return next
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const payload: PlantaFormInput = {
      especie: form.especie,
      nombre_cientifico: form.nombre_cientifico,
      variedad: form.variedad,
      tipo_planta_id: form.tipo_planta_id,
      nombre_comun_principal: form.nombre_comun_principal,
      nombres_comunes: form.nombres_comunes,
      notas: form.notas,
    }
    if (imagen) payload.imagen = imagen
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <section className="rounded-2xl bg-danger-50 px-4 py-3 shadow-soft ring-1 ring-danger-200">
          <p className="text-sm font-semibold text-danger-700">{submitError}</p>
        </section>
      )}

      <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
        <ImageUploader
          initialUrl={withImageVersion(initial?.imagen_url, initial?.updated_at)}
          onChange={setImagen}
          onError={setImagenError}
          disabled={submitting}
        />
        {errors.imagen && (
          <p className="mt-2 text-center text-xs font-semibold text-danger-600">{errors.imagen}</p>
        )}
      </section>

      <section className="space-y-4 rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
        <Field label="Nombre común principal">
          <input
            type="text"
            value={form.nombre_comun_principal}
            onChange={(event) =>
              setForm({ ...form, nombre_comun_principal: event.target.value })
            }
            placeholder="Ej. Caoba"
            disabled={submitting}
            className={inputClasses(false)}
          />
        </Field>

        <Field label="Especie" required error={errors.especie}>
          <input
            type="text"
            value={form.especie}
            onChange={(event) => setForm({ ...form, especie: event.target.value })}
            placeholder="Ej. Swietenia macrophylla"
            disabled={submitting}
            className={inputClasses(Boolean(errors.especie))}
          />
        </Field>

        <Field label="Nombre científico" required error={errors.nombre_cientifico}>
          <input
            type="text"
            value={form.nombre_cientifico}
            onChange={(event) => setForm({ ...form, nombre_cientifico: event.target.value })}
            placeholder="Ej. Swietenia macrophylla"
            disabled={submitting}
            className={`${inputClasses(Boolean(errors.nombre_cientifico))} italic`}
          />
        </Field>

        <Field label="Variedad / raza" required error={errors.variedad}>
          <input
            type="text"
            value={form.variedad}
            onChange={(event) => setForm({ ...form, variedad: event.target.value })}
            placeholder="Ej. Hondureña, Criolla"
            disabled={submitting}
            className={inputClasses(Boolean(errors.variedad))}
          />
        </Field>

        <Field label="Tipo de planta" required error={errors.tipo_planta_id}>
          <div className={selectWrapperClasses(Boolean(errors.tipo_planta_id))}>
            <select
              value={form.tipo_planta_id || ''}
              onChange={(event) =>
                setForm({ ...form, tipo_planta_id: Number(event.target.value) || 0 })
              }
              disabled={submitting}
              className="w-full bg-transparent py-3 text-sm font-semibold text-neutral-700 outline-none"
            >
              <option value="">Seleccionar tipo...</option>
              {tiposPlantas.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" className="h-4 w-4 text-neutral-400" />
          </div>
        </Field>

        <Field label="Otros nombres comunes" hint="Separa con comas: Roble, Cedro real">
          <input
            type="text"
            value={form.nombres_comunes}
            onChange={(event) => setForm({ ...form, nombres_comunes: event.target.value })}
            placeholder="Ej. Roble, Cedro real"
            disabled={submitting}
            className={inputClasses(false)}
          />
        </Field>

        <Field label="Notas">
          <textarea
            value={form.notas}
            onChange={(event) => setForm({ ...form, notas: event.target.value })}
            disabled={submitting}
            rows={4}
            className={`${inputClasses(false)} min-h-[100px]`}
            placeholder="Información adicional..."
          />
        </Field>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? mode === 'create'
            ? 'Creando especie...'
            : 'Guardando cambios...'
          : mode === 'create'
          ? 'Crear especie'
          : 'Guardar cambios'}
      </button>
    </form>
  )
}

export default PlantaForm
