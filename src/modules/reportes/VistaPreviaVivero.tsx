import { useEffect, useState } from 'react'
import { Button } from '../../components/ui'
import DialogoReportePdf from './DialogoReportePdf'
import { IndicadoresMermas, IndicadoresVivero } from './ReportesViveroContenido'
import { formatearCantidad, formatearCorte } from './reporte-plantaciones.presentacion'
import { consultarMermasParaExportar } from './reporte-vivero.api'
import type { ReporteMermas, ReporteVivero } from './reporte-vivero.contract'
import { filtrosViveroAplicados } from './reporte-vivero.presentacion'

type Props = { token: string; onClose: () => void }

function Alcance({ reporte, titulo }: { reporte: ReporteVivero | ReporteMermas; titulo: string }) {
  return <div>
    <h3 className="font-display text-lg font-extrabold">{titulo}</h3>
    <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-700">
      {filtrosViveroAplicados(reporte).map(({ etiqueta, valor }) => <div key={etiqueta} className="flex flex-wrap items-baseline gap-x-1">
        <dt className="font-semibold">{etiqueta}</dt><dd>{valor}</dd>
      </div>)}
    </dl>
    <p className="mt-2 text-xs text-neutral-600">Datos al <time dateTime={reporte.observado_en}>{formatearCorte(reporte.observado_en)}</time> (Bolivia)</p>
  </div>
}

export function VistaPreviaInventario({ reporte, token, onClose }: Props & { reporte: ReporteVivero }) {
  async function descargar(vigente: () => boolean) {
    const { descargarReporteVivero } = await import('./reporte-vivero.pdf')
    if (vigente()) await descargarReporteVivero(reporte, vigente)
  }

  return <DialogoReportePdf token={token} onClose={onClose} onDownload={descargar}>
    <Alcance reporte={reporte} titulo="Inventario de vivero" />
    <IndicadoresVivero totales={reporte.totales} />
    <p className="text-sm text-neutral-700">El PDF incluye el saldo por vivero y el detalle por especie y vivero.</p>
  </DialogoReportePdf>
}

type LecturaExportacion = { estado: 'cargando' } | { estado: 'error'; mensaje: string } | { estado: 'lista'; reporte: ReporteMermas }

export function VistaPreviaMermas({ origen, token, onClose }: Props & { origen: ReporteMermas }) {
  const [resultado, setResultado] = useState<LecturaExportacion>({ estado: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void consultarMermasParaExportar(origen.filtros, token, controller.signal).then((reporte) => {
      if (!controller.signal.aborted) setResultado({ estado: 'lista', reporte })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResultado({ estado: 'error', mensaje: error instanceof Error ? error.message : 'No se pudo cargar el detalle completo de mermas.' })
    })
    return () => controller.abort()
  }, [intento, origen, token])

  function reintentar() {
    setResultado({ estado: 'cargando' })
    setIntento(actual => actual + 1)
  }

  async function descargar(vigente: () => boolean) {
    if (resultado.estado !== 'lista') return
    const { reporte } = resultado
    const { descargarReporteMermas } = await import('./reporte-vivero.pdf')
    if (vigente()) await descargarReporteMermas(reporte, reporte.detalle, vigente)
  }

  return <DialogoReportePdf token={token} onClose={onClose} onDownload={resultado.estado === 'lista' ? descargar : undefined}>
    {resultado.estado === 'cargando' && <p role="status" className="text-sm text-neutral-700">Consultando el detalle completo de mermas…</p>}
    {resultado.estado === 'error' && <div className="space-y-3">
      <p role="alert" className="text-sm text-danger-700">{resultado.mensaje}</p>
      <Button variant="secondary" leftIcon="refresh" onClick={reintentar}>Reintentar consulta del PDF</Button>
    </div>}
    {resultado.estado === 'lista' && <>
      <Alcance reporte={resultado.reporte} titulo="Mermas en vivero" />
      <IndicadoresMermas totales={resultado.reporte.totales} />
      <p className="text-sm text-neutral-700">El PDF incluye el desglose de mermas y el historial completo del corte ({formatearCantidad(resultado.reporte.detalle.length)} eventos).</p>
    </>}
  </DialogoReportePdf>
}
