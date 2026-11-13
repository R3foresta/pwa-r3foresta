import { Link } from 'react-router-dom'
import StatusBadge from '../../../components/ui/StatusBadge'
import { formatUnidadCanonicaDisplay } from '../../../utils/recoleccionUnidad'
import type { StockHistorialRegistro } from '../stockHistorial.service'
import { getEstadoOperativoLabel } from '../recoleccionStatusPresentation'

export default function StockHistorialCard({ item, plantaId, page }: { item: StockHistorialRegistro; plantaId: number; page: number }) {
  const formatAmount = (value: number | string) => new Intl.NumberFormat('es-BO', { maximumFractionDigits: item.unidad_canonica === 'G' ? 1 : 0 }).format(Number(value))
  const cantidad = item.cantidad_inicial_canonica === null
    ? 'No disponible'
    : `${formatAmount(item.cantidad_inicial_canonica)} ${formatUnidadCanonicaDisplay(item.unidad_canonica, Number(item.cantidad_inicial_canonica))}`
  const fecha = Number.isNaN(Date.parse(item.fecha))
    ? 'No disponible'
    : new Date(item.fecha).toLocaleDateString('es-BO', { timeZone: 'UTC' })

  return (
    <Link
      to={`/app/collections/${item.id}`}
      state={{ stockHistorialReturn: { plantaId, page } }}
      className="block rounded-3xl bg-white p-4 shadow-soft transition hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 break-all font-extrabold">{item.codigo_trazabilidad}</p>
        <StatusBadge status={item.estado_operativo} label={getEstadoOperativoLabel(item.estado_operativo)} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div className="col-span-2 min-w-0">
          <dt className="text-neutral-500">Recolector</dt>
          <dd className="break-words font-semibold">{item.nombre_recolector_snapshot?.trim() || 'No disponible'}</dd>
        </div>
        <div><dt className="text-neutral-500">Fecha</dt><dd>{fecha}</dd></div>
        <div><dt className="text-neutral-500">Cantidad original</dt><dd>{cantidad}</dd></div>
        <div>
          <dt className="text-neutral-500">Saldo actual</dt>
          <dd className="font-bold">{formatAmount(item.saldo_actual)} {formatUnidadCanonicaDisplay(item.unidad_canonica, item.saldo_actual)}</dd>
        </div>
      </dl>
      <span className="mt-3 inline-block text-sm font-bold underline">Ver detalle</span>
    </Link>
  )
}
