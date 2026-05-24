import EventCard from './EventCard';
import type { ViveroLotEventView } from '../types/view-models';

interface TimelineProps {
  events: ViveroLotEventView[];
  onOpenGallery?: (event: ViveroLotEventView) => void;
}

export default function Timeline({ events, onOpenGallery }: TimelineProps) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Cronología del lote
        </p>
      </div>
      {/* FIX: Se eliminó border-l-2 border-slate-200 */}
      <ol className="relative ml-3 space-y-6">
        {events.map((event, index) => (
          <EventCard 
            key={event.id ?? index} 
            event={event} 
            isLast={index === events.length - 1} 
            onOpenGallery={onOpenGallery} 
          />
        ))}
      </ol>
    </section>
  )
}