import {
  activarSubcampaniaApi,
  createCampaniaApi,
  createSubcampaniaApi,
  deleteSubcampaniaApi,
  deleteSubcampaniaEquipoMemberApi,
  getCampaniaApi,
  getSubcampaniaApi,
  getSubcampaniaEquipoApi,
  listCampaniasApi,
  patchSubcampaniaApi,
  postSubcampaniaEquipoApi,
  setSubcampaniaPoligonoApi,
} from '../api/plantacion.api'
import { OrganizacionesService } from './organizaciones.service'
import type {
  ActivarSubcampaniaData,
  ApiEnvelope,
  Campania,
  CreateCampaniaInput,
  CreateSubcampaniaInput,
  EquipoMember,
  EquipoMemberInput,
  GeoJsonPolygon,
  RolEnSubcampania,
  SetEquipoData,
  SetSubcampaniaPoligonoData,
  Subcampania,
  TipoCampania,
  UpdateSubcampaniaInput,
} from '../modules/plantacion/types/contracts'
import type {
  ListOrganizacionesQuery,
  Organizacion,
} from '../modules/organizaciones/types'

const TIPOS_CAMPANIA: TipoCampania[] = ['REFORESTACION', 'ARBORIZACION', 'FORESTACION']
const ROLES_SUBCAMPANIA: RolEnSubcampania[] = ['COORDINADOR', 'OPERARIO']

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const source = payload as ApiEnvelope<unknown>
  if (Array.isArray(source.message)) {
    const lines = source.message
      .filter((message): message is string => typeof message === 'string' && message.trim() !== '')
      .map((message) => message.trim())
    return lines.length > 0 ? lines.join('\n') : fallback
  }
  if (typeof source.message === 'string' && source.message.trim()) {
    return source.message.trim()
  }
  if (typeof source.error === 'string' && source.error.trim()) {
    return source.error.trim()
  }
  return fallback
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const raw = await response.text()
  const parsed = raw ? tryParseJson(raw) : null

  if (!response.ok) {
    throw new Error(normalizeErrorMessage(parsed, raw || fallbackError))
  }

  if (!parsed) {
    throw new Error('Respuesta vacía del servidor.')
  }

  return parsed as T
}

function validateCampaniaInput(input: CreateCampaniaInput): CreateCampaniaInput {
  const nombre = normalizeText(input.nombre)
  const descripcion = input.descripcion?.trim()

  if (nombre.length < 3) {
    throw new Error('El nombre de la campaña debe tener al menos 3 caracteres.')
  }
  if (!TIPOS_CAMPANIA.includes(input.tipo)) {
    throw new Error('Selecciona un tipo de campaña válido.')
  }
  if (
    input.fecha_estimada_inicio &&
    input.fecha_estimada_fin &&
    input.fecha_estimada_inicio > input.fecha_estimada_fin
  ) {
    throw new Error('La fecha de cierre estimada no puede ser anterior al inicio.')
  }

  return {
    nombre,
    tipo: input.tipo,
    descripcion: descripcion || undefined,
    fecha_estimada_inicio: input.fecha_estimada_inicio || undefined,
    fecha_estimada_fin: input.fecha_estimada_fin || undefined,
    organizacion_ids: input.organizacion_ids?.filter((id) => Number.isFinite(id)) ?? undefined,
  }
}

function validateGeoJsonPolygon(poligono: GeoJsonPolygon): GeoJsonPolygon {
  const firstRing = poligono.coordinates[0]

  if (poligono.type !== 'Polygon' || !firstRing || firstRing.length < 4) {
    throw new Error('El polígono debe tener al menos 4 puntos y un anillo cerrado.')
  }

  const [firstLng, firstLat] = firstRing[0]
  const [lastLng, lastLat] = firstRing[firstRing.length - 1]

  if (firstLng !== lastLng || firstLat !== lastLat) {
    throw new Error('El anillo del polígono debe estar cerrado.')
  }

  firstRing.forEach(([lng, lat]) => {
    if (
      !Number.isFinite(lng) ||
      !Number.isFinite(lat) ||
      lng < -180 ||
      lng > 180 ||
      lat < -90 ||
      lat > 90
    ) {
      throw new Error('El polígono tiene coordenadas fuera de rango.')
    }
  })

  return poligono
}

export class PlantacionService {
  static async listCampanias(): Promise<Campania[]> {
    const response = await listCampaniasApi()
    const payload = await parseJsonResponse<ApiEnvelope<Campania[]>>(
      response,
      'Error al cargar campañas.',
    )
    return Array.isArray(payload.data) ? payload.data : []
  }

  static async getCampania(campaniaId: number): Promise<Campania> {
    if (!Number.isFinite(campaniaId) || campaniaId <= 0) {
      throw new Error('ID de campaña inválido.')
    }
    const response = await getCampaniaApi(campaniaId)
    const payload = await parseJsonResponse<ApiEnvelope<Campania>>(
      response,
      'Error al cargar la campaña.',
    )
    if (!payload.data) {
      throw new Error('Campaña no encontrada.')
    }
    return payload.data
  }

  static async createCampania(
    input: CreateCampaniaInput,
    authId?: string,
  ): Promise<Campania> {
    const cleanInput = validateCampaniaInput(input)
    const response = await createCampaniaApi(cleanInput, authId)
    const payload = await parseJsonResponse<ApiEnvelope<Campania>>(
      response,
      'Error al crear la campaña.',
    )
    if (!payload.data) {
      throw new Error('No se recibió la campaña creada.')
    }
    return payload.data
  }

  static async setSubcampaniaPoligono(
    subcampaniaId: number,
    poligono: GeoJsonPolygon,
    authId?: string,
  ): Promise<SetSubcampaniaPoligonoData> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }

    const cleanPoligono = validateGeoJsonPolygon(poligono)
    const response = await setSubcampaniaPoligonoApi(
      subcampaniaId,
      { poligono: cleanPoligono },
      authId,
    )
    const payload = await parseJsonResponse<ApiEnvelope<SetSubcampaniaPoligonoData>>(
      response,
      'Error al guardar el polígono de la subcampaña.',
    )

    if (!payload.data) {
      throw new Error('No se recibió confirmación del polígono guardado.')
    }

    return payload.data
  }

  static async listOrganizaciones(
    query: ListOrganizacionesQuery = { activo: true },
  ): Promise<Organizacion[]> {
    const payload = await OrganizacionesService.listOrganizaciones(query)
    return Array.isArray(payload.data) ? payload.data : []
  }

  static async createSubcampania(
    input: CreateSubcampaniaInput,
    authId?: string,
  ): Promise<Subcampania> {
    const cleanInput = validateCreateSubcampaniaInput(input)
    const response = await createSubcampaniaApi(cleanInput, authId)
    const payload = await parseJsonResponse<ApiEnvelope<Subcampania>>(
      response,
      'Error al crear la subcampaña.',
    )
    if (!payload.data) {
      throw new Error('No se recibió la subcampaña creada.')
    }
    return payload.data
  }

  static async updateSubcampania(
    subcampaniaId: number,
    input: UpdateSubcampaniaInput,
    authId?: string,
  ): Promise<Subcampania> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    const cleanInput = validateUpdateSubcampaniaInput(input)
    if (Object.keys(cleanInput).length === 0) {
      throw new Error('No hay cambios para actualizar.')
    }
    const response = await patchSubcampaniaApi(subcampaniaId, cleanInput, authId)
    const payload = await parseJsonResponse<ApiEnvelope<Subcampania>>(
      response,
      'Error al actualizar la subcampaña.',
    )
    if (!payload.data) {
      throw new Error('No se recibió la subcampaña actualizada.')
    }
    return payload.data
  }

  static async getSubcampania(
    subcampaniaId: number,
    authId?: string,
  ): Promise<Subcampania> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    const response = await getSubcampaniaApi(subcampaniaId, authId)
    const payload = await parseJsonResponse<ApiEnvelope<Subcampania>>(
      response,
      'Error al cargar la subcampaña.',
    )
    if (!payload.data) {
      throw new Error('Subcampaña no encontrada.')
    }
    return payload.data
  }

  static async deleteSubcampania(
    subcampaniaId: number,
    authId?: string,
  ): Promise<void> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    const response = await deleteSubcampaniaApi(subcampaniaId, authId)
    await parseJsonResponse<ApiEnvelope<unknown>>(
      response,
      'Error al eliminar la subcampaña.',
    )
  }

  static async getSubcampaniaEquipo(
    subcampaniaId: number,
    authId?: string,
  ): Promise<EquipoMember[]> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    const response = await getSubcampaniaEquipoApi(subcampaniaId, authId)
    const payload = await parseJsonResponse<ApiEnvelope<EquipoMember[]>>(
      response,
      'Error al cargar el equipo de la subcampaña.',
    )
    return Array.isArray(payload.data) ? payload.data : []
  }

  static async setSubcampaniaEquipo(
    subcampaniaId: number,
    miembros: EquipoMemberInput[],
    authId?: string,
  ): Promise<EquipoMember[]> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    const cleanMiembros = validateEquipoMembers(miembros)
    const response = await postSubcampaniaEquipoApi(subcampaniaId, cleanMiembros, authId)
    const payload = await parseJsonResponse<ApiEnvelope<SetEquipoData>>(
      response,
      'Error al guardar el equipo de la subcampaña.',
    )
    return payload.data?.miembros ?? []
  }

  static async removeSubcampaniaEquipoMember(
    subcampaniaId: number,
    usuarioId: number,
    authId?: string,
  ): Promise<void> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    if (!Number.isFinite(usuarioId) || usuarioId <= 0) {
      throw new Error('ID de usuario inválido.')
    }
    const response = await deleteSubcampaniaEquipoMemberApi(subcampaniaId, usuarioId, authId)
    await parseJsonResponse<ApiEnvelope<unknown>>(
      response,
      'Error al quitar el miembro del equipo.',
    )
  }

  static async activarSubcampania(
    subcampaniaId: number,
    authId?: string,
  ): Promise<ActivarSubcampaniaData> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    const response = await activarSubcampaniaApi(subcampaniaId, authId)
    const payload = await parseJsonResponse<ApiEnvelope<ActivarSubcampaniaData>>(
      response,
      'Error al activar la subcampaña.',
    )
    if (!payload.data) {
      throw new Error('No se recibió confirmación de la activación.')
    }
    return payload.data
  }
}

function validateCreateSubcampaniaInput(
  input: CreateSubcampaniaInput,
): CreateSubcampaniaInput {
  const nombre = normalizeText(input.nombre)
  if (nombre.length < 3 || nombre.length > 200) {
    throw new Error('El nombre de la subcampaña debe tener entre 3 y 200 caracteres.')
  }
  if (!Number.isFinite(input.campania_id) || input.campania_id <= 0) {
    throw new Error('Campaña inválida.')
  }
  if (!Number.isFinite(input.zona_id) || input.zona_id <= 0) {
    throw new Error('Zona/comunidad inválida.')
  }
  if (!Number.isFinite(input.meta_total_arboles) || input.meta_total_arboles < 1) {
    throw new Error('La meta total de árboles debe ser al menos 1.')
  }
  if (
    input.fecha_estimada_inicio &&
    input.fecha_estimada_fin &&
    input.fecha_estimada_inicio > input.fecha_estimada_fin
  ) {
    throw new Error('La fecha de cierre estimada no puede ser anterior al inicio.')
  }
  const descripcion = input.descripcion?.trim()
  if (descripcion && descripcion.length > 1000) {
    throw new Error('La descripción no puede superar los 1000 caracteres.')
  }

  return {
    campania_id: input.campania_id,
    nombre,
    zona_id: input.zona_id,
    meta_total_arboles: Math.floor(input.meta_total_arboles),
    descripcion: descripcion || undefined,
    fecha_estimada_inicio: input.fecha_estimada_inicio || undefined,
    fecha_estimada_fin: input.fecha_estimada_fin || undefined,
    tolerancia_gps_metros: input.tolerancia_gps_metros,
  }
}

function validateUpdateSubcampaniaInput(
  input: UpdateSubcampaniaInput,
): UpdateSubcampaniaInput {
  const cleanInput: UpdateSubcampaniaInput = {}

  if (input.nombre !== undefined) {
    const nombre = normalizeText(input.nombre)
    if (nombre.length < 3 || nombre.length > 200) {
      throw new Error('El nombre de la subcampaña debe tener entre 3 y 200 caracteres.')
    }
    cleanInput.nombre = nombre
  }
  if (input.descripcion !== undefined) {
    const descripcion = input.descripcion.trim()
    if (descripcion.length > 1000) {
      throw new Error('La descripción no puede superar los 1000 caracteres.')
    }
    cleanInput.descripcion = descripcion
  }
  if (input.zona_id !== undefined) {
    if (!Number.isFinite(input.zona_id) || input.zona_id <= 0) {
      throw new Error('Zona/comunidad inválida.')
    }
    cleanInput.zona_id = input.zona_id
  }
  if (input.meta_total_arboles !== undefined) {
    if (!Number.isFinite(input.meta_total_arboles) || input.meta_total_arboles < 1) {
      throw new Error('La meta total de árboles debe ser al menos 1.')
    }
    cleanInput.meta_total_arboles = Math.floor(input.meta_total_arboles)
  }
  if (input.fecha_estimada_inicio !== undefined) {
    cleanInput.fecha_estimada_inicio = input.fecha_estimada_inicio || undefined
  }
  if (input.fecha_estimada_fin !== undefined) {
    cleanInput.fecha_estimada_fin = input.fecha_estimada_fin || undefined
  }
  if (input.tolerancia_gps_metros !== undefined) {
    if (!Number.isFinite(input.tolerancia_gps_metros) || input.tolerancia_gps_metros < 1) {
      throw new Error('Tolerancia GPS inválida.')
    }
    cleanInput.tolerancia_gps_metros = input.tolerancia_gps_metros
  }

  if (
    cleanInput.fecha_estimada_inicio &&
    cleanInput.fecha_estimada_fin &&
    cleanInput.fecha_estimada_inicio > cleanInput.fecha_estimada_fin
  ) {
    throw new Error('La fecha de cierre estimada no puede ser anterior al inicio.')
  }

  return cleanInput
}

function validateEquipoMembers(miembros: EquipoMemberInput[]): EquipoMemberInput[] {
  if (!Array.isArray(miembros) || miembros.length === 0) {
    throw new Error('Agrega al menos un miembro al equipo.')
  }

  const seen = new Set<number>()
  let coordinadores = 0

  const cleanMiembros = miembros.map((member) => {
    if (!Number.isFinite(member.usuario_id) || member.usuario_id <= 0) {
      throw new Error('Usuario inválido en el equipo.')
    }
    if (!ROLES_SUBCAMPANIA.includes(member.rol)) {
      throw new Error('Rol inválido en el equipo.')
    }
    if (seen.has(member.usuario_id)) {
      throw new Error('No se puede agregar el mismo usuario dos veces.')
    }
    seen.add(member.usuario_id)
    if (member.rol === 'COORDINADOR') coordinadores += 1
    return { usuario_id: member.usuario_id, rol: member.rol }
  })

  if (coordinadores > 1) {
    throw new Error('Solo puede haber un coordinador por subcampaña.')
  }

  return cleanMiembros
}
