import {
  createCampaniaApi,
  getCampaniaApi,
  listCampaniasApi,
  setSubcampaniaPoligonoApi,
} from '../api/plantacion.api'
import { OrganizacionesService } from './organizaciones.service'
import type {
  ApiEnvelope,
  Campania,
  CreateCampaniaInput,
  GeoJsonPolygon,
  SetSubcampaniaPoligonoData,
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
}
