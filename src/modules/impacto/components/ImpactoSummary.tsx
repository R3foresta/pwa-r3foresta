import Icon from '../../../components/Icon'
import { Card } from '../../../components/ui'
import type { ImpactoIndicadores } from '../types'
import { formatImpactoNumber } from '../utils/consulta'

export default function ImpactoSummary({ indicadores, filtered }: { indicadores: ImpactoIndicadores; filtered: boolean }) {
  return (
    <Card as="section" aria-label="Indicadores de impacto" padding="none" className="overflow-hidden bg-gradient-to-br from-brand-800 to-brand-600 text-white">
      <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1.1fr_1fr] md:items-end md:gap-10">
        <div>
          <div aria-hidden="true" className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-brand-100">
            <Icon name="trees" className="h-6 w-6" />
          </div>
          <p className="break-words text-6xl font-semibold leading-none tracking-tighter sm:text-8xl">{formatImpactoNumber(indicadores.plantacion_inicial)}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">plantas registradas</h2>
        </div>
        <div className="space-y-4">
          <p className="max-w-xl text-sm leading-6 text-brand-100 sm:text-base sm:leading-7">
            Plantaciones iniciales realizadas en equipo{filtered ? ' en esta selección' : ''}. Descubre dónde están y conoce cada jornada.
          </p>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white">
            <span aria-hidden="true"><Icon name="pin" className="h-4 w-4" /></span>
            {formatImpactoNumber(indicadores.registros)} registros grupales
          </p>
          <details className="border-t border-white/15 pt-1 text-xs leading-5 text-brand-100">
            <summary className="min-h-11 cursor-pointer py-3 font-medium text-white">Qué cuenta este número</summary>
            <p>Bajas reportadas: {formatImpactoNumber(indicadores.bajas_reportadas)} · Reposiciones: {formatImpactoNumber(indicadores.reposiciones)}</p>
            <p className="mt-1 pb-2">Se presentan por separado de la plantación inicial; no representan supervivencia comprobada.</p>
          </details>
        </div>
      </div>
    </Card>
  )
}
