import { contentWidth, crearReportePdf, descargarPdf, margin, tablaReportePdf } from './reporte-pdf.layout'
import { formatearCantidad, formatearCorte, formatearFecha } from './reporte-plantaciones.presentacion'
import { validarDetalleCompletoSemillas } from './reporte-semillas.contract'
import type { ReporteMovimientosSemillas, ReporteSaldoSemillas } from './reporte-semillas.contract'
import {
  cantidadConUnidad, categoriasMovimientoSemilla, filtrosSemillasAplicados, formatearCantidadSemilla,
  nombresMovimientoSemilla, unidadesSemilla,
} from './reporte-semillas.presentacion'

export async function generarReporteSemillasPdf(
  saldo: ReporteSaldoSemillas,
  movimientos: ReporteMovimientosSemillas,
  generadoEn = new Date(),
  logo?: ArrayBuffer,
): Promise<Uint8Array> {
  if (saldo.filtros.planta_id !== movimientos.filtros.planta_id ||
      saldo.filtros.vivero_id !== movimientos.filtros.vivero_id) {
    throw new Error('El saldo y los movimientos de semillas corresponden a filtros diferentes.')
  }
  validarDetalleCompletoSemillas(movimientos)

  const pdf = await crearReportePdf('Semillas', generadoEn, logo)
  for (const { etiqueta, valor } of filtrosSemillasAplicados(saldo, movimientos)) pdf.metadata(etiqueta, valor)
  pdf.metadata('Generado', `${formatearCorte(generadoEn.toISOString())} (Bolivia)`)
  pdf.cursor -= 14

  pdf.ensureSpace(137)
  pdf.write('Saldo actual de semillas', margin, pdf.cursor, 15, pdf.bold)
  pdf.cursor -= 20
  pdf.metadata('Corte del saldo', `${formatearCorte(saldo.observado_en)} (Bolivia)`)
  pdf.note('Semillas con recepción conforme y saldo disponible.')
  pdf.cursor -= 8
  pdf.indicators(unidadesSemilla.map(({ codigo, nombre }) => ({
    label: `${nombre} disponibles`,
    value: cantidadConUnidad(saldo.totales[codigo], codigo),
  })))
  tablaReportePdf(pdf, 'Saldo por especie y vivero', [
    { nombre: 'Especie', ancho: 168 },
    { nombre: 'Vivero de custodia', ancho: 168 },
    { nombre: 'Saldo', ancho: contentWidth - 336, derecha: true, ajustarTexto: 'linea' },
  ], saldo.filas.map(row => [row.especie, row.vivero, cantidadConUnidad(row.saldo, row.unidad)]),
  'No hay semillas con saldo disponible para los filtros aplicados.')
  pdf.cursor -= 25

  const { filtros: { desde, hasta }, totales, detalle } = movimientos
  pdf.ensureSpace(178)
  pdf.write('Movimientos de semillas', margin, pdf.cursor, 15, pdf.bold)
  pdf.cursor -= 20
  pdf.metadata('Período', `${formatearFecha(desde)} a ${formatearFecha(hasta)}`)
  pdf.metadata('Corte del historial', `${formatearCorte(movimientos.observado_en)} (Bolivia)`)
  pdf.note('Las recepciones usan la fecha de entrega. Los consumos y descartes usan la fecha de registro.')
  pdf.cursor -= 16
  tablaReportePdf(pdf, 'Totales de movimientos por unidad', [
    { nombre: 'Unidad', ancho: 78 },
    ...categoriasMovimientoSemilla.map(({ nombre }) => ({
      nombre, ancho: (contentWidth - 78) / 3, derecha: true, ajustarTexto: 'linea' as const,
    })),
  ], unidadesSemilla.map(({ codigo, nombre }) => [
    nombre, ...categoriasMovimientoSemilla.map(({ clave }) => formatearCantidadSemilla(totales[codigo][clave])),
  ]), '')
  pdf.cursor -= 8
  const eventos = totales.eventos === 1 ? 'movimiento registrado' : 'movimientos registrados'
  pdf.note(`${formatearCantidad(totales.eventos)} ${eventos}. ${formatearCantidad(totales.eventos_sin_cantidad)} sin cantidad disponible.`)
  pdf.cursor -= 19

  tablaReportePdf(pdf, 'Historial de movimientos', [
    { nombre: 'Fecha', ancho: 61, ajustarTexto: 'linea' },
    { nombre: 'Movimiento', ancho: 69 },
    { nombre: 'Recolección', ancho: 72, ajustarTexto: 'linea' },
    { nombre: 'Especie', ancho: 57, ajustarTexto: 'palabra' },
    { nombre: 'Vivero de custodia', ancho: 67, ajustarTexto: 'palabra' },
    { nombre: 'Vivero de destino', ancho: 65, ajustarTexto: 'palabra' },
    { nombre: 'Cantidad', ancho: contentWidth - 391, derecha: true, ajustarTexto: 'linea' },
  ], detalle.map(row => [
    formatearFecha(row.fecha),
    nombresMovimientoSemilla[row.tipo],
    row.codigo_recoleccion ?? `ID ${row.recoleccion_id}`,
    row.especie,
    row.vivero ?? 'Sin dato',
    row.vivero_destino ?? (row.tipo === 'CONSUMO_A_VIVERO' ? 'Sin dato' : '—'),
    row.cantidad !== null && row.unidad !== null ? cantidadConUnidad(row.cantidad, row.unidad) : 'Cantidad no disponible',
  ]), 'No hay movimientos para el período y los filtros aplicados.')
  return pdf.save()
}

export function descargarReporteSemillas(
  saldo: ReporteSaldoSemillas,
  movimientos: ReporteMovimientosSemillas,
  vigente?: () => boolean,
): Promise<void> {
  const { desde, hasta } = movimientos.filtros
  return descargarPdf(
    `r3foresta-semillas-${desde}-${hasta}.pdf`,
    (generadoEn, logo) => generarReporteSemillasPdf(saldo, movimientos, generadoEn, logo),
    vigente,
  )
}
