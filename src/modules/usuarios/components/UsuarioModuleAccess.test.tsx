import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UsuarioModuleAccess from './UsuarioModuleAccess'
import { AccesosService } from '../../accesos/accesos.api'
import { ParticipacionApiError } from '../../participacion/api/participacion.transport'
import type { useModuleCommand } from '../../accesos/useModuleCommand'
import { assigned, m1Fixture, m2Fixture, OBSERVED, VIVERO_A, VIVERO_B } from '../../accesos/test-fixtures'
import type { AccesoM2 } from '../../accesos/types'

vi.mock('../../../hooks/useViveros', () => ({ useViveros: () => ({ viveros: [{ id: '9007199254740992', nombre: 'Sintético A', codigo: 'SA' }, { id: '9007199254740993', nombre: 'Sintético B', codigo: 'SB' }], loading: false, error: null }) }))
const confirm = vi.fn(), issue = vi.fn()
function command(): ReturnType<typeof useModuleCommand> { return { state: 'idle', busy: false, pending: null, receipt: null, error: null, confirm, recover: vi.fn(), retrySame: vi.fn(), resetTerminal: vi.fn() } }
function panel(domain: 'M1' | 'M2', usuarioId = '7') { return <UsuarioModuleAccess actorId="42" usuarioId={usuarioId} nombre={`Cuenta sintética ${usuarioId}`} domain={domain} locked={false} command={command()} onAccessIssue={issue} /> }
beforeEach(() => {
  confirm.mockReset().mockResolvedValue(undefined); issue.mockReset()
  vi.spyOn(AccesosService, 'm1').mockResolvedValue(m1Fixture())
  vi.spyOn(AccesosService, 'm2').mockResolvedValue(m2Fixture())
})

describe('secciones M1 y M2 en la cuenta seleccionada', () => {
  it('relee M1 antes de confirmar, usa su revisión y cancelar no escribe', async () => {
    vi.mocked(AccesosService.m1).mockResolvedValueOnce(m1Fixture()).mockResolvedValue(m1Fixture({ revision_acceso: '9007199254740993', revision_autoridad: '82' }))
    render(panel('M1'))
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Otorgar Recolección' }))
    await user.type(screen.getByLabelText('Motivo de M1'), 'Habilitación sintética M1')
    await user.click(screen.getByRole('button', { name: 'Otorgar acceso' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(confirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Otorgar acceso' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar M1' }))
    expect(confirm).toHaveBeenCalledWith({ usuario_id: '7', otorgar: true, revision_esperada: '9007199254740993', motivo: 'Habilitación sintética M1' })
    expect(AccesosService.m2).not.toHaveBeenCalled()
  })
  it('M2 selecciona B sin confundirlo con A, y confirma sólo ese vivero', async () => {
    vi.mocked(AccesosService.m2).mockResolvedValue(m2Fixture({ viveros: [assigned(VIVERO_A)] }))
    render(panel('M2')); const user = userEvent.setup()
    await user.selectOptions(await screen.findByLabelText('Vivero a asignar'), VIVERO_B)
    expect((screen.getByLabelText('Vivero a asignar') as HTMLSelectElement).value).toBe(VIVERO_B)
    await user.click(screen.getByRole('button', { name: 'Asignar vivero' }))
    await user.type(screen.getByLabelText('Motivo de M2'), 'Operación sintética B')
    await user.click(screen.getByRole('button', { name: 'Otorgar acceso' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain(VIVERO_B)
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar M2' }))
    expect(confirm).toHaveBeenCalledWith({ usuario_id: '7', otorgar: true, vivero_id: VIVERO_B, revision_esperada: '9007199254740993', motivo: 'Operación sintética B' })
    expect(AccesosService.m1).not.toHaveBeenCalled()
  })
  it.each([{ rol_global: 'ADMIN' as const, activo: true }, { rol_global: 'VOLUNTARIO' as const, activo: true }, { rol_global: 'GENERAL' as const, activo: false }])('permite retirar vigencias conservadas pero no otorgar a $rol_global activo=$activo', async overrides => {
    vi.mocked(AccesosService.m2).mockResolvedValue(m2Fixture({ ...overrides, viveros: [{ ...assigned(), acceso_efectivo: false }] }))
    render(panel('M2'))
    expect((await screen.findByRole('button', { name: 'Retirar Sintético A' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Asignar vivero' }) as HTMLButtonElement).disabled).toBe(true)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Retirar Sintético A' }))
    await user.type(screen.getByLabelText('Motivo de M2'), 'Retiro de vigencia conservada')
    await user.click(screen.getByRole('button', { name: 'Retirar acceso' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar M2' }))
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ otorgar: false, vivero_id: VIVERO_A }))
  })
  it('ADMIN deriva acceso global sin inventar asignaciones', async () => {
    vi.mocked(AccesosService.m2).mockResolvedValue(m2Fixture({ rol_global: 'ADMIN', alcance_global: true }))
    render(panel('M2'))
    expect(await screen.findByText(/ADMIN tiene acceso global/)).toBeTruthy()
    expect(screen.getByText(/Sin viveros asignados explícitamente/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Asignar vivero' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('pagina el historial explícitamente y conserva los motivos de ambos cortes', async () => {
    const history = (id: string, motivo: string): AccesoM2['historial'][number] => ({ id, vivero_id: VIVERO_A, evento: 'ACCESO_OTORGADO', acceso_id: '11', actor_id: '42', revision_anterior: '0', revision_nueva: '1', motivo, creado_en: OBSERVED, comando_id: '4ff8f9bb-4280-463d-95c8-97a3f11f122c', otorgado_en: OBSERVED, revocado_en: null })
    vi.mocked(AccesosService.m2).mockResolvedValueOnce(m2Fixture({ historial: [history('10', 'Primer motivo sintético')], siguiente_antes_de_id: '10' })).mockResolvedValueOnce(m2Fixture({ historial: [history('8', 'Segundo motivo sintético')] }))
    render(panel('M2')); const user = userEvent.setup()
    await user.click(await screen.findByText('Historial auditable de M2'))
    await user.click(screen.getByRole('button', { name: 'Cargar más historial de M2' }))
    await screen.findByText('Segundo motivo sintético')
    expect(screen.getByText('Primer motivo sintético')).toBeTruthy()
    expect(AccesosService.m2).toHaveBeenLastCalledWith('42', '7', '10', expect.any(AbortSignal))
  })
  it.each([401, 403])('un %s bloquea mediante el contenedor sin convertirlo en acceso vacío', async status => {
    vi.mocked(AccesosService.m1).mockRejectedValue(new ParticipacionApiError(status, { codigo: 'CAPACIDAD_INSUFICIENTE', mensaje: 'Lectura sintética denegada', campos: [], ambitos: [], reintento: 'NO_APLICA' }))
    render(panel('M1'))
    expect((await screen.findByRole('alert')).textContent).toContain('denegada')
    expect(issue).toHaveBeenCalledWith({ status, message: 'Lectura sintética denegada' })
    expect(screen.queryByRole('button', { name: 'Otorgar Recolección' })).toBeNull()
  })
  it('cambiar la cuenta seleccionada descarta lecturas tardías y motivos anteriores', async () => {
    let resolve!: (value: ReturnType<typeof m1Fixture>) => void
    vi.mocked(AccesosService.m1).mockReturnValueOnce(new Promise(done => { resolve = done })).mockResolvedValue(m1Fixture({ usuario_id: '8' }))
    const view = render(panel('M1'))
    view.rerender(panel('M1', '8'))
    await screen.findByRole('button', { name: 'Otorgar Recolección' })
    await act(async () => resolve(m1Fixture({ acceso_explicito: true })))
    expect(screen.queryByRole('button', { name: 'Retirar Recolección' })).toBeNull()
    expect(vi.mocked(AccesosService.m1).mock.calls[0][3]?.aborted).toBe(true)
  })
  it('la revisión no envía hasta confirmar el diálogo', async () => {
    render(panel('M1'))
    await screen.findByRole('button', { name: 'Otorgar Recolección' })
    fireEvent.click(screen.getByRole('button', { name: 'Otorgar Recolección' }))
    fireEvent.change(screen.getByLabelText('Motivo de M1'), { target: { value: 'Motivo sintético' } })
    fireEvent.click(screen.getByRole('button', { name: 'Otorgar acceso' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    expect(confirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar M1' }))
    expect(confirm).toHaveBeenCalledTimes(1)
  })
})
