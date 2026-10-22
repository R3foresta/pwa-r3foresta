import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import { Card } from '../../components/ui'
import ImpactoActions from '../impacto/components/ImpactoActions'

export default function ParticipantHomeScreen() {
  const { user, isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  return <main className="mx-auto max-w-2xl space-y-6 px-5 pb-36 pt-6">
    {pathname === '/app/home' && <header className="flex items-center justify-between"><Link to="/impacto" className="font-bold">R3foresta</Link><Link to="/app/profile" aria-label="Ver mi perfil" className="rounded-full bg-white p-3 shadow-soft"><Icon name="user" className="h-5 w-5" /></Link></header>}
    <div><p className="text-sm font-semibold text-brand-600">Cada planta cuenta</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{isAuthenticated ? `Hola${user?.nombre ? `, ${user.nombre}` : ''}` : 'Sé parte de la próxima plantación'}</h1><p className="mt-3 text-sm leading-7 text-neutral-600">{isAuthenticated ? 'Encuentra las zonas donde puedes registrar una plantación con tu equipo.' : 'Explora lo que estamos plantando. Crea tu perfil cuando quieras participar y guardar tu actividad.'}</p></div>
    <ImpactoActions />
    <Card as="section" className="space-y-4"><h2 className="text-lg font-bold">Así empiezas</h2><ol className="space-y-4 text-sm leading-6 text-neutral-600"><li><strong className="text-brand-800">1. Crea tu perfil.</strong> Tu nombre permite al equipo reconocerte.</li><li><strong className="text-brand-800">2. Únete a una jornada.</strong> Coordina con el equipo responsable de la campaña para que habilite tu acceso.</li><li><strong className="text-brand-800">3. Registra con tu equipo.</strong> Elige una zona habilitada y agrega las plantas, la ubicación y las fotos.</li></ol><Link to="/impacto" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4">Explorar las campañas</Link></Card>
  </main>
}
