import { Link } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import type { ImpactoRegistro } from '../../impacto/types'
import { formatImpactoDate, formatImpactoNumber, impactoErrorMessage } from '../../impacto/utils/consulta'

type Props = { records: ImpactoRegistro[]; hasMore: boolean; loadingMore: boolean; pageError: unknown; scopeChanged: boolean; onLoadMore: () => void; returnTo: string; confirmedEmpty: boolean }
export default function ParticipacionDetalleHistorial({ records, hasMore, loadingMore, pageError, scopeChanged, onLoadMore, returnTo, confirmedEmpty }: Props) {
  return <Card as="section" className="space-y-3" aria-label="Historial de plantaciones">
    <h2 className="text-lg font-bold">Historial de plantaciones</h2>
    <p className="text-sm text-neutral-600">Registros colectivos de esta subcampaña. Las cantidades corresponden al grupo completo, no al aporte individual de cada participante.</p>
    {scopeChanged && <p role="status" className="text-sm">Se actualizó el alcance público; algunos registros pueden haber dejado de estar disponibles.</p>}
    {records.length ? <ul className="divide-y divide-neutral-100">{records.map(record => <li key={record.id} className="space-y-1 py-3 text-sm">
      <Link to={`/impacto/registros/${record.id}`} state={{ impactoReturnTo: returnTo }} className="inline-flex min-h-11 items-center font-bold text-brand-700 underline">{record.codigo_trazabilidad}</Link>
      <p>{formatImpactoDate(record.fecha_plantacion)} · {formatImpactoNumber(record.cantidad_total_plantada)} {record.es_reposicion ? 'reposiciones' : 'plantas iniciales'}</p>
      <p className="text-neutral-600">{record.especies.map(species => `${species.nombre ?? 'Especie sin nombre'}: ${formatImpactoNumber(species.cantidad)}`).join(' · ')}</p>
    </li>)}</ul> : <p className="text-sm text-neutral-600">{confirmedEmpty ? 'Todavía no hay plantaciones registradas en la consulta pública.' : hasMore ? 'No hay registros en las páginas cargadas. Carga más para continuar.' : 'Los registros no están disponibles en esta consulta.'}</p>}
    {Boolean(pageError) && <p role="alert" className="text-sm text-danger-700">{impactoErrorMessage(pageError)}</p>}
    {hasMore && <Button variant="secondary" loading={loadingMore} onClick={onLoadMore}>{pageError ? 'Reintentar más registros' : 'Cargar más registros colectivos'}</Button>}
  </Card>
}
