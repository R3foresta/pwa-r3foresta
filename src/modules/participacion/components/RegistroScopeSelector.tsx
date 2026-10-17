import { useState } from 'react'
import { Button } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { useParticipacionCapabilities } from '../hooks/useParticipacionCapabilities'
import type { CapacidadSubcampania } from '../types'

type Props = { onRegistrar: (id: string) => void; onVer?: (id: string) => void }
type Preference = { campania_id: string; subcampania_id: string }
function readPreference(actorId: string): Preference | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`r3foresta:registro-scope:v1:${actorId}`) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const item = value as Partial<Preference>
    return typeof item.campania_id === 'string' && typeof item.subcampania_id === 'string' ? item as Preference : null
  } catch { return null }
}

function canRegisterInScope(scope: CapacidadSubcampania) {
  return scope.estado === 'ACTIVA' && scope.acciones.preparar_registro && scope.acciones.registrar_inicial
}

export default function RegistroScopeSelector(props: Props) {
  const { user, login } = useAuth()
  return <AccountSelector key={user?.id ?? ''} actorId={user?.id ?? ''} login={login} {...props} />
}

function AccountSelector({ actorId, login, onRegistrar, onVer }: Props & { actorId: string; login: () => Promise<void> }) {
  const { data, status, error, refresh } = useParticipacionCapabilities()
  const [selection, setSelection] = useState<Preference | null>(() => readPreference(actorId))
  const scopes = status === 'ready' ? (data?.data.subcampanias ?? []).filter(canRegisterInScope) : []
  const campaigns = Array.from(new Map(scopes.map(scope => [scope.campania_id, scope.campania_nombre])).entries())
  const selectedCampaign = campaigns.some(([id]) => id === selection?.campania_id) ? selection!.campania_id : campaigns[0]?.[0] ?? ''
  const campaignScopes = scopes.filter(scope => scope.campania_id === selectedCampaign)
  const selectedScope = campaignScopes.find(scope => scope.subcampania_id === selection?.subcampania_id) ?? campaignScopes[0]
  const remember = (scope: CapacidadSubcampania) => {
    const value = { campania_id: scope.campania_id, subcampania_id: scope.subcampania_id }
    setSelection(value)
    try { localStorage.setItem(`r3foresta:registro-scope:v1:${actorId}`, JSON.stringify(value)) } catch { /* La preferencia es opcional. */ }
  }
  if (status === 'loading') return <p role="status">Consultando subcampañas habilitadas…</p>
  if (status === 'error' || status === 'sessionExpired') return <div className="space-y-3">
    <p role="alert" className="text-sm text-danger-700">{error} No pudimos confirmar los permisos de tu cuenta.</p>
    <Button onClick={() => { void (status === 'sessionExpired' ? login().catch(() => undefined) : refresh()) }}>{status === 'sessionExpired' ? 'Recuperar sesión' : 'Reintentar capacidades'}</Button>
  </div>
  if (!scopes.length) return <p className="text-sm leading-6">No tienes subcampañas activas habilitadas para registrar. Coordina tu acceso con el equipo responsable. Puedes recuperar los borradores de esta cuenta que aparecen arriba.</p>
  return <div className="space-y-4">
    <label className="block text-sm font-semibold">Campaña
      <select value={selectedCampaign} onChange={event => { const scope = scopes.find(item => item.campania_id === event.target.value); if (scope) remember(scope) }} className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white p-3">
        {campaigns.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
    <label className="block text-sm font-semibold">Subcampaña activa
      <select value={selectedScope?.subcampania_id ?? ''} onChange={event => { const scope = campaignScopes.find(item => item.subcampania_id === event.target.value); if (scope) remember(scope) }} className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white p-3">
        {campaignScopes.map(scope => <option key={scope.subcampania_id} value={scope.subcampania_id}>{scope.nombre}</option>)}
      </select>
    </label>
    <p className="text-xs text-neutral-600">La disponibilidad de plantas se consulta al abrir el formulario.</p>
    {selectedScope && <div className="flex flex-wrap gap-3">
      <Button onClick={() => { remember(selectedScope); onRegistrar(selectedScope.subcampania_id) }}>Registrar en esta subcampaña</Button>
      {onVer && <Button variant="secondary" onClick={() => onVer(selectedScope.subcampania_id)}>Ver subcampaña</Button>}
    </div>}
  </div>
}
