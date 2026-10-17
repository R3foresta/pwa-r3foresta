import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RegistroParticipacionService } from '../../api/registro.api'
import type { DetallePropioRegistroLectura } from '../../registroTypes'
import DetallePropioScreen from './DetallePropioScreen'

const auth = vi.hoisted(() => ({ actorId: '801', login: vi.fn() }))
vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: auth.actorId }, login: auth.login }) }))
function detail(): DetallePropioRegistroLectura {
  return { observado_en: '2026-10-16T12:00:00Z', data: { registro_plantacion_id: '9007199254740999', codigo_trazabilidad: 'PLT-PERSISTIDA', subcampania_id: '820', fecha_plantacion: '2026-10-16', revision_registro: '9007199254740995', relaciones: ['AUTOR'], cantidad_total_plantada: 7, especies: [{ planta_id: '8', cantidad: 7 }], latitud: -16.5, longitud: -68.1, gps_dentro_poligono: true, participantes: [{ usuario_id: '801', nombre_snapshot: 'Nombre guardado', afiliacion_snapshot: 'Afiliación de entonces', afiliacion_estado: 'DECLARADA', afiliacion_tipo: 'OTRA', organizacion_id_snapshot: null, es_responsable: true }], evidencia_ids: ['901'], observaciones_autor: 'Observación privada persistida' } }
}
beforeEach(() => { auth.actorId = '801' })
function element() { return <MemoryRouter initialEntries={['/detalle/9007199254740999']}><Routes><Route path="/detalle/:registroId" element={<DetallePropioScreen />} /></Routes></MemoryRouter> }

describe('Detalle propio persistido', () => {
  it('consulta sin contexto vigente y representa snapshots y observaciones recibidos', async () => {
    const own = vi.spyOn(RegistroParticipacionService, 'detallePropio').mockResolvedValue(detail())
    const context = vi.spyOn(RegistroParticipacionService, 'contexto').mockRejectedValue(new Error('Permiso retirado'))
    render(element())
    await screen.findByText('PLT-PERSISTIDA')
    expect(screen.getByText(/Nombre guardado · Responsable/)).toBeTruthy()
    expect(screen.getByText('Afiliación de entonces')).toBeTruthy()
    expect(screen.getByText('Observación privada persistida')).toBeTruthy()
    expect(screen.getByText(/9007199254740995/)).toBeTruthy()
    expect(own).toHaveBeenCalledWith('801', '9007199254740999', expect.any(AbortSignal))
    expect(context).not.toHaveBeenCalled()
    expect(screen.getByRole('img', { name: 'Evidencia confirmada 901' }).getAttribute('src')).toContain('/api/v1/impact/imagenes/901')
  })

  it('sin observaciones del autor no inventa una sección y conserva ausencias históricas', async () => {
    const response = detail()
    response.data.relaciones = ['PARTICIPANTE']; response.data.observaciones_autor = null
    response.data.participantes[0] = { ...response.data.participantes[0], nombre_snapshot: null, afiliacion_snapshot: null, afiliacion_tipo: null, afiliacion_estado: 'HISTORICA_NO_DISPONIBLE' }
    vi.spyOn(RegistroParticipacionService, 'detallePropio').mockResolvedValue(response)
    render(element())
    await screen.findByText('PLT-PERSISTIDA')
    expect(screen.getByText(/Nombre histórico no disponible/)).toBeTruthy()
    expect(screen.getByText('Afiliación histórica no disponible')).toBeTruthy()
    expect(screen.queryByText('Observaciones propias')).toBeNull()
  })

  it('oculta el resultado tardío de la cuenta anterior al cambiar de sesión', async () => {
    let complete!: (value: DetallePropioRegistroLectura) => void
    vi.spyOn(RegistroParticipacionService, 'detallePropio').mockImplementationOnce(() => new Promise((resolve) => { complete = resolve })).mockRejectedValue(new Error('Registro propio no disponible para esta cuenta.'))
    const view = render(element())
    auth.actorId = '804'
    view.rerender(element())
    await screen.findByText('Registro propio no disponible para esta cuenta.')
    await act(async () => complete(detail()))
    expect(screen.queryByText('PLT-PERSISTIDA')).toBeNull()
    expect(screen.queryByText('Observación privada persistida')).toBeNull()
  })
})
