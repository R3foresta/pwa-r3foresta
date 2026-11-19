import { PDFDocument, PageSizes, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont, RGB } from 'pdf-lib'
import type { ReportePlantaciones } from './reporte-plantaciones.contract'
import {
  filtrosAplicados, formatearCantidad, formatearCorte, formatearMes, nombreEspecie,
} from './reporte-plantaciones.presentacion'

const [pageWidth, pageHeight] = PageSizes.A4
const margin = 44
const contentWidth = pageWidth - margin * 2
const bottom = 54
const colors = {
  dark: rgb(0.05, 0.18, 0.11),
  green: rgb(0.12, 0.38, 0.23),
  lightGreen: rgb(0.39, 0.64, 0.49),
  pale: rgb(0.94, 0.97, 0.95),
  line: rgb(0.84, 0.89, 0.86),
  text: rgb(0.10, 0.19, 0.15),
  muted: rgb(0.30, 0.39, 0.35),
  white: rgb(1, 1, 1),
}
const charactersByFont = new WeakMap<PDFFont, Set<number>>()

function printable(value: string, font: PDFFont): string {
  let characters = charactersByFont.get(font)
  if (!characters) {
    characters = new Set(font.getCharacterSet())
    charactersByFont.set(font, characters)
  }

  return Array.from(value.normalize('NFC').replace(/\s+/gu, ' ').trim(), (character) => {
    if (characters.has(character.codePointAt(0)!)) return character
    const base = character.normalize('NFKD').replace(/\p{M}/gu, '')
    return base && Array.from(base).every((symbol) => characters.has(symbol.codePointAt(0)!)) ? base : '?'
  }).join('')
}

function linesFor(value: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of printable(value, font).split(' ')) {
    const joined = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(joined, size) <= width) {
      line = joined
      continue
    }

    if (line) lines.push(line)
    line = ''
    for (const letter of word) {
      if (line && font.widthOfTextAtSize(line + letter, size) > width) {
        lines.push(line)
        line = ''
      }
      line += letter
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function generarReportePlantacionesPdf(
  reporte: ReportePlantaciones,
  generadoEn = new Date(),
  logo?: ArrayBuffer,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const marca = logo ? await doc.embedPng(logo) : undefined

  const { filtros, totales, especies, meses } = reporte
  const title = filtros.organizacion_id ? 'Plantaciones asociadas' : 'Reporte de plantaciones'
  doc.setTitle(`${title} | R3Foresta`)
  doc.setAuthor('R3Foresta')
  doc.setLanguage('es-BO')
  doc.setCreationDate(generadoEn)

  let page = doc.addPage(PageSizes.A4)
  let cursor = pageHeight - 171

  function write(
    value: string, x: number, y: number, size = 10, font = regular, color: RGB = colors.text,
  ) {
    page.drawText(printable(value, font), { x, y, size, font, color })
  }

  function right(value: string, x: number, y: number, size = 10, font = regular, color = colors.text) {
    const printableValue = printable(value, font)
    write(printableValue, x - font.widthOfTextAtSize(printableValue, size), y, size, font, color)
  }

  function rule(y: number) {
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, color: colors.line, thickness: 0.75 })
  }

  function nextPage() {
    page = doc.addPage(PageSizes.A4)
    write('R3FORESTA', margin, pageHeight - 45, 10, bold, colors.green)
    right(title, pageWidth - margin, pageHeight - 45, 10, regular, colors.muted)
    rule(pageHeight - 55)
    cursor = pageHeight - 79
  }

  function ensureSpace(height: number) {
    if (cursor - height < bottom) nextPage()
  }

  function metadata(label: string, value: string) {
    const labelWidth = 94
    const lines = linesFor(value, regular, 10, contentWidth - labelWidth)
    ensureSpace(14)
    write(label, margin, cursor, 9, bold, colors.muted)
    for (const line of lines) {
      ensureSpace(14)
      write(line, margin + labelWidth, cursor, 10)
      cursor -= 14
    }
  }

  page.drawRectangle({ x: 0, y: pageHeight - 141, width: pageWidth, height: 141, color: colors.dark })
  if (marca) page.drawImage(marca, { x: pageWidth - margin - 47, y: pageHeight - 80, width: 47, height: 47 })
  write('R3FORESTA', margin, pageHeight - 45, 11, bold, colors.lightGreen)
  write(title, margin, pageHeight - 90, 30, bold, colors.white)
  write('Impacto y reportes', margin, pageHeight - 114, 12, regular, colors.white)

  if (!filtros.organizacion_id) metadata('Alcance', 'Consolidado general')
  for (const { etiqueta, valor } of filtrosAplicados(reporte)) {
    metadata(etiqueta, valor.replace(' – ', ' al '))
  }
  metadata('Corte consultado', `${formatearCorte(reporte.observado_en)} (Bolivia)`)
  metadata('Generado', `${formatearCorte(generadoEn.toISOString())} (Bolivia)`)

  if (filtros.organizacion_id) {
    ensureSpace(16)
    write('Alcance según la asociación de la empresa con las campañas al corte consultado.', margin, cursor - 3, 9, regular, colors.muted)
    cursor -= 16
  }
  cursor -= 12

  ensureSpace(75)
  const indicators = [
    { label: 'Total plantado', value: totales.total },
    { label: 'Registros', value: totales.registros },
    { label: 'Iniciales', value: totales.iniciales },
    { label: 'Reposiciones', value: totales.reposiciones },
  ]
  const boxGap = 8
  const boxWidth = (contentWidth - boxGap * (indicators.length - 1)) / indicators.length
  const boxHeight = 57
  indicators.forEach(({ label, value }, index) => {
    const x = margin + (boxWidth + boxGap) * index
    const background = index === 0 ? colors.green : colors.pale
    page.drawRectangle({ x, y: cursor - boxHeight, width: boxWidth, height: boxHeight, color: background })
    write(label, x + 11, cursor - 17, 9, bold, index === 0 ? colors.white : colors.muted)
    const digits = formatearCantidad(value)
    const size = Math.min(23, (boxWidth - 22) / bold.widthOfTextAtSize(digits, 1))
    write(digits, x + 11, cursor - 43, size, bold, index === 0 ? colors.white : colors.text)
  })
  cursor -= boxHeight + 23

  function monthlyHeader(continued: boolean) {
    write(continued ? 'Plantación mensual (continuación)' : 'Plantación mensual', margin, cursor, 15, bold)
    cursor -= 17
    const legend = [
      { x: margin, color: colors.green, label: 'Iniciales' },
      { x: margin + 73, color: colors.lightGreen, label: 'Reposiciones' },
    ]
    for (const { x, color, label } of legend) {
      page.drawRectangle({ x, y: cursor - 1, width: 8, height: 8, color })
      write(label, x + 12, cursor, 9, regular, colors.muted)
    }
    right('Plantas', pageWidth - margin, cursor, 9, bold, colors.muted)
    cursor -= 22
  }

  ensureSpace(75)
  monthlyHeader(false)
  if (!meses.length) {
    write('Sin plantaciones en el período y los filtros seleccionados.', margin, cursor, 10, regular, colors.muted)
    cursor -= 16
  }

  const maximum = meses.reduce((max, item) => Math.max(max, item.iniciales + item.reposiciones), 1)
  const numberWidth = bold.widthOfTextAtSize(formatearCantidad(maximum), 9) + 13
  const barX = margin + 70
  const barWidth = contentWidth - 70 - numberWidth
  for (const { mes, iniciales, reposiciones } of meses) {
    if (cursor - 18 < bottom) {
      nextPage()
      monthlyHeader(true)
    }

    const month = formatearMes(mes)
    const initialWidth = (iniciales / maximum) * barWidth
    const replacementsWidth = (reposiciones / maximum) * barWidth
    write(month, margin, cursor, 9, regular, colors.muted)
    page.drawRectangle({ x: barX, y: cursor - 2, width: barWidth, height: 10, color: colors.pale })
    if (initialWidth > 0) {
      page.drawRectangle({ x: barX, y: cursor - 2, width: initialWidth, height: 10, color: colors.green })
    }
    if (replacementsWidth > 0) {
      page.drawRectangle({
        x: barX + initialWidth, y: cursor - 2, width: replacementsWidth, height: 10, color: colors.lightGreen,
      })
    }
    right(formatearCantidad(iniciales + reposiciones), pageWidth - margin, cursor, 9, bold)
    cursor -= 18
  }

  cursor -= 15
  const tableNameX = margin + 9
  const numericColumns = [margin + contentWidth * 0.65, margin + contentWidth * 0.82, pageWidth - margin - 9]
  const nameWidth = numericColumns[0] - tableNameX - 102

  function tableHeader(continued: boolean) {
    write(continued ? 'Detalle por especie (continuación)' : 'Detalle por especie', margin, cursor, 15, bold)
    cursor -= 10
    page.drawRectangle({ x: margin, y: cursor - 25, width: contentWidth, height: 25, color: colors.green })
    write('Especie', tableNameX, cursor - 16, 9, bold, colors.white)
    const tableHeadings = ['Iniciales', 'Reposiciones', 'Total']
    tableHeadings.forEach((label, index) => {
      right(label, numericColumns[index], cursor - 16, 9, bold, colors.white)
    })
    cursor -= 25
  }

  ensureSpace(82)
  tableHeader(false)
  if (!especies.length) {
    write('Sin especies para la consulta seleccionada.', tableNameX, cursor - 18, 10, regular, colors.muted)
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
      if (cursor - height < bottom) {
        nextPage()
        tableHeader(true)
      }
      if (index % 2 === 0) {
        page.drawRectangle({ x: margin, y: cursor - height, width: contentWidth, height, color: colors.pale })
      }
      row.forEach(({ value, font, size, color }, line) => {
        write(value, tableNameX, cursor - 15 - 13 * line, size, font, color)
      })
      if (offset === 0) {
        [species.iniciales, species.reposiciones, species.total].forEach((value, column) => {
          const digits = formatearCantidad(value)
          const font = column === 2 ? bold : regular
          const size = Math.min(10, 70 / font.widthOfTextAtSize(digits, 1))
          right(digits, numericColumns[column], cursor - 15, size, font)
        })
      }
      cursor -= height
      rule(cursor)
    }
  })

  const pages = doc.getPages()
  pages.forEach((current, index) => {
    page = current
    rule(40)
    write('R3Foresta | Impacto y reportes', margin, 26, 8, regular, colors.muted)
    right(`Página ${index + 1} de ${pages.length}`, pageWidth - margin, 26, 8, bold, colors.muted)
  })
  return doc.save()
}

export async function descargarReportePlantaciones(
  reporte: ReportePlantaciones,
  debeDescargar: () => boolean = () => true,
): Promise<void> {
  const logo = await fetch(`${import.meta.env.BASE_URL}icon-192.png`)
    .then((response) => response.ok && response.headers.get('content-type')?.startsWith('image/png')
      ? response.arrayBuffer()
      : undefined)
    .catch(() => undefined)
  const bytes = await generarReportePlantacionesPdf(reporte, new Date(), logo)
  if (!debeDescargar()) return

  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `r3foresta-plantaciones-${reporte.filtros.desde}-${reporte.filtros.hasta}.pdf`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
