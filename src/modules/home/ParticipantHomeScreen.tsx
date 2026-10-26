import { useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import { Card } from '../../components/ui'
import ImpactoActions from '../impacto/components/ImpactoActions'
import { CapabilitiesContext } from '../participacion/hooks/capabilitiesContext'
import { ParticipacionCapabilitiesProvider } from '../participacion/components/ParticipacionCapabilitiesProvider'
import PlantadorWorkspace from '../participacion/components/PlantadorWorkspace'

export default function ParticipantHomeScreen() {
  const { user, hydrated, isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  const sharedCapabilities = useContext(CapabilitiesContext)
  const token = localStorage.getItem('authToken')
  const accountReady = hydrated && isAuthenticated && user && token
  const workspace = accountReady ? <PlantadorWorkspace key={`${user.auth_id}:${user.id}:${token}`} actorId={user.id} /> : null
  return <main className="mx-auto max-w-6xl space-y-4 px-4 pb-36 pt-1 sm:px-6 sm:pt-3">
    {pathname === '/app/home' && <header className="flex items-center justify-between"><Link to="/impacto" className="font-bold">R3foresta</Link><Link to="/app/profile" aria-label="Ver mi perfil" className="rounded-full bg-white p-3 shadow-soft"><Icon name="user" className="h-5 w-5" /></Link></header>}
    <h1 className="sr-only">Participar</h1>
    {!hydrated ? <Card><p role="status" className="text-sm text-neutral-600">Comprobando tu sesión…</p></Card> : workspace ? (sharedCapabilities ? workspace : <ParticipacionCapabilitiesProvider>{workspace}</ParticipacionCapabilitiesProvider>) : <div className="max-w-2xl space-y-5">
      <ImpactoActions />
      <Card as="section" className="space-y-3"><h2 className="text-lg font-bold">Participa con tu equipo</h2><p className="text-sm leading-6 text-neutral-600">El equipo responsable te habilita en las subcampañas donde vas a plantar. Aquí podrás consultar su ubicación, avance y stock antes de registrar.</p><Link to="/impacto" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4">Explorar las campañas</Link></Card>
    </div>}
  </main>
}
