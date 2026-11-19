import { PDFDocument, PageSizes, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont, RGB } from 'pdf-lib'
import { formatearCantidad, formatearCorte } from './reporte-plantaciones.presentacion'

export const [pageWidth, pageHeight] = PageSizes.A4
export const margin = 44
export const contentWidth = pageWidth - margin * 2
export const bottom = 54
export const colors = {
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

export function linesFor(value: string, font: PDFFont, size: number, width: number): string[] {
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

export async function crearReportePdf(title: string, generadoEn: Date, logo?: ArrayBuffer) {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const marca = logo ? await doc.embedPng(logo) : undefined

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

  function indicators(indicators: { label: string; value: number | string }[]) {
    ensureSpace(75)
    const boxGap = 8
    const boxWidth = (contentWidth - boxGap * (indicators.length - 1)) / indicators.length
    const boxHeight = 57
    indicators.forEach(({ label, value }, index) => {
      const x = margin + (boxWidth + boxGap) * index
      const background = index === 0 ? colors.green : colors.pale
      page.drawRectangle({ x, y: cursor - boxHeight, width: boxWidth, height: boxHeight, color: background })
      write(label, x + 11, cursor - 17, 9, bold, index === 0 ? colors.white : colors.muted)
      const digits = typeof value === 'string' ? value : formatearCantidad(value)
      const size = Math.min(23, (boxWidth - 22) / bold.widthOfTextAtSize(digits, 1))
      write(digits, x + 11, cursor - 43, size, bold, index === 0 ? colors.white : colors.text)
    })
    cursor -= boxHeight + 23
  }

  function save() {
    const pages = doc.getPages()
    pages.forEach((current, index) => {
      page = current
      rule(40)
      write('R3Foresta | Impacto y reportes', margin, 26, 8, regular, colors.muted)
      right(`Página ${index + 1} de ${pages.length}`, pageWidth - margin, 26, 8, bold, colors.muted)
    })
    return doc.save()
  }

  function fechas(observadoEn: string) {
    metadata('Corte consultado', `${formatearCorte(observadoEn)} (Bolivia)`)
    metadata('Generado', `${formatearCorte(generadoEn.toISOString())} (Bolivia)`)
  }

  function note(value: string) {
    for (const line of linesFor(value, regular, 9, contentWidth)) {
      ensureSpace(14)
      write(line, margin, cursor - 3, 9, regular, colors.muted)
      cursor -= 14
    }
  }

  return {
    regular, bold, italic, write, right, rule, nextPage, ensureSpace, metadata, fechas, note, indicators, save,
    get page() { return page },
    get cursor() { return cursor },
    set cursor(value: number) { cursor = value },
  }
}

type PdfLayout = Awaited<ReturnType<typeof crearReportePdf>>
type Columna = { nombre: string; ancho: number; derecha?: boolean; ajustarTexto?: 'linea' | 'palabra' }

export function tablaReportePdf(pdf: PdfLayout, titulo: string, columnas: Columna[], filas: string[][], vacio: string) {
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
    encabezado: linesFor(columna.nombre, pdf.bold, 9, ancho - 14),
  }))
  const altoLinea = 11
  const relleno = 11
  const altoEncabezado = 14 + altoLinea * Math.max(...posiciones.map(columna => columna.encabezado.length))
  const altoTitulo = 10
  const maxLineas = Math.floor((pageHeight - 79 - altoTitulo - altoEncabezado - bottom - relleno) / altoLinea)

  function encabezado() {
    pdf.write(titulo, margin, pdf.cursor, 15, pdf.bold)
    pdf.cursor -= altoTitulo
    pdf.page.drawRectangle({ x: margin, y: pdf.cursor - altoEncabezado, width: contentWidth, height: altoEncabezado, color: colors.green })
    for (const { encabezado: lineas, ancho, x, derecha } of posiciones) {
      lineas.forEach((linea, index) => {
        const y = pdf.cursor - 16 - index * altoLinea
        if (derecha) pdf.right(linea, x + ancho - 7, y, 9, pdf.bold, colors.white)
        else pdf.write(linea, x + 7, y, 9, pdf.bold, colors.white)
      })
    }
    pdf.cursor -= altoEncabezado
  }

  for (const [index, fila] of filas.entries()) {
    const celdas = posiciones.map(({ ancho, derecha, ajustarTexto }, columna) => {
      const fuente = derecha ? pdf.bold : pdf.regular
      const valor = fila[columna]
      const anchoTexto = ancho - 14
      let tamano = 9
      if (ajustarTexto) {
        const partes = ajustarTexto === 'linea' ? [valor] : valor.split(/\s+/)
        const anchoMaximo = Math.max(...partes.map(parte => fuente.widthOfTextAtSize(printable(parte, fuente), 1)))
        tamano = Math.max(7, Math.min(9, (anchoTexto - 0.1) / anchoMaximo))
      }
      return { tamano, lineas: linesFor(valor, fuente, tamano, anchoTexto) }
    })
    const cantidadLineas = Math.max(1, ...celdas.map(celda => celda.lineas.length))

    for (let offset = 0; offset < cantidadLineas; offset += maxLineas) {
      const lineasEnPagina = Math.min(maxLineas, cantidadLineas - offset)
      const alto = relleno + lineasEnPagina * altoLinea
      if (index === 0 && offset === 0) {
        pdf.ensureSpace(altoTitulo + altoEncabezado + alto)
        encabezado()
      } else if (pdf.cursor - alto < bottom) {
        pdf.nextPage()
        encabezado()
      }
      if (index % 2 === 0) {
        pdf.page.drawRectangle({ x: margin, y: pdf.cursor - alto, width: contentWidth, height: alto, color: colors.pale })
      }
      posiciones.forEach(({ x, ancho, derecha }, columna) => {
        const { tamano, lineas } = celdas[columna]
        lineas.slice(offset, offset + lineasEnPagina).forEach((linea, fila) => {
          const y = pdf.cursor - 14 - fila * altoLinea
          if (derecha) pdf.right(linea, x + ancho - 7, y, tamano, pdf.bold)
          else pdf.write(linea, x + 7, y, tamano)
        })
      })
      pdf.cursor -= alto
      pdf.rule(pdf.cursor)
    }
  }
}

export async function descargarPdf(
  filename: string,
  generar: (generadoEn: Date, logo?: ArrayBuffer) => Promise<Uint8Array>,
  debeDescargar: () => boolean = () => true,
): Promise<void> {
  const logo = await fetch(`${import.meta.env.BASE_URL}icon-192.png`)
    .then((response) => response.ok && response.headers.get('content-type')?.startsWith('image/png')
      ? response.arrayBuffer()
      : undefined)
    .catch(() => undefined)
  if (!debeDescargar()) return
  const bytes = await generar(new Date(), logo)
  if (!debeDescargar()) return

  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
