import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui'
import { ParticipacionService } from '../api/participacion.api'
import type { MiembrosLectura, PersonaMinima } from '../types'
import { accessError, permissionLabel } from './accessPresentation'

type Props = { scopeId: string; disabled: boolean; onSelect: (person: PersonaMinima) => void }

export default function AccessMembers({ scopeId, disabled, onSelect }: Props) {
  const [page, setPage] = useState<MiembrosLectura | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    ParticipacionService.miembros(scopeId, { limite: 20 }, controller.signal).then((data) => {
      if (!controller.signal.aborted) setPage(data)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(accessError(failure))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort(); request.current?.abort() }
  }, [scopeId])

  async function load(cursor?: string) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true); setError(null)
    try {
      const data = await ParticipacionService.miembros(scopeId, { limite: 20, ...(cursor ? { cursor } : {}) }, controller.signal)
      if (!controller.signal.aborted) setPage(data)
    } catch (failure) {
      if (!controller.signal.aborted) { setPage(null); setError(accessError(failure)) }
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }

  return <div className="space-y-2">
    <h3 className="text-sm font-bold text-brand-800">Miembros autorizados y logística del ámbito consultado</h3>
    <p className="text-xs text-neutral-600">La responsabilidad logística y el permiso para participar son independientes.</p>
    {loading && <p role="status" className="text-sm text-neutral-600">Cargando miembros…</p>}
    {error && <div role="alert"><p className="text-sm text-danger-700">{error}</p><Button size="sm" variant="secondary" onClick={() => void load()}>Reintentar miembros</Button></div>}
    {!loading && page?.data.length === 0 && <p className="text-sm text-neutral-600">No hay miembros en este ámbito.</p>}
    {page && Array.from(new Map(page.data.map((member) => [member.usuario_id, member])).values()).map((member) => <div key={member.usuario_id} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-3">
      <div className="text-sm"><p className="font-bold text-brand-800">{member.nombre}</p><p className="text-neutral-600">{member.organizacion ?? 'Sin afiliación declarada'}</p>
        {member.acceso_global && <p className="font-semibold text-brand-700">{member.etiqueta_acceso_global}</p>}
        <p className="text-neutral-700">{permissionLabel(member.permiso_contextual)}</p>
        {member.responsabilidad_logistica && <p className="text-xs text-neutral-500">Logística: {member.responsabilidad_logistica === 'COORDINADOR' ? 'Coordinador' : 'Operario'}</p>}
        <p className="text-xs text-neutral-500">Cuenta {member.usuario_id}</p>
      </div>
      <Button variant="secondary" size="sm" disabled={disabled || loading} onClick={() => onSelect(member)}>Elegir persona</Button>
    </div>)}
    {page?.siguiente_cursor && <Button variant="ghost" size="sm" disabled={disabled} loading={loading} onClick={() => void load(page.siguiente_cursor!)}>Siguiente página de miembros</Button>}
    {page && <Button variant="ghost" size="sm" disabled={disabled || loading} onClick={() => void load()}>Volver al inicio de miembros</Button>}
  </div>
}
