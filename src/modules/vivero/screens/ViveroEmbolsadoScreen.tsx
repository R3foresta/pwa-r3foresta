import { Navigate, useParams } from 'react-router-dom'

/** Conserva los enlaces antiguos hacia el único formulario de Embolsado. */
function ViveroEmbolsadoScreen() {
  const { id } = useParams<{ id: string }>()
  const loteId = Number(id)

  if (!Number.isInteger(loteId) || loteId <= 0) {
    return <Navigate to="/app/vivero" replace />
  }

  return <Navigate to={`/app/vivero/${loteId}/event/embolsado`} replace />
}

export default ViveroEmbolsadoScreen
