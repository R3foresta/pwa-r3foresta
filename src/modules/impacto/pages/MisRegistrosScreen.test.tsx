import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImpactoService } from '../api/impacto.api'
import type { MisRegistro, MisRegistros } from '../types'
import MisRegistrosScreen from './MisRegistrosScreen'

const auth = vi.hoisted(() => ({ user: { id: '42', auth_id: 'ana' } as { id: string; auth_id: string } | null, isAuthenticated: true, login: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../api/impacto.api', () => ({ ImpactoService: { misRegistros: vi.fn() } }))
const request = vi.mocked(ImpactoService.misRegistros)
function record(id = '22', relations: MisRegistro['relaciones'] = ['AUTOR']): MisRegistro {
  return { id, subcampania_id: '9', fecha_plantacion: '2026-10-17', codigo_trazabilidad: `Grupo ${id}`, cantidad_total_plantada: 30, es_reposicion: false, relaciones: relations, url_publica: `/api/v1/impact/registros/${id}`, url_detalle_propio: `/api/v1/plantaciones/${id}/detalle-propio` }
}
const page = (records: MisRegistro[] = [], cursor: string | null = null) => ({ data: { registros: records, siguiente_cursor: cursor } })
const tree = () => <MemoryRouter><MisRegistrosScreen /></MemoryRouter>
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('authToken', 'ana-token')
  auth.user = { id: '42', auth_id: 'ana' }
  auth.isAuthenticated = true
  request.mockReset()
})
describe('Mis registros por relación histórica', () => {
  it('deduplica páginas y distingue autor y participante sin repartir cantidades', async () => {
    request.mockResolvedValueOnce(page([record('22'), record('21', ['PARTICIPANTE'])], '21')).mockResolvedValueOnce(page([record('22', ['PARTICIPANTE']), record('20', ['PARTICIPANTE'])]))
    render(tree())
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más registros' }))
    await screen.findByText('Grupo 20')
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getAllByText('Registré')).toHaveLength(1)
    expect(screen.getAllByText('Participé')).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Ver mi registro guardado' }).getAttribute('href')).toBe('/app/participacion/registros/22')
    expect(screen.getAllByRole('link', { name: 'Ver registro público' }).map(link => link.getAttribute('href'))).toEqual(['/impacto/registros/22', '/impacto/registros/21', '/impacto/registros/20'])
    expect(request).toHaveBeenLastCalledWith({ limite: 20, cursor: '21' }, expect.any(AbortSignal))
    expect(screen.queryByText(/90 plantas/)).toBeNull()
  })
  it('permite lectura histórica no pública sin atribuir acceso operativo', async () => {
    request.mockResolvedValueOnce(page([{ ...record('22', ['PARTICIPANTE']), url_publica: null }]))
    render(tree())
    expect((await screen.findByRole('link', { name: 'Ver registro histórico permitido' })).getAttribute('href')).toBe('/app/participacion/registros/22')
    expect(screen.queryByRole('link', { name: /Registrar plantación/ })).toBeNull()
  })
  it.each([401, 403])('distingue error y vacío confirmado, y ofrece recuperar %s sin exponer filas anteriores', async (status) => {
    request.mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce(page([record()])).mockRejectedValueOnce(Object.assign(new Error('Sesión no disponible'), { status }))
    render(tree())
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar consulta' }))
    expect(screen.queryByText(/Todavía no hay registros/)).toBeNull()
    await screen.findByText('Grupo 22')
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar mis registros' }))
    await screen.findByRole('button', { name: 'Recuperar sesión' })
    expect(screen.queryByText('Grupo 22')).toBeNull()
    expect(screen.queryByText(/Todavía no hay registros/)).toBeNull()
  })
  it('oculta inmediatamente la cuenta anterior y descarta su respuesta tardía', async () => {
    let finish!: (value: { data: MisRegistros }) => void
    request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const view = render(tree())
    const firstSignal = request.mock.calls[0][1]!
    auth.user = { id: '43', auth_id: 'bea' }
    localStorage.setItem('authToken', 'bea-token')
    request.mockResolvedValueOnce(page())
    view.rerender(tree())
    expect(firstSignal.aborted).toBe(true)
    await screen.findByText(/Todavía no hay registros/)
    expect(screen.getByRole('link', { name: 'Ver cómo participar' }).getAttribute('href')).toBe('/participar')
    await act(async () => { finish(page([record()])); await Promise.resolve() })
    expect(screen.queryByText('Grupo 22')).toBeNull()
  })
  it('cambiar sólo el token oculta filas mientras verifica la nueva lectura', async () => {
    request.mockResolvedValueOnce(page([record()]))
    const view = render(tree())
    await screen.findByText('Grupo 22')
    localStorage.setItem('authToken', 'nuevo-token')
    request.mockImplementationOnce(() => new Promise(() => {}))
    view.rerender(tree())
    expect(screen.queryByText('Grupo 22')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })
  it('detecta cursor repetido, conserva la lista confirmada y evita anexar la página inválida', async () => {
    request.mockResolvedValueOnce(page([record()], '22')).mockResolvedValueOnce(page([record('21')], '22'))
    render(tree())
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más registros' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/lista cambió/))
    expect(screen.queryByText('Grupo 21')).toBeNull()
    expect(screen.getByText('Grupo 22')).toBeTruthy()
  })
  it('reinicia los cursores al actualizar tras haber recorrido páginas', async () => {
    request.mockResolvedValueOnce(page([record('22')], '22')).mockResolvedValueOnce(page([record('21')])).mockResolvedValueOnce(page([record('22')], '22'))
    render(tree())
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más registros' }))
    await screen.findByText('Grupo 21')
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar mis registros' }))
    await waitFor(() => expect(screen.queryByText('Grupo 21')).toBeNull())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: 'Cargar más registros' })).toBeTruthy()
    expect(request).toHaveBeenLastCalledWith({ limite: 20 }, expect.any(AbortSignal))
  })
})
