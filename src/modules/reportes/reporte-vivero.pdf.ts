import { formatearCantidad, formatearFecha, formatearMes } from './reporte-plantaciones.presentacion'
import { bottom, colors, contentWidth, crearReportePdf, descargarPdf, linesFor, margin, pageHeight, pageWidth } from './reporte-pdf.layout'
import type { DetalleMerma, ReporteMermas, ReporteVivero } from './reporte-vivero.contract'
import { filtrosViveroAplicados, nombreCausaMerma } from './reporte-vivero.presentacion'

type PdfLayout = Awaited<ReturnType<typeof crearReportePdf>>
type Barra = { nombre: string; plantas: number; eventos?: number }
type Columna = { nombre: string; ancho: number; derecha?: boolean }

function barras(pdf: PdfLayout, titulo: string, datos: Barra[]) {
  if (datos.length === 0) return
  const maximo = datos.reduce((max, row) => Math.max(max, row.plantas), 1)
  const xBarra = margin + 158
  const anchoBarra = contentWidth - 246

  function encabezado() {
    pdf.write(titulo, margin, pdf.cursor, 15, pdf.bold)
    pdf.right('Plantas', pageWidth - margin, pdf.cursor, 9, pdf.bold, colors.muted)
    pdf.cursor -= 20
  }

  pdf.ensureSpace(58)
  encabezado()
  for (const { nombre, plantas, eventos } of datos) {
    const label = eventos === undefined ? nombre : `${nombre} (${formatearCantidad(eventos)} ${eventos === 1 ? 'evento' : 'eventos'})`
    const lineas = linesFor(label, pdf.regular, 9, xBarra - margin - 8)
    const ancho = Math.min(anchoBarra, plantas / maximo * anchoBarra)
    for (const [index, linea] of lineas.entries()) {
      if (pdf.cursor - 17 < bottom) {
        pdf.nextPage()
        encabezado()
      }
      pdf.write(linea, margin, pdf.cursor, 9)
      if (index === 0) {
        pdf.page.drawRectangle({ x: xBarra, y: pdf.cursor - 2, width: anchoBarra, height: 9, color: colors.pale })
        if (ancho > 0) pdf.page.drawRectangle({ x: xBarra, y: pdf.cursor - 2, width: ancho, height: 9, color: colors.green })
        pdf.right(formatearCantidad(plantas), pageWidth - margin, pdf.cursor, 9, pdf.bold)
      }
      pdf.cursor -= 15
    }
    pdf.cursor -= 3
  }
  pdf.cursor -= 13
}

function tabla(pdf: PdfLayout, titulo: string, columnas: Columna[], filas: string[][], vacio: string) {
  if (filas.length === 0) {
    pdf.ensureSpace(42)
    pdf.write(titulo, margin, pdf.cursor, 15, pdf.bold)
    pdf.cursor -= 20
    pdf.note(vacio)
    return
  }
  const posiciones = columnas.map(({ ancho, ...columna }, index) => ({
    ...columna, ancho,
    x: margin + columnas.slice(0, index).reduce((x, column) => x + column.ancho, 0),
  }))
  const altoLinea = 11
  const relleno = 11
  const maxLineas = Math.floor((pageHeight - 120 - bottom - relleno) / altoLinea)

  function encabezado() {
    pdf.write(titulo, margin, pdf.cursor, 15, pdf.bold)
    pdf.cursor -= 10
    pdf.page.drawRectangle({ x: margin, y: pdf.cursor - 25, width: contentWidth, height: 25, color: colors.green })
    for (const { nombre, ancho, x, derecha } of posiciones) {
      if (derecha) pdf.right(nombre, x + ancho - 7, pdf.cursor - 16, 9, pdf.bold, colors.white)
      else pdf.write(nombre, x + 7, pdf.cursor - 16, 9, pdf.bold, colors.white)
    }
    pdf.cursor -= 25
  }

  pdf.ensureSpace(78)
  encabezado()

  for (const [index, fila] of filas.entries()) {
    const celdas = posiciones.map(({ ancho, derecha }, columna) =>
      linesFor(fila[columna], derecha ? pdf.bold : pdf.regular, 9, ancho - 14))
    const cantidadLineas = Math.max(1, ...celdas.map(celda => celda.length))

    for (let offset = 0; offset < cantidadLineas; offset += maxLineas) {
      const lineasEnPagina = Math.min(maxLineas, cantidadLineas - offset)
      const alto = relleno + lineasEnPagina * altoLinea
      if (pdf.cursor - alto < bottom) {
        pdf.nextPage()
        encabezado()
      }
      if (index % 2 === 0) {
        pdf.page.drawRectangle({ x: margin, y: pdf.cursor - alto, width: contentWidth, height: alto, color: colors.pale })
      }
      posiciones.forEach(({ x, ancho, derecha }, columna) => {
        celdas[columna].slice(offset, offset + lineasEnPagina).forEach((linea, fila) => {
          const y = pdf.cursor - 14 - fila * altoLinea
          if (derecha) pdf.right(linea, x + ancho - 7, y, 9, pdf.bold)
          else pdf.write(linea, x + 7, y, 9)
        })
      })
      pdf.cursor -= alto
      pdf.rule(pdf.cursor)
    }
  }
}

function metadata(pdf: PdfLayout, reporte: ReporteVivero | ReporteMermas) {
  for (const { etiqueta, valor } of filtrosViveroAplicados(reporte)) pdf.metadata(etiqueta, valor)
  pdf.fechas(reporte.observado_en)
  pdf.cursor -= 12
}

export async function generarReporteViveroPdf(
  reporte: ReporteVivero,
  generadoEn = new Date(),
  logo?: ArrayBuffer,
): Promise<Uint8Array> {
  const pdf = await crearReportePdf('Inventario de vivero', generadoEn, logo)
  metadata(pdf, reporte)
  pdf.indicators([
    { label: 'Plantas vivas', value: reporte.totales.plantas },
    { label: 'Especies con saldo', value: reporte.totales.especies },
    { label: 'Viveros con saldo', value: reporte.totales.viveros },
  ])
  barras(pdf, 'Saldo por vivero', reporte.por_vivero.map(row => ({ nombre: row.vivero, plantas: row.plantas })))
  tabla(pdf, 'Inventario por especie y vivero', [
    { nombre: 'Especie', ancho: 217 },
    { nombre: 'Vivero', ancho: contentWidth - 307 },
    { nombre: 'Plantas', ancho: 90, derecha: true },
  ], reporte.filas.map(row => [row.especie, row.vivero, formatearCantidad(row.plantas)]),
  'No hay plantas vivas con los filtros aplicados.')
  return pdf.save()
}

export async function generarReporteMermasPdf(
  reporte: ReporteMermas,
  detalleCompleto: DetalleMerma[],
  generadoEn = new Date(),
  logo?: ArrayBuffer,
): Promise<Uint8Array> {
  const { totales, por_causa, meses } = reporte
  const ids = new Set(detalleCompleto.map(evento => evento.id))
  const plantas = detalleCompleto.reduce((suma, evento) => suma + (evento.cantidad ?? 0), 0)
  const sinCantidad = detalleCompleto.filter(evento => evento.cantidad === null).length
  if (ids.size !== totales.eventos || detalleCompleto.length !== totales.eventos ||
    plantas !== totales.plantas || sinCantidad !== totales.eventos_sin_cantidad) {
    throw new Error('El historial de mermas está incompleto. Vuelve a consultar el reporte.')
  }

  const pdf = await crearReportePdf('Mermas en vivero', generadoEn, logo)
  metadata(pdf, reporte)
  pdf.indicators([
    { label: sinCantidad ? 'Plantas contabilizadas' : 'Plantas afectadas', value: totales.plantas },
    { label: 'Eventos de merma', value: totales.eventos },
    { label: 'Eventos sin cantidad válida', value: sinCantidad },
  ])
  if (sinCantidad > 0) {
    pdf.note('El total suma las cantidades válidas en plantas. Los eventos sin cantidad válida aparecen en el historial.')
    pdf.cursor -= 12
  }
  barras(pdf, 'Mermas por causa', por_causa.map(row => ({
    nombre: nombreCausaMerma(row.causa), plantas: row.plantas, eventos: row.eventos,
  })))
  if (meses.length > 1) {
    barras(pdf, 'Mermas por mes', meses.map(row => ({ nombre: formatearMes(row.mes), plantas: row.plantas })))
  }
  tabla(pdf, 'Historial de eventos de merma', [
    { nombre: 'Fecha', ancho: 77 },
    { nombre: 'Lote', ancho: 92 },
    { nombre: 'Especie', ancho: 84 },
    { nombre: 'Vivero', ancho: 79 },
    { nombre: 'Causa', ancho: contentWidth - 405 },
    { nombre: 'Plantas', ancho: 73, derecha: true },
  ], detalleCompleto.map(row => [
    formatearFecha(row.fecha), row.codigo_lote, row.especie, row.vivero,
    nombreCausaMerma(row.causa), row.cantidad === null ? 'Sin cantidad válida' : formatearCantidad(row.cantidad),
  ]), 'No hay mermas registradas con los filtros aplicados.')
  return pdf.save()
}

const fechaBolivia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' })

export function descargarReporteVivero(reporte: ReporteVivero, vigente?: () => boolean): Promise<void> {
  const corte = fechaBolivia.format(new Date(reporte.observado_en))
  return descargarPdf(
    `r3foresta-inventario-vivero-${corte}.pdf`,
    (generadoEn, logo) => generarReporteViveroPdf(reporte, generadoEn, logo),
    vigente,
  )
}

export function descargarReporteMermas(
  reporte: ReporteMermas,
  detalleCompleto: DetalleMerma[],
  vigente?: () => boolean,
): Promise<void> {
  const { desde, hasta } = reporte.filtros
  return descargarPdf(
    `r3foresta-mermas-vivero-${desde}-${hasta}.pdf`,
    (generadoEn, logo) => generarReporteMermasPdf(reporte, detalleCompleto, generadoEn, logo),
    vigente,
  )
}
