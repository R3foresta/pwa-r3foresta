import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, StatusBadge } from '../../../components/ui'
import type { ImpactoSubcampania } from '../types'
import { formatImpactoNumber } from '../utils/consulta'
import ImpactoPlantacionProgress from './ImpactoPlantacionProgress'

export default function ImpactoSubcampaniaCard({ data, returnTo, filtered = false, href, current = false, children, showFollowUp = true, simpleProgress = false }: { data: ImpactoSubcampania; returnTo: string; filtered?: boolean; href?: string; current?: boolean; children?: ReactNode; showFollowUp?: boolean; simpleProgress?: boolean }) {
  return <Card as="article" className="space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words font-bold text-brand-800">{data.nombre}</h3><StatusBadge status={data.estado} /></div>
    {(data.zona || !simpleProgress) && <p className="text-sm text-neutral-600">{data.zona ?? 'Zona sin descripción'}</p>}
    {simpleProgress ? <ImpactoPlantacionProgress plantacionInicial={data.plantacion_inicial} meta={data.meta_inicial} /> : <>
      <dl className="grid grid-cols-3 gap-2 text-sm">
      <div><dt className="text-xs text-neutral-500">Inicial{filtered ? ' filtrada' : ''}</dt><dd className="font-bold text-brand-800">{formatImpactoNumber(data.plantacion_inicial)}</dd></div>
      <div><dt className="text-xs text-neutral-500">Meta vigente</dt><dd className="font-bold text-brand-800">{formatImpactoNumber(data.meta_inicial)}</dd></div>
      <div><dt className="text-xs text-neutral-500">Faltantes{filtered ? ' del filtro' : ''}</dt><dd className="font-bold text-brand-800">{formatImpactoNumber(data.faltantes)}</dd></div>
    </dl>
    {data.avance_porcentaje === null ? <p className="text-xs text-neutral-600">Sin meta positiva para calcular avance.</p> : <div className="space-y-1"><p className="text-sm font-bold text-brand-700">Avance inicial{filtered ? ' filtrado' : ''}: {formatImpactoNumber(data.avance_porcentaje)}%</p><progress className="h-2 w-full accent-brand-600" max={100} value={Math.min(data.avance_porcentaje, 100)} aria-label={`Avance inicial de ${data.nombre}`} aria-valuetext={`${formatImpactoNumber(data.avance_porcentaje)}%`} /></div>}
    </>}
    {filtered && <p className="text-xs text-neutral-500">Los filtros reducen los hechos comparados; la meta vigente conserva el total de la subcampaña.</p>}
    {children}
    {showFollowUp && <details className="rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-700"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Ver seguimiento reportado</summary><p className="mt-2">Bajas reportadas: {formatImpactoNumber(data.bajas_reportadas)} · Reposiciones: {formatImpactoNumber(data.reposiciones)}</p><p className="mt-1 text-xs text-neutral-500">No modifican el avance inicial ni los faltantes. No representan supervivencia comprobada.</p></details>}
    {!current && <Link aria-label={`Conocer zona: ${data.nombre}`} className="inline-flex min-h-11 items-center text-sm font-bold text-brand-700 underline underline-offset-4" to={href ?? `/impacto/subcampanias/${data.id}`} state={{ impactoReturnTo: returnTo }}>Conocer zona</Link>}
  </Card>
}
