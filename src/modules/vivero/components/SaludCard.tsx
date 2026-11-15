import type { ViveroLotDetailView } from '../types/view-models'
import { formatViveroNumber, origenLabel } from '../utils/presentation'

export default function SaludCard({ detail }: { detail: ViveroLotDetailView }) {
  const enProceso = detail.origen?.tipo === 'RECOLECCION' && detail.plantasVivasIniciales === null
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-100">
      <p className="text-[10px] font-black uppercase tracking-widest text-brand-700">{origenLabel(detail.origen)}</p>
      <h3 className="mt-1 text-base font-extrabold text-brand-950">{enProceso ? 'Material en proceso' : 'Stock en vivero'}</h3>
      <p className="mt-3 text-3xl font-black text-brand-950">{formatViveroNumber(detail.saldoVivoActual)}</p>
      <p className="mt-1 text-xs font-semibold text-neutral-500">Saldo vivo actual · UNIDAD</p>
      <p className="mt-3 text-xs text-neutral-600">
        {enProceso ? 'El saldo vivo nace al registrar EMBOLSADO.' : 'Saldo actual del vivero. No acredita supervivencia ni aptitud para entregar.'}
      </p>
      <p className="mt-2 text-xs text-neutral-500">{detail.diasDesdeInicio} días desde el registro del lote · Subetapa: {detail.subetapaActual?.replaceAll('_', ' ') ?? 'Sin registro'}</p>
    </section>
  )
}
