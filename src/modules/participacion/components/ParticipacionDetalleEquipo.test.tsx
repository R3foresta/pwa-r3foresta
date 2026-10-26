import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionService } from '../api/participacion.api'
import type { CapacidadSubcampania, MiembrosLectura } from '../types'
import ParticipacionDetalleEquipo from './ParticipacionDetalleEquipo'

const scope: CapacidadSubcampania = {
  campania_id: '7', campania_nombre: 'Palca', subcampania_id: '51', nombre: 'Norte', estado: 'ACTIVA',
  permiso_contextual: 'PLANTADOR', revision_permiso: '2', fuente_autoridad: 'CONTEXTUAL',
  acciones: { preparar_registro: true, registrar_inicial: true, incorporar_plantador: false, retirar_plantador: false, designar_administrador: false, cambiar_administrador: false, retirar_administrador: false, reemplazar_administrador: false },
}
const members: MiembrosLectura = {
  observado_en: '2026-10-26T16:00:00Z', siguiente_cursor: null,
  data: [{ usuario_id: '42', nombre: 'Ana Pérez', organizacion: null, permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA', revision_permiso: '3', acceso_global: false, etiqueta_acceso_global: null, responsabilidad_logistica: 'COORDINADOR' }],
}

function open(current: CapacidadSubcampania) {
  return render(<MemoryRouter><ParticipacionDetalleEquipo scope={current} globalAdmin={false} /></MemoryRouter>)
}

afterEach(() => vi.restoreAllMocks())

describe('Equipo en el detalle participante', () => {
  it('permite al plantador consultar miembros sin acciones de modificación', async () => {
    const read = vi.spyOn(ParticipacionService, 'miembros').mockResolvedValue(members)
    open({ ...scope, acciones: { ...scope.acciones, incorporar_plantador: true } })
    expect(await screen.findByText('Ana Pérez')).toBeTruthy()
    expect(read).toHaveBeenCalledWith('51', { limite: 20 }, expect.any(AbortSignal))
    expect(screen.getByText('Administrador de subcampaña')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Gestionar permisos de participación' })).toBeNull()
  })

  it('mantiene la gestión para el administrador contextual con capacidad', async () => {
    vi.spyOn(ParticipacionService, 'miembros').mockResolvedValue(members)
    open({ ...scope, permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA', acciones: { ...scope.acciones, incorporar_plantador: true } })
    expect(await screen.findByText('Ana Pérez')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Gestionar permisos de participación' })).toBeTruthy()
  })

  it('no confunde un rechazo del servidor con equipo vacío', async () => {
    vi.spyOn(ParticipacionService, 'miembros').mockRejectedValue(new Error('No tienes acceso al equipo.'))
    open(scope)
    expect((await screen.findByRole('alert')).textContent).toContain('No tienes acceso al equipo.')
    expect(screen.queryByText('No hay miembros en esta consulta.')).toBeNull()
  })
})
