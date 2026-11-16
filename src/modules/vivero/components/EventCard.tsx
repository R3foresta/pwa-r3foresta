import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { Button } from '../../../components/ui'
import EvidencePhoto from './EvidencePhoto'
import { formatViveroNumber, incorporacionLabel } from '../utils/presentation'
import Icon from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'
import { formatUnidadCanonicaDisplay } from '../../../utils/recoleccionUnidad'
import type { ViveroLotEventView } from '../types/view-models'

interface EventCardProps {
  event: ViveroLotEventView
  isLast: boolean
  onRenewPhotos: () => void
  onOpenGallery?: (event: ViveroLotEventView) => void
}

const origenesDespacho: Record<string, string> = {
  MANUAL: 'Manual', ASIGNACION_SUBCAMPANIA: 'Asignación a subcampaña', AUTOMATICO_PLANTACION: 'Automático de plantación',
}

export default function EventCard({ event, isLast, onOpenGallery, onRenewPhotos }: EventCardProps) {
  const { user } = useAuth()
  const links = event.vinculos
  const plantingLink = (id: string, section: 'campanias' | 'subcampanias') => {
    if (user?.rol !== 'ADMIN' || BigInt(id) > BigInt(Number.MAX_SAFE_INTEGER)) return id
    const tab = section === 'subcampanias' ? '?pestana=registros' : ''
    return <Link className="font-semibold text-brand-700 underline" to={`/app/planting/${section}/${id}${tab}`}>{id}</Link>
  }
  // Theming de mini-viz del timeline (gotcha §6.2): ícono + tinte por tipo de evento.
  // Codifica el tipo de evento (dato de la visualización), no una píldora de estado de
  // dominio; se mantiene inline con tokens migrados y no deriva de status.ts.
  const configMap: Record<string, { icon: IconName; bg: string; text: string; ring: string }> = {
    INCORPORACION: { icon: 'leaf', bg: 'bg-success-50', text: 'text-success-700', ring: 'ring-success-200' },
    DEVOLUCION_PLANTACION: { icon: 'package', bg: 'bg-info-50', text: 'text-info-700', ring: 'ring-info-200' },
    INICIO: { icon: 'leaf', bg: 'bg-success-50', text: 'text-success-700', ring: 'ring-success-200' },
    EMBOLSADO: { icon: 'box', bg: 'bg-brand-50', text: 'text-brand-950', ring: 'ring-brand-950/10' },
    DESCARTE_PRE_EMBOLSADO: { icon: 'trash', bg: 'bg-danger-50/80', text: 'text-danger-700', ring: 'ring-danger-200' },
    MERMA: { icon: 'loss', bg: 'bg-danger-50/80', text: 'text-danger-700', ring: 'ring-danger-200' },
    ADAPTABILIDAD: { icon: 'sun', bg: 'bg-warning-50', text: 'text-warning-700', ring: 'ring-warning-200' },
    DESPACHO: { icon: 'truck', bg: 'bg-info-50', text: 'text-info-700', ring: 'ring-info-200' },
    CIERRE_AUTOMATICO: { icon: 'flag', bg: 'bg-neutral-50', text: 'text-neutral-700', ring: 'ring-neutral-200' },
  }

  const theme = configMap[event.kind] || { icon: 'info' as IconName, bg: 'bg-neutral-50', text: 'text-neutral-700', ring: 'ring-neutral-200' }
  const causaLabel = event.causa?.toLowerCase().replaceAll('_', ' ') || 'No especificada'
  const unidadLabel = formatUnidadCanonicaDisplay(event.unidadMedidaEvento, event.cantidad ?? undefined)


  return (
    <div className="flex gap-x-3">
      {/* Columna Izquierda: Línea y Burbuja */}
      <div className="relative flex flex-col items-center shrink-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-inset ${theme.ring} ${theme.text} shadow-sm z-10`}>
          <Icon name={theme.icon} className="h-5 w-5" />
        </div>
        {!isLast && <div className="w-[2px] bg-success-900/5 grow my-1" />}
      </div>

      {/* Columna Derecha: Tarjeta Principal */}
      <div className="min-w-0 flex-1 pb-6">
        <div className="bg-white rounded-3xl ring-1 ring-neutral-100 p-4 shadow-sm">

          {/* Header Común */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black tracking-widest uppercase ring-1 ring-inset ${theme.text} ${theme.ring} bg-white`}>
              {event.kind?.replaceAll('_', ' ')}
            </span>
            <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest">
              {event.fecha}
              {event.hora && (
                <>
                  <span className="h-1 w-1 rounded-full bg-neutral-300 inline-block" />
                  <span>{event.hora}</span>
                </>
              )}
            </p>
          </div>

          <h3 className="text-xl font-extrabold text-brand-950 leading-tight">
            {event.label}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
            <Icon name="user" className="h-5 w-5 text-neutral-400" />
            {event.responsableNombre}
          </p>

          {event.registroLocal && <p className="mt-1 text-xs text-neutral-500">Registrado el {event.registroLocal} (hora de Bolivia)</p>}
          {event.fuenteResponsable === 'SNAPSHOT_INCORPORACION' && <p className="mt-1 text-xs text-neutral-500">Nombre guardado al incorporar el lote.</p>}
          {event.fuenteResponsable === 'CUENTA_ACTUAL' && <p className="mt-1 text-[10px] text-neutral-500">Responsable según la cuenta consultada; su nombre puede haber cambiado.</p>}
          {!event.conocido && <p className="mt-3 text-xs text-neutral-600">Tipo recibido sin presentación específica. Se conserva el evento en el historial.</p>}
          {event.kind === 'INCORPORACION' && <div className="mt-4 rounded-2xl bg-success-50 p-3 text-brand-900">
            <p className="text-xs font-bold">Ingreso de plantas vivas</p>
            <p className="mt-1 text-2xl font-black">{formatViveroNumber(event.cantidad)} UNIDAD</p>
            <p className="mt-1 text-xs">{incorporacionLabel(event.procedencia?.modalidad ?? null, event.procedencia?.procedencia ?? null)}</p>
            {event.procedencia?.modalidad === 'SALDO_INICIAL' && <p className="mt-2 text-xs">Historia previa no registrada.</p>}
            {event.procedencia?.tercero && <p className="mt-2 text-xs">Tercero declarado: {event.procedencia.tercero}</p>}
            {event.procedencia?.referencia && <p className="mt-1 text-xs">Referencia: {event.procedencia.referencia}</p>}
          </div>}
          {event.kind === 'DEVOLUCION_PLANTACION' && <div className="mt-4 rounded-2xl bg-info-50 p-3 text-info-900">
            <p className="text-xs font-bold">Devolución al lote original</p>
            <p className="mt-1 text-2xl font-black">{formatViveroNumber(event.cantidad)} UNIDAD</p>
            <p className="mt-1 text-xs">Naturaleza de la devolución no registrada.</p>
          </div>}
          {event.kind === 'CIERRE_AUTOMATICO' && <p className="mt-3 text-sm text-neutral-600">Motivo: {event.causa?.replaceAll('_', ' ') ?? 'No registrado'}</p>}
          {/* 1. Diseño Específico para INICIO */}
          {event.kind === 'INICIO' && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-brand-950 mb-1">Material Ingresado</p>
                  <p className="text-base font-black text-brand-950">
                    {event.materialIngresado || 'Sin datos'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-brand-950 mb-1">Sustrato</p>
                  <p className="text-sm font-bold text-brand-950 leading-tight">
                    {event.sustrato || 'No registrado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-success-50/50 px-3 py-2.5 ring-1 ring-success-100">
                <Icon name="info" className="h-4 w-4 text-success-600 flex-shrink-0" />
                <p className="text-[11px] font-bold text-success-800 leading-tight">Aún no hay plantas vivas. El saldo nace en EMBOLSADO.</p>
              </div>
            </div>
          )}

          {/* Diseño Específico para EMBOLSADO */}
          {event.kind === 'EMBOLSADO' && (
            <div className="mt-4 rounded-2xl bg-brand-50 p-3 ring-1 ring-inset ring-brand-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-brand-700">Nacen las plantas vivas</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-brand-950">{formatViveroNumber(event.cantidad)}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-brand-950/70">Unidad · saldo inicial del lote</p>
            </div>
          )}

          {event.kind === 'DESCARTE_PRE_EMBOLSADO' && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <div className={`flex-1 rounded-2xl p-3 ${theme.bg} ring-1 ring-inset ${theme.ring}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme.text}`}>Material descartado</p>
                  <p className={`mt-0.5 text-3xl font-black tracking-tight ${theme.text}`}>{formatViveroNumber(event.cantidad)}</p>
                  <p className={`mt-0.5 text-[9px] font-bold uppercase tracking-widest ${theme.text}/80`}>{unidadLabel}</p>
                </div>
                <div className="flex-1 rounded-2xl bg-white p-3 ring-1 ring-inset ring-neutral-200">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Causa</p>
                  <p className="mt-0.5 text-base font-black capitalize leading-tight text-brand-950">{causaLabel}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-400">{event.causa || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-warning-50 px-3 py-2.5 ring-1 ring-warning-100">
                <Icon name="info" className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-600" />
                <p className="text-[11px] font-bold leading-tight text-warning-800">
                  Cierre antes de EMBOLSADO. No hubo nacimiento de saldo vivo.
                </p>
              </div>
            </div>
          )}

          {/* 2. Diseño Específico para ADAPTABILIDAD */}
          {event.kind === 'ADAPTABILIDAD' && (
            <div className={`mt-4 flex items-center justify-between gap-2 rounded-2xl ${theme.bg} p-3 ring-1 ring-inset ${theme.ring}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ${theme.ring} ${theme.text}`}>
                  <Icon name="sun" className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme.text}`}>Nueva Subetapa</p>
                  <p className={`text-base font-black ${theme.text}`}>{event.subetapa?.replaceAll('_', ' ') || 'No registrada'}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-neutral-500 ring-1 ring-neutral-200 shadow-sm">
                <Icon name="info" className="h-3 w-3" /> No afecta saldo
              </span>
            </div>
          )}

          {/* 3. Diseño Específico para MERMA (Con causa y saldo) */}
          {event.kind === 'MERMA' && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <div className={`flex-1 rounded-2xl p-3 ${theme.bg} ring-1 ring-inset ${theme.ring}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme.text}`}>Pérdida</p>
                  <p className={`mt-0.5 text-3xl font-black tracking-tight ${theme.text}`}>-{formatViveroNumber(event.cantidad)}</p>
                  <p className={`mt-0.5 text-[9px] font-bold uppercase tracking-widest ${theme.text}/80`}>Unidad</p>
                </div>
                <div className="flex-1 rounded-2xl p-3 bg-white ring-1 ring-inset ring-neutral-200">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Causa</p>
                  <p className="mt-0.5 text-base font-black text-brand-950 capitalize">{causaLabel}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-400">{event.causa || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Diseño Específico para DESPACHO */}
          {event.kind === 'DESPACHO' && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <div className={`flex-1 rounded-2xl p-3 ${theme.bg} ring-1 ring-inset ${theme.ring}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme.text}`}>Despachadas</p>
                  <p className={`mt-0.5 text-3xl font-black tracking-tight ${theme.text}`}>{formatViveroNumber(event.cantidad)}</p>
                  <p className={`mt-0.5 text-[9px] font-bold uppercase tracking-widest ${theme.text}/80`}>Unidad</p>
                </div>
                <div className="flex-1 rounded-2xl p-3 bg-white ring-1 ring-inset ring-neutral-200">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Destino</p>
                  <p className="mt-0.5 text-sm font-black text-brand-950 leading-tight">{event.destino?.replaceAll('_', ' ') || 'No registrado'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-neutral-200">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Referencia</p>
                  <p className="text-xs font-bold text-brand-950">{event.referencia || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Comunidad</p>
                  <p className="text-xs font-bold text-brand-950">{event.comunidad || 'No especificada'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Componente "Saldo Antes -> Saldo Después" (Reutilizable para Merma y Despacho) */}
          {(event.saldoAntes != null || event.saldoDespues != null) && (
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-neutral-200">
              <div className="text-center flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">Saldo Antes</p>
                <p className="text-xl font-black text-neutral-500">{formatViveroNumber(event.saldoAntes)}</p>
              </div>
              <div className="px-2">
                <Icon
                  name="arrow-down"
                  className={`h-4 w-4 ${event.kind === 'MERMA' ? 'text-danger-500' : 'text-info-500'}`}
                />
              </div>
              <div className="text-center flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-brand-950 mb-0.5">Saldo Después</p>
                <p className="text-xl font-black text-brand-950">{formatViveroNumber(event.saldoDespues)}</p>
              </div>
            </div>
          )}

          {links && (links.origenDespacho || links.asignacion || links.campania || links.subcampania || links.registro) && <div className="mt-3 space-y-1 rounded-2xl bg-neutral-50 p-3 text-xs text-neutral-700">
            {links.origenDespacho && <p>Origen del despacho · {origenesDespacho[links.origenDespacho] ?? links.origenDespacho}</p>}
            {links.asignacion && <p>Asignación · {links.asignacion}</p>}
            {links.campania && <p>Campaña · {plantingLink(links.campania, 'campanias')}</p>}
            {links.subcampania && <p>Subcampaña · {plantingLink(links.subcampania, 'subcampanias')}</p>}
            {links.registro && <p>Registro de plantación · {links.registro}</p>}
          </div>}
          {event.estadoEvidencias === 'ERROR_CONSULTA' && <p role="status" className="mt-3 text-xs text-warning-800">No se pudieron consultar todas las evidencias de este evento.</p>}
          {event.estadoEvidencias === 'CONSULTADAS' && !event.fotos?.length && <p className="mt-3 text-xs text-neutral-500">Sin fotos vinculadas en esta consulta.</p>}
          {(event.fotos ?? []).length > 0 && <div className="mt-3 space-y-2">
            <p className="text-xs font-bold text-brand-800">Evidencias · {event.fotos!.length}</p>
            <EvidencePhoto key={`${event.fotos![0].url}-${event.fotos![0].expiraEn}`} photo={event.fotos![0]} onOpen={() => onOpenGallery?.(event)} onRenew={onRenewPhotos} />
            {event.fotos!.length > 1 && <Button variant="secondary" size="sm" onClick={() => onOpenGallery?.(event)}>Ver todas las fotos del evento</Button>}
          </div>}

          {/* Observación Inferior */}
          {event.observacion && (
            <div className="mt-3 rounded-2xl bg-brand-50/60 p-3.5 ring-1 ring-neutral-200/60">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Observación</p>
              <p className="text-[13px] font-medium text-neutral-600 leading-relaxed">
                {event.observacion}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
