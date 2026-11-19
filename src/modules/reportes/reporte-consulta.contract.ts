import { validarId } from '../participacion/api/participacion.contract'
import { validarRegistroFecha } from '../participacion/api/registro.contract'
import type { OpcionReporte } from './reporte-plantaciones.contract'

export type FiltrosVivero = { planta_id: string | null; vivero_id: string | null }
export type OpcionesVivero = { viveros: OpcionReporte[]; especies: OpcionReporte[] }

export function reporteIncompleto(): never {
  throw new Error('El reporte recibido es incompleto o no corresponde a la consulta.')
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return reporteIncompleto()
  return value as Record<string, unknown>
}

export function text(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : reporteIncompleto()
}

export function cantidad(value: unknown, minimo = 0): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimo ? value : reporteIncompleto()
}

export function list<T, Key>(value: unknown, parse: (item: unknown) => T, key: (item: T) => Key): T[] {
  if (!Array.isArray(value)) return reporteIncompleto()
  const result = value.map(parse)
  if (new Set(result.map(key)).size !== result.length) return reporteIncompleto()
  return result
}

export function leerReporte(value: unknown) {
  const response = object(value)
  if (response.success !== true) return reporteIncompleto()
  const data = object(response.data)
  const observado_en = text(data.observado_en)
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(observado_en) ||
    !Number.isFinite(Date.parse(observado_en))) return reporteIncompleto()
  validarRegistroFecha(observado_en.slice(0, 10))

  const opciones = object(data.opciones)
  const parseOpcion = (option: unknown): OpcionReporte => {
    const row = object(option)
    return { id: validarId(row.id), nombre: text(row.nombre) }
  }
  return {
    data, observado_en,
    opciones: {
      viveros: list(opciones.viveros, parseOpcion, row => row.id),
      especies: list(opciones.especies, parseOpcion, row => row.id),
    },
  }
}

export function coincideAmbito(ambito: FiltrosVivero, consulta: FiltrosVivero): boolean {
  return (consulta.planta_id === null || ambito.planta_id === consulta.planta_id) &&
    (consulta.vivero_id === null || ambito.vivero_id === consulta.vivero_id)
}

export function leerFiltros(row: Record<string, unknown>, consulta: FiltrosVivero): FiltrosVivero {
  const planta_id = row.planta_id === null ? null : validarId(row.planta_id)
  const vivero_id = row.vivero_id === null ? null : validarId(row.vivero_id)
  if (planta_id !== consulta.planta_id || vivero_id !== consulta.vivero_id) return reporteIncompleto()
  return { planta_id, vivero_id }
}
