import { validarId, validarRevision } from '../../participacion/api/participacion.contract'
import { coincideCantidadRecepcion } from './recepcion.cantidad'

export type EntradaRecepcion = {
  comando_id: string
  revision_esperada: string
  cantidad_recibida: number
  unidad_recibida: 'G' | 'KG' | 'UNIDAD'
  fecha_recepcion: string
  evidencia_ids: string[]
}
export type EntradaRechazo = {
  comando_id: string
  revision_esperada: string
  motivo_rechazo: string
}
type IdentidadIntencion = { actor_id: string; recoleccion_id: string }
export type IntencionRecepcion = IdentidadIntencion & (
  | { accion: 'RECIBIR'; entrada: EntradaRecepcion }
  | { accion: 'RECHAZAR'; entrada: EntradaRechazo }
)
export type OrigenRecepcion = {
  recoleccion_id: string
  vivero_id: string
  recolector_id: string
  codigo_trazabilidad: string
  fecha_recoleccion: string
  tipo_material: 'SEMILLA' | 'ESQUEJE'
  nombre_cientifico_snapshot: string | null
  nombre_comercial_snapshot: string | null
  nombre_recolector_snapshot: string | null
  cantidad_declarada: number
  unidad_declarada: 'G' | 'UNIDAD'
  saldo_actual: number
  revision: string
  estado_registro: 'BORRADOR' | 'PENDIENTE_VALIDACION' | 'VALIDADO' | 'RECHAZADO'
  motivo_rechazo: string | null
  recepcion: { id: string; fecha_recepcion: string; recibido_por: string; registrado_en: string } | null
  puede_recibir_validar: boolean
  puede_rechazar: boolean
}
export type HistorialRecepcion = {
  id: string
  tipo_historial: string
  estado_origen: string | null
  estado_destino: string
  actor_id: string | null
  fecha: string
  metadata: Record<string, unknown>
}
export type DetalleRecepcion = OrigenRecepcion & {
  observaciones: string | null
  ubicacion_id: string
  metodo_id: string | null
  planta_id: string | null
  ubicacion: {
    id: string
    pais_id: string | null
    division_id: string | null
    nombre: string | null
    referencia: string | null
    latitud: number | null
    longitud: number | null
    precision_m: number | null
    fuente: string | null
  } | null
  historial: HistorialRecepcion[]
  evidencias: {
    id: string
    bucket: string
    ruta_archivo: string
    mime_type: string
    titulo: string | null
    recepcion_id: string | null
    public_url: string
  }[]
}
type ResultadoBase = {
  recoleccion_id: string
  vivero_id: string
  revision_anterior: string
  revision_nueva: string
  actor_id: string
  saldo_actual: number
  registrado_en: string
}
export type ResultadoRecepcion = ResultadoBase & (
  | {
      accion: 'RECIBIR'
      recepcion_id: string
      cantidad_recibida: number
      unidad_recibida: 'G' | 'UNIDAD'
      fecha_recepcion: string
      estado_registro: 'VALIDADO'
      anclaje_externo: 'FUERA_TRANSACCION'
      motivo_rechazo: null
    }
  | {
      accion: 'RECHAZAR'
      recepcion_id: null
      cantidad_recibida: null
      unidad_recibida: null
      fecha_recepcion: null
      estado_registro: 'RECHAZADO'
      anclaje_externo: 'NO_APLICA'
      motivo_rechazo: string
    }
)
export type ReciboRecepcion = {
  comando_id: string
  estado: 'CONFIRMADO' | 'RECHAZADO' | 'SIN_RESULTADO' | 'CONFLICTO_CLAVE'
  resultado: ResultadoRecepcion | null
  error: { codigo: string } | null
  finalizado_en: string | null
}

const assert: (value: unknown) => asserts value = value => {
  if (!value) throw new Error('La respuesta de recepción no cumple el contrato. Conserva la misma operación para recuperarla.')
}
function object(value: unknown): Record<string, unknown> {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  return value as Record<string, unknown>
}
function row(value: unknown, keys: readonly string[]): Record<string, unknown> {
  const result = object(value)
  assert(Object.keys(result).length === keys.length && keys.every(key => Object.hasOwn(result, key)))
  return result
}
function text(value: unknown): asserts value is string { assert(typeof value === 'string') }
function nullableText(value: unknown): void { if (value !== null) text(value) }
function nullableId(value: unknown): void { if (value !== null) validarId(value) }
function number(value: unknown): asserts value is number { assert(typeof value === 'number' && Number.isFinite(value)) }
function commandId(value: unknown): void {
  assert(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value))
}
function date(value: unknown): asserts value is string {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)
}
function instant(value: unknown): void {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)))
}
function reason(value: unknown): void {
  text(value)
  const normalized = value.trim().normalize('NFC')
  assert([...normalized].length >= 10 && [...normalized].length <= 500)
}
function quantity(value: unknown, unit: unknown): void {
  number(value)
  assert(value > 0 && ['G', 'KG', 'UNIDAD'].includes(String(unit)))
  // Decimal base diez, igual que JSON/NUMERIC; no usar tolerancias de coma flotante.
  const [coefficient, exponent = '0'] = String(value).split('e')
  const [integer, fraction = ''] = coefficient.split('.')
  const power = Number(exponent) - fraction.length + (unit === 'KG' ? 9 : unit === 'G' ? 6 : 0)
  assert(power >= 0 || BigInt(integer + fraction) % 10n ** BigInt(-power) === 0n)
}

const receiveKeys = ['comando_id', 'revision_esperada', 'cantidad_recibida', 'unidad_recibida', 'fecha_recepcion', 'evidencia_ids'] as const
const rejectKeys = ['comando_id', 'revision_esperada', 'motivo_rechazo'] as const
export function validarIntencionRecepcion(value: unknown): IntencionRecepcion {
  const intention = row(value, ['accion', 'actor_id', 'recoleccion_id', 'entrada'])
  validarId(intention.actor_id)
  validarId(intention.recoleccion_id)
  assert(intention.accion === 'RECIBIR' || intention.accion === 'RECHAZAR')
  const input = row(intention.entrada, intention.accion === 'RECIBIR' ? receiveKeys : rejectKeys)
  commandId(input.comando_id)
  validarRevision(input.revision_esperada)
  if (intention.accion === 'RECIBIR') {
    quantity(input.cantidad_recibida, input.unidad_recibida)
    date(input.fecha_recepcion)
    assert(Array.isArray(input.evidencia_ids) && input.evidencia_ids.length >= 1 && input.evidencia_ids.length <= 5)
    assert(new Set(input.evidencia_ids).size === input.evidencia_ids.length)
    input.evidencia_ids.forEach(validarId)
  } else reason(input.motivo_rechazo)
  return structuredClone(value) as IntencionRecepcion
}

const originKeys = [
  'recoleccion_id', 'vivero_id', 'recolector_id', 'codigo_trazabilidad', 'fecha_recoleccion', 'tipo_material',
  'nombre_cientifico_snapshot', 'nombre_comercial_snapshot', 'nombre_recolector_snapshot', 'cantidad_declarada',
  'unidad_declarada', 'saldo_actual', 'revision', 'estado_registro', 'motivo_rechazo', 'recepcion', 'puede_recibir_validar', 'puede_rechazar',
] as const
const detailKeys = ['observaciones', 'ubicacion_id', 'metodo_id', 'planta_id', 'ubicacion', 'historial', 'evidencias'] as const
export function validarOrigenRecepcion(value: unknown, detalle = false): OrigenRecepcion | DetalleRecepcion {
  const origin = row(value, detalle ? [...originKeys, ...detailKeys] : originKeys)
  for (const key of ['recoleccion_id', 'vivero_id', 'recolector_id']) validarId(origin[key])
  validarRevision(origin.revision)
  text(origin.codigo_trazabilidad)
  assert(['SEMILLA', 'ESQUEJE'].includes(String(origin.tipo_material)))
  assert(['BORRADOR', 'PENDIENTE_VALIDACION', 'VALIDADO', 'RECHAZADO'].includes(String(origin.estado_registro)))
  for (const key of ['nombre_cientifico_snapshot', 'nombre_comercial_snapshot', 'nombre_recolector_snapshot', 'motivo_rechazo']) nullableText(origin[key])
  date(origin.fecha_recoleccion)
  assert(origin.unidad_declarada === 'G' || origin.unidad_declarada === 'UNIDAD')
  quantity(origin.cantidad_declarada, origin.unidad_declarada)
  number(origin.saldo_actual)
  assert(origin.saldo_actual >= 0)
  if (origin.tipo_material === 'ESQUEJE') assert(origin.unidad_declarada === 'UNIDAD')
  if (origin.unidad_declarada === 'UNIDAD') assert(Number.isInteger(origin.saldo_actual))
  for (const key of ['puede_recibir_validar', 'puede_rechazar']) assert(typeof origin[key] === 'boolean')
  if (origin.recepcion !== null) {
    const receipt = row(origin.recepcion, ['id', 'fecha_recepcion', 'recibido_por', 'registrado_en'])
    validarId(receipt.id)
    validarId(receipt.recibido_por)
    date(receipt.fecha_recepcion)
    instant(receipt.registrado_en)
  }
  if (detalle) {
    nullableText(origin.observaciones)
    validarId(origin.ubicacion_id)
    nullableId(origin.metodo_id)
    nullableId(origin.planta_id)
    if (origin.ubicacion !== null) {
      const location = row(origin.ubicacion, ['id', 'pais_id', 'division_id', 'nombre', 'referencia', 'latitud', 'longitud', 'precision_m', 'fuente'])
      validarId(location.id)
      assert(location.id === origin.ubicacion_id)
      nullableId(location.pais_id)
      nullableId(location.division_id)
      for (const key of ['nombre', 'referencia', 'fuente']) nullableText(location[key])
      for (const key of ['latitud', 'longitud', 'precision_m']) if (location[key] !== null) number(location[key])
    }
    assert(Array.isArray(origin.historial) && Array.isArray(origin.evidencias))
    for (const value of origin.historial) {
      const history = row(value, ['id', 'tipo_historial', 'estado_origen', 'estado_destino', 'actor_id', 'fecha', 'metadata'])
      validarId(history.id)
      nullableId(history.actor_id)
      text(history.tipo_historial)
      nullableText(history.estado_origen)
      text(history.estado_destino)
      // La tabla real proyecta TIMESTAMPTZ; OpenAPI y el fixture aislado
      // documentan date. Conservar cualquiera de las dos formas sin truncar.
      if (typeof history.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(history.fecha)) date(history.fecha)
      else instant(history.fecha)
      object(history.metadata)
    }
    for (const value of origin.evidencias) {
      const evidence = row(value, ['id', 'bucket', 'ruta_archivo', 'mime_type', 'titulo', 'recepcion_id', 'public_url'])
      validarId(evidence.id)
      nullableId(evidence.recepcion_id)
      nullableText(evidence.titulo)
      for (const key of ['bucket', 'ruta_archivo', 'mime_type']) text(evidence[key])
      text(evidence.public_url)
      assert(/^https?:\/\//.test(evidence.public_url))
    }
  }
  return value as OrigenRecepcion | DetalleRecepcion
}

export function validarReciboRecepcion(value: unknown, intento: IntencionRecepcion): ReciboRecepcion {
  const receipt = row(value, ['comando_id', 'estado', 'resultado', 'error', 'finalizado_en'])
  assert(receipt.comando_id === intento.entrada.comando_id)
  assert(['CONFIRMADO', 'RECHAZADO', 'SIN_RESULTADO', 'CONFLICTO_CLAVE'].includes(String(receipt.estado)))
  if (receipt.estado === 'CONFIRMADO') {
    instant(receipt.finalizado_en)
    assert(receipt.error === null)
    const result = row(receipt.resultado, [
      'accion', 'recoleccion_id', 'vivero_id', 'recepcion_id', 'revision_anterior', 'revision_nueva', 'cantidad_recibida',
      'unidad_recibida', 'fecha_recepcion', 'actor_id', 'saldo_actual', 'estado_registro', 'anclaje_externo', 'motivo_rechazo', 'registrado_en',
    ])
    for (const key of ['recoleccion_id', 'vivero_id', 'actor_id']) validarId(result[key])
    assert(result.accion === intento.accion && result.recoleccion_id === intento.recoleccion_id && result.actor_id === intento.actor_id)
    assert(result.revision_anterior === intento.entrada.revision_esperada)
    assert(BigInt(validarRevision(result.revision_nueva)) === BigInt(validarRevision(result.revision_anterior)) + 1n)
    instant(result.registrado_en)
    number(result.saldo_actual)
    assert(result.saldo_actual >= 0)
    if (intento.accion === 'RECIBIR') {
      validarId(result.recepcion_id)
      assert(result.estado_registro === 'VALIDADO' && result.motivo_rechazo === null && result.anclaje_externo === 'FUERA_TRANSACCION')
      assert(result.unidad_recibida === 'G' || result.unidad_recibida === 'UNIDAD')
      quantity(result.cantidad_recibida, result.unidad_recibida)
      date(result.fecha_recepcion)
      assert(result.fecha_recepcion === intento.entrada.fecha_recepcion)
      assert(coincideCantidadRecepcion(intento.entrada.cantidad_recibida, intento.entrada.unidad_recibida, result.cantidad_recibida as number, result.unidad_recibida))
      assert(result.saldo_actual === result.cantidad_recibida)
    } else {
      assert(result.estado_registro === 'RECHAZADO' && result.anclaje_externo === 'NO_APLICA')
      assert(result.recepcion_id === null && result.cantidad_recibida === null && result.unidad_recibida === null && result.fecha_recepcion === null)
      reason(result.motivo_rechazo)
      assert(result.motivo_rechazo === intento.entrada.motivo_rechazo.trim().normalize('NFC'))
    }
  } else {
    assert(receipt.resultado === null)
    if (receipt.estado === 'RECHAZADO') {
      instant(receipt.finalizado_en)
      text(row(receipt.error, ['codigo']).codigo)
      assert((receipt.error as { codigo: string }).codigo.trim())
    } else {
      assert(receipt.finalizado_en === null)
      if (receipt.estado === 'SIN_RESULTADO') assert(receipt.error === null)
      else assert(row(receipt.error, ['codigo']).codigo === 'CLAVE_REUTILIZADA')
    }
  }
  return value as ReciboRecepcion
}

export function validarColaRecepcion(value: unknown): { data: OrigenRecepcion[]; siguiente_antes_de_id: string | null } {
  const result = row(value, ['data', 'siguiente_antes_de_id'])
  assert(Array.isArray(result.data))
  nullableId(result.siguiente_antes_de_id)
  const data = result.data.map(origin => validarOrigenRecepcion(origin) as OrigenRecepcion)
  assert(new Set(data.map(origin => origin.recoleccion_id)).size === data.length)
  return { data, siguiente_antes_de_id: result.siguiente_antes_de_id as string | null }
}
