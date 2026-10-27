import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card } from '../../../components/ui'
import ImpactoRegistroContent from '../../impacto/components/ImpactoRegistroContent'
import type { ImpactoRegistro } from '../../impacto/types'
import {
  formatImpactoDate,
  formatImpactoNumber,
  impactoErrorMessage,
  impactoErrorStatus,
} from '../../impacto/utils/consulta'

type Props = {
  records: ImpactoRegistro[]
  loading: boolean
  error: unknown
  onRetry: () => void
  hasMore: boolean
  loadingMore: boolean
  pageError: unknown
  onLoadMore: () => void
  onShowMap: (recordId: string) => void
  confirmedEmpty: boolean
  scopeChanged?: boolean
  returnTo?: string
}

function RegistroCard({ record, onShowMap, returnTo }: {
  record: ImpactoRegistro
  onShowMap: Props['onShowMap']
  returnTo?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const destination = returnTo ?? `/app/planting/subcampanias/${record.subcampania_id}`
  const responsible = record.personas.find(person => person.es_responsable)

  return <li className="min-w-0 overflow-hidden rounded-3xl bg-neutral-50 ring-1 ring-neutral-100">
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-extrabold text-brand-800">{record.codigo_trazabilidad}</h3>
          <p className="mt-1 break-words text-xs text-neutral-500">Registro {record.id} · {formatImpactoDate(record.fecha_plantacion)}</p>
        </div>
        <Badge variant={record.es_reposicion ? 'info' : 'brand'} size="sm">{record.es_reposicion ? 'Reposición' : 'Plantación inicial'}</Badge>
      </div>
      <p className="text-2xl font-extrabold tabular-nums text-brand-800">{formatImpactoNumber(record.cantidad_total_plantada)} <span className="text-xs font-semibold">{record.cantidad_total_plantada === 1 ? 'planta del registro grupal' : 'plantas del registro grupal'}</span></p>
      <p className="text-xs text-neutral-600">Responsable: <strong className="text-brand-800">{responsible?.nombre ?? 'Nombre histórico no disponible'}</strong></p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Button size="sm" variant="secondary" className="min-h-11" leftIcon="map" onClick={() => onShowMap(record.id)}>Ver en mapa</Button>
        <Link to={`/impacto/registros/${record.id}`} state={{ impactoReturnTo: destination }} className="inline-flex min-h-11 items-center text-xs font-semibold text-brand-700 underline underline-offset-4">Abrir ficha pública</Link>
      </div>
    </div>
    <details onToggle={event => setExpanded(event.currentTarget.open)} className="border-t border-neutral-100">
      <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-bold text-brand-700 focus-visible:outline-brand-500">Ver detalle del registro {record.codigo_trazabilidad}</summary>
      {expanded && <div className="space-y-3 px-3 pb-3"><ImpactoRegistroContent data={record} returnTo={destination} /></div>}
    </details>
  </li>
}

/** Lectura detallada para ADMIN; conserva explícitamente el alcance de Impacto. */
export default function SubcampaniaAdminHistorial({
  records, loading, error, onRetry, hasMore, loadingMore, pageError, onLoadMore,
  onShowMap, confirmedEmpty, scopeChanged = false, returnTo,
}: Props) {
  const unavailable = impactoErrorStatus(error) === 404

  return <Card as="section" className="space-y-4" aria-label="Historial de plantaciones">
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">Consulta del administrador</p>
      <h2 className="mt-1 text-lg font-extrabold text-brand-800">Historial de plantaciones</h2>
      <p className="mt-2 text-xs leading-5 text-neutral-600">Registros disponibles en la consulta pública, con ubicación, participantes, evidencias y seguimiento. Esta lectura no incluye una auditoría administrativa completa ni registros no publicados.</p>
    </div>
    {scopeChanged && <p role="status" className="rounded-2xl bg-warning-50 p-3 text-xs text-warning-800">Se actualizó el alcance público; algunos registros pueden haber dejado de estar disponibles.</p>}
    {loading && <p role="status" className="text-sm text-neutral-600">Consultando historial de plantaciones…</p>}
    {Boolean(error) && <div className="space-y-2 rounded-2xl bg-neutral-50 p-3">
      <p role={unavailable ? 'status' : 'alert'} className="text-sm text-neutral-600">{unavailable ? 'El historial público no está disponible para esta subcampaña. Esto no significa que no existan plantaciones.' : `No pudimos consultar el historial. ${impactoErrorMessage(error)}`}</p>
      <Button size="sm" variant="secondary" onClick={onRetry}>Reintentar historial</Button>
    </div>}
    {records.length > 0 && <ul className="space-y-3">{records.map(record => <RegistroCard key={record.id} record={record} onShowMap={onShowMap} returnTo={returnTo} />)}</ul>}
    {!loading && !error && records.length === 0 && <p role="status" className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">{confirmedEmpty ? 'Todavía no hay plantaciones registradas en la consulta pública.' : hasMore ? 'No hay registros en las páginas cargadas. Carga más para continuar.' : 'Los registros no están disponibles en esta consulta.'}</p>}
    {Boolean(pageError) && <p role="alert" className="text-sm text-danger-700">No pudimos cargar más registros. {impactoErrorMessage(pageError)}</p>}
    {!error && (hasMore || Boolean(pageError)) && <Button variant="secondary" fullWidth loading={loadingMore} disabled={loading} onClick={onLoadMore}>{pageError ? 'Reintentar más registros' : 'Cargar más plantaciones'}</Button>}
  </Card>
}
