import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { Card } from '../../../components/ui'
import { INCORPORACION_CHANGED, incorporacionSignalKey, leerIntento } from './incorporacion.store'

/** Entrada propia sin gate M2/rol: perder ADMIN no oculta una solicitud incierta. */
export default function IncorporacionEntry() {
  const { user } = useAuth()
  const token = localStorage.getItem('authToken')
  const key = JSON.stringify([user?.id, token])
  const [read, setRead] = useState<{ key: string; pending: boolean; error: boolean } | null>(null)
  useEffect(() => {
    if (!user?.id || !token) return
    let active = true
    const load = () => {
      leerIntento(user.id).then(record => { if (active && localStorage.getItem('authToken') === token) setRead({ key, pending: record !== null, error: false }) }, () => { if (active) setRead({ key, pending: false, error: true }) })
    }
    const changed = (event: Event) => { if (event instanceof StorageEvent && event.key !== null && event.key !== incorporacionSignalKey(user.id)) return; load() }
    load()
    window.addEventListener('storage', changed)
    window.addEventListener(INCORPORACION_CHANGED, changed)
    return () => { active = false; window.removeEventListener('storage', changed); window.removeEventListener(INCORPORACION_CHANGED, changed) }
  }, [user?.id, token, key])
  if (read?.key !== key || !read.pending && !read.error) return null
  return <Card as="section" className="mt-5 space-y-3"><h2 className="font-bold">Incorporación conservada</h2><p className="text-sm text-neutral-600">{read.error ? 'No se pudo comprobar la preparación guardada en este dispositivo.' : 'Consulta la solicitud de esta cuenta antes de preparar otro ingreso de plantas.'}</p><Link to="/app/vivero/incorporaciones" className="inline-flex min-h-11 items-center rounded-2xl bg-brand-600 px-4 py-3 font-semibold text-white">Recuperar incorporación propia</Link></Card>
}
