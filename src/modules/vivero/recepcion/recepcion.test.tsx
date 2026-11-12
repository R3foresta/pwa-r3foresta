import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OperationalAccessContext } from '../../accesos/capabilitiesContext'
import { assigned, m1Fixture, m2Fixture, VIVERO_A } from '../../accesos/test-fixtures'
import type { AccesoM2 } from '../../accesos/types'
import RecoleccionesValidacionScreen from '../../recolecciones/RecoleccionesValidacionScreen'
import RecoleccionRecepcionCard from '../../recolecciones/components/RecoleccionRecepcionCard'
import { RecoleccionesService } from '../../../services/recolecciones.service'
import { cargarIntencionRecepcion, recepcionStoreKey, RecepcionService } from './recepcion.api'
import type { DetalleRecepcion, IntencionRecepcion, ReciboRecepcion } from './recepcion.contract'
import RecepcionScreen from './RecepcionScreen'

const auth = vi.hoisted(() => ({ user: { id: '7', auth_id: 'fixture-7', nombre: 'Ana' }, login: vi.fn() }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }))
const origen = '9007199254740993', revision = '9007199254740992'
const BASE = '/app/collections/validate'
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
function detail(overrides: Partial<DetalleRecepcion> = {}): DetalleRecepcion {
  return { recoleccion_id: origen, vivero_id: VIVERO_A, recolector_id: '8', codigo_trazabilidad: 'REC-T4-SINTETICA', fecha_recoleccion: '2026-01-01', tipo_material: 'SEMILLA', nombre_cientifico_snapshot: 'Especie sintética', nombre_comercial_snapshot: 'Tara', nombre_recolector_snapshot: 'Autor sintético', cantidad_declarada: 100, unidad_declarada: 'G', saldo_actual: 100, revision, estado_registro: 'PENDIENTE_VALIDACION', motivo_rechazo: null, recepcion: null, puede_recibir_validar: true, puede_rechazar: true, observaciones: 'Material de campo', ubicacion_id: '32', metodo_id: '2', planta_id: '4', ubicacion: { id: '32', pais_id: '1', division_id: null, nombre: 'Comunidad de prueba', referencia: 'Cerca de la escuela', latitud: -16, longitud: -68, precision_m: 4, fuente: 'GPS' }, evidencias: [], historial: [], ...overrides }
}
function intention(): IntencionRecepcion {
  return { accion: 'RECIBIR', actor_id: '7', recoleccion_id: origen, entrada: { comando_id: '4ff8f9bb-4280-463d-95c8-97a3f11f122c', revision_esperada: revision, cantidad_recibida: 100, unidad_recibida: 'G', fecha_recepcion: hoy(), evidencia_ids: ['9007199254740994'] } }
}
function receipt(i: IntencionRecepcion): ReciboRecepcion {
  const common = { recoleccion_id: i.recoleccion_id, vivero_id: VIVERO_A, revision_anterior: i.entrada.revision_esperada, revision_nueva: (BigInt(i.entrada.revision_esperada) + 1n).toString(), actor_id: i.actor_id, saldo_actual: 100, registrado_en: new Date().toISOString() }
  return { comando_id: i.entrada.comando_id, estado: 'CONFIRMADO', error: null, finalizado_en: new Date().toISOString(), resultado: i.accion === 'RECIBIR' ? { ...common, accion: 'RECIBIR', recepcion_id: '24', cantidad_recibida: i.entrada.cantidad_recibida, unidad_recibida: 'G', fecha_recepcion: i.entrada.fecha_recepcion, estado_registro: 'VALIDADO', anclaje_externo: 'FUERA_TRANSACCION', motivo_rechazo: null } : { ...common, accion: 'RECHAZAR', recepcion_id: null, cantidad_recibida: null, unidad_recibida: null, fecha_recepcion: null, estado_registro: 'RECHAZADO', anclaje_externo: 'NO_APLICA', motivo_rechazo: i.entrada.motivo_rechazo } }
}
function access(overrides: Partial<AccesoM2> = {}) {
  const row = assigned(VIVERO_A, true)
  return m2Fixture({ rol_global: 'VALIDADOR', viveros: [{ ...row, capacidades: { ...row.capacidades, operar: false } }], ...overrides }).data
}
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output> }
function page(path = `${BASE}/${origen}`, m2 = access()) {
  return <OperationalAccessContext.Provider value={{ m1: { status: 'ready', data: m1Fixture().data, error: null, refresh: vi.fn() }, m2: { status: 'ready', data: m2, error: null, refresh: vi.fn() } }}><MemoryRouter initialEntries={[path]}><Location /><Routes><Route path={BASE} element={<RecoleccionesValidacionScreen />} /><Route path={`${BASE}/:id`} element={<RecoleccionesValidacionScreen />} /><Route path="/app/recepciones-semillas" element={<RecepcionScreen />} /><Route path="/app/recepciones-semillas/:id" element={<RecepcionScreen />} /></Routes></MemoryRouter></OperationalAccessContext.Provider>
}
function uploadInput() { return screen.getByRole('group', { name: 'Fotos de recepción' }).querySelector('input[type="file"]') as HTMLInputElement }

beforeEach(() => {
  vi.restoreAllMocks(); localStorage.clear(); localStorage.setItem('authToken', 'fixture-7')
  auth.user = { id: '7', auth_id: 'fixture-7', nombre: 'Ana' }
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_name: string, _options: unknown, callback: () => Promise<unknown>) => callback() } })
  vi.stubGlobal('scrollTo', vi.fn())
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0 })
  URL.createObjectURL = vi.fn(() => 'blob:recepcion')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(RecoleccionesService, 'getViveros').mockResolvedValue([{ id: VIVERO_A, nombre: 'Vivero central', codigo: 'CENTRAL' }])
  vi.spyOn(RecoleccionesService, 'getMetodos').mockResolvedValue([{ id: 2, nombre: 'Manual' }])
  vi.spyOn(RecepcionService, 'detalle').mockResolvedValue(detail())
  vi.spyOn(RecepcionService, 'cola').mockResolvedValue({ data: [detail()], siguiente_antes_de_id: null })
  vi.spyOn(RecepcionService, 'fotos').mockResolvedValue(['9007199254740994'])
  vi.spyOn(RecepcionService, 'comando').mockImplementation(async i => receipt(i))
})

describe('bandeja única de recepción', () => {
  it('reutiliza la tarjeta desplegable con fotos, datos y catálogos sin requerir operación de Vivero', async () => {
    vi.mocked(RecepcionService.detalle).mockResolvedValue(detail({ evidencias: [{ id: '41', bucket: 'privado', ruta_archivo: 'origen.jpg', public_url: 'https://example.invalid/origen.jpg', titulo: 'Foto de origen', mime_type: 'image/jpeg', recepcion_id: null }] }))
    render(page(BASE))
    expect(await screen.findByAltText('Foto de origen')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByText('Comunidad de prueba', { selector: 'section p' })).toBeTruthy()
    expect(screen.getByText('Vivero central')).toBeTruthy(); expect(screen.getByText('Manual')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Recepcionar' }) as HTMLButtonElement).disabled).toBe(false)
    expect(RecepcionService.cola).toHaveBeenCalledWith('7', undefined, expect.any(AbortSignal))
  })

  it('usa cursor exacto y el enlace anterior conserva la consulta al redirigir', async () => {
    vi.mocked(RecepcionService.cola).mockResolvedValue({ data: [], siguiente_antes_de_id: '9007199254740995' })
    render(page('/app/recepciones-semillas?antes_de_id=9007199254740994'))
    expect(await screen.findByText('Todo al día')).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe(`${BASE}?antes_de_id=9007199254740994`)
    expect(RecepcionService.cola).toHaveBeenCalledWith('7', '9007199254740994', expect.any(AbortSignal))
    expect(screen.getByRole('link', { name: 'Siguiente página' }).getAttribute('href')).toBe(`${BASE}?antes_de_id=9007199254740995`)
  })

  it('limita el enriquecimiento a tres lecturas simultáneas y deja reintentar cada fallo', async () => {
    const items = ['21', '22', '23', '24'].map(recoleccion_id => detail({ recoleccion_id }))
    vi.mocked(RecepcionService.cola).mockResolvedValue({ data: items, siguiente_antes_de_id: null })
    const finish: Array<() => void> = []
    vi.mocked(RecepcionService.detalle).mockImplementation((_actor, id) => new Promise(resolve => finish.push(() => resolve(detail({ recoleccion_id: id })))))
    render(page(BASE)); await waitFor(() => expect(RecepcionService.detalle).toHaveBeenCalledTimes(3))
    await act(async () => finish[0]()); await waitFor(() => expect(RecepcionService.detalle).toHaveBeenCalledTimes(4))
    await act(async () => finish.slice(1).forEach(done => done()))
  })

  it('rechaza sobre una revisión recién consultada, con motivo y sin exigir fotos', async () => {
    const u = userEvent.setup(); render(page(BASE)); await waitFor(() => expect((screen.getByRole('button', { name: 'Rechazar' }) as HTMLButtonElement).disabled).toBe(false))
    vi.mocked(RecepcionService.detalle).mockResolvedValue(detail({ revision: '9007199254740994' }))
    await u.click(screen.getByRole('button', { name: 'Rechazar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Rechazar recolección' })
    expect((within(dialog).getByRole('button', { name: 'Confirmar rechazo' }) as HTMLButtonElement).disabled).toBe(true)
    await u.type(within(dialog).getByLabelText('Motivo del rechazo'), 'La cantidad declarada no corresponde al material entregado.')
    expect(RecepcionService.comando).not.toHaveBeenCalled()
    await u.click(within(dialog).getByRole('button', { name: 'Confirmar rechazo' }))
    expect(await screen.findByRole('dialog', { name: 'Recolección rechazada' })).toBeTruthy()
    expect(RecepcionService.fotos).not.toHaveBeenCalled()
    expect(vi.mocked(RecepcionService.comando).mock.calls[0][0]).toMatchObject({ accion: 'RECHAZAR', entrada: { revision_esperada: '9007199254740994' } })
  })

  it('no abre datos a GENERAL operador ni a quien solo tiene M1', async () => {
    render(page(BASE, access({ rol_global: 'GENERAL', viveros: [assigned()] })))
    expect(await screen.findByText(/Tu cuenta no tiene permiso actual/)).toBeTruthy()
    expect(RecepcionService.cola).not.toHaveBeenCalled(); expect(RecepcionService.detalle).not.toHaveBeenCalled()
  })

  it('bloquea autorrecepción para ADMIN y respeta flags por objeto', async () => {
    vi.mocked(RecepcionService.detalle).mockResolvedValue(detail({ recolector_id: '7' }))
    render(page(`${BASE}/${origen}`, access({ rol_global: 'ADMIN' })))
    expect(await screen.findByText(/incluso si eres ADMIN/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Recibir y validar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rechazar recolección' })).toBeNull()
  })

  it('mantiene la consulta auditable de una recepción confirmada con sus fotos y ambas fechas', async () => {
    vi.mocked(RecepcionService.detalle).mockResolvedValue(detail({
      estado_registro: 'VALIDADO', puede_recibir_validar: false, puede_rechazar: false,
      recepcion: { id: '24', fecha_recepcion: '2026-11-11', recibido_por: '7', registrado_en: '2026-11-12T14:00:00Z' },
      evidencias: [{ id: '42', bucket: 'recoleccion_fotos', ruta_archivo: 'recepcion.jpg', public_url: 'https://example.invalid/recepcion.jpg', titulo: 'Foto de recepción', mime_type: 'image/jpeg', recepcion_id: '24' }],
      historial: [{ id: '55', tipo_historial: 'VALIDACION_APROBADA', estado_origen: 'PENDIENTE_VALIDACION', estado_destino: 'VALIDADO', actor_id: '7', fecha: '2026-11-12T14:00:00Z', metadata: {} }],
    }))
    const u = userEvent.setup(); render(page())
    expect(await screen.findByText(/Recepción física conforme registrada/)).toBeTruthy()
    await u.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByText(/Historial auditable/)).toBeTruthy()
    expect(screen.getByText('Fecha física de recepción')).toBeTruthy()
    expect(screen.getByText('Registrado en')).toBeTruthy()
    expect(screen.getAllByAltText('Foto de recepción')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Recibir y validar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rechazar recolección' })).toBeNull()
    expect(RecepcionService.comando).not.toHaveBeenCalled()
  })

  it('retira ficha/fotos al perder el vivero y descarta la respuesta obsoleta', async () => {
    let finish!: (value: DetalleRecepcion) => void
    vi.mocked(RecepcionService.detalle).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const v = render(page()); await waitFor(() => expect(RecepcionService.detalle).toHaveBeenCalled())
    const signal = vi.mocked(RecepcionService.detalle).mock.calls[0][2]
    v.rerender(page(undefined, access({ revision_acceso: '99', viveros: [] })))
    await act(async () => finish(detail()))
    expect(signal?.aborted).toBe(true); expect(screen.queryByText('REC-T4-SINTETICA')).toBeNull()
    expect(screen.queryByRole('group', { name: 'Fotos de recepción' })).toBeNull()
  })

  it('recupera operación propia sin rol ni vivero y conserva la misma intención ante respuesta incierta', async () => {
    const i = intention(); localStorage.setItem(recepcionStoreKey('7'), JSON.stringify(i))
    vi.mocked(RecepcionService.comando).mockRejectedValueOnce(new Error('Respuesta incierta')).mockResolvedValueOnce(receipt(i))
    const u = userEvent.setup(); render(page(BASE, access({ rol_global: 'VOLUNTARIO', viveros: [] })))
    await u.click(await screen.findByRole('button', { name: 'Recuperar resultado' }))
    expect(await screen.findByText('Respuesta incierta')).toBeTruthy(); expect(cargarIntencionRecepcion('7')).toEqual(i)
    await u.click(screen.getByRole('button', { name: 'Recuperar resultado' }))
    expect(await screen.findByRole('dialog', { name: 'Recepción confirmada' })).toBeTruthy()
    expect(vi.mocked(RecepcionService.comando).mock.calls.every(([value, recovery]) => value.entrada.comando_id === i.entrada.comando_id && recovery)).toBe(true)
    expect(RecepcionService.cola).not.toHaveBeenCalled(); expect(RecepcionService.detalle).not.toHaveBeenCalled()
  })
})

describe('captura corta de recepción', () => {
  it('recibe esquejes en UNIDAD conservando la declaración entera', async () => {
    vi.mocked(RecepcionService.detalle).mockResolvedValue(detail({ tipo_material: 'ESQUEJE', unidad_declarada: 'UNIDAD' }))
    vi.mocked(RecepcionService.comando).mockImplementation(async i => {
      const result = receipt(i)
      if (result.resultado?.accion === 'RECIBIR') result.resultado.unidad_recibida = 'UNIDAD'
      return result
    })
    const u = userEvent.setup(); render(page())
    expect((await screen.findByLabelText('Unidad') as HTMLInputElement).value).toBe('UNIDAD')
    await u.upload(uploadInput(), new File(['foto'], 'esquejes.jpg', { type: 'image/jpeg' }))
    await u.click(screen.getByRole('button', { name: 'Recibir y validar' }))
    await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Recibir y validar' }))
    expect(await screen.findByRole('dialog', { name: 'Recepción confirmada' })).toBeTruthy()
    expect(vi.mocked(RecepcionService.comando).mock.calls[0][0]).toMatchObject({ accion: 'RECIBIR', entrada: { cantidad_recibida: 100, unidad_recibida: 'UNIDAD' } })
  })

  it('mantiene cantidad/unidad de solo lectura, fotos nuevas y confirmación explícita; vuelve al mismo cursor', async () => {
    const u = userEvent.setup(); render(page(`${BASE}/${origen}?antes_de_id=31`))
    expect((await screen.findByLabelText('Cantidad declarada') as HTMLInputElement).readOnly).toBe(true)
    expect((screen.getByLabelText('Unidad') as HTMLInputElement).readOnly).toBe(true)
    expect(screen.getByText('Ana (7)')).toBeTruthy()
    await u.upload(uploadInput(), new File(['foto'], 'recepcion.jpg', { type: 'image/jpeg' }))
    await u.click(screen.getByRole('button', { name: 'Recibir y validar' }))
    expect(RecepcionService.fotos).not.toHaveBeenCalled()
    await u.click(within(screen.getByRole('dialog', { name: 'Confirmar recepción' })).getByRole('button', { name: 'Cancelar' }))
    expect(RecepcionService.comando).not.toHaveBeenCalled()
    await u.click(screen.getByRole('button', { name: 'Recibir y validar' }))
    await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Recibir y validar' }))
    expect(await screen.findByRole('dialog', { name: 'Recepción confirmada' })).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe(`${BASE}?antes_de_id=31`)
    expect(vi.mocked(RecepcionService.comando).mock.calls[0][0]).toMatchObject({ accion: 'RECIBIR', recoleccion_id: origen, entrada: { cantidad_recibida: 100, unidad_recibida: 'G', revision_esperada: revision, fecha_recepcion: hoy() } })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recepcion')
  })

  it('exige fotos y fecha dentro del intervalo, rechaza archivos de más de 15 MiB', async () => {
    const u = userEvent.setup(); render(page()); await screen.findByLabelText('Cantidad declarada')
    await u.click(screen.getByRole('button', { name: 'Recibir y validar' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Adjunta de 1 a 5 fotos nuevas de la recepción.')
    const big = new File(['foto'], 'grande.jpg', { type: 'image/jpeg' }); Object.defineProperty(big, 'size', { value: 15 * 1024 * 1024 + 1 })
    await u.upload(uploadInput(), big); expect(await screen.findByText(/Cada foto debe ser una imagen/)).toBeTruthy()
    await u.upload(uploadInput(), new File(['foto'], 'foto.jpg', { type: 'image/jpeg' }))
    fireEvent.change(screen.getByLabelText('Fecha física de recepción'), { target: { value: '2025-12-31' } })
    fireEvent.submit(screen.getByLabelText('Fecha física de recepción').closest('form')!)
    expect(await screen.findByText(/La recepción debe estar entre/)).toBeTruthy(); expect(RecepcionService.fotos).not.toHaveBeenCalled()
  })

  it('conserva fotos y fecha si falla la carga antes del comando, permite reintentar y limpia al cancelar', async () => {
    vi.mocked(RecepcionService.fotos).mockRejectedValueOnce(new Error('No se pudo subir la foto'))
    const u = userEvent.setup(); render(page()); await screen.findByLabelText('Cantidad declarada')
    fireEvent.change(screen.getByLabelText('Fecha física de recepción'), { target: { value: '2026-01-02' } })
    await u.upload(uploadInput(), new File(['foto'], 'foto.jpg', { type: 'image/jpeg' }))
    await u.click(screen.getByRole('button', { name: 'Recibir y validar' })); await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Recibir y validar' }))
    expect(await screen.findByText('No se pudo subir la foto')).toBeTruthy()
    expect((screen.getByLabelText('Fecha física de recepción') as HTMLInputElement).value).toBe('2026-01-02')
    expect(screen.getByAltText('foto.jpg')).toBeTruthy(); expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    await u.click(screen.getByRole('button', { name: 'Recibir y validar' })); await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Recibir y validar' }))
    expect(await screen.findByRole('dialog', { name: 'Recepción confirmada' })).toBeTruthy()
    expect(RecepcionService.fotos).toHaveBeenCalledTimes(2)
  })
})

describe('historial de tarjeta', () => {
  it('conserva snapshot rechazado de 100 ante ficha corregida a 90 y distingue día de instante', async () => {
    const d = detail({ cantidad_declarada: 90, historial: [{ id: '51', tipo_historial: 'VALIDACION_RECHAZADA', estado_origen: 'PENDIENTE_VALIDACION', estado_destino: 'RECHAZADO', actor_id: '7', fecha: '2026-11-12', metadata: { ficha_revisada: { cantidad_inicial_canonica: 100, unidad_canonica: 'G' }, motivo_rechazo: 'Se declaró otra cantidad.' } }, { id: '52', tipo_historial: 'REENVIADA', estado_origen: 'BORRADOR', estado_destino: 'PENDIENTE_VALIDACION', actor_id: '8', fecha: '2026-11-12T03:00:00Z', metadata: {} }] })
    render(<RecoleccionRecepcionCard item={d} detalle={d} canReceive canReject ownCollection={false} onReceive={vi.fn()} onReject={vi.fn()} onRetry={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByText('Declaración revisada: 100 G')).toBeTruthy()
    expect(screen.getByText(/12\/11\/2026 · Persona 7/)).toBeTruthy()
    const expected = new Date('2026-11-12T03:00:00Z').toLocaleString('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'medium', timeStyle: 'short' })
    expect(screen.getByText(`${expected} · Persona 8`)).toBeTruthy()
  })
})
