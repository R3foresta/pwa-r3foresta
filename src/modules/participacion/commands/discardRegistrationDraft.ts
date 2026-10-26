import { ParticipacionApiError } from '../api/participacion.api'
import { RegistroParticipacionService } from '../api/registro.api'
import type { ReciboRegistro, RegistroIdentity } from '../registroTypes'
import {
  deleteRegistrationDraft, indexedRegistrationStorage, readRegistrationDraft, RegistrationChangedError,
  saveRegistrationDraft, withRegistrationLock,
  type RegistrationDraftSummary, type RegistrationStorage,
} from './registrationDraftStore'

type DiscardApi = Pick<typeof RegistroParticipacionService, 'cancelar' | 'preparar'>
export type DiscardRegistrationResult = 'LOCAL' | 'REMOTE'
type Options = { storage?: RegistrationStorage; api?: DiscardApi; signal?: AbortSignal }
export class RegistrationAlreadyConfirmedError extends Error {
  constructor(message: string) { super(message); this.name = 'RegistrationAlreadyConfirmedError' }
}

/** Cierra primero la preparación remota; sólo después elimina campos y fotos locales. */
export async function discardRegistrationDraft(
  actorId: string,
  scopeId: string,
  expected: Pick<RegistrationDraftSummary, 'comando_id' | 'revision_local'>,
  { storage = indexedRegistrationStorage, api = RegistroParticipacionService, signal }: Options = {},
): Promise<DiscardRegistrationResult> {
  return withRegistrationLock(actorId, scopeId, async () => {
    signal?.throwIfAborted()
    const record = await readRegistrationDraft(actorId, scopeId, storage)
    if (!record || record.revision_local !== expected.revision_local || record.comando_id !== expected.comando_id) throw new RegistrationChangedError()
    if (record.terminal?.estado === 'CONFIRMADO') throw new RegistrationAlreadyConfirmedError('Esta plantación ya fue registrada. Consulta Mis registros; sus fotos vinculadas no se pueden borrar como borrador.')
    if (record.payload && !record.terminal) throw new Error('Aún no sabemos si esta plantación se guardó. Comprueba el resultado antes de intentar eliminar la captura.')
    if (!record.comando_id) {
      signal?.throwIfAborted()
      await deleteRegistrationDraft(actorId, scopeId, storage)
      return 'LOCAL'
    }
    if (record.terminal?.estado === 'RECHAZADO' && record.terminal.error.codigo === 'PREPARACION_CANCELADA') {
      signal?.throwIfAborted()
      await deleteRegistrationDraft(actorId, scopeId, storage)
      return 'REMOTE'
    }

    const identity: RegistroIdentity = { actor_id: actorId, subcampania_id: scopeId, comando_id: record.comando_id }
    const marked = record.terminal ? record : await saveRegistrationDraft({ ...record, cancelacion_solicitada: true }, storage)
    let receipt: ReciboRegistro
    try {
      receipt = await api.cancelar(identity, signal)
    } catch (error) {
      if (!(error instanceof ParticipacionApiError) || error.status !== 404 || error.codigo !== 'COMANDO_NO_ENCONTRADO' || error.reintento !== 'MISMA_CLAVE' || record.terminal) throw error
      // Una preparación que no alcanzó al servidor se clausura con la misma clave.
      const prepared = await api.preparar(identity, signal)
      receipt = 'estado' in prepared ? prepared : await api.cancelar(identity, signal)
    }

    signal?.throwIfAborted()
    if (receipt.estado === 'CONFIRMADO') {
      await saveRegistrationDraft({ ...marked, terminal: receipt, files: [] }, storage)
      throw new RegistrationAlreadyConfirmedError('El servidor confirmó esta plantación. No se borró el registro ni sus fotos vinculadas.')
    }
    if (receipt.error.codigo !== 'PREPARACION_CANCELADA' && record.terminal?.estado !== 'RECHAZADO') {
      await saveRegistrationDraft({ ...marked, terminal: receipt }, storage)
      throw new Error('El servidor devolvió un rechazo distinto del descarte. Conservamos la captura para revisar el resultado antes de eliminarla.')
    }
    await deleteRegistrationDraft(actorId, scopeId, storage)
    return 'REMOTE'
  })
}
