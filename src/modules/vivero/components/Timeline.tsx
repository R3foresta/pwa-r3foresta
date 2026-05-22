import EventCard from './EventCard';
import type { ViveroLotEventView } from '../types/view-models';

interface TimelineProps {
  events: ViveroLotEventView[]; // ✅ Ya no usamos any
}

export default function Timeline({ events }: TimelineProps) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Cronología del lote
        </p>
      </div>
      <ol className="space-y-3">
        {events.map((event, index) => (
          <EventCard 
            key={event.id ?? index} 
            event={event} 
            isLast={index === events.length - 1} 
          />
        ))}
      </ol>
    </section>
  )
}