import { Navigate, useLocation, useParams } from 'react-router-dom'

/** Conserva enlaces previos sin mantener una segunda bandeja de recepción. */
export default function RecepcionScreen() {
  const { id } = useParams()
  const location = useLocation()
  return <Navigate replace to={`/app/collections/validate${id ? `/${encodeURIComponent(id)}` : ''}${location.search}`} state={location.state} />
}
