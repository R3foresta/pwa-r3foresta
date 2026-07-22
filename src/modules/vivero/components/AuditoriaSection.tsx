import { useState } from 'react';
import Icon from '../../../components/Icon';
import { Button } from '../../../components/ui';
import type { ViveroLotDetailView } from '../types/view-models';

interface AuditoriaSectionProps {
  detail: ViveroLotDetailView;
}

export default function AuditoriaSection({ detail }: AuditoriaSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const rows = [
    ['LOTE_VIVERO_ID', detail.codigo],
    ['RECOLECCION_ID', detail.recoleccionCodigo],
    ['VIVERO_ID', detail.viveroCodigo || 'No disponible'], 
    ['CREATED_AT', detail.createdAt ? new Date(detail.createdAt).toISOString() : 'No disponible'],
    ['RESPONSABLE_ID', detail.responsableUsername || 'Sistema'],
  ].filter(([, v]) => Boolean(v));

  const handleExportJson = () => {
    const dataToExport = {
      metadata: {
        exportedAt: new Date().toISOString(),
        system: "R3foresta App"
      },
      auditoriaList: Object.fromEntries(rows)
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
      {/* Cabecera de acordeón (toggle estructural): se mantiene nativa, no <Button>. */}
      <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-50 text-neutral-500 ring-1 ring-neutral-100">
            <Icon name="hash" className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Detalle técnico</p>
            <p className="text-[13px] font-extrabold text-brand-950 leading-tight">Auditoría · IDs y anclajes</p>
          </div>
        </div>
        <Icon name="chevron-down" className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border-t border-neutral-50 px-5 pb-5 pt-4 transition-all duration-300">
          <p className="mb-4 text-[11px] font-medium text-neutral-500">Datos de trazabilidad para auditoría. Solo lectura.</p>
          
          <dl className="divide-y divide-neutral-100/80">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5">
                <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{k}</dt>
                <dd className="text-[10px] font-mono font-bold text-brand-950 truncate max-w-[170px]">{v}</dd>
              </div>
            ))}
          </dl>
          
          <Button
            variant="secondary"
            fullWidth
            leftIcon="file"
            onClick={handleExportJson}
            className="mt-5"
          >
            Exportar JSON de auditoría
          </Button>
        </div>
      )}
    </section>
  );
}
