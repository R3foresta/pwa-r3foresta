import { useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import { canAtVivero, exactId, sameId } from '../../accesos/accessPolicy'

// El equipo aporta sólo COORDINADOR M3; sigue siendo imprescindible operar este vivero M2.
export function useM2Logistics(viveroId: unknown, subcampaniaId: unknown) {
  const { user } = useAuth()
  const { m2 } = useOperationalAccess()
  const [version, setVersion] = useState(0)
  let scope: string | null = null
  try { scope = exactId(subcampaniaId) } catch { /* selección todavía incompleta */ }
  const operates = m2.status === 'ready' && canAtVivero(m2.data, viveroId, 'operar')
  const global = operates && m2.data?.rol_global === 'ADMIN' && m2.data.capacidades_globales.operar_cualquier_vivero
  const key = JSON.stringify([user?.id, viveroId, scope, operates, global, version])
  const [state, setState] = useState<{ key: string; allowed: boolean; error: string | null } | null>(null)
  useEffect(() => {
    if (!operates || global || !scope) return
    let active = true
    void PlantacionService.getSubcampaniaEquipoExacto(scope).then(equipo => {
      if (active) setState({ key, allowed: equipo.some(member => member.rol === 'COORDINADOR' && sameId(member.usuario_id, user?.id)), error: null })
    }).catch((error: unknown) => {
      if (active) setState({ key, allowed: false, error: error instanceof Error ? error.message : 'No se pudo consultar tu responsabilidad logística.' })
    })
    return () => { active = false }
  }, [operates, global, scope, key, user?.id])
  const current = state?.key === key ? state : null
  return { allowed: Boolean(operates && scope && (global || current?.allowed)), loading: Boolean(operates && scope && !global && !current), error: current?.error ?? null, refresh: () => setVersion(value => value + 1) }
}
