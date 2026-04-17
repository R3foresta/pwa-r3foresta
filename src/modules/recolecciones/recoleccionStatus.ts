type EstadoRegistroSource = {
  estado_registro?: string | null
  estadoRegistro?: string | null
  estadoRegistroRecoleccion?: string | null
  usuario_validacion_id?: number | null
  fecha_validacion?: string | null
  blockchain_tx_validacion?: string | null
  blockchain_hash_validacion?: string | null
}

export type EstadoOperativo = 'ABIERTO' | 'CERRADO'
type EstadoOperativoSource = {
  estado_operativo?: string | null
  saldo_actual?: number | null
}

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
    normalizeEstadoRegistro(recoleccion.estadoRegistroRecoleccion)

  if (normalizedFromApi) {
    return normalizedFromApi
  }

  const hasValidationData =
    Boolean(recoleccion.usuario_validacion_id) ||
    Boolean(recoleccion.fecha_validacion) ||
    Boolean(recoleccion.blockchain_tx_validacion) ||
    Boolean(recoleccion.blockchain_hash_validacion)

  return hasValidationData ? 'VALIDADO' : 'BORRADOR'
}

function normalizeEstadoOperativo(estadoOperativo: string | null | undefined): EstadoOperativo | null {
  if (!estadoOperativo) {
    return null
  }

  const normalized = estadoOperativo.trim().toUpperCase()
  if (normalized === 'ABIERTO' || normalized === 'CERRADO') {
    return normalized
  }

  return null
}

export function resolveEstadoOperativo(recoleccion: EstadoOperativoSource): EstadoOperativo {
  const estadoOperativoDesdeApi = normalizeEstadoOperativo(recoleccion.estado_operativo)
  if (estadoOperativoDesdeApi) {
    return estadoOperativoDesdeApi
  }

  if (recoleccion.saldo_actual !== undefined && recoleccion.saldo_actual !== null) {
    return Number(recoleccion.saldo_actual) > 0 ? 'ABIERTO' : 'CERRADO'
  }

  return 'CERRADO'
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
