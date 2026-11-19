import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ImpactoReportesScreen from './ImpactoReportesScreen'
import type { FiltrosReportePlantaciones, ReportePlantaciones } from './reporte-plantaciones.contract'
import { periodoInicial } from './reporte-plantaciones.presentacion'
import type { FiltrosMermas, FiltrosVivero, ReporteMermas, ReporteVivero } from './reporte-vivero.contract'

const { actor, descargar } = vi.hoisted(() => ({ actor: { rol: 'ADMIN', id: '47' }, descargar: vi.fn() }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: actor }) }))
vi.mock('./reporte-plantaciones.pdf', () => ({ descargarReportePlantaciones: descargar }))

const desde = '2026-01-01'
const hasta = '2026-11-18'
const tat = { planta_id: '9007199254740999', nombre_comun: 'Tajibo', nombre_cientifico: 'Handroanthus impetiginosus', iniciales: 60, reposiciones: 0, total: 60 }
const tob = { planta_id: '54', nombre_comun: 'Toborochi', nombre_cientifico: 'Ceiba speciosa', iniciales: 28, reposiciones: 12, total: 40 }
const aliso = { planta_id: '55', especie: 'Aliso', vivero_id: '72', vivero: 'Vivero Norte', plantas: 140 }
const opcionesVivero = { especies: [{ id: aliso.planta_id, nombre: aliso.especie }], viveros: [{ id: aliso.vivero_id, nombre: aliso.vivero }] }
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

function fixtureMermas(filtros: FiltrosMermas, eventos: number): ReporteMermas {
  const totalEventos = mismoVivero(filtros) ? eventos : 0
  const plantas = Math.max(totalEventos - 1, 0) * 2
  const detalle = Array.from({ length: totalEventos }, (_, index) => ({
    planta_id: aliso.planta_id, especie: aliso.especie, vivero_id: aliso.vivero_id, vivero: aliso.vivero,
    fecha: filtros.hasta, id: String(totalEventos - index), lote_id: '9007199254741000', codigo_lote: `LV-${index + 1}`,
    causa: index === 0 ? null : 'PLAGA', cantidad: index === 0 ? null : 2,
  })).slice((filtros.pagina - 1) * 25, filtros.pagina * 25)
  return {
    observado_en, filtros, opciones: opcionesVivero, tamano_pagina: 25, detalle,
    totales: { plantas, eventos: totalEventos, eventos_sin_cantidad: totalEventos > 0 ? 1 : 0 },
    por_causa: totalEventos > 0 ? [{ causa: null, plantas: 0, eventos: 1 }, { causa: 'PLAGA', plantas, eventos: totalEventos - 1 }] : [],
    meses: totalEventos > 0 ? [{ mes: filtros.hasta.slice(0, 7), plantas }] : [],
  }
}

function response(input: RequestInfo | URL, eventos = 2) {
  const { pathname, searchParams: query } = new URL(String(input), window.location.href)
  const ambito = { planta_id: query.get('planta_id'), vivero_id: query.get('vivero_id') }
  const periodo = { desde: query.get('desde') ?? '', hasta: query.get('hasta') ?? '' }
  if (pathname.endsWith('/permiso-exportacion')) return new Response(null, { status: 204 })
  const data = pathname.endsWith('/vivero') ? fixtureVivero(ambito)
    : pathname.endsWith('/mermas') ? fixtureMermas({ ...periodo, ...ambito, pagina: Number(query.get('pagina') ?? 1) }, eventos)
      : fixture({ ...periodo, organizacion_id: query.get('organizacion_id'), campania_id: query.get('campania_id'), planta_id: ambito.planta_id })
  return new Response(JSON.stringify({ success: true, data }), { status: 200 })
}

function consultas(llamadas: [RequestInfo | URL][], endpoint: string): URL[] {
  return llamadas.map(([input]) => new URL(String(input), window.location.href)).filter(url => url.pathname.endsWith(`/reportes/${endpoint}`))
}

function renderReport() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ImpactoReportesScreen /></MemoryRouter>)
}

beforeEach(() => {
  actor.rol = 'ADMIN'
  descargar.mockReset()
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
})
