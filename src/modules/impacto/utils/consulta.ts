import type { ImpactoQuery, ImpactoScope } from '../types'
import { validarImpactoQuery } from '../api/impacto.contract'

export const FILTER_KEYS = ['campania_id', 'subcampania_id', 'organizacion_id', 'planta_id', 'desde', 'hasta'] as const
export type ImpactoFilters = Partial<Record<(typeof FILTER_KEYS)[number], string>>

export function readImpactoQuery(search: string, scope: ImpactoScope): { query: ImpactoQuery; error: string | null } {
  const params = new URLSearchParams(search)
  const query: ImpactoQuery = {}
  const allowed = new Set<string>([...FILTER_KEYS, 'cursor', 'limite', 'seleccion'])
  if (scope.tipo !== 'global') allowed.delete('campania_id')
  if (scope.tipo === 'subcampania') allowed.delete('subcampania_id')
  for (const [key, value] of params) {
    if (!allowed.has(key) || params.getAll(key).length > 1) return { query, error: 'El enlace contiene filtros repetidos o no disponibles para este nivel.' }
    if (key === 'seleccion') {
      if (!/^[sr]:[1-9][0-9]*$/.test(value)) return { query, error: 'La selección del enlace no es válida.' }
      continue
    }
    if (!value) return { query, error: 'El enlace contiene un filtro vacío. Límpialo o indica un valor válido.' }
    if (key === 'limite') {
      if (!/^[1-9][0-9]*$/.test(value) || Number(value) > 100) return { query, error: 'El tamaño de página debe estar entre 1 y 100.' }
      query.limite = Number(value)
    } else if (FILTER_KEYS.includes(key as (typeof FILTER_KEYS)[number]) || key === 'cursor') {
      Object.assign(query, { [key]: value })
    }
  }
  try {
    return { query: validarImpactoQuery(scope, query), error: null }
  } catch {
    return { query, error: 'El ámbito o los filtros del enlace no son válidos. Revisa los identificadores y el intervalo de fechas.' }
  }
}

export function impactoErrorStatus(error: unknown): number | null {
  return typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : null
}

export function impactoErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo consultar el impacto. Comprueba tu conexión e inténtalo otra vez.'
}

export function safeImpactoReturn(value: unknown): string | null {
  if (value === '/app/participacion/mis-registros') return value
  return typeof value === 'string' && /^\/impacto(?:\/(?:campanias|subcampanias|registros)\/[1-9][0-9]*)?(?:\?[^#]*)?$/.test(value) ? value : null
}

export function formatImpactoNumber(value: number): string {
  return value.toLocaleString('es-BO', { maximumFractionDigits: 2 })
}

export function formatImpactoDate(value: string): string {
  // Los días de plantación son fechas de calendario; no desplazar al huso local.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/')
  return new Date(value).toLocaleString('es-BO', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }) + ' UTC'
}
