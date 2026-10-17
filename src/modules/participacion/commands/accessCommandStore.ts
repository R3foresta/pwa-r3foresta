import type { AccesoEntrada, IntentoAcceso, OperacionSimple, ReemplazoEntrada } from '../types'
import { validarId, validarIntentoAcceso } from '../api/participacion.contract'
import { withPrivateCommandLock } from './commandLifecycle'

export type AccessCommandDraft =
  | { operacion: OperacionSimple; payload: Omit<AccesoEntrada, 'comando_id'> }
  | { operacion: 'REEMPLAZAR_ADMINISTRADOR'; payload: Omit<ReemplazoEntrada, 'comando_id'> }

const PREFIX = 'r3foresta:participacion:acceso:v1:'

export class AccessCommandStorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'AccessCommandStorageError'
  }
}

export class AccessCommandPendingError extends Error {
  readonly intento: IntentoAcceso

  constructor(intento: IntentoAcceso) {
    super('Hay un envío pendiente de confirmar en esta cuenta. Recupera su resultado antes de confirmar otra acción.')
    this.name = 'AccessCommandPendingError'
    this.intento = intento
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

function freezeIntent(intento: IntentoAcceso): IntentoAcceso {
  intento.payload.ambitos.forEach(Object.freeze)
  Object.freeze(intento.payload.ambitos)
  Object.freeze(intento.payload)
  return Object.freeze(intento)
}

export function accessCommandStorageKey(actorId: string): string {
  return `${PREFIX}${validarId(actorId)}`
}

// Una clave incierta no caduca ni se elimina al salir de la cuenta.
export function readAccessCommand(actorId: string): IntentoAcceso | null {
  try {
    const raw = localStorage.getItem(accessCommandStorageKey(actorId))
    if (raw === null) return null
    const saved: unknown = JSON.parse(raw)
    if (!object(saved) || !exactKeys(saved, ['version', 'intento']) || saved.version !== 1) {
      throw new Error('Formato local de comando no válido')
    }
    const intento = validarIntentoAcceso(saved.intento)
    if (intento.actor_id !== actorId) throw new Error('El envío pertenece a otra cuenta')
    return freezeIntent(intento)
  } catch (error) {
    throw new AccessCommandStorageError('No se pudo leer el envío conservado. No se enviará otra acción hasta recuperar este almacenamiento.', error)
  }
}

// localStorage no ofrece compare-and-set. Web Locks coordina también otras
// pestañas: sin esta garantía se bloquean escrituras, pero aún se puede consultar.
export async function withAccessCommandLock<T>(actorId: string, callback: () => Promise<T> | T): Promise<T> {
  const key = accessCommandStorageKey(actorId)
  return withPrivateCommandLock(key, callback)
}

export async function claimAccessCommand(actorId: string, draft: AccessCommandDraft): Promise<IntentoAcceso> {
  return withAccessCommandLock(actorId, () => {
    const pending = readAccessCommand(actorId)
    if (pending) throw new AccessCommandPendingError(pending)
    try {
      const comandoId = crypto.randomUUID()
      const intento = validarIntentoAcceso({ actor_id: actorId, operacion: draft.operacion, payload: { ...draft.payload, comando_id: comandoId } })
      const serialized = JSON.stringify({ version: 1, intento })
      localStorage.setItem(accessCommandStorageKey(actorId), serialized)
      if (localStorage.getItem(accessCommandStorageKey(actorId)) !== serialized) throw new Error('No se pudo comprobar la persistencia del envío')
      return freezeIntent(intento)
    } catch (error) {
      throw new AccessCommandStorageError('No se pudo conservar el envío en este dispositivo. La acción no se ha enviado.', error)
    }
  })
}

// Sólo un terminal validado por el cliente permite liberar la identidad local.
// Una respuesta tardía de otra pestaña nunca elimina el comando que la sucedió.
export async function clearAccessCommand(intento: IntentoAcceso): Promise<void> {
  await withAccessCommandLock(intento.actor_id, () => {
    const pending = readAccessCommand(intento.actor_id)
    if (pending?.payload.comando_id !== intento.payload.comando_id || pending.operacion !== intento.operacion) return
    try {
      localStorage.removeItem(accessCommandStorageKey(intento.actor_id))
      if (localStorage.getItem(accessCommandStorageKey(intento.actor_id)) !== null) throw new Error('El envío sigue almacenado')
    } catch (error) {
      throw new AccessCommandStorageError('El servidor confirmó el resultado, pero no se pudo liberar el envío en este dispositivo. Conserva su clave y vuelve a consultar.', error)
    }
  })
}
