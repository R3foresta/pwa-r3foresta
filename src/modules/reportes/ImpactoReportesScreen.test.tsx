import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ImpactoReportesScreen from './ImpactoReportesScreen'
import type { FiltrosReportePlantaciones, ReportePlantaciones } from './reporte-plantaciones.contract'
import { periodoInicial } from './reporte-plantaciones.presentacion'
import type { ReporteMovimientosSemillas, ReporteSaldoSemillas } from './reporte-semillas.contract'
import type { FiltrosMermas, FiltrosVivero, ReporteMermas, ReporteVivero } from './reporte-vivero.contract'

const { actor, descargar, descargarVivero, descargarMermas, descargarSemillas } = vi.hoisted(() => ({
  actor: { rol: 'ADMIN', id: '47' }, descargar: vi.fn(), descargarVivero: vi.fn(), descargarMermas: vi.fn(), descargarSemillas: vi.fn(),
}))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: actor }) }))
vi.mock('./reporte-plantaciones.pdf', () => ({ descargarReportePlantaciones: descargar }))
vi.mock('./reporte-vivero.pdf', () => ({ descargarReporteVivero: descargarVivero, descargarReporteMermas: descargarMermas }))
vi.mock('./reporte-semillas.pdf', () => ({ descargarReporteSemillas: descargarSemillas }))

const desde = '2026-01-01'
const hasta = '2026-11-18'
const tat = { version_detalle: 'a'.repeat(64), planta_id: '9007199254740999', nombre_comun: 'Tajibo', nombre_cientifico: 'Handroanthus impetiginosus', iniciales: 60, reposiciones: 0, total: 60 }
const tob = { planta_id: '54', nombre_comun: 'Toborochi', nombre_cientifico: 'Ceiba speciosa', iniciales: 28, reposiciones: 12, total: 40 }
const aliso = { planta_id: '55', especie: 'Aliso', vivero_id: '72', vivero: 'Vivero Norte', plantas: 140 }
const opcionesVivero = { especies: [{ id: aliso.planta_id, nombre: aliso.especie }], viveros: [{ id: aliso.vivero_id, nombre: aliso.vivero }] }
const semillas = { planta_id: '56', especie: 'Jacarandá', vivero_id: '73', vivero: 'Vivero de origen' }
const opcionesSemillas = { especies: [{ id: semillas.planta_id, nombre: semillas.especie }], viveros: [{ id: semillas.vivero_id, nombre: semillas.vivero }] }
const observado_en = '2026-11-18T15:00:00Z'

function fixture(filtros: FiltrosReportePlantaciones): ReportePlantaciones {
  const especies = [tat, tob].filter(row => !filtros.planta_id || row.planta_id === filtros.planta_id)
  const iniciales = especies.reduce((total, row) => total + row.iniciales, 0)
  const reposiciones = especies.reduce((total, row) => total + row.reposiciones, 0)
  return {
    observado_en,
    filtros,
    totales: { registros: especies.length ? 1 : 0, iniciales, reposiciones, total: iniciales + reposiciones },
    meses: especies.length ? [{ mes: filtros.hasta.slice(0, 7), iniciales, reposiciones }] : [],
    especies,
    opciones: { organizaciones: [{ id: '11', nombre: 'Empresa asociada' }], campanias: [{ id: '80', nombre: 'Campaña bosque' }], especies: [tat, tob].map(row => ({ id: row.planta_id, nombre: row.nombre_comun })) },
  }
}

function mismoVivero(filtros: FiltrosVivero) {
  return (!filtros.vivero_id || filtros.vivero_id === aliso.vivero_id) && (!filtros.planta_id || filtros.planta_id === aliso.planta_id)
}

function fixtureVivero(filtros: FiltrosVivero): ReporteVivero {
  const coincide = mismoVivero(filtros)
  return {
    observado_en, filtros, opciones: opcionesVivero,
    totales: coincide ? { plantas: 140, especies: 1, viveros: 1 } : { plantas: 0, especies: 0, viveros: 0 },
    filas: coincide ? [aliso] : [],
    por_vivero: coincide ? [{ vivero_id: aliso.vivero_id, vivero: aliso.vivero, plantas: aliso.plantas }] : [],
  }
}

function fixtureMermas(filtros: FiltrosMermas, eventos: number, exportacionCompleta = false): ReporteMermas {
  const totalEventos = mismoVivero(filtros) ? eventos : 0
  const plantas = Math.max(totalEventos - 1, 0) * 2
  const detalle = Array.from({ length: totalEventos }, (_, index) => ({
    planta_id: aliso.planta_id, especie: aliso.especie, vivero_id: aliso.vivero_id, vivero: aliso.vivero,
    fecha: filtros.hasta, id: String(totalEventos - index), lote_id: '9007199254741000', codigo_lote: `LV-${index + 1}`,
    causa: index === 0 ? null : 'PLAGA', cantidad: index === 0 ? null : 2,
  }))
  return {
    observado_en: exportacionCompleta ? '2026-11-18T16:00:00Z' : observado_en,
    filtros, opciones: opcionesVivero, tamano_pagina: 25,
    detalle: exportacionCompleta ? detalle : detalle.slice((filtros.pagina - 1) * 25, filtros.pagina * 25),
    totales: { plantas, eventos: totalEventos, eventos_sin_cantidad: totalEventos > 0 ? 1 : 0 },
    por_causa: totalEventos > 0 ? [{ causa: null, plantas: 0, eventos: 1 }, { causa: 'PLAGA', plantas, eventos: totalEventos - 1 }] : [],
    meses: totalEventos > 0 ? [{ mes: filtros.hasta.slice(0, 7), plantas }] : [],
  }
}

function coincideSemilla(filtros: FiltrosVivero) {
  return (!filtros.planta_id || filtros.planta_id === semillas.planta_id) && (!filtros.vivero_id || filtros.vivero_id === semillas.vivero_id)
}

function fixtureSaldoSemillas(filtros: FiltrosVivero): ReporteSaldoSemillas {
  const coincide = coincideSemilla(filtros)
  return {
    observado_en, filtros, opciones: opcionesSemillas,
    totales: coincide ? { G: '9007199254740993.123456', UNIDAD: '15' } : { G: '0', UNIDAD: '0' },
    filas: coincide ? [
      { ...semillas, unidad: 'G', saldo: '9007199254740993.123456' },
      { ...semillas, unidad: 'UNIDAD', saldo: '15' },
    ] : [],
  }
}

function fixtureMovimientosSemillas(filtros: FiltrosMermas, exportacionCompleta = false): ReporteMovimientosSemillas {
  const cero = { recibido: '0', consumido: '0', descartado: '0' }
  const corte = exportacionCompleta ? '2026-11-18T17:00:00Z' : observado_en
  if (!coincideSemilla(filtros)) return {
    observado_en: corte, filtros, opciones: opcionesSemillas, tamano_pagina: 25, detalle: [],
    totales: { G: cero, UNIDAD: cero, eventos: 0, eventos_sin_cantidad: 0 },
  }
  const detalle: ReporteMovimientosSemillas['detalle'] = Array.from({ length: 27 }, (_, index) => ({
    ...semillas,
    tipo: index === 0 ? 'RECEPCION_CONFORME' : index === 2 ? 'DESECHO' : 'CONSUMO_A_VIVERO',
    unidad: index === 2 ? null : index < 2 ? 'G' : 'UNIDAD',
    cantidad: index === 2 ? null : index === 0 ? '25.125001' : index === 1 ? '3.125001' : '2',
    id: String(27 - index), fecha: filtros.hasta,
    recoleccion_id: '9007199254740999', codigo_recoleccion: `SEM-${index + 1}`,
    vivero_destino: index === 1 || index > 2 ? 'Vivero de destino' : null,
  }))
  return {
    observado_en: corte, filtros, opciones: opcionesSemillas, tamano_pagina: 25,
    detalle: exportacionCompleta ? detalle : detalle.slice((filtros.pagina - 1) * 25, filtros.pagina * 25),
    totales: { G: { ...cero, recibido: '25.125001', consumido: '3.125001' }, UNIDAD: { ...cero, consumido: '48' }, eventos: 27, eventos_sin_cantidad: 1 },
  }
}

function response(input: RequestInfo | URL, eventos = 2, truncarExportacion = false) {
  const { pathname, searchParams: query } = new URL(String(input), window.location.href)
  const ambito = { planta_id: query.get('planta_id'), vivero_id: query.get('vivero_id') }
  const periodo = { desde: query.get('desde') ?? '', hasta: query.get('hasta') ?? '' }
  if (pathname.endsWith('/permiso-exportacion')) return new Response(null, { status: 204 })
  const data = pathname.endsWith('/semillas/movimientos') ? fixtureMovimientosSemillas({ ...periodo, ...ambito, pagina: Number(query.get('pagina') ?? 1) }, query.has('exportar') && !truncarExportacion)
    : pathname.endsWith('/semillas') ? fixtureSaldoSemillas(ambito)
    : pathname.endsWith('/vivero') ? fixtureVivero(ambito)
    : pathname.endsWith('/mermas') ? fixtureMermas({ ...periodo, ...ambito, pagina: Number(query.get('pagina') ?? 1) }, eventos, query.has('exportar') && !truncarExportacion)
      : fixture({ ...periodo, organizacion_id: query.get('organizacion_id'), campania_id: query.get('campania_id'), planta_id: ambito.planta_id })
  return new Response(JSON.stringify({ success: true, data }), { status: 200 })
}

function consultas(llamadas: Parameters<typeof fetch>[], endpoint: string): URL[] {
  return llamadas.map(([input]) => new URL(String(input), window.location.href)).filter(url => url.pathname.endsWith(`/reportes/${endpoint}`))
}

function ReportRoute() {
  return <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ImpactoReportesScreen /></MemoryRouter>
}

function renderReport() {
  return render(<ReportRoute />)
}

beforeEach(() => {
  actor.rol = 'ADMIN'
  descargar.mockReset()
  descargarVivero.mockReset()
  descargarMermas.mockReset()
  descargarSemillas.mockReset()
  localStorage.setItem('authToken', 'token-verificado-ilustrativo')
  vi.setSystemTime(new Date('2026-11-18T15:00:00Z'))
})

const dialogPrototype = HTMLDialogElement.prototype
const dialogMethods = Object.getOwnPropertyDescriptors(dialogPrototype)
beforeAll(() => {
  Object.defineProperties(dialogPrototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false } },
  })
})
afterAll(() => {
  for (const method of ['showModal', 'close'] as const) {
    const descriptor = dialogMethods[method]
    if (descriptor) Object.defineProperty(dialogPrototype, method, descriptor)
    else Reflect.deleteProperty(dialogPrototype, method)
  }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Impacto y reportes de plantaciones', () => {
  it('aplica los filtros, muestra el desglose exacto y descarga ese mismo corte con permiso', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => response(input))
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    const initialQuery = `/api/v1/reportes/plantaciones?desde=${desde}&hasta=${hasta}`
    expect(await screen.findByRole('rowheader', { name: /Toborochi/ })).toBeTruthy()
    expect(consultas(fetcher.mock.calls, 'plantaciones')[0].href).toEqual(expect.stringContaining(initialQuery))
    expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ cache: 'no-store', headers: { Authorization: 'Bearer token-verificado-ilustrativo' } }))
    expect(screen.getByRole('heading', { name: 'Plantación mensual' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Mezcla de especies' })).toBeTruthy()
    const generate = screen.getByRole<HTMLButtonElement>('button', { name: 'Generar PDF' })
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: '11' } })
    fireEvent.change(screen.getByLabelText('Campaña'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Especie'), { target: { value: '54' } })
    expect(generate.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(generate.disabled).toBe(false))
    expect(consultas(fetcher.mock.calls, 'plantaciones')[1].href).toEqual(expect.stringContaining(`${initialQuery}&organizacion_id=11&campania_id=80&planta_id=54`))
    expect(screen.queryByRole('rowheader', { name: /Tajibo/ })).toBeNull()
    const row = screen.getByRole('row', { name: /Toborochi/ })
    expect(within(row).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['28', '12', '40'])
    fireEvent.click(generate)
    const preview = await screen.findByRole('dialog', { name: 'Vista previa del PDF' })
    expect(within(preview).getByText('Empresa asociada')).toBeTruthy()
    fireEvent.click(within(preview).getByRole('button', { name: 'Descargar PDF' }))
    await waitFor(() => expect(descargar).toHaveBeenCalledOnce())
    expect(consultas(fetcher.mock.calls, 'plantaciones/permiso-exportacion')).toHaveLength(1)
    expect(descargar.mock.calls[0][0]).toMatchObject({ observado_en: '2026-11-18T15:00:00Z', filtros: { organizacion_id: '11', planta_id: '54' }, totales: { registros: 1, total: 40 } })
  })

  it('abre la ficha mixta desde el aporte de la especie con los filtros y el corte originales', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), window.location.href)
      if (!url.pathname.endsWith('/plantaciones/registros')) return response(input)
      return Response.json({ success: true, data: {
        filtros: { desde, hasta, planta_id: tat.planta_id, campania_id: '80', organizacion_id: '11', especie: tat.planta_id, pagina: 1 },
        version_detalle: tat.version_detalle, totales: { registros: 1, iniciales: 60, reposiciones: 0, total: 60 }, tamano_pagina: 25,
        detalle: [{ registro_id: '9007199254740997', codigo_trazabilidad: 'PL-100', subcampania_id: '82', subcampania: 'Ribera Norte',
          fecha: hasta, es_reposicion: false, cantidad: 60, cantidad_total: 100, especies: [
            { planta_id: tat.planta_id, nombre: 'Tajibo', cantidad: 60 }, { planta_id: tob.planta_id, nombre: 'Toborochi', cantidad: 40 },
          ] }],
      } })
    })
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    const nombre = 'Ver registros de Tajibo'
    const inicial = await screen.findByRole<HTMLButtonElement>('button', { name: nombre })
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: '11' } })
    fireEvent.change(screen.getByLabelText('Campaña'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Especie'), { target: { value: tat.planta_id } })
    expect(inicial.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    fireEvent.click(await screen.findByRole('button', { name: nombre }))
    const dialogo = within(await screen.findByRole('dialog', { name: 'Registros de Tajibo' }))
    expect(await dialogo.findByText('Ribera Norte')).toBeTruthy()
    expect(dialogo.getByText('Aporte a la fila').textContent).toContain('60')
    const ficha = dialogo.getByText('Ver ficha PL-100')
    fireEvent.click(ficha)
    expect(ficha.closest('details')?.open).toBe(true)
    expect(dialogo.getByText('Total del registro · 100 plantas')).toBeTruthy()
    expect(dialogo.getByText('Toborochi')).toBeTruthy()
    expect(Object.fromEntries(consultas(fetcher.mock.calls, 'plantaciones/registros')[0].searchParams)).toEqual({
      desde, hasta, campania_id: '80', organizacion_id: '11', planta_id: tat.planta_id,
      especie: tat.planta_id, pagina: '1', version_detalle: tat.version_detalle,
    })
  })

  it('pagina Sin desglose y ante un cambio de corte descarta las fichas y permite actualizar el resumen', async () => {
    const version = 'd'.repeat(64)
    const filtros = { desde, hasta, planta_id: null, organizacion_id: null, campania_id: null }
    let actualizado = false
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), window.location.href)
      if (url.pathname.endsWith('/reportes/plantaciones') && !actualizado) {
        return Response.json({ success: true, data: { ...fixture(filtros),
          totales: { registros: 26, iniciales: 0, reposiciones: 26, total: 26 },
          meses: [{ mes: '2026-11', iniciales: 0, reposiciones: 26 }],
          especies: [{ planta_id: null, nombre_comun: 'Sin desglose de especie', nombre_cientifico: null, version_detalle: version, iniciales: 0, reposiciones: 26, total: 26 }],
        } })
      }
      if (!url.pathname.endsWith('/plantaciones/registros')) return response(input)
      if (url.searchParams.get('pagina') === '2') {
        actualizado = true
        return new Response(null, { status: 409 })
      }
      return Response.json({ success: true, data: {
        filtros: { ...filtros, especie: 'sin_desglose', pagina: 1 }, version_detalle: version, tamano_pagina: 25,
        totales: { registros: 26, iniciales: 0, reposiciones: 26, total: 26 },
        detalle: Array.from({ length: 25 }, (_, i) => ({
          registro_id: String(26 - i), codigo_trazabilidad: `PL-${26 - i}`, fecha: hasta, subcampania_id: '23', subcampania: 'Parque Central',
          es_reposicion: true, cantidad: 1, cantidad_total: 1, especies: [{ planta_id: null, nombre: 'Sin desglose de especie', cantidad: 1 }],
        })),
      } })
    })
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver registros de Sin desglose de especie' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByText('Página 1 de 2')).toBeTruthy()
    expect(dialogo.getAllByText('Parque Central')).toHaveLength(25)
    fireEvent.click(dialogo.getByRole('button', { name: 'Página siguiente' }))
    expect((await dialogo.findByRole('alert')).textContent).toContain('Los registros cambiaron')
    expect(dialogo.queryByText('Parque Central')).toBeNull()
    const segunda = consultas(fetcher.mock.calls, 'plantaciones/registros')[1].searchParams
    expect([segunda.get('especie'), segunda.get('version_detalle'), segunda.get('pagina')]).toEqual(['sin_desglose', version, '2'])
    fireEvent.click(dialogo.getByRole('button', { name: 'Actualizar reporte' }))
    expect(await screen.findByRole('button', { name: 'Ver registros de Tajibo' })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('explica un rechazo de exportación sin descargar el archivo', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/permiso-exportacion')
      ? new Response(null, { status: 403 })
      : response(input)))
    renderReport()
    await screen.findByRole('rowheader', { name: /Toborochi/ })
    fireEvent.click(screen.getByRole('button', { name: 'Generar PDF' }))
    const preview = await screen.findByRole('dialog', { name: 'Vista previa del PDF' })
    fireEvent.click(within(preview).getByRole('button', { name: 'Descargar PDF' }))
    expect((await within(preview).findByRole('alert')).textContent).toContain('Tu cuenta no tiene acceso')
    expect(descargar).not.toHaveBeenCalled()
  })

  it('no solicita datos con una cuenta sin rol administrativo', () => {
    actor.rol = 'GENERAL'
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    expect(screen.getByText(/requiere una cuenta de administración/)).toBeTruthy()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('abre el período al inicio del año según la fecha de Bolivia', () => {
    expect(periodoInicial(new Date('2026-01-01T02:34:00Z'))).toMatchObject({ desde: '2025-01-01', hasta: '2025-12-31' })
  })

  it('mantiene las unidades de semillas separadas y distingue custodia de destino', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => response(input))
    vi.stubGlobal('fetch', fetcher)
    renderReport()

    expect(screen.getByRole('link', { name: 'Semillas' }).getAttribute('href')).toBe('#reporte-semillas')
    const saldo = screen.getByRole('region', { name: 'Saldo actual de semillas' })
    const inventario = await within(saldo).findByRole('region', { name: 'Saldo por especie y vivero de custodia' })
    expect(within(inventario).getByText('9.007.199.254.740.993,123456 g')).toBeTruthy()
    expect(within(inventario).getByText('15 u.')).toBeTruthy()
    expect(within(saldo).getByText('Gramos disponibles')).toBeTruthy()
    expect(within(saldo).getByText('Unidades disponibles')).toBeTruthy()

    const historial = screen.getByRole('region', { name: 'Movimientos de semillas' })
    const tabla = await within(historial).findByRole('table')
    const consumo = within(tabla).getByRole('row', { name: /SEM-2 / })
    expect(within(consumo).getByText('Vivero de origen')).toBeTruthy()
    expect(within(consumo).getByText('Vivero de destino')).toBeTruthy()
    expect(within(consumo).getByText('3,125001 g')).toBeTruthy()
    expect(within(tabla).getByText('Recepción conforme')).toBeTruthy()
    expect(within(tabla).getByText('Cantidad no disponible')).toBeTruthy()
    expect(within(historial).getByText(/Movimientos sin cantidad verificable/)).toBeTruthy()
  })

  it('comparte filtros de especie y custodia, y cambia solamente el historial al cambiar el período', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => response(input, 27))
    vi.stubGlobal('fetch', fetcher)
    renderReport()

    const historial = screen.getByRole('region', { name: 'Movimientos de semillas' })
    fireEvent.click(await within(historial).findByRole('button', { name: 'Página siguiente' }))
    expect(await within(historial).findByText('Página 2 de 2')).toBeTruthy()
    expect(consultas(fetcher.mock.calls, 'semillas/movimientos').at(-1)?.searchParams.get('pagina')).toBe('2')
    expect(consultas(fetcher.mock.calls, 'mermas')).toHaveLength(1)

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(await within(historial).findByText('Página 1 de 2')).toBeTruthy()
    expect(consultas(fetcher.mock.calls, 'semillas/movimientos').at(-1)?.searchParams.get('desde')).toBe('2026-03-01')
    expect(consultas(fetcher.mock.calls, 'semillas')).toHaveLength(1)

    fireEvent.change(screen.getByLabelText('Especie'), { target: { value: semillas.planta_id } })
    fireEvent.change(screen.getByLabelText('Vivero'), { target: { value: semillas.vivero_id } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(consultas(fetcher.mock.calls, 'semillas')).toHaveLength(2))
    for (const endpoint of ['semillas', 'semillas/movimientos']) {
      const params = consultas(fetcher.mock.calls, endpoint).at(-1)?.searchParams
      expect(params?.get('vivero_id')).toBe(semillas.vivero_id)
      expect(params?.get('planta_id')).toBe(semillas.planta_id)
    }
    expect(consultas(fetcher.mock.calls, 'semillas').at(-1)?.searchParams.has('desde')).toBe(false)
  })

  it('reintenta movimientos sin invalidar el saldo de semillas', async () => {
    let fallarMovimientos = true
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), window.location.href)
      return fallarMovimientos && url.pathname.endsWith('/semillas/movimientos') ? new Response(null, { status: 503 }) : response(input)
    })
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    const historial = screen.getByRole('region', { name: 'Movimientos de semillas' })
    const saldo = screen.getByRole('region', { name: 'Saldo actual de semillas' })
    expect(await within(historial).findByRole('alert')).toBeTruthy()
    expect(await within(saldo).findByRole('table')).toBeTruthy()
    const generar = screen.getByRole<HTMLButtonElement>('button', { name: 'Generar PDF de semillas' })
    expect(generar.disabled).toBe(true)

    fallarMovimientos = false
    fireEvent.click(within(historial).getByRole('button', { name: 'Reintentar movimientos de semillas' }))
    expect(await within(historial).findByRole('table')).toBeTruthy()
    expect(consultas(fetcher.mock.calls, 'semillas')).toHaveLength(1)
    expect(generar.disabled).toBe(false)
  })

  it('exporta el saldo visible y todos los movimientos filtrados desde la segunda página', async () => {
    let truncado = true
    const fetcher = vi.fn(async (input: RequestInfo | URL) => response(input, 2, truncado))
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    const generar = screen.getByRole<HTMLButtonElement>('button', { name: 'Generar PDF de semillas' })
    await waitFor(() => expect(generar.disabled).toBe(false))
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: '11' } })
    expect(generar.disabled).toBe(false)
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-01' } })
    expect(generar.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Especie'), { target: { value: semillas.planta_id } })
    fireEvent.change(screen.getByLabelText('Vivero'), { target: { value: semillas.vivero_id } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    const historial = screen.getByRole('region', { name: 'Movimientos de semillas' })
    fireEvent.click(await within(historial).findByRole('button', { name: 'Página siguiente' }))
    expect(await within(historial).findByText('Página 2 de 2')).toBeTruthy()

    fireEvent.click(generar)
    const preview = screen.getByRole('dialog', { name: 'Vista previa del PDF' })
    const boton = within(preview).getByRole<HTMLButtonElement>('button', { name: 'Descargar PDF' })
    expect((await within(preview).findByRole('alert')).textContent).toContain('incompleto')
    expect(boton.disabled).toBe(true)
    expect(descargarSemillas).not.toHaveBeenCalled()

    truncado = false
    fireEvent.click(within(preview).getByRole('button', { name: 'Reintentar consulta del PDF' }))
    expect(await within(preview).findByText('Movimientos en el historial completo · 27')).toBeTruthy()
    expect(within(preview).getByText('Filas de saldo por especie, vivero y unidad · 2')).toBeTruthy()
    expect(within(preview).getByText('Jacarandá')).toBeTruthy()
    expect(within(preview).getByText('Vivero de origen')).toBeTruthy()
    expect(within(preview).getByText('9.007.199.254.740.993,123456')).toBeTruthy()
    expect(within(preview).getByText('25,125001')).toBeTruthy()
    expect([...preview.querySelectorAll('time')].map(time => time.dateTime)).toEqual([observado_en, '2026-03-01', hasta, '2026-11-18T17:00:00Z'])
    expect(within(historial).getByText('Página 2 de 2')).toBeTruthy()

    const exportaciones = consultas(fetcher.mock.calls, 'semillas/movimientos').filter(url => url.searchParams.has('exportar'))
    expect(exportaciones.map(url => Object.fromEntries(url.searchParams))).toEqual(Array.from({ length: 2 }, () => ({
      planta_id: semillas.planta_id, vivero_id: semillas.vivero_id, desde: '2026-03-01', hasta, pagina: '1', exportar: '1',
    })))
    expect(consultas(fetcher.mock.calls, 'semillas')).toHaveLength(2)
    expect(consultas(fetcher.mock.calls, 'plantaciones/permiso-exportacion')).toHaveLength(0)

    fireEvent.click(boton)
    await waitFor(() => expect(descargarSemillas).toHaveBeenCalledOnce())
    const [saldo, movimientos] = descargarSemillas.mock.calls[0]
    expect(saldo).toEqual(fixtureSaldoSemillas({ planta_id: semillas.planta_id, vivero_id: semillas.vivero_id }))
    expect(movimientos).toMatchObject({ observado_en: '2026-11-18T17:00:00Z', filtros: { pagina: 1 } })
    expect(movimientos.detalle).toHaveLength(27)
    expect(consultas(fetcher.mock.calls, 'plantaciones/permiso-exportacion')).toHaveLength(1)
  })

  it.each(['cerrar la vista previa', 'cambiar de sesión', 'cambiar el período'])('cancela la exportación de semillas al %s', async (accion) => {
    let signal: AbortSignal | null | undefined
    const fetcher = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), window.location.href)
      if (!url.pathname.endsWith('/semillas/movimientos') || !url.searchParams.has('exportar')) return Promise.resolve(response(input))
      signal = init?.signal
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Cancelado', 'AbortError')), { once: true })
      })
    })
    vi.stubGlobal('fetch', fetcher)
    const { rerender } = renderReport()
    const generar = screen.getByRole<HTMLButtonElement>('button', { name: 'Generar PDF de semillas' })
    await waitFor(() => expect(generar.disabled).toBe(false))
    fireEvent.click(generar)
    const preview = screen.getByRole('dialog', { name: 'Vista previa del PDF' })
    expect(within(preview).getByText('Consultando el historial completo de semillas…')).toBeTruthy()
    expect(within(preview).getByRole<HTMLButtonElement>('button', { name: 'Descargar PDF' }).disabled).toBe(true)
    await waitFor(() => expect(signal?.aborted).toBe(false))

    if (accion === 'cerrar la vista previa') fireEvent.click(within(preview).getByRole('button', { name: 'Cerrar' }))
    if (accion === 'cambiar el período') fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-01' } })
    if (accion === 'cambiar de sesión') {
      localStorage.setItem('authToken', 'otro-token')
      rerender(<ReportRoute />)
      localStorage.setItem('authToken', 'token-verificado-ilustrativo')
      rerender(<ReportRoute />)
      await waitFor(() => expect(generar.disabled).toBe(false))
      expect(consultas(fetcher.mock.calls, 'semillas/movimientos').filter(url => url.searchParams.has('exportar'))).toHaveLength(1)
    }
    expect(signal?.aborted).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(descargarSemillas).not.toHaveBeenCalled()
  })

  it('aplica período, vivero y especie a las consultas que corresponden', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => response(input))
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    const vivero = screen.getByRole('region', { name: 'Vivero al corte' })
    await within(vivero).findByRole('heading', { name: 'Inventario por especie y vivero' })
    await screen.findByRole('rowheader', { name: /Toborochi/ })
    expect(consultas(fetcher.mock.calls, 'vivero')[0].search).toBe('')

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(consultas(fetcher.mock.calls, 'mermas')).toHaveLength(2))
    expect(consultas(fetcher.mock.calls, 'plantaciones')).toHaveLength(2)
    expect(consultas(fetcher.mock.calls, 'vivero')).toHaveLength(1)

    fireEvent.change(screen.getByLabelText('Vivero'), { target: { value: aliso.vivero_id } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(consultas(fetcher.mock.calls, 'vivero')).toHaveLength(2))
    expect(consultas(fetcher.mock.calls, 'vivero')[1].searchParams.get('vivero_id')).toBe(aliso.vivero_id)
    expect(consultas(fetcher.mock.calls, 'mermas')[2].searchParams.get('vivero_id')).toBe(aliso.vivero_id)
    expect(consultas(fetcher.mock.calls, 'plantaciones')).toHaveLength(2)

    fireEvent.change(screen.getByLabelText('Especie'), { target: { value: aliso.planta_id } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    const plantaciones = screen.getByRole('region', { name: 'Plantaciones' })
    expect(await within(plantaciones).findByText('No hay registros para los filtros aplicados.')).toBeTruthy()
    expect(within(plantaciones).getByText(/Especie Aliso/)).toBeTruthy()
    expect(consultas(fetcher.mock.calls, 'vivero')[2].searchParams.get('planta_id')).toBe(aliso.planta_id)
    expect(consultas(fetcher.mock.calls, 'mermas')[3].searchParams.get('planta_id')).toBe(aliso.planta_id)
  })

  it('mantiene el inventario visible si fallan mermas y vuelve a la primera página al aplicar un período', async () => {
    let fallarMermas = true
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (fallarMermas && new URL(String(input), window.location.href).pathname.endsWith('/mermas')) return new Response(null, { status: 503 })
      return response(input, 27)
    })
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    const vivero = screen.getByRole('region', { name: 'Vivero al corte' })
    const mermas = screen.getByRole('region', { name: 'Mermas en vivero' })
    expect((await within(mermas).findByRole('alert')).textContent).toContain('No pudimos consultar las mermas')
    expect(await within(vivero).findByRole('heading', { name: 'Inventario por especie y vivero' })).toBeTruthy()
    expect(within(mermas).queryByText('Eventos de merma')).toBeNull()

    fallarMermas = false
    fireEvent.click(within(mermas).getByRole('button', { name: 'Reintentar consulta de mermas' }))
    expect(await within(mermas).findByText('Página 1 de 2')).toBeTruthy()
    expect(within(mermas).getByText(/1 evento carece/)).toBeTruthy()
    const historial = within(mermas).getByRole('region', { name: 'Historial de eventos de merma' })
    expect(within(historial).getByRole('link', { name: 'LV-1' }).getAttribute('href')).toBe('/app/vivero/9007199254741000?tab=historial')
    expect(within(historial).getByText('Sin causa registrada')).toBeTruthy()
    expect(within(historial).getByText('Sin cantidad válida')).toBeTruthy()

    fireEvent.click(within(mermas).getByRole('button', { name: 'Página siguiente' }))
    expect(await within(mermas).findByText('Página 2 de 2')).toBeTruthy()
    expect(within(mermas).queryByRole('link', { name: 'LV-1' })).toBeNull()
    expect(within(mermas).getByRole('link', { name: 'LV-26' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(await within(mermas).findByText('Página 1 de 2')).toBeTruthy()
    expect(consultas(fetcher.mock.calls, 'vivero')).toHaveLength(1)
    expect(consultas(fetcher.mock.calls, 'mermas').at(-1)?.searchParams.get('desde')).toBe('2026-03-01')
  })

  it('exporta el corte de inventario visible y vuelve a verificar permiso', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => response(input))
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    const vivero = screen.getByRole('region', { name: 'Vivero al corte' })
    const generar = within(vivero).getByRole<HTMLButtonElement>('button', { name: 'Generar PDF de vivero' })
    await waitFor(() => expect(generar.disabled).toBe(false))
    fireEvent.change(screen.getByLabelText('Vivero'), { target: { value: aliso.vivero_id } })
    expect(generar.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(generar.disabled).toBe(false))
    fireEvent.click(generar)
    const preview = screen.getByRole('dialog', { name: 'Vista previa del PDF' })
    expect(within(preview).getByText('Vivero Norte')).toBeTruthy()
    expect(within(preview).getByText('140')).toBeTruthy()
    fireEvent.click(within(preview).getByRole('button', { name: 'Descargar PDF' }))
    await waitFor(() => expect(descargarVivero).toHaveBeenCalledOnce())
    expect(descargarVivero).toHaveBeenCalledWith(fixtureVivero({ planta_id: null, vivero_id: aliso.vivero_id }), expect.any(Function))
    expect(consultas(fetcher.mock.calls, 'vivero')).toHaveLength(2)
    expect(consultas(fetcher.mock.calls, 'plantaciones/permiso-exportacion')).toHaveLength(1)
  })

  it('carga el detalle completo de mermas desde la segunda página, rechaza truncados y exporta el corte de la vista previa', async () => {
    let truncado = true
    const fetcher = vi.fn(async (input: RequestInfo | URL) => response(input, 27, truncado))
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    const mermas = screen.getByRole('region', { name: 'Mermas en vivero' })
    fireEvent.click(await within(mermas).findByRole('button', { name: 'Página siguiente' }))
    expect(await within(mermas).findByText('Página 2 de 2')).toBeTruthy()
    fireEvent.click(within(mermas).getByRole('button', { name: 'Generar PDF de mermas' }))
    const preview = screen.getByRole('dialog', { name: 'Vista previa del PDF' })
    const boton = within(preview).getByRole<HTMLButtonElement>('button', { name: 'Descargar PDF' })
    expect((await within(preview).findByRole('alert')).textContent).toContain('incompleto')
    expect(boton.disabled).toBe(true)
    expect(descargarMermas).not.toHaveBeenCalled()

    truncado = false
    fireEvent.click(within(preview).getByRole('button', { name: 'Reintentar consulta del PDF' }))
    expect(await within(preview).findByText(/historial completo del corte \(27 eventos\)/)).toBeTruthy()
    expect(preview.querySelector('time')?.dateTime).toBe('2026-11-18T16:00:00Z')
    expect(within(mermas).getByText('Página 2 de 2')).toBeTruthy()
    const exportaciones = consultas(fetcher.mock.calls, 'mermas').filter(url => url.searchParams.get('exportar') === '1')
    expect(exportaciones.map(url => url.searchParams.get('pagina'))).toEqual(['1', '1'])
    fireEvent.click(boton)
    await waitFor(() => expect(descargarMermas).toHaveBeenCalledOnce())
    const [reporte, detalle] = descargarMermas.mock.calls[0]
    expect(reporte.observado_en).toBe('2026-11-18T16:00:00Z')
    expect(detalle).toHaveLength(27)
    expect(consultas(fetcher.mock.calls, 'plantaciones/permiso-exportacion')).toHaveLength(1)
  })

  it('cancela la lectura de exportación de mermas al cerrar la vista previa', async () => {
    let signal: AbortSignal | null | undefined
    const fetcher = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('exportar=1')) {
        signal = init?.signal
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('Cancelado', 'AbortError')), { once: true })
        })
      }
      return Promise.resolve(response(input))
    })
    vi.stubGlobal('fetch', fetcher)
    renderReport()
    const generar = screen.getByRole<HTMLButtonElement>('button', { name: 'Generar PDF de mermas' })
    await waitFor(() => expect(generar.disabled).toBe(false))
    fireEvent.click(generar)
    const preview = screen.getByRole('dialog', { name: 'Vista previa del PDF' })
    await within(preview).findByText('Consultando el detalle completo de mermas…')
    await waitFor(() => expect(signal?.aborted).toBe(false))
    fireEvent.click(within(preview).getByRole('button', { name: 'Cerrar' }))
    expect(signal?.aborted).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(descargarMermas).not.toHaveBeenCalled()
  })
})
