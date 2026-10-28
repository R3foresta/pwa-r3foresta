import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui'
import type { ImpactoConsulta } from '../types'
import { formatImpactoDate, formatImpactoNumber } from '../utils/consulta'
import ImpactoSubcampaniaCard from './ImpactoSubcampaniaCard'

type Props = {
  data: ImpactoConsulta
  selected: string | null
  currentSubcampaniaId?: string
  returnTo: string
  filtered: boolean
  zoneHref: (id: string) => string
}

export default function ImpactoSelectionSummary({ data, selected, currentSubcampaniaId, returnTo, filtered, zoneHref }: Props) {
  const zone = data.subcampanias.find(item => `s:${item.id}` === selected)
  const point = data.mapa.find(item => `r:${item.registro_id}` === selected)
  const record = data.registros.find(item => `r:${item.id}` === selected)
  if (zone) return <section aria-label="Resumen de zona seleccionada" className="space-y-2">
    <h2 className="font-bold text-brand-800">Zona seleccionada</h2>
    <ImpactoSubcampaniaCard current={zone.id === currentSubcampaniaId} data={zone} returnTo={returnTo} filtered={filtered} href={zoneHref(zone.id)} />
  </section>
  if (!point) return null
  const pointZone = data.subcampanias.find(item => item.id === point.subcampania_id)
  return <Card as="section" className="space-y-2" aria-label="Resumen del registro seleccionado">
    <h2 className="break-words font-bold text-brand-800">Plantación en {record?.subcampania_nombre ?? pointZone?.nombre ?? 'ubicación seleccionada'}</h2>
    <p className="text-sm text-neutral-700">{formatImpactoNumber(point.cantidad_total_plantada)} {point.cantidad_total_plantada === 1 ? 'planta' : 'plantas'} {point.es_reposicion ? 'de reposición' : point.cantidad_total_plantada === 1 ? 'inicial' : 'iniciales'} · Registro grupal</p>
    {record && <p className="text-sm text-neutral-600">{formatImpactoDate(record.fecha_plantacion)}</p>}
    <Link className="inline-flex min-h-11 items-center text-sm font-bold text-brand-700 underline underline-offset-4" to={`/impacto/registros/${point.registro_id}`} state={{ impactoReturnTo: returnTo }}>Ver plantación</Link>
  </Card>
}
