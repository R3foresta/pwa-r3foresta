import { useEffect, useRef, useState } from 'react'
import { ParticipacionApiError, UsuariosService } from '../api/usuarios.api'
import type { AutoridadUsuario, RolGlobal, UsuarioAdministracion } from '../types'

export function usuariosError(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo consultar la cuenta. Intenta nuevamente.'
}

type Filters = { consulta: string; rol_global: RolGlobal | '' }
export type UsuariosAccessIssue = { status: 401 | 403; message: string }
type AccessIssueHandler = (issue: UsuariosAccessIssue) => void

function reportAccessIssue(error: unknown, onAccessIssue: AccessIssueHandler) {
  if (error instanceof ParticipacionApiError && (error.status === 401 || error.status === 403)) {
    onAccessIssue({ status: error.status, message: error.message })
  }
}

type Listing = {
  key: string
  rows: UsuarioAdministracion[]
  cursor: string | null
  error: string | null
  sessionExpired: boolean
}

export function useUsuariosAdministracion(actorId: string | null, enabled: boolean, filters: Filters, version: number, onAccessIssue: AccessIssueHandler) {
  const { consulta, rol_global } = filters
  const key = JSON.stringify([actorId, enabled, consulta, rol_global, version])
  const [record, setRecord] = useState<Listing | null>(null)
  const [loadingMoreKey, setLoadingMoreKey] = useState<string | null>(null)
  const [moreFailure, setMoreFailure] = useState<{ key: string; error: string } | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!actorId || !enabled) return
    const controller = new AbortController()
    controllerRef.current = controller
    void UsuariosService.listar(actorId, {
      ...(consulta ? { consulta } : {}),
      ...(rol_global ? { rol_global } : {}),
      limite: 20,
    }, controller.signal).then((response) => {
      if (!controller.signal.aborted) setRecord({ key, rows: response.data, cursor: response.siguiente_cursor, error: null, sessionExpired: false })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setRecord({ key, rows: [], cursor: null, error: usuariosError(error), sessionExpired: error instanceof ParticipacionApiError && error.status === 401 })
        reportAccessIssue(error, onAccessIssue)
      }
    })
    return () => controllerRef.current?.abort()
  }, [actorId, enabled, consulta, rol_global, key, onAccessIssue])

  const current = record?.key === key ? record : null

  async function loadMore() {
    if (!actorId || !enabled || !current?.cursor || loadingMoreKey === key) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoadingMoreKey(key); setMoreFailure(null)
    try {
      const response = await UsuariosService.listar(actorId, {
        ...(consulta ? { consulta } : {}),
        ...(rol_global ? { rol_global } : {}),
        limite: 20, cursor: current.cursor,
      }, controller.signal)
      if (!controller.signal.aborted) {
        const ids = new Set(current.rows.map((row) => row.usuario_id))
        setRecord({ key, rows: [...current.rows, ...response.data.filter((row) => !ids.has(row.usuario_id))], cursor: response.siguiente_cursor, error: null, sessionExpired: false })
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setMoreFailure({ key, error: usuariosError(error) })
        reportAccessIssue(error, onAccessIssue)
      }
    } finally {
      if (!controller.signal.aborted) setLoadingMoreKey(null)
    }
  }

  return {
    rows: current?.rows ?? [], cursor: current?.cursor ?? null,
    loading: enabled && !current, error: current?.error ?? null,
    sessionExpired: current?.sessionExpired ?? false,
    moreError: moreFailure?.key === key ? moreFailure.error : null,
    loadingMore: loadingMoreKey === key, loadMore,
  }
}

export function useUsuarioAutoridad(actorId: string | null, usuarioId: string | null, enabled: boolean, intentionKey: string, onAccessIssue: AccessIssueHandler) {
  const key = JSON.stringify([actorId, usuarioId, enabled, intentionKey])
  const [record, setRecord] = useState<{ key: string; data: AutoridadUsuario } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  useEffect(() => () => controllerRef.current?.abort(), [key])

  async function read() {
    if (!actorId || !usuarioId || !enabled) return null
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setRecord(null); setFailure(null); setLoadingKey(key)
    try {
      const response = await UsuariosService.autoridad(actorId, usuarioId, controller.signal)
      if (controller.signal.aborted) return null
      if (!response.data.activo) throw new Error('La cuenta fue inactivada. Actualiza la lista y escoge otra cuenta.')
      setRecord({ key, data: response.data })
      return response.data
    } catch (error) {
      if (!controller.signal.aborted) {
        setFailure({ key, message: usuariosError(error) })
        reportAccessIssue(error, onAccessIssue)
      }
      return null
    } finally {
      if (!controller.signal.aborted) setLoadingKey(null)
    }
  }

  return { data: record?.key === key ? record.data : null, error: failure?.key === key ? failure.message : null, loading: loadingKey === key, read }
}
