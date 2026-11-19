import { Button } from '../../components/ui'
import DialogoReportePdf from './DialogoReportePdf'
import { IndicadoresMovimientosSemillas, IndicadoresSaldoSemillas } from './ReporteSemillasPanel'
import { formatearCantidad, formatearCorte, formatearFecha } from './reporte-plantaciones.presentacion'
import { consultarMovimientosSemillasParaExportar } from './reporte-semillas.api'
import type { ReporteSaldoSemillas } from './reporte-semillas.contract'
import { filtrosSemillasAplicados } from './reporte-semillas.presentacion'
import type { FiltrosMermas } from './reporte-vivero.contract'
import { useLecturaVivero } from './useLecturaVivero'

type Props = {
  saldo: ReporteSaldoSemillas
  filtros: FiltrosMermas
  token: string
  onClose: () => void
}

export default function VistaPreviaSemillas({ saldo, filtros, token, onClose }: Props) {
  const { datos: movimientos, cargando, error, reintentar } = useLecturaVivero(consultarMovimientosSemillasParaExportar, filtros, token)

  async function descargar(vigente: () => boolean) {
    if (!movimientos) return
    const { descargarReporteSemillas } = await import('./reporte-semillas.pdf')
    if (vigente()) await descargarReporteSemillas(saldo, movimientos, vigente)
  }

  return <DialogoReportePdf token={token} onClose={onClose} onDownload={movimientos ? descargar : undefined}>
    <div>
      <h3 className="font-display text-lg font-extrabold">Reporte de semillas</h3>
      {movimientos && <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-700">
        {filtrosSemillasAplicados(saldo, movimientos).map(({ etiqueta, valor }) => <div key={etiqueta} className="flex flex-wrap items-baseline gap-x-1">
          <dt className="font-semibold">{etiqueta}</dt><dd>{valor}</dd>
        </div>)}
      </dl>}
    </div>
    <div className="space-y-3">
      <div>
        <h4 className="font-display font-extrabold">Saldo actual de semillas</h4>
        <p className="text-sm text-neutral-600">Saldo al <time dateTime={saldo.observado_en}>{formatearCorte(saldo.observado_en)}</time> (Bolivia)</p>
      </div>
      <IndicadoresSaldoSemillas totales={saldo.totales} />
      <p className="text-sm text-neutral-700">Filas de saldo por especie, vivero y unidad · {formatearCantidad(saldo.filas.length)}</p>
    </div>
    <div className="space-y-3">
      <div>
        <h4 className="font-display font-extrabold">Historial de movimientos de semillas</h4>
        <p className="text-sm text-neutral-600">
          <time dateTime={filtros.desde}>{formatearFecha(filtros.desde)}</time> al <time dateTime={filtros.hasta}>{formatearFecha(filtros.hasta)}</time>
        </p>
        {movimientos && <p className="text-sm text-neutral-600">
          Movimientos al <time dateTime={movimientos.observado_en}>{formatearCorte(movimientos.observado_en)}</time> (Bolivia)
        </p>}
      </div>
      {cargando && <p role="status" className="text-sm text-neutral-700">Consultando el historial completo de semillas…</p>}
      {error && <div className="space-y-3">
        <p role="alert" className="text-sm text-danger-700">{error}</p>
        <Button variant="secondary" leftIcon="refresh" onClick={reintentar}>Reintentar consulta del PDF</Button>
      </div>}
      {movimientos && <>
        <IndicadoresMovimientosSemillas totales={movimientos.totales} encabezado="h5" />
        <p className="text-sm text-neutral-700">Movimientos en el historial completo · {formatearCantidad(movimientos.detalle.length)}</p>
      </>}
    </div>
  </DialogoReportePdf>
}
