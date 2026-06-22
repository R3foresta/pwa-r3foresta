import {
  createCampaniaApi,
  getCampaniaApi,
  listCampaniasApi,
} from '../api/plantacion.api'
import { OrganizacionesService } from './organizaciones.service'
import type {
  ApiEnvelope,
  Campania,
  CreateCampaniaInput,
  TipoCampania,
} from '../modules/plantacion/types/contracts'
import type {
  ListOrganizacionesQuery,
  Organizacion,
} from '../modules/organizaciones/types'

const TIPOS_CAMPANIA: TipoCampania[] = ['REFORESTACION', 'ARBORIZACION', 'FORESTACION']

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

  static async listOrganizaciones(
    query: ListOrganizacionesQuery = { activo: true },
  ): Promise<Organizacion[]> {
    const payload = await OrganizacionesService.listOrganizaciones(query)
    return Array.isArray(payload.data) ? payload.data : []
  }
}
