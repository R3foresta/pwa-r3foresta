import { Card } from '../../../components/ui'
import type { ImpactoIndicadores } from '../types'
import { formatImpactoNumber } from '../utils/consulta'

export default function ImpactoSummary({ indicadores, filtered, speciesName, scopeLabel }: { indicadores: ImpactoIndicadores; filtered: boolean; speciesName?: string; scopeLabel: string }) {
  return (
    <Card as="section" aria-label="Indicadores de impacto" padding="none" className="overflow-hidden bg-gradient-to-br from-brand-800 to-brand-600 text-white">
      <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-8">
        <div>
          <p className="mb-2 text-sm font-medium text-brand-100">{scopeLabel}{filtered ? ' · selección filtrada' : ''}</p>
          <p className="break-words text-5xl font-semibold leading-none tracking-tighter sm:text-7xl">{formatImpactoNumber(indicadores.plantacion_inicial)}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">plantas de plantación inicial</h2>
          <p className="mt-2 text-sm leading-5 text-brand-100">{filtered ? 'En los registros de esta selección.' : 'Plantaciones realizadas en equipo.'} No es un conteo de plantas vivas.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-white">{formatImpactoNumber(indicadores.registros)} {indicadores.registros === 1 ? 'registro grupal' : 'registros grupales'}</p>
          {speciesName && <p className="text-sm leading-5 text-brand-100">Registros que incluyen {speciesName}; el total reúne todas las especies de esos registros.</p>}
          <a href="#impacto-mapa-title" className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-4">Explorar zonas</a>
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
