import { useState } from 'react';
import Icon from '../../../components/Icon';
import type { ViveroLotDetailView } from '../types/view-models';

interface AuditoriaSectionProps {
  detail: ViveroLotDetailView; // ✅ Tipo definido, no "any"
}

export default function AuditoriaSection({ detail }: AuditoriaSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const rows = [
    ['LOTE ID', detail.codigo],
    ['VIVERO', detail.viveroNombre],
    ['RESPONSABLE', detail.responsableUsername || 'Sistema'],
    ['REGISTRADO', new Date(detail.createdAt).toLocaleDateString()]
  ];

  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Icon name="hash" className="h-5 w-5 text-slate-400" />
          <p className="text-sm font-extrabold text-brand-800">Detalle técnico · Auditoría</p>
        </div>
        <Icon name="chevron-down" className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 p-4 pt-3">
          <dl className="divide-y divide-slate-100">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-2">
                <dt className="text-[10px] font-bold uppercase text-slate-400">{k}</dt>
                <dd className="text-[11px] font-mono font-bold text-brand-700">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}