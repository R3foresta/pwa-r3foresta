import { ProfileRequestError } from './profile.service'

export type AfiliacionEntrada = { tipo: 'ORGANIZACION_REGISTRADA'; organizacion_id: string } | { tipo: 'OTRA'; nombre: string }
export type Afiliacion = (AfiliacionEntrada & { organizacion_id: string | null; nombre: string }) | null
export type PerfilParticipacion = {
  usuario_id: string
  nombre: string
  apellido: string | null
  afiliacion: Afiliacion
  rol_global: 'ADMIN' | 'GENERAL' | 'VALIDADOR' | 'VOLUNTARIO'
}
export type OrganizacionSeleccionable = { organizacion_id: string; nombre: string }
export type PaginaOrganizaciones = { data: OrganizacionSeleccionable[]; observado_en: string; siguiente_cursor: string | null }
export type CambioPerfil = { nombre: string; apellido: string | null; afiliacion?: AfiliacionEntrada | null }
const API = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Respuesta incompatible del backend')
  return value as Record<string, unknown>
}
function keys(row: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(row).some(key => !allowed.includes(key)) || allowed.some(key => !(key in row))) throw new Error('Respuesta incompatible del backend')
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) throw new Error('ID incompatible del backend')
  return value
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Texto incompatible del backend')
  return value
}
function envelope(value: unknown, allowed: string[]) {
  const row = object(value)
  keys(row, allowed)
  if (typeof row.observado_en !== 'string' || !Number.isFinite(Date.parse(row.observado_en))) throw new Error('Fecha incompatible del backend')
  return row
}
function perfil(value: unknown): PerfilParticipacion {
  const row = object(value)
  keys(row, ['usuario_id', 'nombre', 'apellido', 'afiliacion', 'rol_global'])
  if (row.apellido !== null && typeof row.apellido !== 'string') throw new Error('Apellido incompatible del backend')
  if (!['ADMIN', 'GENERAL', 'VALIDADOR', 'VOLUNTARIO'].includes(String(row.rol_global))) throw new Error('Rol incompatible del backend')
  let afiliacion: Afiliacion = null
  if (row.afiliacion !== null) {
    const a = object(row.afiliacion)
    keys(a, ['tipo', 'organizacion_id', 'nombre'])
    if (a.tipo === 'ORGANIZACION_REGISTRADA') afiliacion = { tipo: a.tipo, organizacion_id: id(a.organizacion_id), nombre: text(a.nombre) }
    else if (a.tipo === 'OTRA' && a.organizacion_id === null) afiliacion = { tipo: a.tipo, organizacion_id: null, nombre: text(a.nombre) }
    else throw new Error('Afiliación incompatible del backend')
  }
  return { usuario_id: id(row.usuario_id), nombre: text(row.nombre), apellido: row.apellido as string | null, afiliacion, rol_global: row.rol_global as PerfilParticipacion['rol_global'] }
}
async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = localStorage.getItem('authToken')
  if (!token) throw new ProfileRequestError(401, 'Ingresa nuevamente con tu passkey')
  const response = await fetch(`${API}${path}`, { ...init, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) } })
  const body: unknown = await response.json().catch(() => null)
  if (localStorage.getItem('authToken') !== token) throw new ProfileRequestError(401, 'La sesión cambió durante la consulta')
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : 'No se pudo completar la solicitud'
    throw new ProfileRequestError(response.status, message)
  }
  return body
}
export class ParticipacionProfileService {
  static async leer(signal?: AbortSignal): Promise<PerfilParticipacion> {
    return perfil(envelope(await request('/usuarios/me/perfil', { signal }), ['data', 'observado_en']).data)
  }
  static async actualizar(change: CambioPerfil): Promise<PerfilParticipacion> {
    // Proyección explícita: autoridad, documento y wallet no forman parte del perfil v1.
    const body: CambioPerfil = { nombre: change.nombre.normalize('NFC').trim(), apellido: change.apellido?.normalize('NFC').trim() || null }
    if ('afiliacion' in change) {
      const a = change.afiliacion
      body.afiliacion = a?.tipo === 'ORGANIZACION_REGISTRADA' ? { tipo: a.tipo, organizacion_id: id(a.organizacion_id) } : a?.tipo === 'OTRA' ? { tipo: a.tipo, nombre: a.nombre.normalize('NFC').trim() } : null
    }
    return perfil(envelope(await request('/usuarios/me/perfil', { method: 'PATCH', body: JSON.stringify(body) }), ['data', 'observado_en']).data)
  }
  static async organizaciones(consulta: string, cursor: string | null = null, signal?: AbortSignal): Promise<PaginaOrganizaciones> {
    const query = new URLSearchParams({ limite: '20' })
    if (consulta.trim()) query.set('consulta', consulta.normalize('NFC').trim())
    if (cursor) query.set('cursor', cursor)
    const row = envelope(await request(`/participacion/organizaciones-seleccionables?${query}`, { signal }), ['data', 'observado_en', 'siguiente_cursor'])
    if (!Array.isArray(row.data) || (row.siguiente_cursor !== null && (typeof row.siguiente_cursor !== 'string' || !row.siguiente_cursor))) throw new Error('Catálogo incompatible del backend')
    return { data: row.data.map(value => { const item = object(value); keys(item, ['organizacion_id', 'nombre']); return { organizacion_id: id(item.organizacion_id), nombre: text(item.nombre) } }), observado_en: row.observado_en as string, siguiente_cursor: row.siguiente_cursor as string | null }
  }
}
