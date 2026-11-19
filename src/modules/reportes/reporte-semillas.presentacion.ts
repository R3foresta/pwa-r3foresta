import { unidadesExactas } from './reporte-semillas.contract'
import type { ReporteMovimientosSemillas, ReporteSaldoSemillas, TipoMovimientoSemilla, UnidadSemilla } from './reporte-semillas.contract'

export const unidadesSemilla = [
  { codigo: 'G', nombre: 'Gramos', sufijo: 'g' },
  { codigo: 'UNIDAD', nombre: 'Unidades', sufijo: 'u.' },
] as const

export const nombresMovimientoSemilla: Record<TipoMovimientoSemilla, string> = {
  RECEPCION_CONFORME: 'Recepción conforme',
  CONSUMO_A_VIVERO: 'Consumo hacia vivero',
  DESECHO: 'Descarte',
}

export const categoriasMovimientoSemilla = [
  { clave: 'recibido', nombre: 'Recibidas' },
  { clave: 'consumido', nombre: 'Consumidas' },
  { clave: 'descartado', nombre: 'Descartadas' },
] as const

const entero = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 })
const separadorDecimal = new Intl.NumberFormat('es-BO').formatToParts(0.1).find(part => part.type === 'decimal')?.value ?? ','

export function formatearCantidadSemilla(decimal: string): string {
  const [unidades, decimales] = decimal.split('.')
  const fraccion = decimales?.replace(/0+$/, '')
  return entero.format(BigInt(unidades)) + (fraccion ? separadorDecimal + fraccion : '')
}

export function cantidadConUnidad(cantidad: string, unidad: UnidadSemilla): string {
  return `${formatearCantidadSemilla(cantidad)} ${unidad === 'G' ? 'g' : 'u.'}`
}

export function filtrosSemillasAplicados(saldo: ReporteSaldoSemillas, movimientos: ReporteMovimientosSemillas) {
  const { planta_id, vivero_id } = saldo.filtros
  const especies = [...saldo.opciones.especies, ...movimientos.opciones.especies]
  const viveros = [...saldo.opciones.viveros, ...movimientos.opciones.viveros]
  return [
    { etiqueta: 'Especie', valor: planta_id ? especies.find(option => option.id === planta_id)?.nombre ?? `ID ${planta_id}` : 'Todas' },
    { etiqueta: 'Vivero de custodia', valor: vivero_id ? viveros.find(option => option.id === vivero_id)?.nombre ?? `ID ${vivero_id}` : 'Todos' },
  ]
}

export function escalaMovimientosSemilla(cantidades: string[]): number[] {
  const valores = cantidades.map(unidadesExactas)
  const maximo = valores.reduce((mayor, valor) => valor > mayor ? valor : mayor, 0n)
  return valores.map(valor => maximo === 0n ? 0 : Number(valor * 1000n / maximo) / 10)
}
