import type { CausaMermaVivero } from '../vivero/types/contracts'
import type { OpcionReporte } from './reporte-plantaciones.contract'
import { formatearFecha } from './reporte-plantaciones.presentacion'
import type { ReporteMermas, ReporteVivero } from './reporte-vivero.contract'

const causaLabels: Record<CausaMermaVivero, string> = {
  PLAGA: 'Plaga',
  ENFERMEDAD: 'Enfermedad',
  SEQUIA: 'Sequía',
  DANO_FISICO: 'Daño físico',
  MUERTE_NATURAL: 'Muerte natural',
  OTRO: 'Otra causa',
}

export function nombreCausaMerma(causa: string | null): string {
  if (causa === null) return 'Sin causa registrada'
  return Object.hasOwn(causaLabels, causa) ? causaLabels[causa as CausaMermaVivero] : causa
}

function label(opciones: OpcionReporte[], id: string | null, todos: string) {
  return id === null ? todos : opciones.find(opcion => opcion.id === id)?.nombre ?? `ID ${id}`
}

export function filtrosViveroAplicados({ filtros, opciones }: ReporteVivero | ReporteMermas) {
  return [
    ...('desde' in filtros
      ? [{ etiqueta: 'Período', valor: `${formatearFecha(filtros.desde)} al ${formatearFecha(filtros.hasta)}` }]
      : []),
    { etiqueta: 'Vivero', valor: label(opciones.viveros, filtros.vivero_id, 'Todos los viveros') },
    { etiqueta: 'Especie', valor: label(opciones.especies, filtros.planta_id, 'Todas las especies') },
  ]
}
