import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui'

export default function RegistroParticipanteEntry() {
  return <Card as="section" className="mt-5" padding="lg">
    <h2 className="text-lg font-bold">Registrar plantación</h2>
    <p className="mt-2 text-sm leading-6 text-neutral-600">Elige una subcampaña habilitada o recupera un borrador guardado en este dispositivo para tu cuenta.</p>
    <Link to="/app/participacion/registrar" className="mt-4 inline-flex rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">Elegir subcampaña</Link>
  </Card>
}
