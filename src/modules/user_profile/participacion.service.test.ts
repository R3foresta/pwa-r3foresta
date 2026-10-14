import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionProfileService } from './participacion.service'
import { ProfileService } from './profile.service'
const profile = { usuario_id: '9007199254740995', nombre: 'Ana', apellido: null, afiliacion: null, rol_global: 'VOLUNTARIO' }
const envelope = (data: unknown) => ({ data, observado_en: '2026-10-14T14:00:00Z' })
beforeEach(() => { localStorage.clear(); localStorage.setItem('authToken', 'jwt') })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('Perfil v1 participante', () => {
  it('guarda ID exacto sin nombre de catálogo ni autoridad ni datos históricos', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => envelope(profile) })
    vi.stubGlobal('fetch', fetch)
    await ParticipacionProfileService.actualizar({ nombre: ' Ána ', apellido: '', afiliacion: { tipo: 'ORGANIZACION_REGISTRADA', organizacion_id: '9007199254740993' } })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ nombre: 'Ána', apellido: null, afiliacion: { tipo: 'ORGANIZACION_REGISTRADA', organizacion_id: '9007199254740993' } })
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'PATCH', cache: 'no-store', headers: { Authorization: 'Bearer jwt' } })
  })
  it('envía Otra y borrado explícito, conserva afiliación cuando no se edita', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => envelope(profile) }); vi.stubGlobal('fetch', fetch)
    await ParticipacionProfileService.actualizar({ nombre: 'Ana', apellido: null, afiliacion: { tipo: 'OTRA', nombre: ' Otra ' } })
    await ParticipacionProfileService.actualizar({ nombre: 'Ana', apellido: null, afiliacion: null })
    await ParticipacionProfileService.actualizar({ nombre: 'Ana', apellido: null })
    expect(JSON.parse(fetch.mock.calls[0][1].body).afiliacion).toEqual({ tipo: 'OTRA', nombre: 'Otra' })
    expect(JSON.parse(fetch.mock.calls[1][1].body).afiliacion).toBeNull()
    expect(JSON.parse(fetch.mock.calls[2][1].body)).not.toHaveProperty('afiliacion')
  })
  it('rechaza IDs numéricos que pueden perder precisión y datos privados en catálogo', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...envelope([{ organizacion_id: Number("9007199254740993"), nombre: 'Entidad' }]), siguiente_cursor: null }) }); vi.stubGlobal('fetch', fetch)
    await expect(ParticipacionProfileService.organizaciones('')).rejects.toThrow('ID incompatible')
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ...envelope([{ organizacion_id: '1', nombre: 'Entidad', contacto: 'privado' }]), siguiente_cursor: null }) })
    await expect(ParticipacionProfileService.organizaciones('')).rejects.toThrow('Respuesta incompatible')
  })
  it('no entrega respuesta tardía tras cambiar de sesión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => { localStorage.setItem('authToken', 'otra'); return { ok: true, json: async () => envelope(profile) } }))
    await expect(ParticipacionProfileService.leer()).rejects.toMatchObject({ status: 401 })
  })
  it('mantiene 401 y 422 del backend sin asumir éxito', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: 'Organización no seleccionable.' }) }); vi.stubGlobal('fetch', fetch)
    await expect(ParticipacionProfileService.actualizar({ nombre: 'Ana', apellido: null })).rejects.toMatchObject({ status: 422 })
    localStorage.removeItem('authToken'); await expect(ParticipacionProfileService.leer()).rejects.toMatchObject({ status: 401 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('no exige documento, wallet, apellido ni afiliación para perfil mínimo', () => {
    expect(ProfileService.isProfileComplete({ nombre: 'Ana' })).toBe(true)
    expect(ProfileService.validateProfileData({ nombre: 'Ana' })).toEqual({ isValid: true, errors: {} })
  })
  it('el adaptador register-form excluye rol aun en un objeto legado manipulado', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, user: {} }) }); vi.stubGlobal('fetch', fetch)
    const legacy = { nombre: 'Ana', rol: 'ADMIN' }
    await ProfileService.completeProfile(legacy)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ nombre: 'Ana' })
  })
})
