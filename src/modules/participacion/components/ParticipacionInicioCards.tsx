import { Badge, Button, Card, StatusBadge } from '../../../components/ui'
import type { CapacidadSubcampania } from '../types'

import { scopeRole } from './plantadorPresentation'

type Props = { scopes: CapacidadSubcampania[]; selectedId: string | null; onEnter: (scope: CapacidadSubcampania) => void }

function CampaignGroups({ scopes, selectedId, onEnter }: Props) {
  const campaigns = [...new Map(scopes.map(scope => [scope.campania_id, scope.campania_nombre]))]
  return <div className="space-y-6">{campaigns.map(([id, name]) => <section key={id} aria-label={name} className="space-y-3">
    <h3 className="break-words text-lg font-bold text-brand-800">{name}</h3>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{scopes.filter(scope => scope.campania_id === id).map(scope => <Card key={scope.subcampania_id} as="article" className={`flex flex-col gap-3 ${selectedId === scope.subcampania_id ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="break-words text-lg font-bold">{scope.nombre}</h4><StatusBadge status={scope.estado} /></div>
      <div><Badge variant="brand">{scopeRole(scope)}</Badge></div>
      <Button variant="secondary" className="mt-auto min-h-12 w-full" aria-label={`Entrar a la subcampaña: ${scope.nombre}`} onClick={() => onEnter(scope)}>Entrar a la subcampaña</Button>
    </Card>)}</div>
  </section>)}</div>
}

export default function ParticipacionInicioCards(props: Props) {
  const active = props.scopes.filter(scope => scope.estado === 'ACTIVA')
  const other = props.scopes.filter(scope => scope.estado !== 'ACTIVA')
  return <div className="space-y-7">
    <CampaignGroups {...props} scopes={active} />
    {other.length > 0 && <section aria-labelledby="otras-subcampanias" className="space-y-4 border-t border-neutral-200 pt-5"><h2 id="otras-subcampanias" className="text-lg font-bold">Otras subcampañas</h2><CampaignGroups {...props} scopes={other} /></section>}
  </div>
}
