import type { ReportePlantaciones } from './reporte-plantaciones.contract'
import {
  filtrosAplicados, formatearCantidad, formatearMes, nombreEspecie,
} from './reporte-plantaciones.presentacion'
import {
  bottom, colors, contentWidth, crearReportePdf, descargarPdf, linesFor, margin, pageHeight, pageWidth,
} from './reporte-pdf.layout'

export async function generarReportePlantacionesPdf(
  reporte: ReportePlantaciones,
  generadoEn = new Date(),
  logo?: ArrayBuffer,
): Promise<Uint8Array> {
  const { filtros, totales, especies, meses } = reporte
  const title = filtros.organizacion_id ? 'Plantaciones asociadas' : 'Reporte de plantaciones'
  const pdf = await crearReportePdf(title, generadoEn, logo)
  const { regular, bold, italic, write, right, rule, nextPage, ensureSpace, metadata, fechas } = pdf

  if (!filtros.organizacion_id) metadata('Alcance', 'Consolidado general')
  for (const { etiqueta, valor } of filtrosAplicados(reporte)) {
    metadata(etiqueta, valor.replace(' – ', ' al '))
  }
  fechas(reporte.observado_en)

  if (filtros.organizacion_id) {
    pdf.note('Alcance según la asociación de la empresa con las campañas al corte consultado.')
  }
  pdf.cursor -= 12
  pdf.indicators([
    { label: 'Total plantado', value: totales.total },
    { label: 'Registros', value: totales.registros },
    { label: 'Iniciales', value: totales.iniciales },
    { label: 'Reposiciones', value: totales.reposiciones },
  ])

  function monthlyHeader(continued: boolean) {
    write(continued ? 'Plantación mensual (continuación)' : 'Plantación mensual', margin, pdf.cursor, 15, bold)
    pdf.cursor -= 17
    const legend = [
      { x: margin, color: colors.green, label: 'Iniciales' },
      { x: margin + 73, color: colors.lightGreen, label: 'Reposiciones' },
    ]
    for (const { x, color, label } of legend) {
      pdf.page.drawRectangle({ x, y: pdf.cursor - 1, width: 8, height: 8, color })
      write(label, x + 12, pdf.cursor, 9, regular, colors.muted)
    }
    right('Plantas', pageWidth - margin, pdf.cursor, 9, bold, colors.muted)
    pdf.cursor -= 22
  }

  ensureSpace(75)
  monthlyHeader(false)
  if (!meses.length) {
    write('Sin plantaciones en el período y los filtros seleccionados.', margin, pdf.cursor, 10, regular, colors.muted)
    pdf.cursor -= 16
  }

  const maximum = meses.reduce((max, item) => Math.max(max, item.iniciales + item.reposiciones), 1)
  const numberWidth = bold.widthOfTextAtSize(formatearCantidad(maximum), 9) + 13
  const barX = margin + 70
  const barWidth = contentWidth - 70 - numberWidth
  for (const { mes, iniciales, reposiciones } of meses) {
    if (pdf.cursor - 18 < bottom) {
      nextPage()
      monthlyHeader(true)
    }

    const month = formatearMes(mes)
    const initialWidth = (iniciales / maximum) * barWidth
    const replacementsWidth = (reposiciones / maximum) * barWidth
    write(month, margin, pdf.cursor, 9, regular, colors.muted)
    pdf.page.drawRectangle({ x: barX, y: pdf.cursor - 2, width: barWidth, height: 10, color: colors.pale })
    if (initialWidth > 0) {
      pdf.page.drawRectangle({ x: barX, y: pdf.cursor - 2, width: initialWidth, height: 10, color: colors.green })
    }
    if (replacementsWidth > 0) {
      pdf.page.drawRectangle({
        x: barX + initialWidth, y: pdf.cursor - 2, width: replacementsWidth, height: 10, color: colors.lightGreen,
      })
    }
    right(formatearCantidad(iniciales + reposiciones), pageWidth - margin, pdf.cursor, 9, bold)
    pdf.cursor -= 18
  }

  pdf.cursor -= 15
  const tableNameX = margin + 9
  const numericColumns = [margin + contentWidth * 0.65, margin + contentWidth * 0.82, pageWidth - margin - 9]
  const nameWidth = numericColumns[0] - tableNameX - 102

  function tableHeader(continued: boolean) {
    write(continued ? 'Detalle por especie (continuación)' : 'Detalle por especie', margin, pdf.cursor, 15, bold)
    pdf.cursor -= 10
    pdf.page.drawRectangle({ x: margin, y: pdf.cursor - 25, width: contentWidth, height: 25, color: colors.green })
    write('Especie', tableNameX, pdf.cursor - 16, 9, bold, colors.white)
    const tableHeadings = ['Iniciales', 'Reposiciones', 'Total']
    tableHeadings.forEach((label, index) => {
      right(label, numericColumns[index], pdf.cursor - 16, 9, bold, colors.white)
    })
    pdf.cursor -= 25
  }

  ensureSpace(82)
  tableHeader(false)
  if (!especies.length) {
    write('Sin especies para la consulta seleccionada.', tableNameX, pdf.cursor - 18, 10, regular, colors.muted)
  }

  especies.forEach((species, index) => {
    const common = species.nombre_comun?.trim()
    const scientific = species.nombre_cientifico?.trim()
    const name = nombreEspecie(species)
    const primary = linesFor(name, bold, 10, nameWidth).map((value) => ({ value, font: bold, size: 10, color: colors.text }))
    const secondary = common && scientific && common !== scientific
      ? linesFor(scientific, italic, 9, nameWidth).map((value) => ({ value, font: italic, size: 9, color: colors.muted }))
      : []
    const speciesLines = [...primary, ...secondary]
    const maxLines = Math.floor((pageHeight - 114 - bottom - 12) / 13)

    for (let offset = 0; offset < speciesLines.length; offset += maxLines) {
      const row = speciesLines.slice(offset, offset + maxLines)
      const height = 12 + row.length * 13
      if (pdf.cursor - height < bottom) {
        nextPage()
        tableHeader(true)
      }
      if (index % 2 === 0) {
        pdf.page.drawRectangle({ x: margin, y: pdf.cursor - height, width: contentWidth, height, color: colors.pale })
      }
      row.forEach(({ value, font, size, color }, line) => {
        write(value, tableNameX, pdf.cursor - 15 - 13 * line, size, font, color)
      })
      if (offset === 0) {
        [species.iniciales, species.reposiciones, species.total].forEach((value, column) => {
          const digits = formatearCantidad(value)
          const font = column === 2 ? bold : regular
          const size = Math.min(10, 70 / font.widthOfTextAtSize(digits, 1))
          right(digits, numericColumns[column], pdf.cursor - 15, size, font)
        })
      }
      pdf.cursor -= height
      rule(pdf.cursor)
    }
  })

  return pdf.save()
}

export async function descargarReportePlantaciones(
  reporte: ReportePlantaciones,
  debeDescargar?: () => boolean,
): Promise<void> {
  const { desde, hasta } = reporte.filtros
  return descargarPdf(
    `r3foresta-plantaciones-${desde}-${hasta}.pdf`,
    (generadoEn, logo) => generarReportePlantacionesPdf(reporte, generadoEn, logo),
    debeDescargar,
  )
}
