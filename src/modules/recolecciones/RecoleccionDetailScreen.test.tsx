import { assigned, m1Fixture, m2Fixture, VIVERO_A, VIVERO_B } from '../accesos/test-fixtures'
import type { AccesoM2 } from '../accesos/types'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
  vi.spyOn(RecoleccionesService, 'getEvidenciasByRecoleccion').mockResolvedValue({ success: true, data: [] })
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
    expect(await screen.findByText('Material habilitado por recepción física conforme.')).toBeTruthy()
    expect(screen.getByText('Recepción física: conforme acreditada.')).toBeTruthy()
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
    expect(await screen.findByText('Material habilitado por recepción física conforme.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Registrar pérdida o descarte' })).toBeNull()
  })

  it('mantiene bloqueado el descarte si falta recepción conforme', async () => {
    auth.m2 = m2Fixture({ viveros: [assigned(VIVERO_A)] }).data
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({
      success: true,
      data: { ...validada, recepcion_conforme: false, recepcion: null, m2_estado_habilitacion: 'PENDIENTE_RECEPCION' },
    })
    render(<DetailRoute />)
    expect(await screen.findByText('Pendiente de recepción física conforme.')).toBeTruthy()
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
      expect(await screen.findByText('Recepción física: conforme acreditada.')).toBeTruthy()
      expect(Boolean(screen.queryByRole('button', { name: 'Registrar pérdida o descarte' }))).toBe(visible)
    },
  )
})
