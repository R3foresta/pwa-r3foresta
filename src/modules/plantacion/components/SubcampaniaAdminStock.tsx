import { Button, Card } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import type { useRegistroContext } from '../../participacion/registro/hooks/useRegistroContext'
import type { Subcampania } from '../types/contracts'
import SubcampaniaStockDisponible from './SubcampaniaStockDisponible'

type Props = { subcampania: Subcampania; registration: ReturnType<typeof useRegistroContext> }

export default function SubcampaniaAdminStock({ subcampania, registration }: Props) {
  const { login } = useAuth()
  const active = subcampania.estado === 'ACTIVA'
  return <Card as="section" className="space-y-3" aria-label="Stock de la subcampaña">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-extrabold text-brand-800">Stock para plantación inicial</h2>
      <Button size="sm" variant="secondary" leftIcon="plus" disabled aria-describedby="asignar-stock-pendiente">Asignar stock</Button>
    </div>
    <p id="asignar-stock-pendiente" className="text-xs leading-5 text-neutral-500">La asignación de stock desde esta pantalla estará disponible más adelante.</p>
    {active ? <SubcampaniaStockDisponible {...registration} expanded onRefresh={registration.refresh}
      onRecoverSession={() => { void login().then(registration.refresh).catch(() => undefined) }} />
      : <p role="status" className="text-sm leading-6 text-neutral-600">La consulta de stock para registrar está disponible cuando la subcampaña está ACTIVA. El stock no se ha consultado; esto no significa que el saldo sea cero.</p>}
    <p className="text-xs leading-5 text-neutral-500">Disponibilidad elegible por especie para plantación inicial. No incluye stock de reposición ni representa el saldo vivo de plantas ya registradas.</p>
  </Card>
}
