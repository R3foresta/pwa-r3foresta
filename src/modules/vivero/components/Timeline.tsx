import EventCard from './EventCard';
import type { ViveroLotEventView } from '../types/view-models';

interface TimelineProps {
  events: ViveroLotEventView[];
  onRenewPhotos: () => void;
  onOpenGallery?: (event: ViveroLotEventView) => void;
}

export default function Timeline({ events, onOpenGallery, onRenewPhotos }: TimelineProps) {
  const orderedEvents = [...events].reverse()
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Historial auditable del lote
        </p>
      </div>
      <p className="mb-3 text-xs text-neutral-500">Más recientes primero, según fecha física. Eventos de solo lectura; no se editan ni eliminan.</p>
      {events.length === 0 && <p className="text-sm text-neutral-500">Sin eventos en esta consulta.</p>}
      <ol className="relative ml-3 space-y-6">
        {orderedEvents.map((event, index) => (
          <EventCard
            key={event.id ?? index}
            event={event}
            isLast={index === orderedEvents.length - 1}
            onOpenGallery={onOpenGallery}
            onRenewPhotos={onRenewPhotos}
          />
        ))}
      </ol>
    </section>
  )
}
