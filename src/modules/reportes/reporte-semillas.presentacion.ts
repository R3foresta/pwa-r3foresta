import { unidadesExactas } from './reporte-semillas.contract'

const entero = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 })
const separadorDecimal = new Intl.NumberFormat('es-BO').formatToParts(0.1).find(part => part.type === 'decimal')?.value ?? ','

export function formatearCantidadSemilla(decimal: string): string {
  const [unidades, decimales] = decimal.split('.')
  const fraccion = decimales?.replace(/0+$/, '')
  return entero.format(BigInt(unidades)) + (fraccion ? separadorDecimal + fraccion : '')
}

export function escalaMovimientosSemilla(cantidades: string[]): number[] {
  const valores = cantidades.map(unidadesExactas)
  const maximo = valores.reduce((mayor, valor) => valor > mayor ? valor : mayor, 0n)
  return valores.map(valor => maximo === 0n ? 0 : Number(valor * 1000n / maximo) / 10)
}
