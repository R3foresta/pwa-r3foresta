import { useMemo } from 'react';
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models';
import { useNow } from './nowContext'; 

export function useViveroStats(detail: ViveroLotDetailView, events: ViveroLotEventView[]) {
  const now = useNow(); 

  return useMemo(() => {
    const plantasIniciales = detail.plantasVivasIniciales ?? 0;
    const hasEmbolsado = detail.plantasVivasIniciales !== null;

    const despachadas = events
      .filter(e => e.kind === 'DESPACHO')
      .reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
    const mermas = events
      .filter(e => e.kind === 'MERMA')
      .reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
    const disponibles = detail.saldoVivoActual ?? plantasIniciales;

    const vivasHoy = disponibles + despachadas;
    const supervivencia = plantasIniciales > 0 ? Math.round((vivasHoy / plantasIniciales) * 100) : 0;

    const pctDisponibles = plantasIniciales > 0 ? (disponibles / plantasIniciales) * 100 : 0;
    const pctDespachadas = plantasIniciales > 0 ? (despachadas / plantasIniciales) * 100 : 0;
    const pctMermas = plantasIniciales > 0 ? (mermas / plantasIniciales) * 100 : 0;

    const mermasEventos = events.filter(e => e.kind === 'MERMA');
    const ultimaMerma = mermasEventos.length > 0 ? mermasEventos[mermasEventos.length - 1] : null;

    const diasDesdeUltimaMerma = (now != null && ultimaMerma)
    ? Math.floor((now - new Date(ultimaMerma.fechaIso).getTime()) / 86_400_000)
    : null;

    return {
      plantasIniciales,
      hasEmbolsado,
      despachadas,
      mermas,
      disponibles,
      vivasHoy,
      supervivencia,
      pctDisponibles,
      pctDespachadas,
      pctMermas,
      diasDesdeUltimaMerma,
    };
  }, [detail, events, now]);
}
