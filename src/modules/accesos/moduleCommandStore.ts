import type { IntentoAcceso, AccesoDraft, DominioAcceso } from './types'
import { validarId } from '../participacion/api/participacion.contract'
import { validarIntentoAcceso } from './accesos.contract'
import { withPrivateCommandLock } from '../participacion/commands/commandLifecycle'

export type { AccesoDraft } from './types'

const PREFIX = 'r3foresta:usuarios:acceso:v1:'

export class ModuleCommandStorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'ModuleCommandStorageError'
  }
}

export class ModuleCommandPendingError extends Error {
  readonly intento: IntentoAcceso

  constructor(intento: IntentoAcceso) {
    super('Hay un envío pendiente de confirmar en esta cuenta. Recupera su resultado antes de confirmar otra acción.')
    this.name = 'ModuleCommandPendingError'
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
  Object.freeze(intento.payload)
  return Object.freeze(intento)
}

export function moduleCommandStorageKey(actorId: string, domain: DominioAcceso): string {
  return `${PREFIX}${domain}:${validarId(actorId)}`
}

// Una clave incierta no caduca ni se elimina al salir de la cuenta.
export function readModuleCommand(actorId: string, domain: DominioAcceso): IntentoAcceso | null {
  try {
    const raw = localStorage.getItem(moduleCommandStorageKey(actorId, domain))
    if (raw === null) return null
    const saved: unknown = JSON.parse(raw)
    if (!object(saved) || !exactKeys(saved, ['version', 'intento']) || saved.version !== 1) {
      throw new Error('Formato local de comando no válido')
    }
    const intento = validarIntentoAcceso(saved.intento)
    if (intento.actor_id !== actorId || intento.dominio !== domain) throw new Error('El envío pertenece a otra cuenta')
    return freezeIntent(intento)
  } catch (error) {
    throw new ModuleCommandStorageError('No se pudo leer el envío conservado. No se enviará otra acción hasta recuperar este almacenamiento.', error)
  }
}

// localStorage no ofrece compare-and-set. Web Locks coordina también otras
// pestañas: sin esta garantía se bloquean escrituras, pero aún se puede consultar.
export async function withModuleCommandLock<T>(actorId: string, domain: DominioAcceso, callback: () => Promise<T> | T): Promise<T> {
  const key = moduleCommandStorageKey(actorId, domain)
  return withPrivateCommandLock(key, callback)
}

export async function claimModuleCommand(actorId: string, domain: DominioAcceso, draft: AccesoDraft): Promise<IntentoAcceso> {
  return withModuleCommandLock(actorId, domain, () => {
    const pending = readModuleCommand(actorId, domain)
    if (pending) throw new ModuleCommandPendingError(pending)
    try {
      const comandoId = crypto.randomUUID()
      const intento = validarIntentoAcceso({ actor_id: actorId, dominio: domain, operacion: `${draft.otorgar ? 'OTORGAR' : 'RETIRAR'}_ACCESO_${domain === 'M1' ? 'RECOLECCION' : 'VIVERO'}`, usuario_id: draft.usuario_id, payload: { comando_id: comandoId, revision_esperada: draft.revision_esperada, motivo: draft.motivo, ...(domain === 'M2' ? { vivero_id: draft.vivero_id } : {}) } })
      const serialized = JSON.stringify({ version: 1, intento })
      localStorage.setItem(moduleCommandStorageKey(actorId, domain), serialized)
      if (localStorage.getItem(moduleCommandStorageKey(actorId, domain)) !== serialized) throw new Error('No se pudo comprobar la persistencia del envío')
      return freezeIntent(intento)
    } catch (error) {
      throw new ModuleCommandStorageError('No se pudo conservar el envío en este dispositivo. La acción no se ha enviado.', error)
    }
  })
}

// Sólo un terminal validado por el cliente permite liberar la identidad local.
// Una respuesta tardía de otra pestaña nunca elimina el comando que la sucedió.
export async function clearModuleCommand(intento: IntentoAcceso): Promise<void> {
  await withModuleCommandLock(intento.actor_id, intento.dominio, () => {
    const pending = readModuleCommand(intento.actor_id, intento.dominio)
    if (pending?.payload.comando_id !== intento.payload.comando_id || pending.operacion !== intento.operacion) return
    try {
      localStorage.removeItem(moduleCommandStorageKey(intento.actor_id, intento.dominio))
      if (localStorage.getItem(moduleCommandStorageKey(intento.actor_id, intento.dominio)) !== null) throw new Error('El envío sigue almacenado')
    } catch (error) {
      throw new ModuleCommandStorageError('El servidor confirmó el resultado, pero no se pudo liberar el envío en este dispositivo. Conserva su clave y vuelve a consultar.', error)
    }
  })
}
