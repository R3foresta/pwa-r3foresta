import { useState } from 'react'
import Icon from '../../../components/Icon'
import { formatRecoleccionDateTime } from '../recoleccionPresentation'

type Evidencia = {
  id: number | string
  public_url?: string | null
  titulo: string | null
  mime_type: string
  tamano_bytes?: number | null
  tomado_en?: string | null
  creado_en?: string | null
  recepcion_id?: string | null
}

function Foto({ evidencia }: { evidencia: Evidencia }) {
  const [failed, setFailed] = useState(false)
  const title = evidencia.titulo || `Evidencia ${evidencia.id}`
  const url = evidencia.public_url
  return <figure className="min-w-0 space-y-1">
    {url && !failed ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar ${title}`} className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">
      <img src={url} alt={title} className="h-24 w-full rounded-2xl object-cover" loading="lazy" onError={() => setFailed(true)} />
    </a> : <div className="flex h-24 items-center justify-center rounded-2xl bg-neutral-100"><Icon name="photo" className="h-8 w-8 text-neutral-400" /></div>}
    <figcaption className="break-words text-center text-[11px] font-semibold text-neutral-500">
      {title}
      <span className="block">{evidencia.recepcion_id ? 'Recepción' : 'Recolección'} · {evidencia.mime_type}</span>
      {evidencia.tamano_bytes != null && <span className="block">{new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 }).format(evidencia.tamano_bytes / 1024)} KB</span>}
      {(evidencia.tomado_en || evidencia.creado_en) && <span className="block">{formatRecoleccionDateTime(evidencia.tomado_en || evidencia.creado_en)}</span>}
      {(!url || failed) && <span className="block">{failed ? 'No se pudo cargar la foto.' : 'Vista previa no disponible.'}</span>}
    </figcaption>
  </figure>
}

export default function RecoleccionEvidencias({ evidencias }: { evidencias: readonly Evidencia[] | undefined }) {
  if (!evidencias) return <p className="mt-3 text-sm text-neutral-500">Evidencias no disponibles en esta consulta.</p>
  if (evidencias.length === 0) return <p className="mt-3 text-sm text-neutral-500">No hay evidencias registradas.</p>
  return <div className="mt-3 grid grid-cols-3 gap-3">{evidencias.map(evidencia => <Foto key={`${evidencia.id}:${evidencia.public_url}`} evidencia={evidencia} />)}</div>
}
