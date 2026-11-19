import { validarId } from '../participacion/api/participacion.contract'
import { validarRegistroFecha } from '../participacion/api/registro.contract'
import { cantidad, list, object, reporteIncompleto, text } from './reporte-consulta.contract'
import type { EspeciePlantada, FiltrosReportePlantaciones } from './reporte-plantaciones.contract'

export function validarRegistrosPlantados(
  value: unknown, filtros: FiltrosReportePlantaciones, especie: EspeciePlantada, pagina: number,
) {
  const response = object(value)
  if (response.success !== true) return reporteIncompleto()
  const data = object(response.data)
  const aplicados = object(data.filtros)
  if (!especie.version_detalle || data.version_detalle !== especie.version_detalle ||
    aplicados.desde !== filtros.desde || aplicados.hasta !== filtros.hasta ||
    aplicados.organizacion_id !== filtros.organizacion_id || aplicados.campania_id !== filtros.campania_id ||
    aplicados.planta_id !== filtros.planta_id || aplicados.especie !== (especie.planta_id ?? 'sin_desglose') ||
    aplicados.pagina !== pagina || data.tamano_pagina !== 25) return reporteIncompleto()

  const totales = object(data.totales)
  const registros = cantidad(totales.registros)
  if (totales.total !== especie.total || totales.iniciales !== especie.iniciales ||
    totales.reposiciones !== especie.reposiciones) return reporteIncompleto()

  const detalle = list(data.detalle, item => {
    const row = object(item)
    const fecha = validarRegistroFecha(row.fecha)
    const aporte = cantidad(row.cantidad)
    const total = cantidad(row.cantidad_total)
    const especies = list(row.especies, item => {
      const parte = object(item)
      return { planta_id: parte.planta_id === null ? null : validarId(parte.planta_id), nombre: text(parte.nombre), cantidad: cantidad(parte.cantidad) }
    }, parte => parte.planta_id)
    if (typeof row.es_reposicion !== 'boolean' || fecha < filtros.desde || fecha > filtros.hasta ||
      especies.find(parte => parte.planta_id === especie.planta_id)?.cantidad !== aporte ||
      especies.reduce((sum, parte) => sum + parte.cantidad, 0) !== total) return reporteIncompleto()
    return {
      registro_id: validarId(row.registro_id), codigo_trazabilidad: text(row.codigo_trazabilidad),
      fecha, subcampania_id: validarId(row.subcampania_id), subcampania: text(row.subcampania),
      es_reposicion: row.es_reposicion, cantidad: aporte, cantidad_total: total, especies,
    }
  }, row => row.registro_id)
  const tamano = data.tamano_pagina
  const esperados = Math.max(0, Math.min(tamano, registros - (pagina - 1) * tamano))
  if (detalle.length !== esperados) return reporteIncompleto()
  const iniciales = detalle.reduce((sum, row) => sum + (row.es_reposicion ? 0 : row.cantidad), 0)
  const reposiciones = detalle.reduce((sum, row) => sum + (row.es_reposicion ? row.cantidad : 0), 0)
  if (iniciales > especie.iniciales || reposiciones > especie.reposiciones ||
    (detalle.length === registros && iniciales + reposiciones !== especie.total)) return reporteIncompleto()
  return { registros, detalle, paginas: Math.ceil(registros / tamano) }
}

export type DetallePlantaciones = ReturnType<typeof validarRegistrosPlantados>
