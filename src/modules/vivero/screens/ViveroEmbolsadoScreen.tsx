import { isExactId } from '../../accesos/accessPolicy'
import { Navigate, useParams } from 'react-router-dom'

/** Conserva los enlaces antiguos hacia el único formulario de Embolsado. */
function ViveroEmbolsadoScreen() {
  const { id } = useParams<{ id: string }>()
  const loteId = id ?? ''

  if (!isExactId(loteId)) {
    return <Navigate to="/app/vivero" replace />
  }

  return <Navigate to={`/app/vivero/${loteId}/event/embolsado`} replace />
}

export default ViveroEmbolsadoScreen
