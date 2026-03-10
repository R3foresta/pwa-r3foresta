type EstadoRegistroSource = {
  estado_registro?: string | null
  estadoRegistro?: string | null
  estadoRegistroRecoleccion?: string | null
  estado?: string | null
  usuario_validacion_id?: number | null
  fecha_validacion?: string | null
  blockchain_hash_validacion?: string | null
}

export type EstadoOperativo = 'ABIERTO' | 'CERRADO'

function normalizeEstadoRegistro(estadoRegistro: string | null | undefined) {
  if (!estadoRegistro) {
    return null
  }

  return estadoRegistro.trim().toUpperCase()
}

export function resolveEstadoRegistro(recoleccion: EstadoRegistroSource) {
  const normalizedFromApi =
    normalizeEstadoRegistro(recoleccion.estado_registro) ||
    normalizeEstadoRegistro(recoleccion.estadoRegistro) ||
    normalizeEstadoRegistro(recoleccion.estadoRegistroRecoleccion) ||
    normalizeEstadoRegistro(recoleccion.estado)

  if (normalizedFromApi) {
    return normalizedFromApi
  }

  const hasValidationData =
    Boolean(recoleccion.usuario_validacion_id) ||
    Boolean(recoleccion.fecha_validacion) ||
    Boolean(recoleccion.blockchain_hash_validacion)

  return hasValidationData ? 'VALIDADO' : 'BORRADOR'
}

export function resolveEstadoOperativo(cantidad: number | null | undefined): EstadoOperativo {
  return Number(cantidad) > 0 ? 'ABIERTO' : 'CERRADO'
}

export function estadoRegistroBadgeClass(estadoRegistro: string | null | undefined) {
  switch (estadoRegistro) {
    case 'BORRADOR':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'VALIDADO':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function estadoOperativoBadgeClass(estadoOperativo: EstadoOperativo) {
  switch (estadoOperativo) {
    case 'ABIERTO':
      return 'bg-cyan-50 text-cyan-700 ring-cyan-200'
    case 'CERRADO':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}
