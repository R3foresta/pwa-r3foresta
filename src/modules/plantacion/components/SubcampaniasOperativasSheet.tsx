import { Button } from '../../../components/ui'
import RegistroScopeSelector from '../../participacion/components/RegistroScopeSelector'

type Props = { onVer: (id: string) => void; onRegistrar: (id: string) => void; onBack: () => void }

export default function SubcampaniasOperativasSheet({ onBack, ...selection }: Props) {
  return <div className="space-y-4 p-5">
    <RegistroScopeSelector {...selection} />
    <Button variant="ghost" onClick={onBack}>Volver a acciones rápidas</Button>
  </div>
}
