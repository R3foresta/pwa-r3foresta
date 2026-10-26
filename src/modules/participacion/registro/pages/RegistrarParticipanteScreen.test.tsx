import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { RegistroParticipacionService } from '../../api/registro.api'
import { ParticipacionApiError } from '../../api/participacion.api'
import { newRegistrationDraft } from '../../commands/registrationDraftStore'
import type { CargaRegistro, ContextoRegistro, IntentoRegistro, ReciboRegistro } from '../../registroTypes'
import RegistrarParticipanteScreen from './RegistrarParticipanteScreen'

const mocks = vi.hoisted(() => {
  const records = new Map<string, unknown>()
  return { actorId: '801', records, login: vi.fn(), storage: { read: async (key: string) => records.get(key) ?? null, write: async (record: { key: string }) => { records.set(record.key, record) }, delete: async (key: string) => { records.delete(key) }, list: async () => [...records.values()] } }
})
vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mocks.actorId, nombre: 'Carlos', apellido: 'Pérez', username: 'Carlos' }, login: mocks.login }) }))
vi.mock('../../commands/useRegistroCommand', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../commands/useRegistroCommand')>()
  return { ...original, useRegistroCommand: (actorId: string | null, scopeId: string | null) => original.useRegistroCommand(actorId, scopeId, mocks.storage) }
})

const today = '2026-03-02'
const observed = '2026-03-02T16:00:00Z'
let uploaded: Map<string, CargaRegistro>
function context(actorId = '801'): ContextoRegistro {
  return { subcampania: { id: '820', campania_id: '800', nombre: 'Palca Norte', campania_nombre: 'Bosque 2026', estado: 'ACTIVA', plan_revision: '9007199254740997', meta_total_arboles: 5, poligono: { type: 'Polygon', coordinates: [[[-68.2, -16.6], [-68, -16.6], [-68, -16.4], [-68.2, -16.4], [-68.2, -16.6]]] } }, actor: { usuario_id: actorId, fuente_autoridad: 'CONTEXTUAL' }, disponibilidad: 'DISPONIBLE', especies: [{ planta_id: '9007199254740995', nombre: 'Queñua', porcentaje_objetivo: 100, cantidad_objetivo: 5, saldo_elegible: 15 }], reglas: { hoy_operativo: today, fecha_minima_ventana: '2026-02-20', fecha_maxima: today, zona_horaria: 'America/La_Paz', ventana_retroactiva_dias: 10, fotos_min: 1, fotos_max: 10, exterior_permitido: true } }
}
function receipt(identity: IntentoRegistro): ReciboRegistro {
  return { comando_id: identity.comando_id, operacion: 'REGISTRAR_PLANTACION_INICIAL', finalizado_en: observed, estado: 'CONFIRMADO', error: null, resultado: { tipo: 'PLANTACION_INICIAL', registro_plantacion_id: '9007199254740999', codigo_trazabilidad: 'PLT-REAL-001', subcampania_id: identity.subcampania_id, responsable_id: identity.actor_id, fecha_plantacion: identity.payload.fecha_plantacion, cantidad_total_plantada: identity.payload.especies.reduce((sum, species) => sum + species.cantidad, 0), especies: identity.payload.especies, gps_dentro_poligono: false, gps_distancia_a_poligono_m: 1300, revision_inicial: '0' } }
}

beforeEach(() => {
  mocks.actorId = '801'; mocks.records.clear(); uploaded = new Map()
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: vi.fn(async (_key: string, _options: unknown, callback: () => Promise<unknown>) => callback()) } })
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => 'blob:local-photo'); static revokeObjectURL = vi.fn() })
  vi.spyOn(RegistroParticipacionService, 'contexto').mockImplementation(async (actorId) => ({ data: context(actorId), observado_en: observed }))
  vi.spyOn(RegistroParticipacionService, 'participantes').mockResolvedValue({ data: [{ usuario_id: '802', nombre: 'Ana', organizacion: null }], observado_en: observed, siguiente_cursor: null })
  vi.spyOn(RegistroParticipacionService, 'preparar').mockImplementation(async (identity) => ({ data: { comando_id: identity.comando_id, subcampania_id: identity.subcampania_id, operacion: 'REGISTRAR_PLANTACION_INICIAL', estado: 'PREPARADO' }, observado_en: observed }))
  vi.spyOn(RegistroParticipacionService, 'listarCargas').mockImplementation(async (identity) => ({ data: [...uploaded.entries()].filter(([key]) => key.startsWith(`${identity.comando_id}:`)).map(([, value]) => value), observado_en: observed }))
  vi.spyOn(RegistroParticipacionService, 'subirCarga').mockImplementation(async (_identity, cargaId) => {
    const carga: CargaRegistro = { carga_id: cargaId, estado: 'DISPONIBLE', evidencia_id: '901', creado_en: observed, expira_en: '2026-03-03T16:00:00Z' }
    uploaded.set(`${_identity.comando_id}:${cargaId}`, carga)
    return { data: carga, observado_en: observed }
  })
  vi.spyOn(RegistroParticipacionService, 'preview').mockResolvedValue({ data: { url: 'https://preview.example.test/foto.jpg', expira_en: '2026-03-02T16:05:00Z' }, observado_en: observed })
  vi.spyOn(RegistroParticipacionService, 'enviar').mockImplementation(async (identity) => receipt(identity))
  vi.spyOn(RegistroParticipacionService, 'recuperar').mockImplementation(async (identity) => {
    if (!identity.payload) throw new ParticipacionApiError(202, { codigo: 'COMANDO_PREPARADO', mensaje: 'Preparación todavía abierta.', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' })
    return receipt(identity as IntentoRegistro)
  })
  vi.spyOn(RegistroParticipacionService, 'cancelar').mockImplementation(async (identity) => ({ comando_id: identity.comando_id, operacion: 'REGISTRAR_PLANTACION_INICIAL', finalizado_en: observed, estado: 'RECHAZADO', resultado: null, error: { codigo: 'PREPARACION_CANCELADA', mensaje: 'Preparación cerrada sin registro.', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' } }))
})

function ReturnDestination() {
  const { pathname, search } = useLocation()
  return <p>Retorno: {pathname}{search}</p>
}
function open(state?: unknown) { return render(<MemoryRouter initialEntries={[{ pathname: '/registro/820', state }]}><Routes>
  <Route path="/registro/:subcampaniaId" element={<RegistrarParticipanteScreen />} />
  <Route path="/participar" element={<ReturnDestination />} />
  <Route path="/app/planting/subcampanias/:id" element={<ReturnDestination />} />
  <Route path="/app/participacion/registrar" element={<ReturnDestination />} />
</Routes></MemoryRouter>) }

async function fillToParticipants() {
  const user = userEvent.setup()
  await screen.findByRole('heading', { name: 'Fotos del trabajo' })
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
  await user.upload(input, new File(['jpeg-fake'], 'trabajo.jpg', { type: 'image/jpeg' }))
  await screen.findByText('Foto lista')
  await user.click(screen.getByRole('button', { name: /Editar coordenadas manualmente/ }))
  await user.type(screen.getByLabelText('Latitud'), '-16.8')
  await user.type(screen.getByLabelText('Longitud'), '-68.4')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.type(await screen.findByLabelText('Cantidad de Queñua'), '7')
  await user.type(screen.getByLabelText('Observaciones (opcional)'), 'Se plantó junto al sendero')
  await user.click(screen.getByRole('button', { name: 'Continuar a participantes' }))
  await screen.findByRole('checkbox', { name: /Ana/ })
  return user
}

describe('Registro participante de tres pasos', () => {
  it('explica cuándo el contexto de la subcampaña requiere una corrección administrativa', async () => {
    vi.mocked(RegistroParticipacionService.contexto).mockRejectedValueOnce(new ParticipacionApiError(422, { codigo: 'CONTEXTO_INCOMPLETO', mensaje: 'El plan, polígono o día de entrega requiere conciliación.', campos: [], ambitos: [], reintento: 'NO_APLICA' }))
    open()
    expect(await screen.findByText('La subcampaña necesita una corrección antes de registrar plantaciones.')).toBeTruthy()
    expect(screen.getByText(/El equipo responsable debe revisar el plan de especies/)).toBeTruthy()
    expect(screen.queryByText('El plan, polígono o día de entrega requiere conciliación.')).toBeNull()
  })

  it('explica un rechazo durable por contexto incompleto antes de una nueva propuesta', async () => {
    vi.mocked(RegistroParticipacionService.enviar).mockImplementationOnce(async (identity) => ({ comando_id: identity.comando_id, operacion: 'REGISTRAR_PLANTACION_INICIAL', estado: 'RECHAZADO', resultado: null, finalizado_en: observed, error: { codigo: 'CONTEXTO_INCOMPLETO', mensaje: 'El plan, polígono o día de entrega requiere conciliación.', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' } }))
    open()
    const user = await fillToParticipants()
    await user.click(screen.getByRole('button', { name: 'Confirmar plantación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar y guardar plantación' }))
    await screen.findByText('Plantación rechazada por el servidor')
    expect(screen.getByText('La subcampaña necesita una corrección antes de registrar plantaciones.')).toBeTruthy()
    expect(screen.getByText(/El equipo responsable debe revisar el plan de especies/)).toBeTruthy()
    expect(screen.queryByText('El plan, polígono o día de entrega requiere conciliación.')).toBeNull()
  })

  it('permite reintentar un descarte pendiente con la misma clave desde el formulario', async () => {
    const original = crypto.randomUUID()
    mocks.records.set('801:820', { ...newRegistrationDraft('801', '820'), comando_id: original, cancelacion_solicitada: true })
    vi.mocked(RegistroParticipacionService.recuperar).mockRejectedValueOnce(new ParticipacionApiError(404, { codigo: 'COMANDO_NO_CONFIRMADO', mensaje: 'No hay un resultado confirmado para esta clave.', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' }))
    vi.mocked(RegistroParticipacionService.cancelar).mockRejectedValueOnce(new ParticipacionApiError(404, { codigo: 'COMANDO_NO_ENCONTRADO', mensaje: 'No se encontró la preparación propia.', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' }))
    open()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Descarte pendiente', level: 1 })
    expect(screen.getByText(/Aún no se confirmó el descarte/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Fotos del trabajo' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Reintentar descarte' }))
    await screen.findByText('Preparación cancelada')
    expect(RegistroParticipacionService.preparar).toHaveBeenCalledWith(expect.objectContaining({ comando_id: original }), expect.any(AbortSignal))
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('recupera una preparación ausente sin bloquear fotos ni ubicación', async () => {
    const original = crypto.randomUUID()
    mocks.records.set('801:820', { ...newRegistrationDraft('801', '820'), comando_id: original, preparado: true })
    vi.mocked(RegistroParticipacionService.listarCargas).mockRejectedValueOnce(new ParticipacionApiError(404, { codigo: 'COMANDO_NO_ENCONTRADO', mensaje: 'No se encontró la preparación propia.', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' }))
    open()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Fotos del trabajo' })
    await waitFor(() => expect(RegistroParticipacionService.preparar).toHaveBeenCalledWith(expect.objectContaining({ comando_id: original }), expect.any(AbortSignal)))
    expect(screen.queryByText('No se encontró la preparación propia.')).toBeNull()
    expect((screen.getByRole('button', { name: 'Marcar punto en el mapa' }) as HTMLButtonElement).disabled).toBe(false)
    expect((document.querySelector<HTMLInputElement>('input[type="file"]')!).disabled).toBe(false)
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['foto'], 'campo.jpg', { type: 'image/jpeg' }))
    await screen.findByText('Foto lista')
    await user.click(screen.getByRole('button', { name: 'Editar coordenadas manualmente' }))
    await user.type(screen.getByLabelText('Latitud'), '-16.8')
    await user.type(screen.getByLabelText('Longitud'), '-68.4')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByLabelText('Cantidad de Queñua')
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('un fallo de preparación deja marcar ubicación y añadir fotos antes del envío final', async () => {
    mocks.records.set('801:820', { ...newRegistrationDraft('801', '820'), comando_id: crypto.randomUUID(), preparado: true })
    vi.mocked(RegistroParticipacionService.listarCargas).mockRejectedValueOnce(new ParticipacionApiError(404, { codigo: 'COMANDO_NO_ENCONTRADO', mensaje: 'No se encontró la preparación propia.', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' }))
    vi.mocked(RegistroParticipacionService.preparar).mockRejectedValueOnce(new ParticipacionApiError(503, { codigo: 'RESULTADO_NO_DETERMINADO', mensaje: 'La carga no respondió.', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' }))
    open()
    const user = userEvent.setup()
    await screen.findByText('Puedes continuar la captura')
    expect(screen.getByText('La carga no respondió.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Marcar punto en el mapa' }) as HTMLButtonElement).disabled).toBe(false)
    expect((document.querySelector<HTMLInputElement>('input[type="file"]')!).disabled).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Editar coordenadas manualmente' }))
    await user.type(screen.getByLabelText('Latitud'), '-16.8')
    await user.type(screen.getByLabelText('Longitud'), '-68.4')
    await waitFor(() => expect(mocks.records.get('801:820')).toMatchObject({ draft: { latitud: -16.8, longitud: -68.4 } }))
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('captura GPS al entrar y conserva su respuesta mientras la foto se sube automáticamente', async () => {
    let locate!: PositionCallback
    const gps = vi.fn((success: PositionCallback) => { locate = success })
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: gps } })
    let complete!: () => void
    vi.mocked(RegistroParticipacionService.subirCarga).mockImplementationOnce(async (_identity, cargaId) => {
      await new Promise<void>((resolve) => { complete = resolve })
      return { data: { carga_id: cargaId, estado: 'DISPONIBLE', evidencia_id: '901', creado_en: observed, expira_en: null }, observado_en: observed }
    })
    open()
    const user = userEvent.setup()
    await waitFor(() => expect(gps).toHaveBeenCalledTimes(1))
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['foto'], 'campo.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(RegistroParticipacionService.subirCarga).toHaveBeenCalledTimes(1))
    await act(async () => locate({ coords: { latitude: -16.5, longitude: -68.1, accuracy: 5 } } as GeolocationPosition))
    expect((screen.getByRole('button', { name: 'Subiendo fotos…' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => complete())
    await screen.findByText('Foto lista')
    await waitFor(() => expect(mocks.records.get('801:820')).toMatchObject({ draft: { latitud: -16.5, longitud: -68.1 } }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByLabelText('Cantidad de Queñua')
    expect(gps).toHaveBeenCalledTimes(1)
    expect(RegistroParticipacionService.preview).not.toHaveBeenCalled()
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('una corrección manual prevalece sobre una respuesta GPS tardía', async () => {
    let locate!: PositionCallback
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn((success: PositionCallback) => { locate = success }) } })
    open()
    const user = userEvent.setup()
    await screen.findByText('Obteniendo tu ubicación…')
    await user.click(screen.getByRole('button', { name: 'Editar coordenadas manualmente' }))
    await user.type(screen.getByLabelText('Latitud'), '-16.8')
    await user.type(screen.getByLabelText('Longitud'), '-68.4')
    await act(async () => locate({ coords: { latitude: -16.5, longitude: -68.1, accuracy: 5 } } as GeolocationPosition))
    expect((screen.getByLabelText('Latitud') as HTMLInputElement).value).toBe('-16.8')
    await waitFor(() => expect(mocks.records.get('801:820')).toMatchObject({ draft: { latitud: -16.8, longitud: -68.4 } }))
  })

  it.each(['/participar?campania_id=800&subcampania_id=820', '/app/planting/subcampanias/820', '/app/planting/subcampanias/820?pestana=resumen'])('al conservar el borrador vuelve al detalle de origen: %s', async destination => {
    open({ participacionReturnTo: destination })
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Fotos del trabajo' })
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Conservar borrador y salir' }))
    expect(await screen.findByText(`Retorno: ${destination}`)).toBeTruthy()
    expect(RegistroParticipacionService.cancelar).not.toHaveBeenCalled()
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('vuelve al ámbito seleccionado después de confirmar el descarte de la preparación', async () => {
    open({ participacionReturnTo: '/participar?campania_id=800&subcampania_id=820' })
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Fotos del trabajo' })
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['jpeg-fake'], 'trabajo.jpg', { type: 'image/jpeg' }))
      await screen.findByText('Foto lista')
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar borrador y cerrar preparación' }))
    expect(await screen.findByText('Retorno: /participar?campania_id=800&subcampania_id=820')).toBeTruthy()
    expect(RegistroParticipacionService.cancelar).toHaveBeenCalledTimes(1)
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it.each([
    undefined,
    { participacionReturnTo: 'https://example.test/participar' },
    { participacionReturnTo: '/participar?campania_id=800&subcampania_id=820&extra=1' },
    { participacionReturnTo: '/participar?campania_id=0' },
  ])('sin retorno válido mantiene la salida al selector (%j)', async (state) => {
    open(state)
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Fotos del trabajo' })
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Conservar borrador y salir' }))
    expect(await screen.findByText('Retorno: /app/participacion/registrar')).toBeTruthy()
  })

  it('usa hoy del servidor, admite superar meta dentro de saldo y conserva datos al volver; sólo confirma al final', async () => {
    const origin = '/app/planting/subcampanias/820?pestana=resumen'
    const view = open({ participacionReturnTo: origin })
    const user = await fillToParticipants()
    expect(screen.getByText('Paso 3 de 3')).toBeTruthy()
    expect(screen.getByText('Responsable: Carlos Pérez (tu cuenta)')).toBeTruthy()
    await user.click(screen.getByRole('checkbox', { name: /Ana/ }))
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Volver y corregir especies/ }))
    expect((screen.getByLabelText('Fecha de plantación') as HTMLInputElement).value).toBe(today)
    expect((screen.getByLabelText('Observaciones (opcional)') as HTMLTextAreaElement).value).toBe('Se plantó junto al sendero')
    await user.clear(screen.getByLabelText('Cantidad de Queñua'))
    await user.type(screen.getByLabelText('Cantidad de Queñua'), '9')
    expect(screen.getByText(/La cantidad supera la meta orientativa/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Continuar a participantes' }))
    expect(screen.getByText('Queñua: 9')).toBeTruthy()
    expect(screen.getByText('Participante: Ana')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Confirmar plantación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirmar plantación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar y guardar plantación' }))
    await screen.findByRole('dialog', { name: 'Plantación registrada' })
    expect(RegistroParticipacionService.enviar).toHaveBeenCalledTimes(1)
    const attempt = vi.mocked(RegistroParticipacionService.enviar).mock.calls[0][0]
    const uploadedIdentity = vi.mocked(RegistroParticipacionService.subirCarga).mock.calls[0][0]
    expect(attempt.comando_id).toBe(uploadedIdentity.comando_id)
    expect(attempt.payload).toEqual({ comando_id: uploadedIdentity.comando_id, subcampania_id: '820', plan_revision_esperada: '9007199254740997', fecha_plantacion: today, latitud: -16.8, longitud: -68.4, especies: [{ planta_id: '9007199254740995', cantidad: 9 }], coresponsable_ids: ['802'], evidencia_ids: ['901'], observaciones: 'Se plantó junto al sendero', afiliaciones_declaradas: [] })
    expect(screen.getByText('9 plantas registradas')).toBeTruthy()
    expect(screen.queryByText('PLT-REAL-001')).toBeNull()
    expect(screen.queryByText('Responsable:')).toBeNull()
    view.unmount(); open({ participacionReturnTo: origin })
    await screen.findByRole('dialog', { name: 'Plantación registrada' })
    expect(RegistroParticipacionService.enviar).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Volver a la campaña' }))
    expect(await screen.findByText(`Retorno: ${origin}`)).toBeTruthy()
  })

  it('permite iniciar otra plantación sólo después del éxito confirmado', async () => {
    open()
    const user = await fillToParticipants()
    await user.click(screen.getByRole('button', { name: 'Confirmar plantación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar y guardar plantación' }))
    await screen.findByRole('dialog', { name: 'Plantación registrada' })
    await user.click(screen.getByRole('button', { name: 'Registrar otra plantación' }))
    await screen.findByRole('heading', { name: 'Fotos del trabajo' })
    expect(screen.queryByRole('dialog', { name: 'Plantación registrada' })).toBeNull()
    expect(RegistroParticipacionService.enviar).toHaveBeenCalledTimes(1)
  })

  it('sin origen de navegación vuelve al detalle de la misma subcampaña', async () => {
    open()
    const user = await fillToParticipants()
    await user.click(screen.getByRole('button', { name: 'Confirmar plantación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar y guardar plantación' }))
    await screen.findByRole('dialog', { name: 'Plantación registrada' })
    await user.click(screen.getByRole('button', { name: 'Volver a la campaña' }))
    expect(await screen.findByText('Retorno: /app/planting/subcampanias/820')).toBeTruthy()
  })

  it('cuenta plantas con más y menos sin usar la meta como límite', async () => {
    open()
    const user = await fillToParticipants()
    await user.click(screen.getByRole('button', { name: /Volver y corregir especies/ }))
    expect(screen.getByText('Propuesta frente a meta')).toBeTruthy()
    expect(screen.getByText(/Avance previo no disponible/)).toBeTruthy()
    expect(screen.getByLabelText('Avance de meta de Queñua').textContent).toBe('7 / 5')
    expect(screen.queryByText(/Plantado antes:/)).toBeNull()
    const quantity = screen.getByLabelText('Cantidad de Queñua') as HTMLInputElement
    const add = screen.getByRole('button', { name: 'Sumar 1 a Queñua' }) as HTMLButtonElement
    const subtract = screen.getByRole('button', { name: 'Restar 1 a Queñua' }) as HTMLButtonElement

    await user.clear(quantity)
    expect(subtract.disabled).toBe(true)
    await user.click(add)
    await user.click(add)
    expect(quantity.value).toBe('2')
    await user.click(subtract)
    await user.click(subtract)
    expect(quantity.value).toBe('')
    await waitFor(() => expect((mocks.records.get('801:820') as { draft: { especies: unknown[] } }).draft.especies).toEqual([]))

    await user.type(quantity, '16')
    expect(add.disabled).toBe(true)
    await user.click(subtract)
    expect(quantity.value).toBe('15')
    expect(screen.getByText(/La cantidad supera la meta orientativa/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Continuar a participantes' }))
    expect(screen.getByText('Queñua: 15')).toBeTruthy()
  })

  it('muestra el avance previo oficial y distingue la propuesta de lo ya plantado', async () => {
    vi.mocked(RegistroParticipacionService.contexto).mockImplementation(async (actorId) => {
      const data = context(actorId)
      data.especies[0] = { ...data.especies[0], cantidad_objetivo: 10, plantado_inicial: 4, pendiente_meta: 6 }
      return { data, observado_en: observed }
    })
    open()
    const user = await fillToParticipants()
    await user.click(screen.getByRole('button', { name: /Volver y corregir especies/ }))
    expect(screen.getByText('Plantado antes: 4')).toBeTruthy()
    expect(screen.getByText('Pendiente de meta: 6')).toBeTruthy()
    expect(screen.getByText('Avance si guardas')).toBeTruthy()
    expect(screen.getByLabelText('Avance de meta de Queñua').textContent).toBe('11 / 10')
    expect(screen.getByText(/El avance propuesto supera la meta orientativa/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Restar 1 a Queñua' }))
    expect(screen.getByLabelText('Avance de meta de Queñua').textContent).toBe('10 / 10')
    expect(screen.queryByText(/El avance propuesto supera la meta orientativa/)).toBeNull()
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('tras perder respuesta congela el payload y recarga recupera el mismo intento sin consultar contexto operativo', async () => {
    vi.mocked(RegistroParticipacionService.enviar).mockRejectedValue(new Error('La respuesta se perdió.'))
    const view = open()
    const user = await fillToParticipants()
    await user.click(screen.getByRole('button', { name: 'Confirmar plantación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar y guardar plantación' }))
    await screen.findByText('Guardado pendiente de confirmar')
    expect(screen.queryByLabelText('Cantidad de Queñua')).toBeNull()
    const original = vi.mocked(RegistroParticipacionService.enviar).mock.calls[0][0]
    const contextCalls = vi.mocked(RegistroParticipacionService.contexto).mock.calls.length
    view.unmount(); open()
    await screen.findByRole('dialog', { name: 'Plantación registrada' })
    expect(RegistroParticipacionService.recuperar).toHaveBeenLastCalledWith(expect.objectContaining({ comando_id: original.comando_id, payload: original.payload }), expect.any(AbortSignal))
    expect(RegistroParticipacionService.contexto).toHaveBeenCalledTimes(contextCalls)
    expect(RegistroParticipacionService.enviar).toHaveBeenCalledTimes(1)
  })

  it('explica una pausa del servidor y reintenta el mismo registro después de comprobarlo', async () => {
    const paused = 'El registro está pausado temporalmente. Conserve la misma clave.'
    vi.mocked(RegistroParticipacionService.enviar).mockRejectedValueOnce(new ParticipacionApiError(503, { codigo: 'RESULTADO_NO_DETERMINADO', mensaje: paused, campos: [], ambitos: [], reintento: 'MISMA_CLAVE' }))
    open()
    const user = await fillToParticipants()
    await user.click(screen.getByRole('button', { name: 'Confirmar plantación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar y guardar plantación' }))
    await screen.findByText(paused)
    expect(screen.queryByRole('dialog', { name: 'Plantación registrada' })).toBeNull()
    expect(screen.getByText(/«Comprobar guardado» solo consulta el estado/)).toBeTruthy()
    const original = vi.mocked(RegistroParticipacionService.enviar).mock.calls[0][0]
    vi.mocked(RegistroParticipacionService.recuperar).mockRejectedValue(new ParticipacionApiError(202, { codigo: 'COMANDO_NO_CONFIRMADO', mensaje: 'Todavía no hay resultado de guardado.', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' }))
    await user.click(screen.getByRole('button', { name: 'Comprobar guardado' }))
    await screen.findByText(/Aún no se confirmó si esta plantación se guardó/)
    expect(RegistroParticipacionService.enviar).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Reintentar envío' }))
    await screen.findByRole('dialog', { name: 'Plantación registrada' })
    expect(RegistroParticipacionService.recuperar).toHaveBeenCalledTimes(2)
    expect(vi.mocked(RegistroParticipacionService.enviar).mock.calls[1][0]).toEqual(original)
  })

  it('recarga durante captura conserva fotos, nombres seleccionados y revisión del plan hasta revisar otra vez', async () => {
    const view = open()
    const user = await fillToParticipants()
    await user.click(screen.getByRole('checkbox', { name: /Ana/ }))
    await waitFor(() => expect((mocks.records.get('801:820') as { draft: { participantes_ui?: { nombre: string }[] } }).draft.participantes_ui?.[0].nombre).toBe('Ana'))
    view.unmount()
    vi.mocked(RegistroParticipacionService.contexto).mockImplementation(async (actorId) => { const data = context(actorId); data.subcampania.plan_revision = '9007199254740998'; return { data, observado_en: observed } })
    vi.mocked(RegistroParticipacionService.participantes).mockResolvedValue({ data: [{ usuario_id: '803', nombre: 'Luis', organizacion: null }], observado_en: observed, siguiente_cursor: null })
    open()
    await screen.findByText('Participante: Ana')
    expect((screen.getByRole('button', { name: 'Confirmar plantación' }) as HTMLButtonElement).disabled).toBe(true)
    expect(RegistroParticipacionService.subirCarga).toHaveBeenCalledTimes(1)
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
    const preserved = mocks.records.get('801:820') as { draft: { plan_revision_revisada: string } }
    expect(preserved.draft.plan_revision_revisada).toBe('9007199254740997')
    await user.click(screen.getByRole('button', { name: /Volver y corregir especies/ }))
    expect((screen.getByLabelText('Cantidad de Queñua') as HTMLInputElement).value).toBe('7')
    await user.click(screen.getByRole('button', { name: 'Continuar a participantes' }))
    expect((screen.getByRole('button', { name: 'Confirmar plantación' }) as HTMLButtonElement).disabled).toBe(false)
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('distingue rechazo durable 503 del evaluador y no reduce cantidades cuando cambia el saldo', async () => {
    vi.mocked(RegistroParticipacionService.enviar).mockImplementation(async (identity) => ({ comando_id: identity.comando_id, operacion: 'REGISTRAR_PLANTACION_INICIAL', estado: 'RECHAZADO', resultado: null, finalizado_en: observed, error: { codigo: 'EVALUADOR_NO_DISPONIBLE', mensaje: 'No se pudo evaluar ubicación. No se guardó la plantación.', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' } }))
    open()
    const user = await fillToParticipants()
    await user.click(screen.getByRole('checkbox', { name: /Ana/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar plantación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar y guardar plantación' }))
    await screen.findByText('Plantación rechazada por el servidor')
    expect(screen.queryByText('Guardado pendiente de confirmar')).toBeNull()
    vi.mocked(RegistroParticipacionService.contexto).mockImplementation(async (actorId) => { const data = context(actorId); data.especies[0].saldo_elegible = 2; return { data, observado_en: observed } })
    await user.click(screen.getByRole('button', { name: 'Revisar borrador para una intención nueva' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Comenzar nueva revisión' }))
    await waitFor(() => expect((screen.getByLabelText('Cantidad de Queñua') as HTMLInputElement).value).toBe('7'))
    expect(screen.getByText(/Tu propuesta no se ha reducido/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Sumar 1 a Queñua' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Restar 1 a Queñua' }) as HTMLButtonElement).disabled).toBe(false)
    expect(RegistroParticipacionService.enviar).toHaveBeenCalledTimes(1)
    const stored = mocks.records.get('801:820') as { draft: { coresponsable_ids: string[]; plan_revision_revisada: string | null } }
    expect(stored.draft.coresponsable_ids).toEqual(['802'])
    expect(stored.draft.plan_revision_revisada).toBeNull()
  })

  it('GPS denegado permite coordenadas manuales y una foto inválida no se considera cargada', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn((_success: unknown, error: () => void) => error()) } })
    open()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Fotos del trabajo' })
    await screen.findByText(/No pudimos obtener tu ubicación/)
    await user.click(screen.getByRole('button', { name: /Editar coordenadas manualmente/ }))
    await user.type(screen.getByLabelText('Latitud'), '-16.5')
    await user.type(screen.getByLabelText('Longitud'), '-68.1')
    expect(screen.queryByText(/No pudimos obtener tu ubicación/)).toBeNull()
    const file = new File(['x'], 'grande.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 + 1 })
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file)
    expect(screen.getByText(/Los archivos fuera del límite no se agregaron/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText(/Añade al menos una foto y espera/)).toBeTruthy()
    expect(RegistroParticipacionService.subirCarga).not.toHaveBeenCalled()
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('normaliza GPS a seis decimales y exige corregir expresamente una coordenada manual de mayor precisión', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn((success: (position: { coords: { latitude: number; longitude: number; accuracy: number } }) => void) => success({ coords: { latitude: -16.5123456789, longitude: -68.1123456789, accuracy: 3 } })) } })
    open()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Fotos del trabajo' })
    await user.click(screen.getByRole('button', { name: /Editar coordenadas manualmente/ }))
    expect((screen.getByLabelText('Latitud') as HTMLInputElement).value).toBe('-16.512346')
    expect((screen.getByLabelText('Longitud') as HTMLInputElement).value).toBe('-68.112346')
    await user.clear(screen.getByLabelText('Latitud'))
    await user.type(screen.getByLabelText('Latitud'), '-16.1234567')
    expect(screen.getByText(/Usa como máximo 6 decimales/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText(/Indica una coordenada válida/)).toBeTruthy()
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('un rechazo real de la foto muestra su archivo y no confunde la miniatura local con carga válida', async () => {
    vi.mocked(RegistroParticipacionService.subirCarga).mockRejectedValue(new Error('La foto no pudo decodificarse.'))
    open()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Fotos del trabajo' })
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['bytes-no-validos'], 'fallida.jpg', { type: 'image/jpeg' }))
      await screen.findByText('Puedes continuar la captura')
    expect(screen.getByRole('img', { name: 'Foto 1 del trabajo' })).toBeTruthy()
    expect(screen.getAllByText('La foto no pudo decodificarse.').length).toBeGreaterThan(0)
    expect(screen.queryByText('Foto lista')).toBeNull()
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('otra cuenta no ve ni concilia el comando y las fotos conservados por el actor anterior', async () => {
    const view = open()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Fotos del trabajo' })
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['jpeg'], 'privada-del-actor.jpg', { type: 'image/jpeg' }))
    await screen.findByText('Foto lista')
    const original = mocks.records.get('801:820') as { comando_id: string }
    mocks.actorId = '804'
    vi.mocked(RegistroParticipacionService.contexto).mockRejectedValue(new Error('Esta cuenta no tiene contexto autorizado.'))
    view.rerender(<MemoryRouter initialEntries={['/registro/820']}><Routes><Route path="/registro/:subcampaniaId" element={<RegistrarParticipanteScreen />} /></Routes></MemoryRouter>)
    await screen.findByText('Esta cuenta no tiene contexto autorizado.')
    expect(screen.queryByRole('img', { name: 'Foto 1 del trabajo' })).toBeNull()
    expect(screen.queryByText(original.comando_id, { exact: false })).toBeNull()
    expect(RegistroParticipacionService.recuperar).not.toHaveBeenCalled()
    expect(mocks.records.has('801:820')).toBe(true)
  })

  it('participantes paginados conservan selección opcional y no multiplican cantidades', async () => {
    vi.mocked(RegistroParticipacionService.participantes).mockResolvedValueOnce({ data: [{ usuario_id: '802', nombre: 'Ana', organizacion: null }], observado_en: observed, siguiente_cursor: 'page2' }).mockResolvedValue({ data: [{ usuario_id: '803', nombre: 'Luis', organizacion: 'Otra comunidad' }], observado_en: observed, siguiente_cursor: null })
    open()
    const user = await fillToParticipants()
    await user.click(screen.getByRole('checkbox', { name: /Ana/ }))
    await user.click(screen.getByRole('button', { name: 'Siguiente página de participantes' }))
    await user.click(await screen.findByRole('checkbox', { name: /Luis/ }))
    expect(screen.getByText('Participante: Ana')).toBeTruthy()
    expect(screen.getByText('Participante: Luis')).toBeTruthy()
    expect(screen.getByText('Total: 7 plantas')).toBeTruthy()
    expect(RegistroParticipacionService.enviar).not.toHaveBeenCalled()
    expect(RegistroParticipacionService.participantes).toHaveBeenLastCalledWith('801', '820', expect.objectContaining({ cursor: 'page2' }), expect.any(AbortSignal))
  })

  it('salir o quitar una foto exige confirmación y no descarta ciegamente una preparación', async () => {
    open()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Fotos del trabajo' })
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['jpeg-fake'], 'trabajo.jpg', { type: 'image/jpeg' }))
      await screen.findByText('Foto lista')
    await user.click(screen.getByRole('button', { name: 'Quitar foto 1' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('img', { name: 'Foto 1 del trabajo' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Conservar borrador y salir' })).toBeTruthy()
    expect(RegistroParticipacionService.cancelar).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(RegistroParticipacionService.cancelar).not.toHaveBeenCalled()
  })
})
