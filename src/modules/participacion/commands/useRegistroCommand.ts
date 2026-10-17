import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { RegistrationCommandController } from './registrationCommandController'
import type { RegistrationStorage } from './registrationDraftStore'

export type { RegistroCommandState, RegistroConfirmDraft } from './registrationCommandController'
export type { RegistroDraft, RegistrationFile } from './registrationDraftStore'

export function useRegistroCommand(actorId: string | null, scopeId: string | null, storage?: RegistrationStorage) {
  const controller = useMemo(() => new RegistrationCommandController(actorId, scopeId, storage), [actorId, scopeId, storage])
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => controller.start(), [controller])
  return { ...snapshot, updateDraft: controller.updateDraft, addFiles: controller.addFiles, removeFile: controller.removeFile, prepare: controller.prepare, upload: controller.upload, recover: controller.recover, confirm: controller.confirm, retrySame: controller.retrySame, cancel: controller.cancel, newIntent: controller.newIntent }
}
