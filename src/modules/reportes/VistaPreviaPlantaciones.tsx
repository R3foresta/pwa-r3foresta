import DialogoReportePdf from './DialogoReportePdf'
import { IndicadoresPlantaciones, PlantacionMensual, TablaEspecies } from './ReportePlantacionesContenido'
import type { ReportePlantaciones } from './reporte-plantaciones.contract'
import { filtrosAplicados, formatearCorte } from './reporte-plantaciones.presentacion'

type Props = { reporte: ReportePlantaciones; token: string; onClose: () => void }

export default function VistaPreviaPlantaciones({ reporte, token, onClose }: Props) {
  async function descargar(vigente: () => boolean) {
    const { descargarReportePlantaciones } = await import('./reporte-plantaciones.pdf')
    if (vigente()) await descargarReportePlantaciones(reporte, vigente)
  }

  return <DialogoReportePdf token={token} onClose={onClose} onDownload={descargar}>
    <div>
      <h3 className="font-display text-lg font-extrabold">{reporte.filtros.organizacion_id ? 'Plantaciones asociadas' : 'Reporte de plantaciones'}</h3>
      <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-700">
        {filtrosAplicados(reporte).map(({ etiqueta, valor }) => <div key={etiqueta} className="flex flex-wrap items-baseline gap-x-1">
          <dt className="font-semibold">{etiqueta}</dt><dd>{valor}</dd>
        </div>)}
      </dl>
      <p className="mt-2 text-xs text-neutral-600">Datos al <time dateTime={reporte.observado_en}>{formatearCorte(reporte.observado_en)}</time> (Bolivia)</p>
      {reporte.filtros.organizacion_id && <p className="mt-2 text-xs text-neutral-600">Las campañas compartidas pueden figurar en los reportes de otras empresas asociadas.</p>}
    </div>
    <IndicadoresPlantaciones totales={reporte.totales} />
    <PlantacionMensual meses={reporte.meses} />
    <TablaEspecies especies={reporte.especies} tablaId="vista-previa-especies" />
  </DialogoReportePdf>
}
