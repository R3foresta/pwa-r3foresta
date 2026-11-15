import { useMemo } from 'react'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

// Totales del historial consultado, nunca una reconstrucción del saldo ni supervivencia.
export function useViveroStats(detail: ViveroLotDetailView | null, events: ViveroLotEventView[], eventsReady = true) {
  return useMemo(() => {
    const total = (kind: string) => {
      if (!eventsReady) return null
      const matching = events.filter(event => event.kind === kind)
      if (matching.some(event => event.cantidad == null)) return null
      return matching.reduce((sum, event) => sum + (event.cantidad ?? 0), 0)
    }
    return {
      plantasIniciales: detail?.plantasVivasIniciales ?? null,
      disponibles: detail?.saldoVivoActual ?? null,
      despachadas: total('DESPACHO'), mermas: total('MERMA'),
      devueltas: total('DEVOLUCION_PLANTACION'),
    }
  }, [detail, events, eventsReady])
}
