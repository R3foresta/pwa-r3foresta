import { useNavigate } from 'react-router-dom'
import { Button, Card } from '../../../../components/ui'
import RegistroScopeSelector from '../../components/RegistroScopeSelector'

export default function RegistroSelectorScreen() {
  const navigate = useNavigate()
  return <main className="mx-auto max-w-lg space-y-5 px-5 pb-36 pt-6">
    <Button variant="ghost" onClick={() => navigate('/app/home')}>Volver al inicio</Button>
    <h1 className="text-2xl font-bold">Iniciar plantación</h1>
    <p className="text-sm leading-6">Elige una subcampaña habilitada para iniciar un registro de plantación.</p>
    <Card as="section" padding="lg"><h2 className="mb-4 font-bold">Elegir subcampaña</h2><RegistroScopeSelector onRegistrar={id => navigate(`/app/participacion/subcampanias/${id}/registrar`)} /></Card>
  </main>
}
