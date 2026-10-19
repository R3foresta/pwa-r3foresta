import { useEffect, useMemo, useRef, useState } from 'react'
import { ImpactoService } from '../api/impacto.api'
import type { ImpactoConsulta, ImpactoQuery, ImpactoScope } from '../types'

type QueryKey = { serialized: string }
type Result = { key: QueryKey; data: ImpactoConsulta | null; error: unknown; scopeChanged: boolean }
type Pagination = { key: QueryKey; loading: boolean; error: unknown }

export function useImpactoConsulta(scope: ImpactoScope, query: ImpactoQuery, enabled = true) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const serialized = JSON.stringify([scope, query, revision, enabled])
  // Cada transición tiene identidad propia, también A → B → A. No restaurar
  // datos de la primera A mientras la nueva consulta todavía está pendiente.
  const queryKey = useMemo(() => ({ serialized }), [serialized])
  const active = useRef<{ key: QueryKey; controller: AbortController; pendingCursor: string | null } | null>(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    active.current = { key: queryKey, controller, pendingCursor: null }
    const [requestScope, requestQuery] = JSON.parse(queryKey.serialized) as [ImpactoScope, ImpactoQuery]
    ImpactoService.consultar(requestScope, requestQuery, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setResult({ key: queryKey, data, error: null, scopeChanged: false })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ key: queryKey, data: null, error, scopeChanged: false })
    })
    return () => controller.abort()
  }, [queryKey, enabled])

  const current = result?.key === queryKey ? result : null
  const page = pagination?.key === queryKey ? pagination : null

  async function loadMore() {
    const request = active.current
    const cursor = current?.data?.siguiente_cursor
    if (!request || request.key !== queryKey || request.controller.signal.aborted || !cursor || request.pendingCursor || page?.loading) return
    request.pendingCursor = cursor
    setPagination({ key: queryKey, loading: true, error: null })
    try {
      const response = await ImpactoService.consultar(scope, { ...query, cursor }, request.controller.signal)
      if (request.controller.signal.aborted) return
      if (response.data.siguiente_cursor && BigInt(response.data.siguiente_cursor) >= BigInt(cursor)) throw new Error('La lista cambió durante la consulta. Actualiza el alcance antes de continuar.')
      setResult((previous) => {
        if (!previous?.data || previous.key !== queryKey) return previous
        const eligible = new Set(response.data.mapa.map((point) => point.registro_id))
        const changed = eligible.size !== previous.data.mapa.length || previous.data.mapa.some((point) => !eligible.has(point.registro_id))
        // Una nueva página puede reflejar un alcance distinto: retirar inmediatamente
        // cualquier fila anterior que ya no figure en su proyección pública completa.
        const unique = new Map(previous.data.registros.filter((registro) => eligible.has(registro.id)).map((registro) => [registro.id, registro]))
        response.data.registros.forEach((registro) => unique.set(registro.id, registro))
        // El resto del DTO representa el alcance completo: reemplazar, nunca sumar por página.
        return { key: queryKey, data: { ...response.data, registros: [...unique.values()] }, error: null, scopeChanged: previous.scopeChanged || changed }
      })
      setPagination({ key: queryKey, loading: false, error: null })
    } catch (error: unknown) {
      if (!request.controller.signal.aborted) setPagination({ key: queryKey, loading: false, error })
    } finally {
      request.pendingCursor = null
    }
  }

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: enabled && !current,
    loadingMore: page?.loading ?? false,
    pageError: page?.error ?? null,
    scopeChanged: current?.scopeChanged ?? false,
    retry: () => setRevision((value) => value + 1),
    loadMore,
  }
}
