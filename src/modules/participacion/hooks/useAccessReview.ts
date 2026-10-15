import { useEffect, useRef, useState } from 'react'
import { ParticipacionService } from '../api/participacion.api'
import type { OperacionAcceso, PersonaMinima, RevisionLectura } from '../types'
import type { AccessCommandDraft } from '../commands/useAccessCommand'
import { accessError } from '../components/accessPresentation'

export type AccessReview = { target: RevisionLectura; replacement: RevisionLectura | null }
type Params = {
  operation: OperacionAcceso
  scopeIds: string[]
  person: PersonaMinima | null
  replacement: PersonaMinima | null
  treatment: 'PLANTADOR' | 'SIN_ACCESO'
  version: number
}

export function useAccessReview({ operation, scopeIds, person, replacement, treatment, version }: Params) {
  const key = JSON.stringify([operation, [...scopeIds].sort(), person?.usuario_id, replacement?.usuario_id, treatment, version])
  const [record, setRecord] = useState<{ key: string; review: AccessReview } | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  useEffect(() => () => controllerRef.current?.abort(), [key])
  const review = record?.key === key ? record.review : null

  async function read() {
    if (!person || scopeIds.length === 0 || scopeIds.length > 100 || (operation === 'REEMPLAZAR_ADMINISTRADOR' && (!replacement || replacement.usuario_id === person.usuario_id))) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setRecord(null); setFailure(null); setLoadingKey(key)
    try {
      const [target, incoming] = await Promise.all([
        ParticipacionService.revisar({ usuario_destino_id: person.usuario_id, subcampania_ids: scopeIds }, controller.signal),
        operation === 'REEMPLAZAR_ADMINISTRADOR' && replacement ? ParticipacionService.revisar({ usuario_destino_id: replacement.usuario_id, subcampania_ids: scopeIds }, controller.signal) : Promise.resolve(null),
      ])
      if (!controller.signal.aborted) setRecord({ key, review: { target, replacement: incoming } })
    } catch (error) {
      if (!controller.signal.aborted) setFailure({ key, message: accessError(error) })
    } finally {
      if (!controller.signal.aborted) setLoadingKey(null)
    }
  }

  function buildDraft(): AccessCommandDraft | null {
    if (!review || !person) return null
    if (operation === 'REEMPLAZAR_ADMINISTRADOR') {
      if (!replacement || !review.replacement) return null
      const replacementScopes = review.replacement.data.ambitos
      return { operacion: operation, payload: {
        usuario_saliente_id: person.usuario_id, usuario_reemplazo_id: replacement.usuario_id, tratamiento_saliente: treatment,
        ambitos: review.target.data.ambitos.map((scope) => ({
          subcampania_id: scope.subcampania_id, revision_saliente_esperada: scope.revision_permiso,
          revision_reemplazo_esperada: replacementScopes.find((incoming) => incoming.subcampania_id === scope.subcampania_id)!.revision_permiso,
        })),
      } }
    }
    return { operacion: operation, payload: { usuario_destino_id: person.usuario_id, ambitos: review.target.data.ambitos.map((scope) => ({ subcampania_id: scope.subcampania_id, revision_esperada: scope.revision_permiso })) } }
  }

  return { review, loading: loadingKey === key, error: failure?.key === key ? failure.message : null, read, buildDraft }
}
