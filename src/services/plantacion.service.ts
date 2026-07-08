import {
  activarSubcampaniaApi,
  cancelarSubcampaniaApi,
  createCampaniaApi,
  createRegistroPlantacionApi,
  createSubcampaniaApi,
  deleteCampaniaApi,
  deleteCampaniaOrganizacionApi,
  deleteEvidenciasPendientesPlantacionApi,
  deleteSubcampaniaEquipoMemberApi,
  getCampaniaActivityApi,
  getCampaniaApi,
  getCampaniaMetricsApi,
  getPlantacionContextApi,
  getSubcampaniaApi,
  getSubcampaniaEquipoApi,
  getSubcampaniaPlanApi,
  listCampaniasApi,
  listSubcampaniasApi,
  listSubcampaniasByCampaniaApi,
  patchCampaniaApi,
  patchSubcampaniaApi,
  postCampaniaOrganizacionesApi,
  postSubcampaniaEquipoApi,
  putSubcampaniaPlanApi,
  setSubcampaniaPoligonoApi,
  uploadEvidenciasPendientesPlantacionApi,
} from '../api/plantacion.api'
import { getImageFileValidationError } from '../utils/imageValidation'
import { OrganizacionesService } from './organizaciones.service'
import type {
  ActivarSubcampaniaData,
  ApiEnvelope,
  CreateRegistroPlantacionInput,
  DescartarEvidenciasData,
  PlantacionContext,
  RegistroPlantacionData,
  UploadEvidenciasPlantacionData,
  UploadEvidenciasPlantacionInput,
  CampaniaActivityItem,
  CampaniaMetrics,
  CancelarSubcampaniaData,
  Campania,
  CreateCampaniaInput,
  CreateSubcampaniaInput,
  DeleteCampaniaData,
  EquipoMember,
  EquipoMemberInput,
  GeoJsonPolygon,
  GetPlanData,
  PlanEspecieMetaInput,
  PutPlanData,
  RolEnSubcampania,
  SetEquipoData,
  SetSubcampaniaPoligonoData,
  Subcampania,
  TipoCampania,
  UpdateCampaniaInput,
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

  static async listSubcampaniasByCampania(campaniaId: number): Promise<Subcampania[]> {
    if (!Number.isFinite(campaniaId) || campaniaId <= 0) {
      throw new Error('ID de campaña inválido.')
    }
    const response = await listSubcampaniasByCampaniaApi(campaniaId)
    const payload = await parseJsonResponse<ApiEnvelope<Subcampania[]>>(
      response,
      'Error al cargar subcampañas de la campaña.',
    )
    return Array.isArray(payload.data) ? payload.data : []
  }

  static async getCampaniaMetrics(campaniaId: number): Promise<CampaniaMetrics | null> {
    if (!Number.isFinite(campaniaId) || campaniaId <= 0) {
      throw new Error('ID de campaña inválido.')
    }
    const response = await getCampaniaMetricsApi(campaniaId)
    const payload = await parseJsonResponse<ApiEnvelope<CampaniaMetrics>>(
      response,
      'Error al cargar métricas de la campaña.',
    )
    return payload.data ?? null
  }

  static async getCampaniaActivity(
    campaniaId: number,
    limit = 5,
  ): Promise<CampaniaActivityItem[]> {
    if (!Number.isFinite(campaniaId) || campaniaId <= 0) {
      throw new Error('ID de campaña inválido.')
    }
    const clampedLimit = Math.max(1, Math.min(50, Math.floor(limit)))
    const response = await getCampaniaActivityApi(campaniaId, clampedLimit)
    const payload = await parseJsonResponse<ApiEnvelope<CampaniaActivityItem[]>>(
      response,
      'Error al cargar la actividad reciente.',
    )
    return Array.isArray(payload.data) ? payload.data : []
  }

  static async updateCampania(
    campaniaId: number,
    input: UpdateCampaniaInput,
    authId?: string,
  ): Promise<Campania> {
    if (!Number.isFinite(campaniaId) || campaniaId <= 0) {
      throw new Error('ID de campaña inválido.')
    }
    const cleanInput = validateUpdateCampaniaInput(input)
    if (Object.keys(cleanInput).length === 0) {
      throw new Error('No hay cambios para actualizar.')
    }
    const response = await patchCampaniaApi(campaniaId, cleanInput, authId)
    const payload = await parseJsonResponse<ApiEnvelope<Campania>>(
      response,
      'Error al actualizar la campaña.',
    )
    if (!payload.data) {
      throw new Error('No se recibió la campaña actualizada.')
    }
    return payload.data
  }

  static async deleteCampania(
    campaniaId: number,
    authId?: string,
  ): Promise<DeleteCampaniaData> {
    if (!Number.isFinite(campaniaId) || campaniaId <= 0) {
      throw new Error('ID de campaña inválido.')
    }
    const response = await deleteCampaniaApi(campaniaId, authId)
    const payload = await parseJsonResponse<ApiEnvelope<DeleteCampaniaData>>(
      response,
      'Error al desactivar la campaña.',
    )
    return payload.data ?? { id: campaniaId }
  }

  static async addCampaniaOrganizaciones(
    campaniaId: number,
    organizacionIds: number[],
    authId?: string,
  ): Promise<void> {
    if (!Number.isFinite(campaniaId) || campaniaId <= 0) {
      throw new Error('ID de campaña inválido.')
    }
    const cleanIds = (organizacionIds || []).filter(
      (id) => Number.isFinite(id) && id > 0,
    )
    if (cleanIds.length === 0) {
      throw new Error('Selecciona al menos una organización.')
    }
    const response = await postCampaniaOrganizacionesApi(
      campaniaId,
      { organizacion_ids: cleanIds },
      authId,
    )
    await parseJsonResponse<ApiEnvelope<unknown>>(
      response,
      'Error al asociar organizaciones a la campaña.',
    )
  }

  static async removeCampaniaOrganizacion(
    campaniaId: number,
    organizacionId: number,
    authId?: string,
  ): Promise<void> {
    if (!Number.isFinite(campaniaId) || campaniaId <= 0) {
      throw new Error('ID de campaña inválido.')
    }
    if (!Number.isFinite(organizacionId) || organizacionId <= 0) {
      throw new Error('ID de organización inválido.')
    }
    const response = await deleteCampaniaOrganizacionApi(
      campaniaId,
      organizacionId,
      authId,
    )
    await parseJsonResponse<ApiEnvelope<unknown>>(
      response,
      'Error al quitar la organización de la campaña.',
    )
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

  static async getSubcampaniaPlan(
    subcampaniaId: number,
    authId?: string,
  ): Promise<GetPlanData> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    const response = await getSubcampaniaPlanApi(subcampaniaId, authId)
    const payload = await parseJsonResponse<ApiEnvelope<GetPlanData>>(
      response,
      'Error al cargar el plan de metas por especie.',
    )
    if (!payload.data) {
      throw new Error('No se recibió el plan de metas.')
    }
    return payload.data
  }

  static async putSubcampaniaPlan(
    subcampaniaId: number,
    metas: PlanEspecieMetaInput[],
    authId?: string,
  ): Promise<PutPlanData> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    const cleanMetas = validatePlanMetas(metas)
    const response = await putSubcampaniaPlanApi(
      subcampaniaId,
      { metas: cleanMetas },
      authId,
    )
    const payload = await parseJsonResponse<ApiEnvelope<PutPlanData>>(
      response,
      'Error al guardar el plan de metas.',
    )
    if (!payload.data) {
      throw new Error('No se recibió confirmación del plan guardado.')
    }
    return payload.data
  }

  static async cancelarSubcampania(
    subcampaniaId: number,
    motivo: string,
    authId?: string,
  ): Promise<CancelarSubcampaniaData> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    const cleanMotivo = motivo.trim().replace(/\s+/g, ' ')
    if (cleanMotivo.length < 3 || cleanMotivo.length > 1000) {
      throw new Error('El motivo debe tener entre 3 y 1000 caracteres.')
    }
    const response = await cancelarSubcampaniaApi(
      subcampaniaId,
      { motivo: cleanMotivo },
      authId,
    )
    const payload = await parseJsonResponse<ApiEnvelope<CancelarSubcampaniaData>>(
      response,
      'Error al cancelar la subcampaña.',
    )
    if (!payload.data) {
      throw new Error('No se recibió confirmación de la cancelación.')
    }
    return payload.data
  }

  // -------------------------------------------------------------------------
  // Registro de plantación inicial (PLT-EPIC-01)
  // -------------------------------------------------------------------------

  /**
   * Subcampañas ACTIVAS donde el usuario pertenece al equipo operativo
   * (COORDINADOR u OPERARIO). Mientras backend no exponga un listado dedicado,
   * se filtra client-side sobre `GET /subcampanias?estado=ACTIVA` usando el
   * campo `equipo[]` del payload enriquecido.
   */
  static async listSubcampaniasOperativas(
    usuarioId: number,
    authId?: string,
  ): Promise<Subcampania[]> {
    if (!Number.isFinite(usuarioId) || usuarioId <= 0) {
      throw new Error('Usuario inválido para listar subcampañas operativas.')
    }
    const response = await listSubcampaniasApi('ACTIVA', authId)
    const payload = await parseJsonResponse<ApiEnvelope<Subcampania[]>>(
      response,
      'Error al cargar tus subcampañas operativas.',
    )
    const subcampanias = Array.isArray(payload.data) ? payload.data : []
    return subcampanias.filter((sub) =>
      (sub.equipo ?? []).some((member) => member.usuario_id === usuarioId),
    )
  }

  static async getPlantacionContext(
    subcampaniaId: number,
    authId?: string,
  ): Promise<PlantacionContext> {
    if (!Number.isFinite(subcampaniaId) || subcampaniaId <= 0) {
      throw new Error('ID de subcampaña inválido.')
    }
    const response = await getPlantacionContextApi(subcampaniaId, authId)
    const payload = await parseJsonResponse<ApiEnvelope<PlantacionContext>>(
      response,
      'Error al cargar el contexto de plantación.',
    )
    const context = payload.data
    if (!context?.subcampania || !context.usuario) {
      throw new Error('El contexto de plantación llegó incompleto.')
    }

    // Backend garantiza `fecha_asignacion ASC, asignacion_id ASC`; se reordena
    // defensivamente para que la distribución automática sea determinística
    // incluso si el contrato cambia.
    const stockOrdenado = (context.stock_por_especie ?? []).map((stock) => ({
      ...stock,
      asignaciones: [...(stock.asignaciones ?? [])].sort((a, b) => {
        if (a.fecha_asignacion !== b.fecha_asignacion) {
          return a.fecha_asignacion < b.fecha_asignacion ? -1 : 1
        }
        return a.asignacion_id - b.asignacion_id
      }),
    }))

    return {
      ...context,
      equipo: Array.isArray(context.equipo) ? context.equipo : [],
      plan_por_especie: Array.isArray(context.plan_por_especie)
        ? context.plan_por_especie
        : [],
      stock_por_especie: stockOrdenado,
      reglas: context.reglas ?? {},
    }
  }

  static async uploadEvidenciasPendientesPlantacion(
    input: UploadEvidenciasPlantacionInput,
    limits?: { minFotos?: number; maxFotos?: number },
    authId?: string,
  ): Promise<UploadEvidenciasPlantacionData> {
    const minFotos = limits?.minFotos ?? 1
    const maxFotos = limits?.maxFotos ?? MAX_FOTOS_PLANTACION_DEFAULT

    if (!Array.isArray(input.fotos) || input.fotos.length < minFotos) {
      throw new Error(
        minFotos === 1
          ? 'Debes adjuntar al menos una foto de la plantación.'
          : `Debes adjuntar al menos ${minFotos} fotos de la plantación.`,
      )
    }
    if (input.fotos.length > maxFotos) {
      throw new Error(`Solo se permiten hasta ${maxFotos} fotos por registro.`)
    }
    const invalidPhoto = input.fotos.find((foto) => getImageFileValidationError(foto))
    if (invalidPhoto) {
      throw new Error(
        getImageFileValidationError(invalidPhoto) ??
          'Solo se aceptan fotos JPG, PNG, WEBP, HEIC o HEIF.',
      )
    }

    const response = await uploadEvidenciasPendientesPlantacionApi(input, authId)
    const payload = await parseJsonResponse<
      ApiEnvelope<unknown> & { evidencia_ids?: unknown }
    >(response, 'Error al subir las evidencias de la plantación.')

    const evidenciaIds = extractEvidenciaIds(payload)
    if (evidenciaIds.length < 1) {
      throw new Error('No se recibieron IDs de evidencia para registrar la plantación.')
    }
    return { evidencia_ids: evidenciaIds }
  }

  /**
   * Descarta evidencias pendientes pre-subidas (cancelación del flujo o fallo
   * del POST final). Idempotente: IDs ya eliminados/vinculados vuelven en
   * `evidencia_ids_ignoradas` y no se tratan como error.
   */
  static async descartarEvidenciasPendientesPlantacion(
    evidenciaIds: number[],
    authId?: string,
  ): Promise<DescartarEvidenciasData> {
    const cleanIds = (evidenciaIds ?? []).filter(
      (id) => Number.isInteger(id) && id > 0,
    )
    if (cleanIds.length === 0) {
      return { evidencia_ids_descartadas: [], evidencia_ids_ignoradas: [] }
    }
    const response = await deleteEvidenciasPendientesPlantacionApi(cleanIds, authId)
    const payload = await parseJsonResponse<ApiEnvelope<DescartarEvidenciasData>>(
      response,
      'Error al descartar las evidencias pendientes.',
    )
    return {
      evidencia_ids_descartadas: Array.isArray(payload.data?.evidencia_ids_descartadas)
        ? payload.data.evidencia_ids_descartadas
        : [],
      evidencia_ids_ignoradas: Array.isArray(payload.data?.evidencia_ids_ignoradas)
        ? payload.data.evidencia_ids_ignoradas
        : [],
    }
  }

  static async registrarPlantacion(
    input: CreateRegistroPlantacionInput,
    authId?: string,
  ): Promise<RegistroPlantacionData> {
    const cleanInput = validateRegistroPlantacionInput(input)
    const response = await createRegistroPlantacionApi(cleanInput, authId)
    const payload = await parseJsonResponse<ApiEnvelope<RegistroPlantacionData>>(
      response,
      'Error al registrar la plantación.',
    )
    if (!payload.data?.registro_plantacion_id) {
      throw new Error('No se recibió confirmación del registro de plantación.')
    }
    return payload.data
  }
}

const MAX_FOTOS_PLANTACION_DEFAULT = 10

function extractEvidenciaIds(payload: {
  evidencia_ids?: unknown
  data?: unknown
}): number[] {
  const candidates: unknown[] = [
    payload.evidencia_ids,
    (payload.data as { evidencia_ids?: unknown } | null | undefined)?.evidencia_ids,
    Array.isArray(payload.data)
      ? (payload.data as Array<{ id?: unknown }>).map((item) => item?.id)
      : undefined,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const ids = candidate
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
      if (ids.length > 0) return ids
    }
  }
  return []
}

function validateRegistroPlantacionInput(
  input: CreateRegistroPlantacionInput,
): CreateRegistroPlantacionInput {
  if (!Number.isFinite(input.subcampania_id) || input.subcampania_id <= 0) {
    throw new Error('Subcampaña inválida para registrar la plantación.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha_plantacion)) {
    throw new Error('La fecha de plantación debe tener formato YYYY-MM-DD.')
  }
  if (!Number.isFinite(input.latitud) || input.latitud < -90 || input.latitud > 90) {
    throw new Error('La latitud debe estar entre -90 y 90.')
  }
  if (!Number.isFinite(input.longitud) || input.longitud < -180 || input.longitud > 180) {
    throw new Error('La longitud debe estar entre -180 y 180.')
  }
  const observaciones = input.observaciones?.trim()
  if (observaciones && observaciones.length > 2000) {
    throw new Error('Las observaciones no pueden superar los 2000 caracteres.')
  }

  if (!Array.isArray(input.detalles) || input.detalles.length < 1) {
    throw new Error('El registro debe incluir al menos un detalle por asignación.')
  }
  const detalles = input.detalles.map((detalle) => {
    if (!Number.isInteger(detalle.asignacion_id) || detalle.asignacion_id <= 0) {
      throw new Error('Detalle con asignación inválida.')
    }
    if (!Number.isInteger(detalle.lote_vivero_id) || detalle.lote_vivero_id <= 0) {
      throw new Error('Detalle con lote de vivero inválido.')
    }
    if (!Number.isInteger(detalle.planta_id) || detalle.planta_id <= 0) {
      throw new Error('Detalle con especie inválida.')
    }
    if (!Number.isInteger(detalle.cantidad) || detalle.cantidad < 1) {
      throw new Error('Cada detalle debe tener una cantidad entera mayor o igual a 1.')
    }
    return {
      asignacion_id: detalle.asignacion_id,
      lote_vivero_id: detalle.lote_vivero_id,
      planta_id: detalle.planta_id,
      cantidad: detalle.cantidad,
    }
  })

  if (!Array.isArray(input.evidencia_ids) || input.evidencia_ids.length < 1) {
    throw new Error('El registro requiere al menos una evidencia fotográfica.')
  }
  const evidenciaIds = input.evidencia_ids.filter(
    (id) => Number.isInteger(id) && id > 0,
  )
  if (evidenciaIds.length < 1) {
    throw new Error('Los IDs de evidencia recibidos son inválidos.')
  }

  const coresponsableIds = Array.from(
    new Set((input.coresponsable_ids ?? []).filter((id) => Number.isInteger(id) && id > 0)),
  )

  return {
    subcampania_id: input.subcampania_id,
    es_reposicion: input.es_reposicion ?? false,
    fecha_plantacion: input.fecha_plantacion,
    latitud: input.latitud,
    longitud: input.longitud,
    observaciones: observaciones || undefined,
    coresponsable_ids: coresponsableIds.length > 0 ? coresponsableIds : undefined,
    detalles,
    evidencia_ids: evidenciaIds,
  }
}

function validateUpdateCampaniaInput(input: UpdateCampaniaInput): UpdateCampaniaInput {
  const cleanInput: UpdateCampaniaInput = {}

  if (input.nombre !== undefined) {
    const nombre = normalizeText(input.nombre)
    if (nombre.length < 3 || nombre.length > 200) {
      throw new Error('El nombre de la campaña debe tener entre 3 y 200 caracteres.')
    }
    cleanInput.nombre = nombre
  }
  if (input.tipo !== undefined) {
    if (!TIPOS_CAMPANIA.includes(input.tipo)) {
      throw new Error('Selecciona un tipo de campaña válido.')
    }
    cleanInput.tipo = input.tipo
  }
  if (input.descripcion !== undefined) {
    const descripcion = input.descripcion.trim()
    if (descripcion.length > 1000) {
      throw new Error('La descripción no puede superar los 1000 caracteres.')
    }
    cleanInput.descripcion = descripcion || undefined
  }
  if (input.fecha_estimada_inicio !== undefined) {
    cleanInput.fecha_estimada_inicio = input.fecha_estimada_inicio || undefined
  }
  if (input.fecha_estimada_fin !== undefined) {
    cleanInput.fecha_estimada_fin = input.fecha_estimada_fin || undefined
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

function validatePlanMetas(metas: PlanEspecieMetaInput[]): PlanEspecieMetaInput[] {
  if (!Array.isArray(metas) || metas.length === 0) {
    throw new Error('Agrega al menos una especie al plan de metas.')
  }

  const seen = new Set<number>()

  return metas.map((meta) => {
    const plantaId = Number(meta.planta_id)
    const pct = Number(meta.porcentaje_objetivo)
    const cantidad = Number(meta.cantidad_objetivo)

    if (!Number.isFinite(plantaId) || plantaId <= 0) {
      throw new Error('Especie inválida en el plan de metas.')
    }
    if (seen.has(plantaId)) {
      throw new Error('No se puede repetir una especie en el plan de metas.')
    }
    seen.add(plantaId)
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      throw new Error('El porcentaje por especie debe estar entre 1 y 100.')
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad por especie debe ser mayor a 0.')
    }

    return {
      planta_id: plantaId,
      porcentaje_objetivo: pct,
      cantidad_objetivo: Math.floor(cantidad),
    }
  })
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
