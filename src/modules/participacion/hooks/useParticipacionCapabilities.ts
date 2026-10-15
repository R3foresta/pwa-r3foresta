import { useContext } from 'react'
import { CapabilitiesContext } from './capabilitiesContext'

export function useParticipacionCapabilities() {
  const value = useContext(CapabilitiesContext)
  if (!value) throw new Error('La consulta de capacidades requiere ParticipacionCapabilitiesProvider')
  return value
}
