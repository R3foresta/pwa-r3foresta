import { assigned, m1Fixture, m2Fixture, VIVERO_A, VIVERO_B } from '../accesos/test-fixtures'
import type { AccesoM2 } from '../accesos/types'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoleccionesService, RecoleccionRequestError, type Recoleccion } from '../../services/recolecciones.service'
import RecoleccionDetailScreen from './RecoleccionDetailScreen'

const auth = vi.hoisted(() => ({ user: { id: '7', rol: 'GENERAL' } as { id: string; rol: string } | null, m2: null as AccesoM2 | null }))
vi.mock('../accesos/capabilitiesContext', () => ({ useOperationalAccess: () => ({ m1: { status: 'ready', data: m1Fixture({ origen: auth.user?.rol === 'ADMIN' ? 'ADMIN' : 'EXPLICITO', acceso_efectivo: auth.user?.rol !== 'VOLUNTARIO', capacidades: { crear: true, mantener_propias: auth.user?.rol !== 'VOLUNTARIO', confirmar_propias: false, desechar: false } }).data }, m2: { status: 'ready', data: auth.m2 } }) }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }))

const draft: Recoleccion = {
  id: 292,
  fecha: '2026-11-03T12:00:00.000Z',
  nombre_cientifico: 'Jacaranda mimosifolia',
  nombre_comercial: 'Jacarandá',
  tipo_material: 'SEMILLA',
  especie_nueva: false,
  observaciones: null,
  usuario_id: 7,
  vivero_id: null,
  metodo_id: 1,
  planta_id: 2,
  created_at: '2026-11-03T12:00:00.000Z',
  codigo_trazabilidad: 'REC-292',
  blockchain_url: null,
  token_id: null,
  transaction_hash: null,
  estado_registro: 'BORRADOR',
  unidad_canonica: 'G',
  cantidad_inicial_canonica: 100,
  saldo_actual: 100,
  estado_operativo: 'ABIERTO',
}

const confirmation = {
  success: true as const,
  data: { recoleccion_id: 292, eliminado_en: '2026-11-03T18:30:00.000Z', eliminado_por_usuario_id: 7 },
}

function DetailRoute() {
  return <MemoryRouter initialEntries={['/app/collections/292']}>
    <Routes>
      <Route path="/app/collections/:id" element={<RecoleccionDetailScreen />} />
      <Route path="/app/collections/new" element={<p>Formulario para revisar y guardar la ficha</p>} />
      <Route path="/app/collections" element={<p>Listado de recolecciones actualizado</p>} />
    </Routes>
  </MemoryRouter>
}

beforeEach(() => {
  auth.user = { id: '7', rol: 'GENERAL' }
  auth.m2 = null
  vi.spyOn(RecoleccionesService, 'getById').mockResolvedValue({ success: true, data: draft })
  vi.spyOn(RecoleccionesService, 'deleteDraft').mockResolvedValue(confirmation)
  vi.spyOn(RecoleccionesService, 'submit')
})

describe('eliminar borrador desde el detalle de Recolección', () => {
  it.each([
    ['GENERAL', '7', 'BORRADOR', true],
    ['VALIDADOR', '7', 'BORRADOR', true],
    ['ADMIN', '99', 'BORRADOR', true],
    ['GENERAL', '99', 'BORRADOR', false],
    ['VALIDADOR', '99', 'BORRADOR', false],
    ['VOLUNTARIO', '7', 'BORRADOR', false],
    ['ADMIN', '99', 'RECHAZADO', false],
    ['GENERAL', '7', 'PENDIENTE_VALIDACION', false],
    ['ADMIN', '99', 'VALIDADO', false],
    ['ADMIN', '99', null, false],
  ])('permiso %s, usuario %s, estado %s: visible=%s', async (rol, id, estado, visible) => {
    auth.user = { id, rol }
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({ success: true, data: { ...draft, estado_registro: estado } })
    render(<DetailRoute />)
    await screen.findByRole('heading', { name: 'Detalle de Recolección' })
    expect(Boolean(screen.queryByRole('button', { name: 'Eliminar borrador' }))).toBe(visible)
    expect(RecoleccionesService.deleteDraft).not.toHaveBeenCalled()
  })

  it('muestra el código y la consecuencia; cancelar no realiza ninguna escritura', async () => {
    const user = userEvent.setup()
    render(<DetailRoute />)
    await user.click(await screen.findByRole('button', { name: 'Eliminar borrador' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar borrador de recolección' })
    expect(within(dialog).getByText(/REC-292 · Guardada sin enviar/)).toBeTruthy()
    expect(within(dialog).getByText(/Se conservarán la ficha, las fotos y el historial/)).toBeTruthy()
    expect(RecoleccionesService.deleteDraft).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(RecoleccionesService.deleteDraft).not.toHaveBeenCalled()
  })

  it('evita envíos duplicados y acciones simultáneas; muestra éxito solo tras confirmación y vuelve al listado', async () => {
    const user = userEvent.setup()
    let complete!: (value: typeof confirmation) => void
    vi.mocked(RecoleccionesService.deleteDraft).mockReturnValue(new Promise(resolve => { complete = resolve }))
    render(<DetailRoute />)
    await user.click(await screen.findByRole('button', { name: 'Eliminar borrador' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar eliminación' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(RecoleccionesService.deleteDraft).toHaveBeenCalledExactlyOnceWith(292)
    expect(screen.getByRole('button', { name: 'Revisar y enviar' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Enviar a recepción' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveProperty('disabled', true)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Eliminar borrador de recolección' })).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Borrador eliminado' })).toBeNull()
    await act(async () => { complete(confirmation) })
    expect(screen.getByRole('dialog', { name: 'Borrador eliminado' })).toBeTruthy()
    expect(RecoleccionesService.getById).toHaveBeenCalledTimes(1)
    expect(RecoleccionesService.submit).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Volver a recolecciones' }))
    expect(screen.getByText('Listado de recolecciones actualizado')).toBeTruthy()
  })

  it.each([
    new RecoleccionRequestError('No tienes permiso para eliminar esta recolección.', 403),
    new RecoleccionRequestError('El registro ya no está en BORRADOR.', 409),
    new TypeError('Failed to fetch'),
  ])('conserva el detalle y exige releer tras el error $message', async (error) => {
    const user = userEvent.setup()
    vi.mocked(RecoleccionesService.deleteDraft).mockRejectedValueOnce(error)
    render(<DetailRoute />)
    await user.click(await screen.findByRole('button', { name: 'Eliminar borrador' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining(error.message))
    expect(screen.queryByRole('dialog', { name: 'Borrador eliminado' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Eliminar borrador' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Enviar a recepción' })).toHaveProperty('disabled', true)
    vi.mocked(RecoleccionesService.getById).mockResolvedValueOnce({ success: true, data: { ...draft, estado_registro: 'PENDIENTE_VALIDACION' } })
    await user.click(screen.getByRole('button', { name: 'Actualizar detalle' }))
    await waitFor(() => expect(RecoleccionesService.getById).toHaveBeenCalledTimes(2))
    await screen.findByRole('heading', { name: 'Detalle de Recolección' })
    expect(screen.queryByRole('button', { name: 'Eliminar borrador' })).toBeNull()
    expect(RecoleccionesService.deleteDraft).toHaveBeenCalledTimes(1)
  })

  it('permite otra confirmación solo después de releer un BORRADOR disponible', async () => {
    const user = userEvent.setup()
    vi.mocked(RecoleccionesService.deleteDraft).mockRejectedValueOnce(new TypeError('Sin conexión'))
    render(<DetailRoute />)
    await user.click(await screen.findByRole('button', { name: 'Eliminar borrador' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    await user.click(await screen.findByRole('button', { name: 'Actualizar detalle' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar borrador' }))
    expect(RecoleccionesService.getById).toHaveBeenCalledTimes(2)
    expect(RecoleccionesService.deleteDraft).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    expect(await screen.findByRole('dialog', { name: 'Borrador eliminado' })).toBeTruthy()
    expect(RecoleccionesService.deleteDraft).toHaveBeenCalledTimes(2)
  })

  it('un 404 y su relectura no acreditan una eliminación propia', async () => {
    const user = userEvent.setup()
    const notFound = new RecoleccionRequestError('Recolección inexistente o ya eliminada.', 404)
    vi.mocked(RecoleccionesService.deleteDraft).mockRejectedValueOnce(notFound)
    render(<DetailRoute />)
    await user.click(await screen.findByRole('button', { name: 'Eliminar borrador' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    vi.mocked(RecoleccionesService.getById).mockRejectedValueOnce(notFound)
    await user.click(await screen.findByRole('button', { name: 'Actualizar detalle' }))
    expect(await screen.findByText('No se pudo cargar la recolección')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Borrador eliminado' })).toBeNull()
    expect(RecoleccionesService.deleteDraft).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Volver al listado' }))
    expect(screen.getByText('Listado de recolecciones actualizado')).toBeTruthy()
  })

  it('descarta una confirmación tardía al cambiar de cuenta', async () => {
    const user = userEvent.setup()
    let complete!: (value: typeof confirmation) => void
    vi.mocked(RecoleccionesService.deleteDraft).mockReturnValue(new Promise(resolve => { complete = resolve }))
    const view = render(<DetailRoute />)
    await user.click(await screen.findByRole('button', { name: 'Eliminar borrador' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    auth.user = { id: '99', rol: 'GENERAL' }
    view.rerender(<DetailRoute />)
    await act(async () => { complete(confirmation) })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eliminar borrador' })).toBeNull()
  })
})

describe('contexto operativo de los estados de Recolección', () => {
  it('revisar una ficha guardada abre su edición sin enviar ni eliminar', async () => {
    const user = userEvent.setup()
    render(<DetailRoute />)
    await user.click(await screen.findByRole('button', { name: 'Revisar y enviar' }))
    expect(screen.getByText('Formulario para revisar y guardar la ficha')).toBeTruthy()
    expect(RecoleccionesService.submit).not.toHaveBeenCalled()
    expect(RecoleccionesService.deleteDraft).not.toHaveBeenCalled()
  })

  it('explica el rechazo y permite corregir sin ofrecer reenvío antes de guardar', async () => {
    const user = userEvent.setup()
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({
      success: true,
      data: { ...draft, estado_registro: 'RECHAZADO', motivo_rechazo: 'La cantidad no coincide con el material recibido.' },
    })
    render(<DetailRoute />)
    expect(await screen.findByText('La cantidad no coincide con el material recibido.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Enviar a recepción' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Corregir recolección' }))
    expect(screen.getByText('Formulario para revisar y guardar la ficha')).toBeTruthy()
    expect(RecoleccionesService.submit).not.toHaveBeenCalled()
  })
})

describe('habilitación de Vivero en el detalle de Recolección', () => {
  const validada: Recoleccion = {
    ...draft,
    estado_registro: 'VALIDADO',
    vivero_id: VIVERO_A,
    recepcion_conforme: true,
    m2_estado_habilitacion: 'RECEPCION_CONFORME',
    recepcion: { id: '10', fecha_recepcion: '2026-11-04', recibido_por: '9007199254740993', registrado_en: '2026-11-04T18:00:00Z' },
  }

  it('muestra recepción física y permite el descarte en la custodia autorizada', async () => {
    const user = userEvent.setup()
    auth.m2 = m2Fixture({ viveros: [assigned(VIVERO_A)] }).data
    vi.mocked(RecoleccionesService.getById)
      .mockResolvedValueOnce({ success: true, data: validada })
      .mockResolvedValueOnce({ success: true, data: { ...validada, saldo_actual: 75 } })
    const descarte = vi.spyOn(RecoleccionesService, 'registrarDesecho').mockResolvedValue({
      success: true,
      data: {
        message: 'Descarte confirmado.',
        recoleccion_movimiento_id: 31,
        recoleccion_id: 292,
        cantidad_desechada: 25,
        unidad_medida: 'G',
        saldo_antes: 100,
        saldo_despues: 75,
        estado_operativo: 'ABIERTO',
      },
    })
    render(<DetailRoute />)
    expect(await screen.findByText('Recibida en vivero')).toBeTruthy()
    expect(screen.queryByText('Consumo y desecho requieren recepción conforme.')).toBeNull()
    expect(screen.getByText('Usuario 9007199254740993')).toBeTruthy()
    expect(screen.queryByText(/aprobación documental/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Registrar pérdida o descarte' }))
    const cantidad = screen.getByRole('spinbutton', { name: /cantidad a desechar/i })
    await user.clear(cantidad)
    await user.type(cantidad, '25')
    await user.click(screen.getByRole('button', { name: 'Confirmar descarte' }))
    expect(await screen.findByText('Descarte confirmado.')).toBeTruthy()
    expect(descarte).toHaveBeenCalledExactlyOnceWith(292, { cantidad: 25 })
    descarte.mockRestore()
  })

  it('muestra la habilitación sin ofrecer descarte a un operador de otra custodia', async () => {
    auth.m2 = m2Fixture({ viveros: [assigned(VIVERO_B)] }).data
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({ success: true, data: validada })
    render(<DetailRoute />)
    expect(await screen.findByText('Recibida en vivero')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Registrar pérdida o descarte' })).toBeNull()
  })

  it('mantiene bloqueado el descarte si falta recepción conforme', async () => {
    auth.m2 = m2Fixture({ viveros: [assigned(VIVERO_A)] }).data
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({
      success: true,
      data: { ...validada, recepcion_conforme: false, recepcion: null, m2_estado_habilitacion: 'PENDIENTE_RECEPCION' },
    })
    render(<DetailRoute />)
    expect(await screen.findByText('Consumo y desecho requieren recepción conforme.')).toBeTruthy()
    expect(screen.getByText('Recepción no acreditada')).toBeTruthy()
    expect(screen.queryByText('Recibida en vivero')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar pérdida o descarte' })).toBeNull()
  })

  it('conserva la recepción al agotarse el origen sin ofrecer edición ni descarte', async () => {
    auth.m2 = m2Fixture({ viveros: [assigned(VIVERO_A)] }).data
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({
      success: true,
      data: { ...validada, saldo_actual: 0, estado_operativo: 'CERRADO' },
    })
    render(<DetailRoute />)
    expect(await screen.findByText('Recibida en vivero')).toBeTruthy()
    expect(screen.getByText('Sin saldo en origen')).toBeTruthy()
    expect(screen.getByText(/Sus lotes de vivero pueden continuar su proceso/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Revisar y enviar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Enviar a recepción' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar pérdida o descarte' })).toBeNull()
  })

  it.each([[undefined, true], [null, false]] as const)(
    'con recepción T4, distingue la ausencia del campo de su valor explícito %s',
    async (estado, visible) => {
      auth.m2 = m2Fixture({ viveros: [assigned(VIVERO_A)] }).data
      vi.mocked(RecoleccionesService.getById).mockResolvedValue({
        success: true,
        data: { ...validada, recepcion_conforme: true, m2_estado_habilitacion: estado },
      })
      render(<DetailRoute />)
      expect(await screen.findByText('Recibida en vivero')).toBeTruthy()
      expect(Boolean(screen.queryByRole('button', { name: 'Registrar pérdida o descarte' }))).toBe(visible)
    },
  )
})

describe('consulta del detalle canónico', () => {
  it('usa una sola lectura, conserva snapshots y permite ampliar las evidencias incluidas', async () => {
    vi.mocked(RecoleccionesService.getById).mockRestore()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: {
      ...draft,
      planta: { nombre_comun_principal: 'Nombre cambiado en catálogo', nombre_cientifico: 'Nombre científico nuevo' },
      nombre_recolector_snapshot: 'Recolector histórico',
      usuario: { id: 7, nombre: 'Nombre actual del recolector' },
      evidencias: [{ id: 1, titulo: 'Foto de origen', public_url: 'https://example.test/origen.jpg', mime_type: 'image/jpeg', tamano_bytes: 2048, creado_en: '2026-11-03T12:00:00Z' }],
    } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<DetailRoute />)
    await screen.findByRole('heading', { name: 'Detalle de Recolección' })
    expect(screen.getByText('Jacarandá')).toBeTruthy()
    expect(screen.getByText('Jacaranda mimosifolia')).toBeTruthy()
    expect(screen.queryByText('Nombre cambiado en catálogo')).toBeNull()
    expect(screen.getByText('Recolector histórico')).toBeTruthy()
    expect(screen.queryByText('Nombre actual del recolector')).toBeNull()
    expect(screen.getByRole('link', { name: 'Ampliar Foto de origen' })).toHaveProperty('href', 'https://example.test/origen.jpg')
    expect(screen.getByText('2 KB')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/recolecciones/292'), expect.objectContaining({ method: 'GET' }))
    fireEvent.error(screen.getByRole('img', { name: 'Foto de origen' }))
    expect(screen.getByText('No se pudo cargar la foto.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Detalle de Recolección' })).toBeTruthy()
  })

  it('un saldo o estado ausentes no se convierten en cero, cierre ni permiso de edición', async () => {
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({ success: true, data: { ...draft, saldo_actual: null, cantidad_inicial_canonica: null, estado_operativo: null, estado_registro: null } })
    render(<DetailRoute />)
    await screen.findByRole('heading', { name: 'Detalle de Recolección' })
    expect(screen.getByText('Saldo en origen').nextElementSibling?.textContent).toBe('No disponible')
    expect(screen.queryByText('Sin saldo en origen')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Revisar y enviar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Enviar a recepción' })).toBeNull()
  })

  it.each([['7', false], ['99', true]])('ADMIN %s solo abre la recepción operativa ajena: %s', async (id, visible) => {
    auth.user = { id, rol: 'ADMIN' }
    auth.m2 = m2Fixture({ rol_global: 'ADMIN', capacidades_globales: { administrar: true, operar_cualquier_vivero: true, recibir_y_validar_cualquier_vivero: true, desechar_semillas_cualquier_vivero: true } }).data
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({ success: true, data: {
      ...draft, estado_registro: 'VALIDADO', vivero_id: VIVERO_A, recepcion_conforme: true,
      recepcion: { id: '1', fecha_recepcion: '2026-11-04', recibido_por: '9', registrado_en: '2026-11-04T18:00:00Z' },
    } })
    render(<DetailRoute />)
    await screen.findByRole('heading', { name: 'Detalle de Recolección' })
    expect(Boolean(screen.queryByRole('button', { name: 'Consultar recepción' }))).toBe(visible)
    expect(screen.getByText('Usuario 9')).toBeTruthy()
  })

  it('descarta una ficha tardía al cambiar de cuenta y token', async () => {
    let finish!: (value: { success: boolean; data: Recoleccion }) => void
    vi.mocked(RecoleccionesService.getById)
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      .mockResolvedValueOnce({ success: true, data: { ...draft, nombre_comercial: 'Ficha de cuenta nueva' } })
    const view = render(<DetailRoute />)
    auth.user = { id: '99', rol: 'GENERAL' }
    localStorage.setItem('authToken', 'otra-sesion')
    view.rerender(<DetailRoute />)
    await screen.findByText('Ficha de cuenta nueva')
    await act(async () => finish({ success: true, data: draft }))
    expect(screen.queryByText('Jacarandá')).toBeNull()
    expect(screen.getByText('Ficha de cuenta nueva')).toBeTruthy()
  })

  it('descarta también las respuestas al cambiar de ficha sin cambiar la cuenta', async () => {
    let finish!: (value: { success: boolean; data: Recoleccion }) => void
    vi.mocked(RecoleccionesService.getById)
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      .mockResolvedValueOnce({ success: true, data: { ...draft, id: 293, nombre_comercial: 'Otra ficha' } })
    render(<MemoryRouter initialEntries={['/app/collections/292']}>
      <Link to="/app/collections/293">Abrir otra ficha</Link>
      <Routes><Route path="/app/collections/:id" element={<RecoleccionDetailScreen />} /></Routes>
    </MemoryRouter>)
    fireEvent.click(screen.getByRole('link', { name: 'Abrir otra ficha' }))
    await screen.findByText('Otra ficha')
    await act(async () => finish({ success: true, data: draft }))
    expect(screen.queryByText('Jacarandá')).toBeNull()
  })
})

describe('confirmación y recuperación de acciones del detalle', () => {
  it('confirmar el envío es explícito; cancelar no escribe y un doble clic envía una sola vez', async () => {
    const user = userEvent.setup()
    let finish!: (value: { success: boolean; data: Recoleccion }) => void
    vi.mocked(RecoleccionesService.submit).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    render(<DetailRoute />)
    await user.click(await screen.findByRole('button', { name: 'Enviar a recepción' }))
    const dialog = screen.getByRole('dialog', { name: 'Enviar recolección a recepción' })
    expect(RecoleccionesService.submit).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(RecoleccionesService.submit).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Enviar a recepción' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar envío' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(RecoleccionesService.submit).toHaveBeenCalledExactlyOnceWith(292)
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({ success: true, data: { ...draft, estado_registro: 'PENDIENTE_VALIDACION' } })
    await act(async () => finish({ success: true, data: draft }))
    expect(await screen.findByRole('dialog', { name: 'Envío exitoso' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('button', { name: 'Enviar a recepción' })).toBeNull()
    expect(screen.getByText('Pendiente de recepción')).toBeTruthy()
  })

  it('no ofrece repetir un envío confirmado aunque falle la actualización de la ficha', async () => {
    const user = userEvent.setup()
    vi.mocked(RecoleccionesService.submit).mockResolvedValue({ success: true, data: { ...draft, estado_registro: 'PENDIENTE_VALIDACION' } })
    render(<DetailRoute />)
    await user.click(await screen.findByRole('button', { name: 'Enviar a recepción' }))
    vi.mocked(RecoleccionesService.getById).mockRejectedValueOnce(new Error('Sin conexión al actualizar'))
    await user.click(screen.getByRole('button', { name: 'Confirmar envío' }))
    const dialog = await screen.findByRole('dialog', { name: 'Envío exitoso' })
    expect(within(dialog).getByRole('alert').textContent).toContain('Envío confirmado')
    expect(screen.getByRole('button', { name: 'Enviar a recepción' })).toHaveProperty('disabled', true)
    await user.click(screen.getByRole('button', { name: 'Entendido' }))
    await screen.findByRole('heading', { name: 'Detalle de Recolección' })
    expect(RecoleccionesService.submit).toHaveBeenCalledTimes(1)
    expect(RecoleccionesService.getById).toHaveBeenCalledTimes(3)
  })

  it('un descarte incierto exige una lectura correcta antes de habilitar otra confirmación', async () => {
    const user = userEvent.setup()
    auth.m2 = m2Fixture({ viveros: [assigned(VIVERO_A)] }).data
    const received = { ...draft, estado_registro: 'VALIDADO', vivero_id: VIVERO_A, recepcion_conforme: true }
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({ success: true, data: received })
    const discard = vi.spyOn(RecoleccionesService, 'registrarDesecho').mockRejectedValue(new Error('Respuesta perdida'))
    render(<DetailRoute />)
    await user.click(await screen.findByRole('button', { name: 'Registrar pérdida o descarte' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar descarte' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Respuesta perdida'))
    expect(screen.getByRole('button', { name: 'Registrar pérdida o descarte' })).toHaveProperty('disabled', true)
    vi.mocked(RecoleccionesService.getById).mockRejectedValueOnce(new Error('Lectura fallida'))
    await user.click(screen.getByRole('button', { name: 'Actualizar detalle' }))
    await screen.findByText('No se pudo cargar la recolección')
    expect(screen.queryByRole('button', { name: 'Registrar pérdida o descarte' })).toBeNull()
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({ success: true, data: { ...received, saldo_actual: 75 } })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    const next = await screen.findByRole('button', { name: 'Registrar pérdida o descarte' })
    expect(next).toHaveProperty('disabled', false)
    await user.click(next)
    expect(screen.getByRole('spinbutton', { name: /cantidad a desechar/i })).toHaveProperty('value', '75')
    expect(discard).toHaveBeenCalledTimes(1)
  })
})
