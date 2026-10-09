type EstadoRegistroSource = {
  estado_registro?: string | null
  estadoRegistro?: string | null
  estadoRegistroRecoleccion?: string | null
  usuario_validacion_id?: number | null
  fecha_validacion?: string | null
  usuario_id?: number | null
  can_edit?: boolean
  can_submit_for_validation?: boolean
}

type UsuarioActual = { id?: number | string | null; rol?: string | null } | null

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
    Boolean(recoleccion.fecha_validacion)

  return hasValidationData ? 'VALIDADO' : 'BORRADOR'
}

export function getRecoleccionFormActions(recoleccion: EstadoRegistroSource, user: UsuarioActual) {
  const estado = resolveEstadoRegistro(recoleccion)
  const autorizado = Boolean(user && (
    String(user.rol ?? '').toUpperCase() === 'ADMIN' ||
    (user.id != null && recoleccion.usuario_id != null && Number(user.id) === Number(recoleccion.usuario_id))
  ))
  return {
    canEdit: autorizado && (estado === 'BORRADOR' || estado === 'RECHAZADO') && recoleccion.can_edit !== false,
    canSubmit: autorizado && estado === 'BORRADOR' && recoleccion.can_submit_for_validation !== false,
  }
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

// El color de estado (registro/operativo) se centraliza en
// `src/components/ui/status.ts` (`statusVariant`) y se renderiza con <Badge>.
// Aquí solo vive la resolución de dominio del estado, no su color.
