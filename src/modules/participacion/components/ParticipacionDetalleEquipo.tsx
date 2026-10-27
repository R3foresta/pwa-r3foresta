import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui'
import { EquipoCollapsibleCategory, EquipoMemberCard } from '../../plantacion/components/EquipoVisual'
import { ParticipacionService } from '../api/participacion.api'
import { useParticipacionCapabilities } from '../hooks/useParticipacionCapabilities'
import type { CapacidadSubcampania, MiembroParticipacion, MiembrosLectura } from '../types'
import AgregarParticipanteEquipo from './AgregarParticipanteEquipo'
import { accessError, permissionLabel } from './accessPresentation'

type Props = { scope: CapacidadSubcampania; globalAdmin: boolean; actorId: string; canDesignateAdmins?: boolean; includeLogistics?: boolean }

export default function ParticipacionDetalleEquipo({ scope, globalAdmin, actorId, canDesignateAdmins = globalAdmin, includeLogistics = true }: Props) {
  const allowed = globalAdmin || scope.permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA' || scope.permiso_contextual === 'PLANTADOR'
  const canManage = (globalAdmin || scope.permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA') && (
    scope.acciones.incorporar_plantador || scope.acciones.retirar_plantador || scope.acciones.designar_administrador ||
    scope.acciones.cambiar_administrador || scope.acciones.retirar_administrador || scope.acciones.reemplazar_administrador
  )
  return <section className="space-y-4" aria-label="Equipo de la subcampaña">
    {allowed ? <Members key={scope.subcampania_id} scope={scope} globalAdmin={globalAdmin} actorId={actorId} canManage={canManage} canDesignateAdmins={canDesignateAdmins} includeLogistics={includeLogistics} />
      : <p className="text-sm leading-6 text-neutral-600">La consulta del equipo no está disponible para tu cuenta.</p>}
  </section>
}

function memberRole(member: MiembroParticipacion): string {
  if (member.permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA') return 'Administrador'
  if (member.permiso_contextual) return permissionLabel(member.permiso_contextual)
  if (member.responsabilidad_logistica === 'COORDINADOR') return 'Coordinador'
  if (member.responsabilidad_logistica === 'OPERARIO') return 'Operario'
  return 'Miembro'
}

function memberSubtitle(member: MiembroParticipacion): string | undefined {
  const values = [member.organizacion]
  if (member.responsabilidad_logistica) values.push(`Logística: ${member.responsabilidad_logistica === 'COORDINADOR' ? 'Coordinador' : 'Operario'}`)
  return values.filter(Boolean).join(' · ') || undefined
}

function MemberGroup({ title, members }: { title: string; members: MiembroParticipacion[] }) {
  if (members.length === 0) return null
  return <EquipoCollapsibleCategory title={title} aside={`${members.length} ${members.length === 1 ? 'asignado' : 'asignados'}`}>
    <ul className="space-y-2">{members.map(member => <EquipoMemberCard key={member.usuario_id} nombre={member.nombre} rol={memberRole(member)}
      subtitle={memberSubtitle(member)} />)}</ul>
  </EquipoCollapsibleCategory>
}

function Members({ scope, globalAdmin, actorId, canManage, canDesignateAdmins = false, includeLogistics }: Props & { canManage: boolean }) {
  const capabilities = useParticipacionCapabilities()
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

  async function load(cursor?: string): Promise<boolean> {
    if (loading) return false
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true); setError(null)
    try {
      const data = await ParticipacionService.miembros(scope.subcampania_id, { limite: 20, ...(cursor ? { cursor } : {}) }, controller.signal)
      if (controller.signal.aborted) return false
      setPage(previous => ({ ...data, data: cursor && previous ? [...new Map([...previous.data, ...data.data].map(member => [member.usuario_id, member])).values()] : data.data }))
      return true
    } catch (reason) {
      if (!controller.signal.aborted) setError(accessError(reason))
      return false
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }

  async function refreshAfterConfirmed() {
    const [members, permissions] = await Promise.allSettled([load(), capabilities.refresh()])
    if (members.status !== 'fulfilled' || !members.value || permissions.status !== 'fulfilled') throw new Error('Reintenta la lectura para ver los permisos vigentes.')
  }

  // La coordinación se muestra una sola vez, fuera de las categorías. En la
  // vista interna ya está representada por el equipo logístico original.
  const coordinador = includeLogistics ? page?.data.find(member => member.responsabilidad_logistica === 'COORDINADOR') : undefined
  const admins = page?.data.filter(member => !member.acceso_global && member.responsabilidad_logistica !== 'COORDINADOR' && member.permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA') ?? []
  const plantadores = page?.data.filter(member => !member.acceso_global && member.responsabilidad_logistica !== 'COORDINADOR' && member.permiso_contextual === 'PLANTADOR') ?? []
  const logistics = page?.data.filter(member => !member.acceso_global && member.responsabilidad_logistica === 'OPERARIO' && !member.permiso_contextual) ?? []
  const visibleCount = (coordinador ? 1 : 0) + admins.length + plantadores.length + (includeLogistics ? logistics.length : 0)
  const heading = page?.siguiente_cursor ? 'Miembros del equipo' : `${visibleCount} ${visibleCount === 1 ? 'miembro' : 'miembros'}`

  return <div className="space-y-4">
    <AgregarParticipanteEquipo scope={scope} actorId={actorId} globalAdmin={globalAdmin} canDesignateAdmins={canDesignateAdmins} heading={heading} onConfirmed={refreshAfterConfirmed} />
    {loading && <p role="status" className="text-sm font-semibold text-neutral-500">Consultando equipo…</p>}
    {error && <div className="space-y-2"><p role="alert" className="text-sm text-danger-700">{error}</p><Button variant="secondary" onClick={() => void load()}>Reintentar equipo</Button></div>}
    {!loading && !error && page && !page.siguiente_cursor && visibleCount === 0 && <div className="rounded-2xl bg-white p-5 text-center shadow-soft ring-1 ring-black/5"><p className="text-sm font-extrabold text-brand-800">Todavía no hay participantes asignados</p><p className="mt-1 text-xs text-neutral-500">Los miembros de esta subcampaña aparecerán aquí.</p></div>}
    {!loading && !error && page?.siguiente_cursor && visibleCount === 0 && <p className="text-xs font-semibold text-neutral-500">Aún no hay miembros de esta subcampaña entre las personas cargadas.</p>}
    {page && !error && <div className="space-y-4">
      {coordinador && <EquipoMemberCard as="section" nombre={coordinador.nombre} rol="Coordinador" tone="warning" subtitle={coordinador.organizacion ?? undefined} />}
      <MemberGroup title="Administradores" members={admins} />
      <MemberGroup title="Plantadores" members={plantadores} />
      {includeLogistics && <MemberGroup title="Operarios" members={logistics} />}
    </div>}
    {page?.siguiente_cursor && !error && <Button variant="secondary" loading={loading} onClick={() => void load(page.siguiente_cursor!)}>Cargar más personas</Button>}
    {canManage && <Link to="/app/participacion/accesos" className="inline-flex min-h-11 items-center text-xs font-semibold text-brand-700 underline">Retirar o cambiar otros permisos</Link>}
  </div>
}
