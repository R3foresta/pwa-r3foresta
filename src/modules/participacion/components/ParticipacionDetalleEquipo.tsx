import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import { ParticipacionService } from '../api/participacion.api'
import type { CapacidadSubcampania, MiembrosLectura } from '../types'
import { accessError, permissionLabel } from './accessPresentation'

export default function ParticipacionDetalleEquipo({ scope, globalAdmin }: { scope: CapacidadSubcampania; globalAdmin: boolean }) {
  const allowed = globalAdmin || scope.permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA' || scope.permiso_contextual === 'PLANTADOR'
  const canManage = (globalAdmin || scope.permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA') && (
    scope.acciones.incorporar_plantador || scope.acciones.retirar_plantador || scope.acciones.designar_administrador ||
    scope.acciones.cambiar_administrador || scope.acciones.retirar_administrador || scope.acciones.reemplazar_administrador
  )
  return <Card as="section" className="space-y-3"><h2 className="text-lg font-bold">Equipo de la subcampaña</h2>
    {allowed ? <Members key={scope.subcampania_id} scope={scope} canManage={canManage} /> : <p className="text-sm leading-6 text-neutral-600">La consulta del equipo no está disponible para tu cuenta.</p>}
  </Card>
}

function Members({ scope, canManage }: { scope: CapacidadSubcampania; canManage: boolean }) {
  const [page, setPage] = useState<MiembrosLectura | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    ParticipacionService.miembros(scope.subcampania_id, { limite: 20 }, controller.signal).then(data => {
      if (!controller.signal.aborted) setPage(data)
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(accessError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort(); request.current?.abort() }
  }, [scope.subcampania_id])
  async function loadMore(cursor?: string) {
    if (loading) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true); setError(null)
    try {
      const data = await ParticipacionService.miembros(scope.subcampania_id, { limite: 20, ...(cursor ? { cursor } : {}) }, controller.signal)
      if (!controller.signal.aborted) setPage(previous => ({ ...data, data: cursor && previous ? [...new Map([...previous.data, ...data.data].map(member => [member.usuario_id, member])).values()] : data.data }))
    } catch (reason) { if (!controller.signal.aborted) setError(accessError(reason)) }
    finally { if (!controller.signal.aborted) setLoading(false) }
  }
  return <div className="space-y-3">
    <p className="text-sm text-neutral-600">Permisos de participación y responsabilidades logísticas. Las fotos del equipo todavía no están disponibles.</p>
    {!canManage && page && !error && <p className="text-xs text-neutral-600">Puedes consultar el equipo de esta subcampaña. Los cambios de acceso están reservados a sus administradores.</p>}
    {loading && <p role="status">Consultando equipo…</p>}
    {error && <div className="space-y-2"><p role="alert" className="text-sm text-danger-700">{error}</p><Button variant="secondary" onClick={() => void loadMore(page?.siguiente_cursor ?? undefined)}>Reintentar equipo</Button></div>}
    {!loading && !error && page?.data.length === 0 && <p>No hay miembros en esta consulta.</p>}
    {page && <ul className="divide-y divide-neutral-100">{page.data.map(member => <li key={member.usuario_id} className="flex items-center gap-3 py-3">
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">●</span>
      <div className="min-w-0 text-sm"><p className="break-words font-bold">{member.nombre}</p><p>{permissionLabel(member.permiso_contextual)}</p>{member.acceso_global && <p>{member.etiqueta_acceso_global}</p>}{member.responsabilidad_logistica && <p className="text-xs text-neutral-500">Logística: {member.responsabilidad_logistica === 'COORDINADOR' ? 'Coordinador' : 'Operario'}</p>}</div>
    </li>)}</ul>}
    {page?.siguiente_cursor && !error && <Button variant="secondary" loading={loading} onClick={() => void loadMore(page.siguiente_cursor!)}>Cargar más personas</Button>}
    {canManage && <div className="border-t border-neutral-100 pt-3"><Link to="/app/participacion/accesos" className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Gestionar permisos de participación</Link><p className="text-xs text-neutral-500">Selecciona esta subcampaña en el gestor antes de revisar y confirmar cambios.</p></div>}
  </div>
}
