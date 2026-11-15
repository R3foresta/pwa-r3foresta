import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assigned, m2Fixture } from '../../accesos/test-fixtures'
import IncorporacionScreen from './IncorporacionScreen'
import IncorporacionEntry from './IncorporacionEntry'
import ViveroScreen from '../screens/ViveroScreen'
import { indexedIncorporacionStorage, type IntentoIncorporacion } from './incorporacion.store'
import { IncorporacionApi, IncorporacionApiError } from './incorporacion.api'
import type { IncorporacionPayload, IncorporacionRecibo } from './incorporacion.contract'
import { canOpenAppPath } from '../../../utils/appAccess'

const account = vi.hoisted(() => ({ id: '7', role: 'ADMIN', revision: '1' }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: account.id, rol: account.role, auth_id: 'synthetic', nombre: 'Ana', username: 'ana' } }) }))
vi.mock('../../accesos/capabilitiesContext', () => ({ useOperationalAccess: () => ({ m2: { status: 'ready', data: m2Fixture({ usuario_id: account.id, rol_global: account.role as 'ADMIN', revision_acceso: account.revision, capacidades_globales: { administrar: account.role === 'ADMIN', operar_cualquier_vivero: account.role === 'ADMIN', recibir_y_validar_cualquier_vivero: account.role === 'ADMIN', desechar_semillas_cualquier_vivero: account.role === 'ADMIN' }, viveros: [assigned('9007199254740992', true)] }).data } }) }))
vi.mock('../../../services/recolecciones.service', () => ({ RecoleccionesService: { getViveros: vi.fn(async () => [{ id: '9007199254740992', nombre: 'Vivero sintético', codigo: 'VS' }]) } }))
vi.mock('../../../services/plantas.service', () => ({ PlantasService: { listPlantas: vi.fn(async () => ({ data: [{ id: '9007199254740993', nombre_comun_principal: 'Especie sintética', nombre_cientifico: 'Científico sintético', variedad: 'Variedad', activo: true }], pagination: { page: 1, hasNextPage: false } })) } }))
vi.mock('../hooks/useViveroLots', () => ({ useViveroLots: () => ({ lots: [], loading: false, error: null, refetch: vi.fn() }) }))
vi.mock('../../../services/lotes-vivero.service', () => ({ LotesViveroService: { listSubcampanias: vi.fn(async () => []) } }))
const UUID = '3e7cebf2-1536-4b04-b212-26c198a26728'
const photo = new File(['foto original sintética'], 'conteo.png', { type: 'image/png' })
const uploaded = { success: true as const, evidencia_ids: ['9007199254740994'], data: [{ id: '9007199254740994', bucket: 'vivero_incorporaciones' as const, ruta_archivo: 'synthetic/foto', signed_url: 'https://storage.example.test/foto', url_expira_en_segundos: 300 as const }] }
function receipt(input: IncorporacionPayload): IncorporacionRecibo {
  return { success: true, estado: 'CONFIRMADO', data: { ...input, lote_vivero_id: '9007199254740995', evento_incorporacion_id: '9007199254740996', codigo_trazabilidad: 'VIV-INC-SINTETICO', tercero_origen: input.tercero_origen ?? null, referencia_documental: input.referencia_documental ?? null, observaciones: input.observaciones ?? null, saldo_vivo_antes: 0, saldo_vivo_despues: input.cantidad, evidencia_ids_vinculadas: input.evidencia_ids, nombre_cientifico_snapshot: 'Científico sintético', nombre_comercial_snapshot: 'Especie sintética', variedad_snapshot: null, nombre_responsable_snapshot: 'Ana', registrado_en: '2026-11-15T12:00:00Z' } }
}
let records: Map<string, IntentoIncorporacion>
const lockDescriptor = Object.getOwnPropertyDescriptor(navigator, 'locks')
beforeEach(() => {
  records = new Map()
  account.id = '7'; account.role = 'ADMIN'; account.revision = '1'
  localStorage.setItem('authToken', 'synthetic-token')
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-15T16:00:00Z'))
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(UUID)
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:synthetic'), revokeObjectURL: vi.fn() })
  vi.spyOn(indexedIncorporacionStorage, 'read').mockImplementation(async actor => records.get(actor) ?? null)
  vi.spyOn(indexedIncorporacionStorage, 'write').mockImplementation(async record => { records.set(record.actor_id, record) })
  vi.spyOn(indexedIncorporacionStorage, 'delete').mockImplementation(async actor => { records.delete(actor) })
  vi.spyOn(IncorporacionApi, 'subir').mockResolvedValue(uploaded)
  vi.spyOn(IncorporacionApi, 'pendientes').mockResolvedValue(uploaded)
  vi.spyOn(IncorporacionApi, 'recuperar').mockResolvedValue({ success: true, estado: 'SIN_RESULTADO', resultado_concluyente: false })
  vi.spyOn(IncorporacionApi, 'confirmar').mockImplementation(async (_actor, payload) => receipt(payload))
  const tails = new Map<string, Promise<unknown>>()
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_key: string, _options: unknown, callback: () => unknown) => { const result = (tails.get(_key) ?? Promise.resolve()).then(callback); tails.set(_key, result.catch(() => {})); return result } } })
})
afterEach(() => { vi.useRealTimers(); if (lockDescriptor) Object.defineProperty(navigator, 'locks', lockDescriptor); else Reflect.deleteProperty(navigator, 'locks') })
function mount() { return render(<MemoryRouter><IncorporacionScreen /></MemoryRouter>) }
async function fill() {
  const view = mount()
  fireEvent.change(await screen.findByLabelText('Vivero físico'), { target: { value: '9007199254740992' } })
  fireEvent.click(await screen.findByRole('button', { name: /Especie sintética/ }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Plantas recibidas o contadas' }), { target: { value: '210' } })
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [photo] } })
  return view
}
async function prepare() {
  const view = await fill()
  fireEvent.click(screen.getByRole('button', { name: 'Preparar fotos y revisar ingreso' }))
  await screen.findByRole('button', { name: 'Revisar y confirmar incorporación' })
  return view
}

describe('formulario y recuperación propia T5', () => {
  it('reutiliza selectores, conserva BIGINT, exige confirmación y evita doble alta', async () => {
    await prepare()
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    expect(records.get('7')?.base.planta_id).toBe('9007199254740993')
    fireEvent.click(screen.getByRole('button', { name: 'Revisar y confirmar incorporación' }))
    const confirm = screen.getByRole('dialog', { name: '¿Confirmar la incorporación?' })
    expect(within(confirm).getByText('210 UNIDAD')).toBeTruthy()
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancelar' }))
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Revisar y confirmar incorporación' }))
    const button = within(screen.getByRole('dialog', { name: '¿Confirmar la incorporación?' })).getByRole('button', { name: 'Confirmar ingreso de plantas' })
    fireEvent.click(button); fireEvent.click(button)
    await screen.findByRole('dialog', { name: 'Plantas incorporadas' })
    expect(IncorporacionApi.confirmar).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Ver recibo confirmado' }))
    expect(screen.getByText(/El saldo actual se consulta por separado/)).toBeTruthy()
    expect(records.get('7')?.recibo?.data.saldo_vivo_despues).toBe(210)
  })
  it('limita modalidad/procedencia, enteros, fotos y fecha de La Paz, con observaciones para desconocida', async () => {
    const view = await fill()
    const prepareButton = screen.getByRole('button', { name: 'Preparar fotos y revisar ingreso' })
    expect(screen.queryByRole('option', { name: 'Desconocida' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Modalidad'), { target: { value: 'SALDO_INICIAL' } })
    fireEvent.change(screen.getByLabelText('Procedencia declarada'), { target: { value: 'DESCONOCIDA' } })
    expect(prepareButton.hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByPlaceholderText('Antecedentes, límites del conteo o fecha de compra antigua…'), { target: { value: 'Conteo actual, sin historia previa.' } })
    expect(prepareButton.hasAttribute('disabled')).toBe(false)
    const quantity = view.container.querySelector('input[inputmode="numeric"]')!
    for (const value of ['1.5', '0', '-1', '2147483648']) { fireEvent.change(quantity, { target: { value } }); expect(prepareButton.hasAttribute('disabled')).toBe(true) }
    fireEvent.change(quantity, { target: { value: '2147483647' } })
    expect(prepareButton.hasAttribute('disabled')).toBe(false)
    const date = view.container.querySelector('input[type="date"]')!
    fireEvent.change(date, { target: { value: '2099-01-01' } })
    expect(prepareButton.hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByLabelText('Modalidad'), { target: { value: 'RECEPCION' } })
    expect((screen.getByLabelText('Procedencia declarada') as HTMLSelectElement).value).toBe('COMPRA')
  })
  it('no sube archivos mayores a 15MiB y no avanza sin fotos válidas', async () => {
    const view = mount()
    await screen.findByLabelText('Vivero físico')
    const large = new File(['x'], 'grande.png', { type: 'image/png' })
    Object.defineProperty(large, 'size', { value: 15 * 1024 * 1024 + 1 })
    fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [large] } })
    expect(screen.getByText('Cada foto debe pesar como máximo 15 MiB.')).toBeTruthy()
    expect(IncorporacionApi.subir).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Preparar fotos y revisar ingreso' }).hasAttribute('disabled')).toBe(true)
  })
  it('recupera un alta incierta tras recarga y pérdida de ADMIN desde Inicio y ruta propia', async () => {
    const view = await prepare()
    vi.mocked(IncorporacionApi.confirmar).mockRejectedValueOnce(new IncorporacionApiError(503, false, 'Espera agotada; consultar'))
    fireEvent.click(screen.getByRole('button', { name: 'Revisar y confirmar incorporación' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar ingreso de plantas' }))
    await screen.findByText('Resultado pendiente de consulta')
    const stored = records.get('7')!
    view.unmount()
    account.role = 'VOLUNTARIO'
    const entry = render(<MemoryRouter initialEntries={['/app/home']}><Routes><Route path="/app/home" element={<IncorporacionEntry />} /><Route path="/app/vivero/incorporaciones" element={<IncorporacionScreen />} /></Routes></MemoryRouter>)
    const link = await screen.findByRole('link', { name: 'Recuperar incorporación propia' })
    expect(canOpenAppPath('/app/vivero/incorporaciones', 'VOLUNTARIO')).toBe(true)
    expect(canOpenAppPath('/app/vivero', 'VOLUNTARIO')).toBe(false)
    vi.mocked(IncorporacionApi.recuperar).mockResolvedValueOnce(receipt({ ...stored.base, solicitud_id: stored.solicitud_id, evidencia_ids: stored.evidencia_ids }))
    fireEvent.click(link)
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar resultado y fotos' }))
    await screen.findByRole('dialog', { name: 'Plantas incorporadas' })
    expect(IncorporacionApi.confirmar).toHaveBeenCalledOnce()
    expect(IncorporacionApi.subir).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Ver recibo confirmado' }))
    expect(screen.queryByRole('button', { name: 'Preparar otro ingreso' })).toBeNull()
    entry.unmount()
    account.id = '8'
    mount()
    await screen.findByText(/No hay una incorporación conservada/)
    expect(screen.queryByText(UUID)).toBeNull()
  })
  it('un rechazo de fotos no se presenta como alta rechazada y permite recuperar un ingreso confirmado', async () => {
    vi.mocked(IncorporacionApi.subir).mockRejectedValueOnce(new IncorporacionApiError(400, true, 'SOLICITUD_YA_CONFIRMADA'))
    await fill()
    fireEvent.click(screen.getByRole('button', { name: 'Preparar fotos y revisar ingreso' }))
    await screen.findByText('La carga de fotos recibió un rechazo explícito. Consulta el resultado del ingreso antes de continuar.')
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    const record = records.get('7')!
    vi.mocked(IncorporacionApi.recuperar).mockResolvedValueOnce(receipt({ ...record.base, solicitud_id: record.solicitud_id, evidencia_ids: uploaded.evidencia_ids }))
    fireEvent.click(screen.getByRole('button', { name: 'Consultar resultado y fotos' }))
    await screen.findByRole('dialog', { name: 'Plantas incorporadas' })
    expect(IncorporacionApi.subir).toHaveBeenCalledOnce()
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
  })
  it('sólo descarta una preparación local antes del alta y advierte que las fotos remotas permanecen', async () => {
    await prepare()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar sólo esta preparación local' }))
    expect(screen.getByText(/las fotos ya cargadas en el vivero no se borran/)).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(records.has('7')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Descartar sólo esta preparación local' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar preparación local' }))
    await screen.findByRole('button', { name: 'Preparar fotos y revisar ingreso' })
    expect(records.has('7')).toBe(false)
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
  })
})
describe('menú de Vivero por rol', () => {
  it('ADMIN conserva el CTA M1 y agrupa los tres accesos en el menú', async () => {
    render(<MemoryRouter><ViveroScreen /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Recibir y validar material' })).toBeNull()
    expect(screen.getByText('Nuevo lote de vivero')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones de Vivero' }))
    const nav = screen.getByRole('navigation', { name: 'Administración de Vivero' })
    expect(within(nav).getAllByRole('link')).toHaveLength(3)
    expect(within(nav).getByRole('link', { name: 'Incorporar plantas' }).getAttribute('href')).toBe('/app/vivero/incorporaciones')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('navigation', { name: 'Administración de Vivero' })).toBeNull()
  })
  it('VALIDADOR conserva recepción y no accede al alta ni al menú ADMIN', async () => {
    account.role = 'VALIDADOR'
    const view = render(<MemoryRouter><ViveroScreen /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Recibir y validar material' }).getAttribute('href')).toBe('/app/collections/validate')
    expect(screen.queryByRole('button', { name: 'Más opciones de Vivero' })).toBeNull()
    view.unmount()
    mount()
    await screen.findByText(/El alta de plantas requiere ADMIN/)
    expect(screen.queryByRole('button', { name: 'Preparar fotos y revisar ingreso' })).toBeNull()
    expect(IncorporacionApi.subir).not.toHaveBeenCalled()
  })
})
