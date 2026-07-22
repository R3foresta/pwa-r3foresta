import { useEffect, useState } from 'react'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import type {
  LoteTimelineAdaptabilidadResponse,
  SubetapaAdaptabilidad,
} from '../types/contracts'

type TimelineData = LoteTimelineAdaptabilidadResponse['data']

type Props = {
  loteId: number
}

const SUBETAPA_LABEL: Record<SubetapaAdaptabilidad, string> = {
  SOMBRA: 'Sombra',
  MEDIA_SOMBRA: 'Media sombra',
  SOL_DIRECTO: 'Sol directo',
}

// Mini-viz data-driven (gotcha §6.2): el color codifica la intensidad lumínica de
// la sub-etapa (sombra → media sombra → sol directo), no un estado de dominio; por
// eso se mantiene inline y no deriva de status.ts. `orange` (SOL_DIRECTO) no tiene
// variante de <Badge> equivalente y colapsarlo a `warning` borraría el gradiente,
// así que se conserva por paridad.
const SUBETAPA_BADGE_TONE: Record<SubetapaAdaptabilidad, string> = {
  SOMBRA: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  MEDIA_SOMBRA: 'bg-warning-50 text-warning-700 ring-warning-200',
  SOL_DIRECTO: 'bg-warning-100 text-warning-700 ring-warning-200',
}

function formatFecha(iso: string): string {
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso
  const parts = datePart.split('-').map((p) => parseInt(p, 10))
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function AdaptabilidadTimeline({ loteId }: Props) {
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado inicial `loading=true` cubre el primer render. El componente se
  // remonta cuando cambia el lote (el padre lo oculta durante su propio
  // `loading`), así que no hace falta resetear state sincrónicamente acá —
  // y evitamos cascading renders al setear dentro del effect.
  useEffect(() => {
    let mounted = true
    LotesViveroService.listAdaptabilidadTimeline(loteId)
      .then((d) => {
        if (mounted) setData(d)
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar el historial.')
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [loteId])

  if (loading) {
    return (
      <p className="text-xs font-semibold text-brand-500">Cargando historial…</p>
    )
  }

  if (error) {
    return (
      <p className="whitespace-pre-line rounded-2xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-200">
        {error}
      </p>
    )
  }

  if (!data || data.eventos.length === 0) {
    return (
      <p className="text-xs font-semibold text-brand-400">
        Sin registros de adaptabilidad todavía.
      </p>
    )
  }

  return (
    <ol className="space-y-3">
      {data.eventos.map((evento, idx) => {
        const isLast = idx === data.eventos.length - 1
        const subetapa = evento.payload.subetapa_destino
        return (
          <li key={evento.id} className="relative pl-5">
            {/* Línea vertical entre items */}
            {!isLast && (
              <span
                className="absolute bottom-0 left-1.5 top-5 w-0.5 bg-brand-100"
                aria-hidden
              />
            )}
            {/* Punto */}
            <span
              className="absolute left-0 top-2 h-3 w-3 rounded-full bg-brand-500 shadow-soft ring-2 ring-white"
              aria-hidden
            />
            <div className="rounded-2xl bg-brand-50/40 px-3 py-2.5 ring-1 ring-brand-100">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${SUBETAPA_BADGE_TONE[subetapa]}`}
                >
                  {SUBETAPA_LABEL[subetapa]}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
                  {formatFecha(evento.fecha_evento)}
                </span>
              </div>
              {evento.responsable_nombre && (
                <p className="mt-1.5 text-[11px] font-semibold text-brand-500">
                  Por {evento.responsable_nombre}
                </p>
              )}
              {evento.observaciones && (
                <p className="mt-1 text-xs font-semibold text-brand-700">
                  {evento.observaciones}
                </p>
              )}
              {evento.evidencias.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {evento.evidencias.map((ev) => (
                    <a
                      key={ev.id}
                      href={ev.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-12 w-12 overflow-hidden rounded-lg ring-1 ring-brand-100 transition hover:ring-brand-300"
                    >
                      <img
                        src={ev.public_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default AdaptabilidadTimeline
