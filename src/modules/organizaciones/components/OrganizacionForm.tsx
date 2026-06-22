import { type FormEvent, useState } from 'react'
import FormField from '../../../components/crud/FormField'
import { inputClasses, selectWrapperClasses } from '../../../components/crud/form-classes'
import ImageUploader from '../../../components/crud/ImageUploader'
import Icon from '../../../components/Icon'
import type {
  Organizacion,
  OrganizacionFormInput,
  TipoOrganizacion,
} from '../types'
import { TIPO_ORGANIZACION_LABEL, TIPOS_ORGANIZACION } from '../types'

type Mode = 'create' | 'edit'

type FormState = {
  nombre: string
  tipo: TipoOrganizacion | ''
  activo: boolean
}

type Errors = Partial<Record<keyof FormState | 'logo' | 'general', string>>

type Props = {
  mode: Mode
  initial?: Organizacion | null
  submitting: boolean
  submitError: string | null
  onSubmit: (input: OrganizacionFormInput) => void
}

const EMPTY_FORM: FormState = {
  nombre: '',
  tipo: '',
  activo: true,
}

function buildInitialForm(initial: Organizacion | null | undefined): FormState {
  if (!initial) return EMPTY_FORM
  return {
    nombre: initial.nombre || '',
    tipo: initial.tipo || '',
    activo: Boolean(initial.activo),
  }
}

function OrganizacionForm({
  mode,
  initial,
  submitting,
  submitError,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(buildInitialForm(initial))
  const [logo, setLogo] = useState<File | null | undefined>(undefined)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})

  const validate = (): Errors => {
    const next: Errors = {}
    if (form.nombre.trim().length < 2) {
      next.nombre = 'El nombre debe tener al menos 2 caracteres.'
    }
    if (!form.tipo) {
      next.tipo = 'Selecciona un tipo de organización.'
    }
    if (logoError) {
      next.logo = logoError
    }
    return next
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !form.tipo) return

    const payload: OrganizacionFormInput = {
      nombre: form.nombre,
      tipo: form.tipo,
      activo: form.activo,
    }

    if (logo instanceof File) {
      payload.logo = logo
    } else if (mode === 'edit' && logo === null && initial?.logo_url) {
      payload.removeLogo = true
    }

    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <section className="rounded-2xl bg-red-50 px-4 py-3 shadow-soft ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">{submitError}</p>
        </section>
      )}

      <section className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
        <ImageUploader
          initialUrl={logo === null ? null : initial?.logo_url}
          onChange={setLogo}
          onError={setLogoError}
          disabled={submitting}
        />
        {errors.logo && (
          <p className="mt-2 text-center text-xs font-semibold text-red-600">{errors.logo}</p>
        )}
      </section>

      <section className="space-y-4 rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
        <FormField label="Nombre" required error={errors.nombre}>
          <input
            type="text"
            value={form.nombre}
            onChange={(event) => setForm({ ...form, nombre: event.target.value })}
            placeholder="Ej. Fundación Bosque Vivo"
            disabled={submitting}
            className={inputClasses(Boolean(errors.nombre))}
          />
        </FormField>

        <FormField label="Tipo de organización" required error={errors.tipo}>
          <div className={selectWrapperClasses(Boolean(errors.tipo))}>
            <select
              value={form.tipo}
              onChange={(event) =>
                setForm({ ...form, tipo: event.target.value as TipoOrganizacion | '' })
              }
              disabled={submitting}
              className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="">Seleccionar tipo...</option>
              {TIPOS_ORGANIZACION.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TIPO_ORGANIZACION_LABEL[tipo]}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
          </div>
        </FormField>

        <label className="flex items-center gap-2 text-sm font-semibold text-brand-700">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(event) => setForm({ ...form, activo: event.target.checked })}
            disabled={submitting}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
          />
          Organización activa
        </label>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? mode === 'create'
            ? 'Creando organización...'
            : 'Guardando cambios...'
          : mode === 'create'
            ? 'Crear organización'
            : 'Guardar cambios'}
      </button>
    </form>
  )
}

export default OrganizacionForm
