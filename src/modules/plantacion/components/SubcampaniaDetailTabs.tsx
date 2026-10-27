export type DetailTab = 'resumen' | 'equipo' | 'mapa' | 'registros'
const tabs: { key: DetailTab; label: string }[] = [{ key: 'resumen', label: 'Resumen' }, { key: 'equipo', label: 'Equipo' }, { key: 'mapa', label: 'Mapa' }, { key: 'registros', label: 'Registros' }]

export default function SubcampaniaDetailTabs({ active, onChange, showRegistros = false }: { active: DetailTab; onChange: (tab: DetailTab) => void; showRegistros?: boolean }) {
  return <nav aria-label="Secciones de la subcampaña" className="sticky top-0 z-20 -mx-5 bg-brand-50/95 px-5 pb-2 pt-3 backdrop-blur-sm">
    <div className="flex rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
      {tabs.filter(tab => tab.key !== 'registros' || showRegistros).map(tab => <button key={tab.key} type="button" aria-pressed={active === tab.key} onClick={() => onChange(tab.key)} className={`min-w-0 flex-1 rounded-full px-2 py-2 text-[12px] font-extrabold tracking-wide transition focus-visible:outline-brand-500 ${active === tab.key ? 'bg-brand-600 text-white shadow-soft' : 'text-brand-700 hover:bg-brand-50'}`}>{tab.label}</button>)}
    </div>
  </nav>
}
