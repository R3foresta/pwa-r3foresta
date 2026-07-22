import { Chip } from '../../../components/ui'

interface FiltersRowProps {
  active: string;
  onChange: (filter: string) => void;
  counts: Record<string, number>;
}

export default function FiltersRow({ active, onChange, counts }: FiltersRowProps) {
  const filters = [
    'TODOS',
    'INICIO',
    'EMBOLSADO',
    'DESCARTE_PRE_EMBOLSADO',
    'MERMA',
    'ADAPTABILIDAD',
    'DESPACHO',
    'CIERRE_AUTOMATICO',
  ];

  return (
    <section>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filters.map(f => (
          <Chip key={f} selected={active === f} onClick={() => onChange(f)} className="shrink-0">
            {f.replaceAll('_', ' ')} {counts[f] ? `(${counts[f]})` : ''}
          </Chip>
        ))}
      </div>
    </section>
  );
}
