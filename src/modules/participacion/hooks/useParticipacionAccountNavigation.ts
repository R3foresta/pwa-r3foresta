import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

/** Debe vivir fuera del provider que remonta sus hijos al cambiar de cuenta. */
export function useParticipacionAccountNavigation() {
  const { user } = useAuth()
  const previousActor = useRef(user?.id)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => {
    if (previousActor.current && previousActor.current !== user?.id
      && (pathname === '/participar' || pathname === '/app/home' || /^\/app\/planting\/subcampanias\/[1-9]\d*$/.test(pathname))) {
      navigate('/participar', { replace: true, state: null })
    }
    previousActor.current = user?.id
  }, [user?.id, pathname, navigate])
}
