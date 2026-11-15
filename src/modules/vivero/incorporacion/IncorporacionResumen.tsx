import type { IncorporacionBase } from './incorporacion.contract'
import { incorporacionLabel, formatViveroDate, formatViveroNumber } from '../utils/presentation'

export default function IncorporacionResumen({ base, labels, evidencias }: {
  base: IncorporacionBase
  labels: { vivero: string; planta: string; responsable: string }
  evidencias: number
}) {
  const rows = [
    ['Lote', 'Nuevo lote homogéneo'], ['Evento', 'INCORPORACION'], ['Vivero', labels.vivero], ['Especie', labels.planta],
    ['Procedencia', incorporacionLabel(base.modalidad, base.procedencia)], ['Cantidad', `${formatViveroNumber(base.cantidad)} UNIDAD`],
    ['Fecha física', formatViveroDate(base.fecha_evento)], ['Responsable', labels.responsable], ['Evidencia', `${evidencias} foto(s)`],
    ['Tercero declarado', base.tercero_origen ?? 'No registrado'], ['Referencia documental', base.referencia_documental ?? 'No registrada'],
    ['Observaciones', base.observaciones ?? 'No registradas'], ['Efecto esperado', `Nuevo saldo vivo inicial de ${formatViveroNumber(base.cantidad)} UNIDAD`],
  ]
  return <div className="mt-3 space-y-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
    <dl className="space-y-2">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="shrink-0 font-semibold text-brand-600">{label}</dt><dd className="break-words text-right font-bold">{value}</dd></div>)}</dl>
    {base.modalidad === 'SALDO_INICIAL' && <p className="text-xs">Se registra el conteo actual. La historia previa no queda acreditada ni se inventan pérdidas anteriores.</p>}
    <p className="text-xs">El evento quedará en el historial auditable y no podrá editarse. Se creará un lote nuevo, sin consumir Recolección.</p>
  </div>
}
