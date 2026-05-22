import { useMemo } from 'react'
import Icon from '../../../components/Icon'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

interface Props {
  detail: ViveroLotDetailView
  events: ViveroLotEventView[]
}

export default function IndicadoresRapidos({ detail, events }: Props) {
  const disponibles = detail.saldoVivoActual ?? detail.plantasVivasIniciales ?? 0

  // Cálculo dinámico iterando sobre los eventos reales del backend
  const { mermas, despachadas } = useMemo(() => {
    return events.reduce((acc, e) => {
      if (e.kind === 'MERMA') acc.mermas += (e.cantidad || 0)
      if (e.kind === 'DESPACHO') acc.despachadas += (e.cantidad || 0)
      return acc
    }, { mermas: 0, despachadas: 0 })
  }, [events])

  const smallCards = [
    { label: 'Material inicial', value: detail.cantidadInicialEnProceso, unit: detail.unidadMedidaInicial, hint: 'En INICIO' },
    { label: 'Plantas vivas iniciales', value: detail.plantasVivasIniciales ?? 0, unit: 'UNIDAD', hint: 'En EMBOLSADO' },
    { label: 'Mermas acumuladas', value: mermas, unit: 'UNIDAD', tone: 'red' },
    { label: 'Despachadas', value: despachadas, unit: 'UNIDAD', tone: 'blue' },
  ]

  return (
    <section>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500 mb-2">
        Indicadores rápidos
      </p>
      
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-4 text-white shadow-soft">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">Disponibles ahora</p>
            <p className="mt-1 text-5xl font-extrabold leading-none tracking-tight">{disponibles}</p>
            <p className="mt-1 text-[11px] font-bold text-white/80">UNIDAD · saldo vivo actual</p>
          </div>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Icon name="trending_up" className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {smallCards.map(s => {
          const toneText = s.tone === 'red' ? 'text-red-700' : s.tone === 'blue' ? 'text-blue-700' : 'text-brand-800'
          return (
            <div key={s.label} className="rounded-2xl bg-white px-3 py-2.5 shadow-soft ring-1 ring-black/5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">{s.label}</p>
              <p className={`mt-0.5 text-xl font-extrabold leading-none ${toneText}`}>{s.value.toLocaleString('es-BO')}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {s.unit}{s.hint ? ` · ${s.hint}` : ''}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}