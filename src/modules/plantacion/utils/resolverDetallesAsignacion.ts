import type {
  PlantacionDetalleInput,
  StockEspecieContext,
} from '../types/contracts'

// PLT-FE-005: convierte cantidades declaradas por especie en `detalles[]` para
// `POST /registros-plantacion`, sin selección manual de lote/asignación.
//
// Regla de distribución (espejo de `reglas.orden_consumo_asignaciones`):
//   1. Tomar asignaciones activas de la especie.
//   2. Ordenar por `fecha_asignacion ASC`, empatar por `asignacion_id ASC`.
//   3. Consumir cada asignación hasta agotar la cantidad pedida o su
//      `saldo_asignado_disponible`, rebalsando a la siguiente.

export type CantidadPorEspecie = {
  planta_id: number
  cantidad: number
}

export class StockInsuficienteError extends Error {
  readonly planta_id: number
  readonly solicitado: number
  readonly disponible: number

  constructor(plantaId: number, solicitado: number, disponible: number, nombre?: string | null) {
    super(
      `Stock asignado insuficiente para ${nombre || `la especie ${plantaId}`}: ` +
        `se pidieron ${solicitado} y hay ${disponible} disponibles.`,
    )
    this.name = 'StockInsuficienteError'
    this.planta_id = plantaId
    this.solicitado = solicitado
    this.disponible = disponible
  }
}

export function resolverDetallesAsignacion(
  cantidades: CantidadPorEspecie[],
  stockPorEspecie: StockEspecieContext[],
): PlantacionDetalleInput[] {
  const detalles: PlantacionDetalleInput[] = []

  for (const { planta_id, cantidad } of cantidades) {
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      throw new Error(`Cantidad inválida para la especie ${planta_id}.`)
    }
    if (cantidad === 0) continue

    const stock = stockPorEspecie.find((item) => item.planta_id === planta_id)
    const asignaciones = [...(stock?.asignaciones ?? [])].sort((a, b) => {
      if (a.fecha_asignacion !== b.fecha_asignacion) {
        return a.fecha_asignacion < b.fecha_asignacion ? -1 : 1
      }
      return a.asignacion_id - b.asignacion_id
    })

    let restante = cantidad
    for (const asignacion of asignaciones) {
      if (restante === 0) break
      const saldo = Math.max(0, Math.floor(asignacion.saldo_asignado_disponible))
      if (saldo === 0) continue

      const aConsumir = Math.min(restante, saldo)
      detalles.push({
        asignacion_id: asignacion.asignacion_id,
        lote_vivero_id: asignacion.lote_vivero_id,
        planta_id,
        cantidad: aConsumir,
      })
      restante -= aConsumir
    }

    if (restante > 0) {
      throw new StockInsuficienteError(
        planta_id,
        cantidad,
        cantidad - restante,
        stock?.nombre_comun_principal,
      )
    }
  }

  return detalles
}
