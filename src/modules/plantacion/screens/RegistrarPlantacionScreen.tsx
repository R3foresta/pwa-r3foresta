import { Navigate, useParams } from 'react-router-dom'

// Los enlaces internos de inicial conservan su entrada y usan el comando v1 compartido.
export default function RegistrarPlantacionScreen() {
  const { subcampaniaId } = useParams<{ subcampaniaId: string }>()
  return <Navigate replace to={subcampaniaId && /^[1-9]\d*$/.test(subcampaniaId)
    ? `/app/participacion/subcampanias/${subcampaniaId}/registrar`
    : '/app/participacion/registrar'} state={{ registroIntent: 'nuevo' }} />
}
