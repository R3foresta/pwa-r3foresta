import type { LoteViveroItem } from '../../types/contracts'

type Props = {
  lote: LoteViveroItem
  evento: string
  cantidad: string
  fecha: string
  responsable: string
  evidencias: number
  efecto: string
  detalle?: string
}

export default function EventoConfirmacionResumen({
  lote,
  evento,
  cantidad,
  fecha,
  responsable,
  evidencias,
  efecto,
  detalle,
}: Props) {
  const rows = [
    ['Lote', lote.codigo_trazabilidad || `VIV-${lote.id}`],
    ['Evento', evento],
    ['Cantidad y unidad', cantidad],
    ['Fecha', fecha],
    ['Responsable del registro', responsable],
    ['Evidencia', evidencias === 0 ? 'Sin fotos' : `${evidencias} foto${evidencias === 1 ? '' : 's'}`],
    ['Efecto esperado', efecto],
  ]

  return (
    <div className="mt-4 max-h-[45vh] overflow-y-auto rounded-2xl bg-brand-50 px-4 py-3 text-sm ring-1 ring-brand-100">
      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="shrink-0 font-semibold text-brand-500">{label}</dt>
            <dd className="text-right font-bold text-brand-700">{value}</dd>
          </div>
        ))}
        {detalle && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 font-semibold text-brand-500">Detalle</dt>
            <dd className="text-right font-bold text-brand-700">{detalle}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-xs font-semibold text-brand-500">
        El evento quedará en el historial auditable y no podrá editarse. El sistema confirmará el saldo final.
      </p>
    </div>
  )
}
