
interface FiltersRowProps {
  active: string;
  onChange: (filter: string) => void;
  counts: Record<string, number>;
}

export default function FiltersRow({ active, onChange, counts }: FiltersRowProps) {
  const filters = ['TODOS', 'MERMA', 'DESPACHO', 'ADAPTABILIDAD'];

  return (
    <section>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ring-1 ${
              active === f ? 'bg-brand-600 text-white ring-brand-700' : 'bg-white text-brand-700 ring-brand-100'
            }`}
          >
            {f} {counts[f] ? `(${counts[f]})` : ''}
          </button>
        ))}
      </div>
    </section>
  );
}