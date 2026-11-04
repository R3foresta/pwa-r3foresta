import type { IntentoRol, RoleCommandDraft } from '../types'
import { validarId } from '../../participacion/api/participacion.contract'
import { validarIntentoRol } from '../api/usuarios.contract'
import { withPrivateCommandLock } from '../../participacion/commands/commandLifecycle'

export type { RoleCommandDraft } from '../types'

const PREFIX = 'r3foresta:usuarios:rol:v1:'

export class RoleCommandStorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'RoleCommandStorageError'
  }
}

export class RoleCommandPendingError extends Error {
  readonly intento: IntentoRol

  constructor(intento: IntentoRol) {
    super('Hay un envío pendiente de confirmar en esta cuenta. Recupera su resultado antes de confirmar otra acción.')
    this.name = 'RoleCommandPendingError'
    this.intento = intento
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

function freezeIntent(intento: IntentoRol): IntentoRol {
  Object.freeze(intento.payload)
  return Object.freeze(intento)
}

export function roleCommandStorageKey(actorId: string): string {
  return `${PREFIX}${validarId(actorId)}`
}

// Una clave incierta no caduca ni se elimina al salir de la cuenta.
export function readRoleCommand(actorId: string): IntentoRol | null {
  try {
    const raw = localStorage.getItem(roleCommandStorageKey(actorId))
    if (raw === null) return null
    const saved: unknown = JSON.parse(raw)
    if (!object(saved) || !exactKeys(saved, ['version', 'intento']) || saved.version !== 1) {
      throw new Error('Formato local de comando no válido')
    }
    const intento = validarIntentoRol(saved.intento)
    if (intento.actor_id !== actorId) throw new Error('El envío pertenece a otra cuenta')
    return freezeIntent(intento)
  } catch (error) {
    throw new RoleCommandStorageError('No se pudo leer el envío conservado. No se enviará otra acción hasta recuperar este almacenamiento.', error)
  }
}

// localStorage no ofrece compare-and-set. Web Locks coordina también otras
// pestañas: sin esta garantía se bloquean escrituras, pero aún se puede consultar.
export async function withRoleCommandLock<T>(actorId: string, callback: () => Promise<T> | T): Promise<T> {
  const key = roleCommandStorageKey(actorId)
  return withPrivateCommandLock(key, callback)
}

export async function claimRoleCommand(actorId: string, draft: RoleCommandDraft): Promise<IntentoRol> {
  return withRoleCommandLock(actorId, () => {
    const pending = readRoleCommand(actorId)
    if (pending) throw new RoleCommandPendingError(pending)
    try {
      const comandoId = crypto.randomUUID()
      const intento = validarIntentoRol({ actor_id: actorId, operacion: 'CAMBIAR_ROL_GLOBAL', usuario_id: draft.usuario_id, payload: { comando_id: comandoId, rol_global: draft.rol_global, revision_esperada: draft.revision_esperada, motivo: draft.motivo } })
      const serialized = JSON.stringify({ version: 1, intento })
      localStorage.setItem(roleCommandStorageKey(actorId), serialized)
      if (localStorage.getItem(roleCommandStorageKey(actorId)) !== serialized) throw new Error('No se pudo comprobar la persistencia del envío')
      return freezeIntent(intento)
    } catch (error) {
      throw new RoleCommandStorageError('No se pudo conservar el envío en este dispositivo. La acción no se ha enviado.', error)
    }
  })
}

// Sólo un terminal validado por el cliente permite liberar la identidad local.
// Una respuesta tardía de otra pestaña nunca elimina el comando que la sucedió.
export async function clearRoleCommand(intento: IntentoRol): Promise<void> {
  await withRoleCommandLock(intento.actor_id, () => {
    const pending = readRoleCommand(intento.actor_id)
    if (pending?.payload.comando_id !== intento.payload.comando_id || pending.operacion !== intento.operacion) return
    try {
      localStorage.removeItem(roleCommandStorageKey(intento.actor_id))
      if (localStorage.getItem(roleCommandStorageKey(intento.actor_id)) !== null) throw new Error('El envío sigue almacenado')
    } catch (error) {
      throw new RoleCommandStorageError('El servidor confirmó el resultado, pero no se pudo liberar el envío en este dispositivo. Conserva su clave y vuelve a consultar.', error)
    }
  })
}
