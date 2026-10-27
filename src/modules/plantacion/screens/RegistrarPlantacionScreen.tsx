import { Navigate, useParams } from 'react-router-dom'
import { subcampaniaDetailPath } from '../../participacion/utils/detailNavigation'

// Los enlaces internos de inicial conservan su entrada y usan el comando v1 compartido.
export default function RegistrarPlantacionScreen() {
  const { subcampaniaId } = useParams<{ subcampaniaId: string }>()
  if (!subcampaniaId || !/^[1-9]\d*$/.test(subcampaniaId)) return <Navigate replace to="/participar" />
  return <Navigate replace to={`/app/participacion/subcampanias/${subcampaniaId}/registrar`} state={{ registroIntent: 'nuevo', participacionReturnTo: subcampaniaDetailPath(subcampaniaId) }} />
}
