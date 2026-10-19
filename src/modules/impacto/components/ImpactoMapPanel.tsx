import { Component, lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import type { ImpactoPunto, ImpactoSubcampania } from '../types'

const ImpactoMap = lazy(() => import('./ImpactoMap'))

class MapFallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <p role="status" className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">El mapa no se pudo mostrar. Puedes consultar y seleccionar las zonas y registros en las listas siguientes.</p> : this.props.children
  }
}

export default function ImpactoMapPanel(props: { subcampanias: ImpactoSubcampania[]; puntos: ImpactoPunto[]; seleccion: string | null; onSelect: (value: string) => void }) {
  return <MapFallback><Suspense fallback={<p role="status" className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">Cargando mapa público…</p>}><ImpactoMap {...props} /></Suspense></MapFallback>
}
