import { Component, lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import type { ImpactoMapProps } from './ImpactoMap'

const ImpactoMap = lazy(() => import('./ImpactoMap'))

class MapFallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <p role="status" className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">El mapa no se pudo mostrar. Puedes consultar y seleccionar las zonas y registros en las listas siguientes.</p> : this.props.children
  }
}

export default function ImpactoMapPanel(props: ImpactoMapProps) {
  return <MapFallback><Suspense fallback={<div role="status" className={`flex items-center justify-center rounded-3xl bg-brand-50 text-sm text-brand-700 ring-1 ring-brand-100 ${props.fill ? 'h-full min-h-48' : props.compact ? 'h-[clamp(14rem,32svh,18rem)] sm:h-[420px]' : 'h-[360px] sm:h-[460px]'}`}>{props.privateScope ? 'Cargando mapa…' : 'Cargando mapa público…'}</div>}><ImpactoMap {...props} /></Suspense></MapFallback>
}
