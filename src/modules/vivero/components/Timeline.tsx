import { useState, useMemo } from 'react'
import EventCard from './EventCard'
import type { ViveroLotEventView } from '../types/view-models'

interface TimelineProps {
  events: ViveroLotEventView[]
}

type FilterKind = 'TODOS' | 'MERMA' | 'DESPACHO' | 'ADAPTABILIDAD'

export default function Timeline({ events }: TimelineProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKind>('TODOS')

  const filterChips: { key: FilterKind; label: string }[] = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'MERMA', label: 'Mermas' },
    { key: 'DESPACHO', label: 'Despachos' },
    { key: 'ADAPTABILIDAD', label: 'Etapas' },
  ]

  // Filtrado reactivo en memoria local
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'TODOS') return events
    return events.filter(e => e.kind === activeFilter)
  }, [events, activeFilter])

  return (
    <div className="space-y-4">
      {/* Fila Horizontal de Filtros Rápidos (Chips) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none">
        {filterChips.map((chip) => {
          const isSelected = activeFilter === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveFilter(chip.key)}
              className={`text-[11px] font-black px-3 py-1.5 rounded-full border tracking-wide shrink-0 transition-all ${
                isSelected
                  ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                  : 'bg-white text-brand-700 border-slate-200/80 hover:border-brand-300'
              }`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Listado Cronológico Ordinario */}
      {filteredEvents.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-100">
          <p className="text-xs font-semibold text-slate-400">No se encontraron registros para este filtro.</p>
        </div>
      ) : (
        <div className="mt-2 flex flex-col">
          {filteredEvents.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              isLast={index === filteredEvents.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}