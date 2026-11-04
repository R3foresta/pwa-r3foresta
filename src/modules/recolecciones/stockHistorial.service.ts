import { RecoleccionRequestError, type ApiPagination } from '../../services/recolecciones.service'

export interface StockHistorialPlanta {
  planta_id: number
  especie: string
  nombre_cientifico: string | null
  variedad: string | null
  nombre_comun_principal: string | null
  imagen_url: string | null
}

export interface StockHistorialRegistro {
  id: number
  planta_id: number
  fecha: string
  codigo_trazabilidad: string
  nombre_recolector_snapshot: string | null
  unidad_canonica: 'G' | 'UNIDAD'
  cantidad_inicial_canonica: number | string | null
  saldo_actual: number
  estado_operativo: 'ABIERTO' | 'CERRADO'
  estado_registro: 'VALIDADO'
  tipo_material: 'SEMILLA'
}

export interface StockDisponibilidad {
  gramos_disponibles: number
  unidades_disponibles: number
}

export interface StockHistorialResult {
  planta: StockHistorialPlanta
  data: StockHistorialRegistro[]
  pagination: ApiPagination
}

const apiUrl = import.meta.env.VITE_API_URL

async function readJson(path: string, token: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  if (!response.ok) throw new RecoleccionRequestError('No se pudo completar la consulta.', response.status)
  try {
    return await response.json() as unknown
  } catch {
    throw new Error('El servidor devolvió una respuesta inválida.')
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}
function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}
function isPlanta(value: unknown, plantaId: number): value is StockHistorialPlanta {
  return isObject(value) && value.planta_id === plantaId && typeof value.especie === 'string' &&
    isNullableString(value.nombre_cientifico) && isNullableString(value.variedad) &&
    isNullableString(value.nombre_comun_principal) && isNullableString(value.imagen_url)
}
function isRegistro(value: unknown, plantaId: number): value is StockHistorialRegistro {
  if (!isObject(value)) return false
  const cantidad = value.cantidad_inicial_canonica
  const validCantidad = cantidad === null || isNonNegativeNumber(cantidad) ||
    (typeof cantidad === 'string' && cantidad.trim() !== '' && Number.isFinite(Number(cantidad)) && Number(cantidad) >= 0)
  const validPrecision = (amount: number) => value.unidad_canonica === 'UNIDAD'
    ? Number.isSafeInteger(amount)
    : Number.isSafeInteger(Math.round(amount * 10)) && Math.abs(amount * 10 - Math.round(amount * 10)) < 1e-8
  return (cantidad === null || (validCantidad && validPrecision(Number(cantidad)))) &&
    isNonNegativeNumber(value.saldo_actual) && validPrecision(value.saldo_actual) && isPositiveInteger(value.id) && value.planta_id === plantaId && typeof value.fecha === 'string' &&
    typeof value.codigo_trazabilidad === 'string' && isNullableString(value.nombre_recolector_snapshot) &&
    (value.unidad_canonica === 'G' || value.unidad_canonica === 'UNIDAD') && validCantidad &&
    (value.estado_operativo === 'ABIERTO' || value.estado_operativo === 'CERRADO') &&
    value.estado_registro === 'VALIDADO' && value.tipo_material === 'SEMILLA'
}
function isPagination(value: unknown, page: number): value is ApiPagination {
  return isObject(value) && value.page === page && isPositiveInteger(value.limit) &&
    typeof value.total === 'number' && Number.isSafeInteger(value.total) && value.total >= 0 &&
    typeof value.totalPages === 'number' && Number.isSafeInteger(value.totalPages) && value.totalPages >= 0 &&
    typeof value.hasNextPage === 'boolean' && typeof value.hasPrevPage === 'boolean'
}

export async function getStockHistorial(plantaId: number, page: number, token: string, signal: AbortSignal): Promise<StockHistorialResult> {
  const value = await readJson(`/api/recolecciones/stock-summary/${plantaId}/historial?page=${page}&limit=10`, token, signal)
  if (!isObject(value) || value.success !== true || !isPlanta(value.planta, plantaId) ||
    !Array.isArray(value.data) || !value.data.every(item => isRegistro(item, plantaId)) ||
    !isPagination(value.pagination, page)) {
    throw new Error('El servidor devolvió una respuesta inválida.')
  }
  return { planta: value.planta, data: value.data, pagination: value.pagination }
}

export async function getStockDisponibilidad(plantaId: number, token: string, signal: AbortSignal): Promise<StockDisponibilidad | null> {
  const value = await readJson('/api/recolecciones/stock-summary', token, signal)
  if (!isObject(value) || value.success !== true || !Array.isArray(value.data)) throw new Error('El servidor devolvió una respuesta inválida.')
  const item: unknown = value.data.find((candidate: unknown) => isObject(candidate) && candidate.planta_id === plantaId)
  if (!item) return null
  if (!isObject(item)) throw new Error('El servidor devolvió una respuesta inválida.')
  const parseAmount = (amount: unknown): number | null => {
    if ((typeof amount !== 'number' && typeof amount !== 'string') || (typeof amount === 'string' && !amount.trim())) return null
    const parsed = Number(amount)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  }
  const gramos = parseAmount(item.gramos_disponibles)
  const unidades = parseAmount(item.unidades_disponibles)
  if (gramos === null || unidades === null || !Number.isSafeInteger(unidades) ||
    !Number.isSafeInteger(Math.round(gramos * 10)) || Math.abs(gramos * 10 - Math.round(gramos * 10)) >= 1e-8) {
    throw new Error('El servidor devolvió una respuesta inválida.')
  }
  return { gramos_disponibles: gramos, unidades_disponibles: unidades }
}
