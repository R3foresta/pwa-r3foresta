import Icon from '../../../components/Icon';

export default function CierreLoteCard() {
  // Estos valores podrías extraerlos del detail si tu API los provee
  const diasActivo = 125; 
  const despachadas = 420;
  const perdidas = 80;
  const fechaCierre = '24 feb 2027';

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cierre del lote</p>
        <span className="rounded-full bg-[#1e293b] px-2.5 py-1 text-[9px] font-black tracking-widest text-white uppercase">
          Finalizado
        </span>
      </div>

      <div className="rounded-3xl bg-[#f8fafe] p-4 ring-1 ring-blue-100 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white text-blue-600 ring-1 ring-blue-200 shadow-sm">
          <Icon name="truck" className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-600/70 mb-0.5">Motivo</p>
              <p className="text-[15px] font-black text-blue-800 leading-tight">Despacho total</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue-500 mt-0.5">DESPACHO_TOTAL</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-600/70 mb-0.5">Cerrado</p>
              <p className="text-xs font-black text-blue-800">{fechaCierre}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
         <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 flex flex-col justify-center items-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 text-center leading-tight">Días<br/>Activo</p>
            <p className="text-[22px] font-black text-[#002b15] leading-none mt-1">{diasActivo}</p>
         </div>
         <div className="rounded-2xl bg-blue-50/60 p-3 ring-1 ring-blue-100 flex flex-col justify-center items-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1 text-center leading-tight"><br/>Despachadas</p>
            <p className="text-[22px] font-black text-blue-700 leading-none mt-1">{despachadas}</p>
         </div>
         <div className="rounded-2xl bg-red-50/60 p-3 ring-1 ring-red-100 flex flex-col justify-center items-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-1 text-center leading-tight"><br/>Pérdidas</p>
            <p className="text-[22px] font-black text-red-700 leading-none mt-1">{perdidas}</p>
         </div>
      </div>

      <button className="mt-3 w-full flex items-center justify-between rounded-2xl bg-[#f4f7f2] p-4 ring-1 ring-brand-100 hover:bg-brand-50 transition">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#002b15] ring-1 ring-brand-200">
             <Icon name="box" className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-600 mb-0.5">Continúa en</p>
            <p className="text-sm font-extrabold text-[#002b15]">Plantación PLT-2027-003</p>
          </div>
        </div>
        <Icon name="chevron-right" className="h-4 w-4 text-[#002b15]" />
      </button>
    </section>
  );
}