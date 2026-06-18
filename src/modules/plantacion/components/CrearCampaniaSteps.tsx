import Icon from '../../../components/Icon'
import {
  TIPO_CAMPANIA_DESCRIPTION,
  TIPO_CAMPANIA_LABEL,
  TIPO_ORGANIZACION_LABEL,
  type Organizacion,
  type TipoCampania,
} from '../types/contracts'
import type { CrearCampaniaFormValues } from '../utils/crearCampaniaForm'

const CAMPANIA_TYPES: TipoCampania[] = ['REFORESTACION', 'ARBORIZACION', 'FORESTACION']

function formatDate(value: string): string {
  if (!value) return 'Sin fecha'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function ProgressDots({ step }: { step: number }) {
  return (
    <div className="mt-4 flex items-center gap-2">
      {[1, 2, 3].map((currentStep) => (
        <div
          key={currentStep}
          className={`h-1.5 flex-1 rounded-full ${
            currentStep <= step ? 'bg-emerald-300' : 'bg-white/20'
          }`}
        />
      ))}
    </div>
  )
}

function TypeSelector({
  value,
  onChange,
}: {
  value: TipoCampania | ''
  onChange: (value: TipoCampania) => void
}) {
  return (
    <div>
      <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
        Tipo de campaña
      </p>
      <div className="grid grid-cols-1 gap-2">
        {CAMPANIA_TYPES.map((tipo) => {
          const selected = value === tipo
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => onChange(tipo)}
              className={`flex items-start gap-3 rounded-2xl p-3 text-left shadow-soft ring-1 transition ${
                selected
                  ? 'bg-brand-600 text-white ring-brand-700'
                  : 'bg-white text-brand-800 ring-black/5 hover:ring-brand-300'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  selected ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700'
                }`}
              >
                <Icon name="planting" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold leading-tight">
                  {TIPO_CAMPANIA_LABEL[tipo]}
                </span>
                <span
                  className={`mt-1 block text-[11px] font-semibold leading-relaxed ${
                    selected ? 'text-white/80' : 'text-slate-500'
                  }`}
                >
                  {TIPO_CAMPANIA_DESCRIPTION[tipo]}
                </span>
              </span>
              <span
                className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  selected ? 'bg-white text-brand-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon name={selected ? 'check' : 'plus'} className="h-3.5 w-3.5" />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CrearCampaniaStepDatos({
  values,
  onChange,
}: {
  values: CrearCampaniaFormValues
  onChange: <K extends keyof CrearCampaniaFormValues>(
    key: K,
    value: CrearCampaniaFormValues[K],
  ) => void
}) {
  return (
    <div className="space-y-4">
      <TypeSelector value={values.tipo} onChange={(tipo) => onChange('tipo', tipo)} />

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <div>
          <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Nombre
          </label>
          <input
            type="text"
            value={values.nombre}
            onChange={(event) => onChange('nombre', event.target.value)}
            placeholder="Ej. Reforestación Norte 2026"
            maxLength={200}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-brand-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Descripción
          </label>
          <textarea
            value={values.descripcion}
            onChange={(event) => onChange('descripcion', event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Objetivo general, zona estratégica o alcance institucional"
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-brand-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-1 text-right text-[10px] font-semibold text-slate-400">
            {values.descripcion.length}/1000
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Inicio estimado
            </label>
            <input
              type="date"
              value={values.fecha_estimada_inicio}
              onChange={(event) => onChange('fecha_estimada_inicio', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-brand-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Cierre estimado
            </label>
            <input
              type="date"
              value={values.fecha_estimada_fin}
              min={values.fecha_estimada_inicio || undefined}
              onChange={(event) => onChange('fecha_estimada_fin', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-brand-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export function CrearCampaniaStepOrganizaciones({
  organizaciones,
  selectedIds,
  loading,
  error,
  query,
  onQueryChange,
  onToggle,
  onRetry,
}: {
  organizaciones: Organizacion[]
  selectedIds: number[]
  loading: boolean
  error: string | null
  query: string
  onQueryChange: (value: string) => void
  onToggle: (id: number) => void
  onRetry: () => void
}) {
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = normalizedQuery
    ? organizaciones.filter((org) => {
        const tipoLabel = TIPO_ORGANIZACION_LABEL[org.tipo] ?? org.tipo
        return (
          org.nombre.toLowerCase().includes(normalizedQuery) ||
          tipoLabel.toLowerCase().includes(normalizedQuery)
        )
      })
    : organizaciones

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <p className="text-sm font-extrabold text-brand-800">Organizaciones asociadas</p>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
          Selecciona organizaciones existentes. Si falta una, se gestionará desde su propio CRUD
          del menú lateral.
        </p>
        {selectedIds.length === 0 && (
          <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
            <p className="text-[11px] font-bold leading-relaxed text-amber-800">
              Recomendado: asociar al menos una organización para transparencia institucional.
            </p>
          </div>
        )}
      </section>

      <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-black/5">
        <Icon name="search" className="h-5 w-5 text-slate-400" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar organización o tipo"
          className="w-full border-none bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
          type="search"
        />
      </label>

      {loading && (
        <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
          Cargando organizaciones...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-xl bg-red-100 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-brand-100 bg-white px-4 py-8 text-center shadow-soft">
          <p className="text-base font-extrabold text-brand-800">Sin organizaciones</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
            {query.trim()
              ? 'No hay coincidencias con la búsqueda.'
              : 'No hay organizaciones activas disponibles para seleccionar.'}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((org) => {
            const selected = selectedIds.includes(org.id)
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => onToggle(org.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left shadow-soft ring-1 transition ${
                  selected
                    ? 'bg-brand-600 text-white ring-brand-700'
                    : 'bg-white text-brand-800 ring-black/5 hover:ring-brand-300'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xs font-extrabold ${
                    selected ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700'
                  }`}
                >
                  {org.logo_url ? (
                    <img src={org.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(org.nombre)
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold leading-tight">{org.nombre}</span>
                  <span
                    className={`mt-0.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] ${
                      selected ? 'text-white/75' : 'text-brand-500'
                    }`}
                  >
                    {TIPO_ORGANIZACION_LABEL[org.tipo] ?? org.tipo}
                  </span>
                </span>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    selected ? 'bg-white text-brand-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Icon name={selected ? 'check' : 'plus'} className="h-4 w-4" />
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function CrearCampaniaStepResumen({
  values,
  organizacionesSeleccionadas,
}: {
  values: CrearCampaniaFormValues
  organizacionesSeleccionadas: Organizacion[]
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-brand-700 p-4 text-white shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          {values.tipo && (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ring-1 ring-white/25">
              {TIPO_CAMPANIA_LABEL[values.tipo]}
            </span>
          )}
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ring-1 ring-white/25">
            Borrador inicial
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-extrabold leading-tight">{values.nombre || 'Sin nombre'}</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-white/80">
          {values.descripcion || 'Sin descripción registrada.'}
        </p>
      </section>

      <section className="divide-y divide-slate-100 rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon name="date" className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
              Calendario estimado
            </p>
            <p className="text-sm font-extrabold text-brand-800">
              {formatDate(values.fecha_estimada_inicio)} → {formatDate(values.fecha_estimada_fin)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon name="package" className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
              Organizaciones
            </p>
            {organizacionesSeleccionadas.length === 0 ? (
              <p className="text-sm font-extrabold text-amber-700">
                Sin organizaciones asociadas
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {organizacionesSeleccionadas.map((org) => (
                  <span
                    key={org.id}
                    className="rounded-full bg-[#f8fbf7] px-2.5 py-1 text-[10.5px] font-extrabold text-brand-700 ring-1 ring-brand-100"
                  >
                    {org.nombre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon name="info" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-brand-800">Siguiente paso</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
              Al crear la campaña iremos directo al flujo de sub-campaña. Ahí se configura
              zona, meta, coordinador, equipo y asignación de lotes.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
