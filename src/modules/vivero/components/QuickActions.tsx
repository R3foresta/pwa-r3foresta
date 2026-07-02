import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'
import type { ViveroLotDetailView } from '../types/view-models'

interface QuickActionsProps {
  detail: ViveroLotDetailView
  onJumpEvidencia: () => void
}

export default function QuickActions({ detail, onJumpEvidencia }: QuickActionsProps) {
  const navigate = useNavigate()
  const closed = detail.estadoLote === 'FINALIZADO'
  const yaEmbolsado = detail.plantasVivasIniciales !== null;
  const puedeDescartarPreEmbolsado = detail.puedeDescartarPreEmbolsado

  const actions = [
    ...(!yaEmbolsado ? [{
      key: 'embolsado',
      label: 'Embolsado',
      icon: 'box' as IconName,
      onClick: () => navigate(`/app/vivero/${detail.id}/event/embolsado`),
      disabled: false
    }] : []),
    ...(puedeDescartarPreEmbolsado ? [{
      key: 'descarte-pre-embolsado',
      label: 'Descarte',
      icon: 'trash' as IconName,
      onClick: () => navigate(`/app/vivero/${detail.id}/event/descarte-pre-embolsado`),
      disabled: false,
    }] : []),
    {
      key: 'merma',
      label: 'Merma',
      icon: 'loss' as IconName,
      onClick: () => navigate(`/app/vivero/${detail.id}/event/merma`),
      disabled: detail.plantasVivasIniciales === null
    },
    {
      key: 'adapt',
      label: 'Subetapa',
      icon: 'sun' as IconName,
      onClick: () => navigate(`/app/vivero/${detail.id}/event/adaptabilidad`),
      disabled: detail.plantasVivasIniciales === null
    },
    {
      key: 'despacho',
      label: 'Despacho',
      icon: 'truck' as IconName,
      onClick: () => navigate(`/app/vivero/${detail.id}/event/despacho`),
      disabled: (detail.saldoVivoActual ?? detail.plantasVivasIniciales ?? 0) === 0
    },
    {
      key: 'foto',
      label: 'Evidencia',
      icon: 'photo',
      onClick: onJumpEvidencia,
      disabled: false
    },
  ]

  if (closed) {
    return (
      <div className="rounded-2xl bg-slate-100 p-4 shadow-soft ring-1 ring-black/5 flex items-center gap-3">
        <Icon name={"shield" as IconName} className="h-5 w-5 text-slate-500 shrink-0" />
        <div>
          <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Lote finalizado</p>
          <p className="text-[11px] font-medium text-slate-500 leading-snug">No admite nuevos eventos operativos.</p>
        </div>
      </div>
    )
  }

  return (
    <section>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500 mb-2">Acciones rápidas</p>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            disabled={a.disabled}
            onClick={a.onClick} 
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white px-2 py-3 shadow-soft ring-1 ring-black/5 transition-all active:scale-[0.97] ${
              a.disabled 
                ? 'opacity-40 cursor-not-allowed bg-slate-50 ring-transparent' 
                : 'hover:ring-brand-300'
            }`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${a.disabled ? 'bg-slate-200 text-slate-400' : 'bg-brand-50 text-brand-600'}`}>
              <Icon name={a.icon as IconName} className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-extrabold text-brand-700 tracking-tight">{a.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
