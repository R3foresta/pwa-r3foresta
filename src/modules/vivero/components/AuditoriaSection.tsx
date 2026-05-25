import { useState } from 'react';
import Icon from '../../../components/Icon';
import type { ViveroLotDetailView } from '../types/view-models';

interface AuditoriaSectionProps {
  detail: ViveroLotDetailView;
}

export default function AuditoriaSection({ detail }: AuditoriaSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const fallbackDate = new Date().toISOString();

  const rows = [
    ['LOTE_VIVERO_ID', detail.codigo],
    ['RECOLECCION_ID', detail.recoleccionCodigo],
    ['VIVERO_ID', detail.viveroNombre],
    ['CREATED_AT', detail.createdAt ? new Date(detail.createdAt).toISOString() : fallbackDate],
    ['RESPONSABLE_ID', detail.responsableUsername || 'Sistema'],
  ].filter(([, v]) => Boolean(v));

  const handleExportJson = () => {
    const dataToExport = {
      metadata: {
        exportedAt: new Date().toISOString(),
        system: "R3foresta App"
      },
      auditoriaList: Object.fromEntries(rows),
      rawDetail: detail
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_${detail.codigo || 'lote'}.json`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-100">
            <Icon name="hash" className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Detalle técnico</p>
            <p className="text-[13px] font-extrabold text-[#002b15] leading-tight">Auditoría · IDs y anclajes</p>
          </div>
        </div>
        <Icon name="chevron-down" className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border-t border-slate-50 px-5 pb-5 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="mb-4 text-[11px] font-medium text-slate-500">Datos de trazabilidad para auditoría. Solo lectura.</p>
          
          <dl className="divide-y divide-slate-100/80">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5">
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-500">{k}</dt>
                <dd className="text-[10px] font-mono font-bold text-[#002b15] truncate max-w-[170px]">{v}</dd>
              </div>
            ))}
          </dl>
          
          <button 
            onClick={handleExportJson}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3.5 text-[11px] font-extrabold text-[#002b15] ring-1 ring-slate-200 hover:bg-slate-100 active:bg-slate-200 transition"
          >
            <Icon name="file" className="h-4 w-4" />
            Exportar JSON de auditoría
          </button>
        </div>
      )}
    </section>
  );
}
