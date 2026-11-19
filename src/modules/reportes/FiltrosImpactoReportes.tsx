import type { FormEvent } from 'react'
import { Button } from '../../components/ui'
import type { FiltrosReportePlantaciones, OpcionReporte } from './reporte-plantaciones.contract'
import type { FiltrosVivero } from './reporte-vivero.contract'

export type FiltrosTablero = FiltrosReportePlantaciones & FiltrosVivero

const fieldClass = 'mt-1 min-h-11 w-full min-w-0 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base font-normal text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:bg-neutral-50 sm:text-sm'
const selects = [
  { filtro: 'organizacion_id', opciones: 'organizaciones', label: 'Empresa', todas: 'Todas las empresas' },
  { filtro: 'campania_id', opciones: 'campanias', label: 'Campaña', todas: 'Todas las campañas' },
  { filtro: 'planta_id', opciones: 'especies', label: 'Especie', todas: 'Todas las especies' },
  { filtro: 'vivero_id', opciones: 'viveros', label: 'Vivero', todas: 'Todos los viveros' },
] as const

type Props = {
  filtros: FiltrosTablero
  opciones: Record<(typeof selects)[number]['opciones'], OpcionReporte[]>
  errorFechas: string | null
  pendientes: boolean
  cargando: boolean
  actualizar: (patch: Partial<FiltrosTablero>) => void
  enviar: (event: FormEvent<HTMLFormElement>) => void
}

export default function FiltrosImpactoReportes({ filtros, opciones, errorFechas, pendientes, cargando, actualizar, enviar }: Props) {
  return <form onSubmit={enviar} className="rounded-3xl border border-brand-100 bg-white p-4 shadow-sm sm:p-6">
    <h2 className="font-display text-base font-extrabold text-brand-900">Filtros del tablero</h2>
    <p className="mt-1 text-sm text-neutral-600">El período se aplica a plantaciones y mermas. Empresa y campaña filtran plantaciones. Vivero filtra saldo y mermas.</p>
    <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1.15fr_1.15fr_1.15fr_1.15fr_auto] xl:items-end">
      <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:contents">
        {(['desde', 'hasta'] as const).map((campo) => <label key={campo} className="min-w-0 text-sm font-semibold text-brand-800">
          {campo === 'desde' ? 'Desde' : 'Hasta'}
          <input required name={campo} type="date" className={fieldClass} value={filtros[campo]} aria-invalid={Boolean(errorFechas)} aria-describedby={errorFechas ? 'reportes-fecha-error' : undefined} onChange={(event) => actualizar({ [campo]: event.target.value })} />
        </label>)}
      </div>
      {selects.map(({ filtro, opciones: grupo, label, todas }) => {
        const value = filtros[filtro]
        const lista = opciones[grupo]
        return <div key={filtro} className="min-w-0 text-sm font-semibold text-brand-800">
          <label htmlFor={`reporte-${filtro}`}>{label}</label>
          <select id={`reporte-${filtro}`} name={filtro} className={fieldClass} value={value ?? ''} disabled={!lista.length && !value} onChange={(event) => actualizar({ [filtro]: event.target.value || null })}>
            <option value="">{todas}</option>
            {value && !lista.some(option => option.id === value) && <option value={value}>ID {value}</option>}
            {lista.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        </div>
      })}
      <Button type="submit" variant="secondary" className="min-h-11 self-end whitespace-nowrap" loading={cargando && !pendientes} leftIcon="filter">Aplicar filtros</Button>
    </div>
    {errorFechas && <p id="reportes-fecha-error" role="alert" className="mt-2 text-sm text-danger-700">{errorFechas}</p>}
    {pendientes && <p role="status" className="mt-2 text-sm text-neutral-600">Aplica los cambios para actualizar las cifras.</p>}
  </form>
}
