import { useEffect, useState } from 'react'
import { RegistroParticipacionService } from '../../api/registro.api'
import { ParticipacionApiError } from '../../api/participacion.api'
import type { ContextoRegistro } from '../../registroTypes'

type RecordState = { key: string; data: ContextoRegistro | null; error: string | null; errorCode: string | null; sessionExpired: boolean }

export function useRegistroContext(actorId: string | null, scopeId: string | null, enabled: boolean) {
  const [revision, setRevision] = useState(0)
  const [record, setRecord] = useState<RecordState | null>(null)
  const key = JSON.stringify([actorId, scopeId, revision, enabled])
  useEffect(() => {
    if (!actorId || !scopeId || !enabled) return
    const controller = new AbortController()
    RegistroParticipacionService.contexto(actorId, scopeId, controller.signal).then((response) => {
      if (!controller.signal.aborted) setRecord({ key, data: response.data, error: null, errorCode: null, sessionExpired: false })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setRecord({ key, data: null, error: error instanceof ParticipacionApiError && error.codigo === 'CONTEXTO_INCOMPLETO' ? 'La subcampaña necesita una corrección antes de registrar plantaciones.' : error instanceof Error ? error.message : 'No se pudo consultar el contexto del registro.', errorCode: error instanceof ParticipacionApiError ? error.codigo : null, sessionExpired: error instanceof ParticipacionApiError && error.status === 401 })
    })
    return () => controller.abort()
  }, [actorId, scopeId, enabled, key])
  const current = record?.key === key ? record : null
  return { context: current?.data ?? null, loading: enabled && Boolean(actorId && scopeId) && !current, error: current?.error ?? null, errorCode: current?.errorCode ?? null, sessionExpired: current?.sessionExpired ?? false, refresh: () => setRevision((value) => value + 1) }
}
