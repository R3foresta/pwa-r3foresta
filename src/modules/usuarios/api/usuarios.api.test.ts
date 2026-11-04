import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionService } from '../../participacion/api/participacion.api'
import type { IntentoRol } from '../types'
import { UsuariosService } from './usuarios.api'
import { validarIntentoRol, validarReciboRol, validarUsuarios } from './usuarios.contract'

const date = '2026-11-03T12:00:00Z'
const uuid = '3db713df-36a1-479c-82b9-91ac76cc1db6'
const intento: IntentoRol = { actor_id: '9007199254740993', operacion: 'CAMBIAR_ROL_GLOBAL', usuario_id: '9007199254740995', payload: { comando_id: uuid, rol_global: 'GENERAL', revision_esperada: '9007199254740993', motivo: 'Asignación interna' } }
const capacidades = { data: { actor: { usuario_id: intento.actor_id, rol_global: 'ADMIN' }, capacidades_globales: { asignar_roles: true, designar_administradores: true, leer_plan: true }, subcampanias: [] }, observado_en: date, siguiente_cursor: null }
const usuario = { usuario_id: intento.usuario_id, nombre: 'José', username: null, rol_global: 'VOLUNTARIO', activo: true, revision_autoridad: '9007199254740993' }
const list = { data: [usuario], observado_en: date, siguiente_cursor: null }
const autoridad = { data: { usuario_id: usuario.usuario_id, nombre: usuario.nombre, rol_global: usuario.rol_global, activo: true, revision_autoridad: usuario.revision_autoridad }, observado_en: date }
const recibo = { comando_id: uuid, operacion: 'CAMBIAR_ROL_GLOBAL', estado: 'CONFIRMADO', resultado: { tipo: 'ROL_GLOBAL', usuario_id: intento.usuario_id, rol_anterior: 'VOLUNTARIO', rol_nuevo: 'GENERAL', revision_anterior: '9007199254740993', revision_nueva: '9007199254740994', cambio: 'CAMBIO_APLICADO' }, error: null, finalizado_en: date }
const error = { codigo: 'REVISION_OBSOLETA', mensaje: 'La revisión cambió.', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' }
const response = (body: unknown, status = 200) => ({ status, json: async () => body, headers: new Headers() })
let sequence = 0
const api = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`

beforeEach(() => localStorage.setItem('authToken', `usuarios-jwt-${++sequence}`))
async function prime(rol = 'ADMIN') {
  const fetch = vi.fn().mockResolvedValue(response({ ...capacidades, data: { ...capacidades.data, actor: { ...capacidades.data.actor, rol_global: rol } } }))
  vi.stubGlobal('fetch', fetch)
  await ParticipacionService.capacidades()
  fetch.mockClear()
  return fetch
}

describe('contratos de usuarios y autoridad', () => {
  it('conserva precisión BIGINT y username nullable sin datos privados', () => {
    expect(validarUsuarios(list)).toEqual(list)
    expect(validarIntentoRol({ ...intento, payload: { ...intento.payload, motivo: ' Asignacio\u0301n interna ' } }).payload.motivo).toBe('Asignación interna')
  })
  it.each([
    { ...usuario, usuario_id: Number('9007199254740995') },
    { ...usuario, revision_autoridad: 1 },
    { ...usuario, activo: false },
    { ...usuario, correo: 'privado@example.test' },
    { ...usuario, rol_global: 'PLANTADOR' },
  ])('rechaza una proyección incompatible %j', item => {
    expect(() => validarUsuarios({ ...list, data: [item] })).toThrow()
  })
  it('rechaza orden duplicado, orden inverso y página que no coincide con rol', () => {
    expect(() => validarUsuarios({ ...list, data: [usuario, usuario] })).toThrow()
    expect(() => validarUsuarios({ ...list, data: [usuario, { ...usuario, usuario_id: '2' }] })).toThrow()
    expect(() => validarUsuarios(list, { rol_global: 'ADMIN' })).toThrow()
  })
  it('valida UUID, destino, rol, revisión y efecto exacto del recibo', () => {
    expect(validarReciboRol(recibo, intento)).toEqual(recibo)
    const failures = [
      { ...recibo, comando_id: '4db713df-36a1-479c-82b9-91ac76cc1db6' },
      { ...recibo, operacion: 'OTORGAR_PLANTADOR' },
      { ...recibo, resultado: { ...recibo.resultado, usuario_id: '2' } },
      { ...recibo, resultado: { ...recibo.resultado, rol_nuevo: 'ADMIN' } },
      { ...recibo, resultado: { ...recibo.resultado, revision_anterior: '0' } },
      { ...recibo, resultado: { ...recibo.resultado, revision_nueva: '9007199254740995' } },
      { ...recibo, resultado: { ...recibo.resultado, rol_anterior: 'GENERAL' } },
      { ...recibo, resultado: { ...recibo.resultado, cambio: 'SIN_CAMBIOS' } },
      { ...recibo, resultado: { ...recibo.resultado, correo: 'privado@example.test' } },
    ]
    for (const value of failures) expect(() => validarReciboRol(value, intento)).toThrow()
    const unchanged = { ...recibo, resultado: { ...recibo.resultado, rol_anterior: 'GENERAL', cambio: 'SIN_CAMBIOS', revision_nueva: intento.payload.revision_esperada } }
    expect(validarReciboRol(unchanged, intento)).toEqual(unchanged)
  })
})

describe('API privada de gestión de roles', () => {
  it('lista por filtros NFC con Bearer y conserva ID exacto al releer autoridad', async () => {
    const fetch = await prime()
    fetch.mockResolvedValueOnce(response(list)).mockResolvedValueOnce(response(autoridad))
    await UsuariosService.listar(intento.actor_id, { consulta: ' Jose\u0301_% ', rol_global: 'VOLUNTARIO', limite: 20, cursor: 'cursor opaco' })
    expect(fetch.mock.calls[0][0]).toBe(`${api}/usuarios?consulta=Jos%C3%A9_%25&rol_global=VOLUNTARIO&cursor=cursor+opaco&limite=20`)
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: 'no-store', credentials: 'omit', headers: { Authorization: `Bearer usuarios-jwt-${sequence}` } })
    await expect(UsuariosService.autoridad(intento.actor_id, intento.usuario_id)).resolves.toEqual(autoridad)
    expect(fetch.mock.calls[1][0]).toBe(`${api}/usuarios/${intento.usuario_id}/autoridad`)
  })
  it('POST transmite exclusivamente payload y recupera el comando original por GET', async () => {
    const fetch = await prime()
    fetch.mockResolvedValue(response(recibo))
    await UsuariosService.enviar(intento)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/usuarios/${intento.usuario_id}/roles`)
    expect(fetch.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(intento.payload)
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('x-user-role')
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('x-auth-id')
    await UsuariosService.recuperar(intento)
    expect(fetch.mock.calls[1][0]).toBe(`${api}/participacion/comandos/${uuid}?operacion=CAMBIAR_ROL_GLOBAL`)
    expect(fetch.mock.calls[1][1]).not.toHaveProperty('body')
  })
  it('permite recuperar un terminal propio tras perder ADMIN', async () => {
    const fetch = await prime('VOLUNTARIO')
    fetch.mockResolvedValue(response(recibo))
    await expect(UsuariosService.recuperar(intento)).resolves.toEqual(recibo)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('valida actor contra Bearer y no consulta un pendiente de otra cuenta', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ ...capacidades, data: { ...capacidades.data, actor: { usuario_id: '8', rol_global: 'ADMIN' } } }))
    vi.stubGlobal('fetch', fetch)
    await expect(UsuariosService.recuperar(intento)).rejects.toMatchObject({ status: 401 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/participacion/capacidades`)
  })
  it('sin token no consulta; un cambio de sesión descarta respuestas tardías', async () => {
    const fetch = await prime()
    localStorage.removeItem('authToken')
    await expect(UsuariosService.listar(intento.actor_id)).rejects.toMatchObject({ status: 401 })
    expect(fetch).not.toHaveBeenCalled()
    localStorage.setItem('authToken', `usuarios-jwt-${sequence}`)
    fetch.mockImplementationOnce(async () => {
      localStorage.setItem('authToken', 'cuenta-diferente')
      return response(recibo)
    })
    await expect(UsuariosService.enviar(intento)).rejects.toMatchObject({ status: 401 })
  })
  it.each([202, 404, 409, 503])('un resultado fuera de recibo HTTP%s conserva incertidumbre', async status => {
    const fetch = await prime()
    fetch.mockResolvedValue(response({ comando_id: uuid, resultado_concluyente: false, error: { ...error, reintento: 'MISMA_CLAVE' } }, status))
    await expect(UsuariosService.recuperar(intento)).rejects.toMatchObject({ resultado_concluyente: false, status })
  })
  it('un rechazo durable se distingue de un fallo HTTP y acepta recuperación histórica200', async () => {
    const fetch = await prime()
    const rejected = { ...recibo, estado: 'RECHAZADO', resultado: null, error }
    fetch.mockResolvedValueOnce(response(rejected, 409)).mockResolvedValueOnce(response(rejected))
    await expect(UsuariosService.enviar(intento)).resolves.toEqual(rejected)
    await expect(UsuariosService.recuperar(intento)).resolves.toEqual(rejected)
  })
  it('no acepta terminales de error/infraestructura ni autoridad de otro usuario', async () => {
    const fetch = await prime()
    fetch.mockResolvedValueOnce(response(recibo, 503))
      .mockResolvedValueOnce(response({ ...autoridad, data: { ...autoridad.data, usuario_id: '2' } }))
    await expect(UsuariosService.enviar(intento)).rejects.toMatchObject({ status: 503 })
    await expect(UsuariosService.autoridad(intento.actor_id, intento.usuario_id)).rejects.toThrow()
  })
})
