import type { ReactNode } from 'react'
import { Building2, Leaf, Trees } from 'lucide-react'
import Icon from '../../../components/Icon'
import {
  TIPO_CAMPANIA_DESCRIPTION,
  TIPO_CAMPANIA_LABEL,
  TIPO_ORGANIZACION_LABEL,
  type Organizacion,
  type TipoCampania,
} from '../types/contracts'
import type { CrearCampaniaFormValues } from '../utils/crearCampaniaForm'
import { getInitials } from '../utils/userAvatar'

// Orden visual del selector — Arborización primero por producto.
// El array de validación vive en `plantacion.service.ts` (`TIPOS_CAMPANIA`) con
// el orden del enum del backend. Los elementos deben coincidir en set; solo
// difiere el orden. Ver AUD-005 en FRONTEND_AUDIT.md.
const CAMPANIA_TYPES: TipoCampania[] = ['ARBORIZACION', 'REFORESTACION', 'FORESTACION']
const CAMPANIA_TYPE_ICONS: Record<TipoCampania, typeof Trees> = {
  REFORESTACION: Trees,
  ARBORIZACION: Building2,
  FORESTACION: Leaf,
}

function OrganizationLogo({
  organization,
  selected = false,
}: {
  organization: Organizacion
  selected?: boolean
}) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xs font-extrabold ${
        selected ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700'
      }`}
    >
      {organization.logo_url ? (
        <img src={organization.logo_url} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(organization.nombre)
      )}
    </span>
  )
}

function OrganizationLogoPile({ organizations }: { organizations: Organizacion[] }) {
  if (organizations.length === 0) return null

  return (
    <div className="flex -space-x-2">
      {organizations.slice(0, 4).map((organization) => (
        <span
          key={organization.id}
          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-[9px] font-extrabold text-brand-700 ring-2 ring-white"
        >
          {organization.logo_url ? (
            <img src={organization.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            getInitials(organization.nombre)
          )}
        </span>
      ))}
      {organizations.length > 4 && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[9px] font-extrabold text-slate-500 ring-2 ring-white">
          +{organizations.length - 4}
        </span>
      )}
    </div>
  )
}

export function CrearCampaniaFormFields({
  values,
  onChange,
  organizationSelector,
  tipoLocked = false,
  tipoLockedReason,
}: {
  values: CrearCampaniaFormValues
  onChange: <K extends keyof CrearCampaniaFormValues>(
    key: K,
    value: CrearCampaniaFormValues[K],
  ) => void
  organizationSelector: ReactNode
  tipoLocked?: boolean
  tipoLockedReason?: string
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Tipo de campaña
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CAMPANIA_TYPES.map((tipo) => {
            const selected = values.tipo === tipo
            const TypeIcon = CAMPANIA_TYPE_ICONS[tipo]
            const disabled = tipoLocked && !selected

            return (
              <button
                key={tipo}
                type="button"
                onClick={() => {
                  if (tipoLocked) return
                  onChange('tipo', tipo)
                }}
                disabled={disabled}
                className={`flex min-h-[154px] flex-col items-center gap-1.5 rounded-3xl p-3 text-center shadow-soft ring-1 transition ${
                  selected
                    ? 'bg-brand-600 text-white ring-brand-700'
                    : disabled
                      ? 'cursor-not-allowed bg-slate-50 text-slate-400 ring-black/5'
                      : 'bg-white text-brand-800 ring-black/5 hover:ring-brand-300'
                }`}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    selected
                      ? 'bg-white/20 text-white'
                      : disabled
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-brand-50 text-brand-700'
                  }`}
                >
                  <TypeIcon className="h-6 w-6" strokeWidth={2} />
                </span>
                <span className="text-sm font-extrabold leading-tight">
                  {TIPO_CAMPANIA_LABEL[tipo]}
                </span>
                <span
                  className={`text-[10.5px] font-semibold leading-snug ${
                    selected ? 'text-white/85' : 'text-slate-500'
                  }`}
                >
                  {TIPO_CAMPANIA_DESCRIPTION[tipo]}
                </span>
              </button>
            )
          })}
        </div>
        {tipoLocked && tipoLockedReason && (
          <p className="mt-2 text-[11px] font-semibold text-slate-500">
            {tipoLockedReason}
          </p>
        )}
      </div>

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

        {organizationSelector}

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

export function OrganizacionSelector({
  organizaciones,
  selectedIds,
  loading,
  error,
  query,
  open,
  onOpen,
  onClose,
  onQueryChange,
  onToggle,
  onRetry,
}: {
  organizaciones: Organizacion[]
  selectedIds: number[]
  loading: boolean
  error: string | null
  query: string
  open: boolean
  onOpen: () => void
  onClose: () => void
  onQueryChange: (value: string) => void
  onToggle: (id: number) => void
  onRetry: () => void
}) {
  const selectedOrganizations = organizaciones.filter((organization) =>
    selectedIds.includes(organization.id),
  )
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOrganizations = normalizedQuery
    ? organizaciones.filter((organization) => {
        const tipoLabel = TIPO_ORGANIZACION_LABEL[organization.tipo] ?? organization.tipo
        return (
          organization.nombre.toLowerCase().includes(normalizedQuery) ||
          tipoLabel.toLowerCase().includes(normalizedQuery)
        )
      })
    : organizaciones

  return (
    <>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Organizaciones asociadas
          </label>
          <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:ring-1 hover:ring-brand-300"
          >
            {selectedOrganizations.length === 0 ? (
              <span className="text-sm font-medium text-slate-400">
                Seleccionar organizaciones
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-2">
                <OrganizationLogoPile organizations={selectedOrganizations} />
                <span className="truncate text-sm font-extrabold text-brand-800">
                  {selectedOrganizations.length} seleccionada
                  {selectedOrganizations.length !== 1 ? 's' : ''}
                </span>
              </span>
            )}
            <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </div>

        {selectedOrganizations.length === 0 && (
          <div className="rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
            <p className="text-[11px] font-bold leading-relaxed text-amber-800">
              Recomendado: asociar al menos una organización para transparencia institucional.
            </p>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <button
            type="button"
            aria-label="Cerrar selector de organizaciones"
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <div className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-2">
              <div>
                <h2 className="text-lg font-extrabold text-brand-800">Organizaciones</h2>
                <p className="text-[11px] font-semibold text-brand-500">
                  {selectedOrganizations.length > 0
                    ? `${selectedOrganizations.length} seleccionada${
                        selectedOrganizations.length !== 1 ? 's' : ''
                      }`
                    : 'Ninguna seleccionada aún'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="Cerrar"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="shrink-0 px-5 pb-3">
              <div className="rounded-full bg-brand-600 px-4 py-2.5 text-center text-[11px] font-extrabold text-white shadow-soft">
                Catálogo
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-4">
              <label className="mb-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#f8fbf7] px-3 py-2.5">
                <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Buscar por nombre o tipo"
                  className="w-full bg-transparent text-sm font-semibold text-brand-800 outline-none placeholder:text-slate-400"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => onQueryChange('')}
                    className="shrink-0 text-slate-400 transition hover:text-slate-600"
                    aria-label="Limpiar búsqueda"
                  >
                    <Icon name="x" className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>

              {loading && (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-600">
                  Cargando organizaciones...
                </div>
              )}

              {error && !loading && (
                <div className="rounded-2xl bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700 ring-1 ring-red-200">
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

              {!loading && !error && filteredOrganizations.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-sm font-extrabold text-brand-800">Sin resultados</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Prueba con otro nombre o revisa el CRUD de organizaciones.
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                filteredOrganizations.map((organization) => {
                  const selected = selectedIds.includes(organization.id)
                  return (
                    <button
                      key={organization.id}
                      type="button"
                      onClick={() => onToggle(organization.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left shadow-soft ring-1 transition ${
                        selected
                          ? 'bg-brand-600 text-white ring-brand-700'
                          : 'bg-[#f8fbf7] text-brand-800 ring-brand-100 hover:ring-brand-300'
                      }`}
                    >
                      <OrganizationLogo organization={organization} selected={selected} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold leading-tight">
                          {organization.nombre}
                        </span>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.14em] ring-1 ${
                            selected
                              ? 'bg-white/15 text-white ring-white/20'
                              : 'bg-white text-slate-600 ring-slate-200'
                          }`}
                        >
                          {TIPO_ORGANIZACION_LABEL[organization.tipo] ?? organization.tipo}
                        </span>
                      </span>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          selected
                            ? 'bg-white text-brand-700'
                            : 'bg-white text-slate-400 ring-1 ring-slate-200'
                        }`}
                      >
                        <Icon name={selected ? 'check' : 'plus'} className="h-4 w-4" />
                      </span>
                    </button>
                  )
                })}
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 pb-6 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-700"
              >
                {selectedOrganizations.length > 0
                  ? `Confirmar · ${selectedOrganizations.length} seleccionada${
                      selectedOrganizations.length !== 1 ? 's' : ''
                    }`
                  : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
