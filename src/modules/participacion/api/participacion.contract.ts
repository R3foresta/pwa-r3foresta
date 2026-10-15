import type {
  AccesoResultado, AccionesParticipacion, BuscarEntrada, CapacidadSubcampania,
  CapacidadesLectura, CambioUsuario, ErrorEstable, IntentoAcceso, MiembroParticipacion,
  MiembrosLectura, PersonaMinima, PersonasLectura, ReciboAcceso, RevisarEntrada,
  RevisionAmbito, RevisionLectura,
} from '../types'

export class ParticipacionContratoError extends Error {
  readonly resultado_concluyente = false
  constructor(message = 'La respuesta del servidor no corresponde al contrato de participación. El resultado no está confirmado.') {
    super(message)
    this.name = 'ParticipacionContratoError'
  }
}

function fail(): never { throw new ParticipacionContratoError() }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  return value as Record<string, unknown>
}
function row(value: unknown, expected: string[]): Record<string, unknown> {
  const result = object(value)
  if (Object.keys(result).length !== expected.length || expected.some(key => !Object.hasOwn(result, key))) return fail()
  return result
}
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) return fail(); return value }
function nullableText(value: unknown): string | null { return value === null ? null : text(value) }
function boolean(value: unknown): boolean { if (typeof value !== 'boolean') return fail(); return value }
function oneOf<const T extends readonly (string | null)[]>(value: unknown, values: T): T[number] {
  if (!values.includes(value as T[number])) return fail()
  return value as T[number]
}
function array<T>(value: unknown, parse: (item: unknown) => T, min = 0, max = 100): T[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) return fail()
  return value.map(parse)
}
function unique<T>(values: T[], key: (value: T) => string): T[] {
  if (new Set(values.map(key)).size !== values.length) return fail()
  return values
}
export function validarId(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) return fail()
  return value
}
export function validarRevision(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(value) || BigInt(value) > 9223372036854775807n) return fail()
  return value
}
function commandId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) return fail()
  return value
}
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) || !Number.isFinite(Date.parse(value))) return fail()
  return value
}
function cursor(value: unknown): string | null {
  if (value === null) return null
  const result = text(value)
  if (result.length > 1024) return fail()
  return result
}
const permissions = ['PLANTADOR', 'ADMINISTRADOR_SUBCAMPANIA', null] as const
const operations = ['OTORGAR_PLANTADOR', 'RETIRAR_PLANTADOR', 'DESIGNAR_ADMINISTRADOR', 'CAMBIAR_ADMINISTRADOR_A_PLANTADOR', 'RETIRAR_ADMINISTRADOR', 'REEMPLAZAR_ADMINISTRADOR'] as const
const actionKeys: (keyof AccionesParticipacion)[] = ['preparar_registro', 'registrar_inicial', 'incorporar_plantador', 'retirar_plantador', 'designar_administrador', 'cambiar_administrador', 'retirar_administrador', 'reemplazar_administrador']

function actions(value: unknown): AccionesParticipacion {
  const result = row(value, actionKeys)
  return Object.fromEntries(actionKeys.map(key => [key, boolean(result[key])])) as AccionesParticipacion
}
function capability(value: unknown): CapacidadSubcampania {
  const result = row(value, ['campania_id', 'campania_nombre', 'subcampania_id', 'nombre', 'estado', 'permiso_contextual', 'revision_permiso', 'fuente_autoridad', 'acciones'])
  return {
    campania_id: validarId(result.campania_id), campania_nombre: text(result.campania_nombre),
    subcampania_id: validarId(result.subcampania_id), nombre: text(result.nombre),
    estado: oneOf(result.estado, ['BORRADOR', 'ACTIVA', 'COMPLETADA', 'FINALIZADA_PARCIAL', 'PAUSADA', 'CANCELADA']),
    permiso_contextual: oneOf(result.permiso_contextual, permissions), revision_permiso: validarRevision(result.revision_permiso),
    fuente_autoridad: oneOf(result.fuente_autoridad, ['GLOBAL', 'CONTEXTUAL']), acciones: actions(result.acciones),
  }
}
export function validarCapacidades(value: unknown): CapacidadesLectura {
  const result = row(value, ['data', 'observado_en', 'siguiente_cursor'])
  const data = row(result.data, ['actor', 'capacidades_globales', 'subcampanias'])
  const actor = row(data.actor, ['usuario_id', 'rol_global'])
  const global = row(data.capacidades_globales, ['asignar_roles', 'designar_administradores', 'leer_plan'])
  return {
    data: {
      actor: { usuario_id: validarId(actor.usuario_id), rol_global: oneOf(actor.rol_global, ['ADMIN', 'GENERAL', 'VALIDADOR', 'VOLUNTARIO']) },
      capacidades_globales: { asignar_roles: boolean(global.asignar_roles), designar_administradores: boolean(global.designar_administradores), leer_plan: boolean(global.leer_plan) },
      subcampanias: unique(array(data.subcampanias, capability), item => item.subcampania_id),
    },
    observado_en: timestamp(result.observado_en), siguiente_cursor: cursor(result.siguiente_cursor),
  }
}
function personFields(result: Record<string, unknown>): PersonaMinima {
  return { usuario_id: validarId(result.usuario_id), nombre: text(result.nombre), organizacion: nullableText(result.organizacion) }
}
function person(value: unknown): PersonaMinima { return personFields(row(value, ['usuario_id', 'nombre', 'organizacion'])) }
function member(value: unknown): MiembroParticipacion {
  const result = row(value, ['usuario_id', 'nombre', 'organizacion', 'permiso_contextual', 'revision_permiso', 'acceso_global', 'etiqueta_acceso_global', 'responsabilidad_logistica'])
  const acceso_global = boolean(result.acceso_global)
  const etiqueta_acceso_global = oneOf(result.etiqueta_acceso_global, ['Administrador · Acceso global', null])
  if (acceso_global !== (etiqueta_acceso_global !== null)) return fail()
  return {
    ...personFields(result), permiso_contextual: oneOf(result.permiso_contextual, permissions),
    revision_permiso: validarRevision(result.revision_permiso), acceso_global, etiqueta_acceso_global,
    responsabilidad_logistica: oneOf(result.responsabilidad_logistica, ['COORDINADOR', 'OPERARIO', null]),
  }
}
export function validarMiembros(value: unknown): MiembrosLectura {
  const result = row(value, ['data', 'observado_en', 'siguiente_cursor'])
  return { data: unique(array(result.data, member), item => item.usuario_id), observado_en: timestamp(result.observado_en), siguiente_cursor: cursor(result.siguiente_cursor) }
}
export function validarPersonas(value: unknown): PersonasLectura {
  const result = row(value, ['data', 'observado_en', 'siguiente_cursor'])
  return { data: unique(array(result.data, person, 0, 20), item => item.usuario_id), observado_en: timestamp(result.observado_en), siguiente_cursor: cursor(result.siguiente_cursor) }
}
function revisionScope(value: unknown): RevisionAmbito {
  const result = row(value, ['subcampania_id', 'permiso_contextual', 'revision_permiso', 'acceso_global'])
  return { subcampania_id: validarId(result.subcampania_id), permiso_contextual: oneOf(result.permiso_contextual, permissions), revision_permiso: validarRevision(result.revision_permiso), acceso_global: boolean(result.acceso_global) }
}
function exactIds(actual: string[], expected: string[]) {
  if (actual.length !== expected.length || new Set(actual).size !== actual.length || actual.some(item => !expected.includes(item))) return fail()
}
export function validarRevisionAccesos(value: unknown, input: RevisarEntrada): RevisionLectura {
  const result = row(value, ['data', 'observado_en'])
  const data = row(result.data, ['usuario', 'ambitos'])
  const usuario = person(data.usuario)
  const ambitos = unique(array(data.ambitos, revisionScope, 1), item => item.subcampania_id)
  if (usuario.usuario_id !== input.usuario_destino_id) return fail()
  exactIds(ambitos.map(item => item.subcampania_id), input.subcampania_ids)
  return { data: { usuario, ambitos }, observado_en: timestamp(result.observado_en) }
}
export function validarErrorEstable(value: unknown): ErrorEstable {
  const result = row(value, ['codigo', 'mensaje', 'campos', 'ambitos', 'reintento'])
  return {
    codigo: text(result.codigo), mensaje: text(result.mensaje), campos: array(result.campos, text),
    ambitos: unique(array(result.ambitos, validarId), item => item),
    reintento: oneOf(result.reintento, ['MISMA_CLAVE', 'NUEVA_CONFIRMACION', 'RECUPERAR_SESION', 'NO_APLICA']),
  }
}
export function validarErrorFueraRecibo(value: unknown): { error: ErrorEstable; comando_id: string | null; resultado_concluyente: false } {
  const result = row(value, ['error', 'comando_id', 'resultado_concluyente'])
  if (result.resultado_concluyente !== false) return fail()
  return { error: validarErrorEstable(result.error), comando_id: result.comando_id === null ? null : commandId(result.comando_id), resultado_concluyente: false }
}
function scopeIds(value: unknown): string[] { return unique(array(value, validarId, 1), item => item) }
export function validarBusqueda(input: BuscarEntrada): BuscarEntrada {
  // La consulta privada viaja en POST y se descarta después de esta lectura.
  const consulta = input.consulta.normalize('NFC').trim()
  const modo = oneOf(input.modo, ['NOMBRE', 'CORREO_EXACTO'])
  if (consulta.length < (modo === 'NOMBRE' ? 2 : 1) || consulta.length > (modo === 'NOMBRE' ? 100 : 254)) return fail()
  return { modo, consulta, accion: oneOf(input.accion, ['OTORGAR_PLANTADOR', 'DESIGNAR_ADMINISTRADOR', 'REEMPLAZAR_ADMINISTRADOR']), subcampania_ids: scopeIds(input.subcampania_ids), ...validarPagina(input, 20) }
}
export function validarPagina(input: { cursor?: string; limite?: number }, max = 100): { cursor?: string; limite?: number } {
  const result: { cursor?: string; limite?: number } = {}
  if (input.cursor !== undefined) result.cursor = cursor(input.cursor) ?? fail()
  if (input.limite !== undefined) {
    if (!Number.isInteger(input.limite) || input.limite < 1 || input.limite > max) return fail()
    result.limite = input.limite
  }
  return result
}
export function validarEntradaRevision(input: RevisarEntrada): RevisarEntrada {
  return { usuario_destino_id: validarId(input.usuario_destino_id), subcampania_ids: scopeIds(input.subcampania_ids) }
}
export function validarIntentoAcceso(value: unknown): IntentoAcceso {
  const input = row(value, ['actor_id', 'operacion', 'payload'])
  const actor_id = validarId(input.actor_id)
  const operacion = oneOf(input.operacion, operations)
  if (operacion === 'REEMPLAZAR_ADMINISTRADOR') {
    const payload = row(input.payload, ['comando_id', 'usuario_saliente_id', 'usuario_reemplazo_id', 'tratamiento_saliente', 'ambitos'])
    const usuario_saliente_id = validarId(payload.usuario_saliente_id)
    const usuario_reemplazo_id = validarId(payload.usuario_reemplazo_id)
    if (usuario_saliente_id === usuario_reemplazo_id) return fail()
    return { actor_id, operacion, payload: {
      comando_id: commandId(payload.comando_id), usuario_saliente_id, usuario_reemplazo_id,
      tratamiento_saliente: oneOf(payload.tratamiento_saliente, ['PLANTADOR', 'SIN_ACCESO']),
      ambitos: unique(array(payload.ambitos, value => {
        const item = row(value, ['subcampania_id', 'revision_saliente_esperada', 'revision_reemplazo_esperada'])
        return { subcampania_id: validarId(item.subcampania_id), revision_saliente_esperada: validarRevision(item.revision_saliente_esperada), revision_reemplazo_esperada: validarRevision(item.revision_reemplazo_esperada) }
      }, 1), item => item.subcampania_id),
    } }
  }
  const payload = row(input.payload, ['comando_id', 'usuario_destino_id', 'ambitos'])
  return { actor_id, operacion, payload: {
    comando_id: commandId(payload.comando_id), usuario_destino_id: validarId(payload.usuario_destino_id),
    ambitos: unique(array(payload.ambitos, value => {
      const item = row(value, ['subcampania_id', 'revision_esperada'])
      return { subcampania_id: validarId(item.subcampania_id), revision_esperada: validarRevision(item.revision_esperada) }
    }, 1), item => item.subcampania_id),
  } }
}
function change(value: unknown): CambioUsuario {
  const result = row(value, ['usuario_id', 'permiso_anterior', 'permiso_nuevo', 'revision_anterior', 'revision_nueva', 'cambio', 'conserva_acceso_global'])
  return {
    usuario_id: validarId(result.usuario_id), permiso_anterior: oneOf(result.permiso_anterior, permissions), permiso_nuevo: oneOf(result.permiso_nuevo, permissions),
    revision_anterior: validarRevision(result.revision_anterior), revision_nueva: validarRevision(result.revision_nueva),
    cambio: oneOf(result.cambio, ['CAMBIO_APLICADO', 'SIN_CAMBIOS']), conserva_acceso_global: boolean(result.conserva_acceso_global),
  }
}
function validateEffect(item: CambioUsuario, expectedRevision: string, next: CambioUsuario['permiso_nuevo'], previous: CambioUsuario['permiso_anterior'][]) {
  if (item.revision_anterior !== expectedRevision || item.permiso_nuevo !== next || !previous.includes(item.permiso_anterior)) return fail()
  const same = item.permiso_anterior === item.permiso_nuevo
  if (item.cambio !== (same ? 'SIN_CAMBIOS' : 'CAMBIO_APLICADO') || BigInt(item.revision_nueva) !== BigInt(expectedRevision) + (same ? 0n : 1n)) return fail()
}
function accessResult(value: unknown, intento: IntentoAcceso): AccesoResultado {
  const result = row(value, ['tipo', 'cambios'])
  if (result.tipo !== 'ACCESO') return fail()
  const cambios = unique(array(result.cambios, value => {
    const item = row(value, ['subcampania_id', 'usuarios'])
    return { subcampania_id: validarId(item.subcampania_id), usuarios: unique(array(item.usuarios, change, 1, 2), user => user.usuario_id) }
  }, 1), item => item.subcampania_id)
  exactIds(cambios.map(item => item.subcampania_id), intento.payload.ambitos.map(item => item.subcampania_id))
  for (const scope of cambios) {
    if (intento.operacion === 'REEMPLAZAR_ADMINISTRADOR') {
      const expected = intento.payload.ambitos.find(item => item.subcampania_id === scope.subcampania_id)!
      exactIds(scope.usuarios.map(item => item.usuario_id), [intento.payload.usuario_saliente_id, intento.payload.usuario_reemplazo_id])
      const outgoing = scope.usuarios.find(item => item.usuario_id === intento.payload.usuario_saliente_id)!
      const incoming = scope.usuarios.find(item => item.usuario_id === intento.payload.usuario_reemplazo_id)!
      validateEffect(outgoing, expected.revision_saliente_esperada, intento.payload.tratamiento_saliente === 'PLANTADOR' ? 'PLANTADOR' : null, ['ADMINISTRADOR_SUBCAMPANIA'])
      validateEffect(incoming, expected.revision_reemplazo_esperada, 'ADMINISTRADOR_SUBCAMPANIA', [null, 'PLANTADOR', 'ADMINISTRADOR_SUBCAMPANIA'])
    } else {
      const expected = intento.payload.ambitos.find(item => item.subcampania_id === scope.subcampania_id)!
      exactIds(scope.usuarios.map(item => item.usuario_id), [intento.payload.usuario_destino_id])
      const item = scope.usuarios[0]
      switch (intento.operacion) {
        case 'OTORGAR_PLANTADOR': validateEffect(item, expected.revision_esperada, 'PLANTADOR', [null, 'PLANTADOR']); break
        case 'RETIRAR_PLANTADOR': validateEffect(item, expected.revision_esperada, null, [null, 'PLANTADOR']); break
        case 'DESIGNAR_ADMINISTRADOR': validateEffect(item, expected.revision_esperada, 'ADMINISTRADOR_SUBCAMPANIA', [null, 'PLANTADOR', 'ADMINISTRADOR_SUBCAMPANIA']); break
        case 'CAMBIAR_ADMINISTRADOR_A_PLANTADOR': validateEffect(item, expected.revision_esperada, 'PLANTADOR', ['ADMINISTRADOR_SUBCAMPANIA']); break
        case 'RETIRAR_ADMINISTRADOR': validateEffect(item, expected.revision_esperada, null, ['ADMINISTRADOR_SUBCAMPANIA']); break
      }
    }
  }
  return { tipo: 'ACCESO', cambios }
}
export function validarReciboAcceso(value: unknown, intentoValue: IntentoAcceso): ReciboAcceso {
  const intento = validarIntentoAcceso(intentoValue)
  const result = row(value, ['comando_id', 'operacion', 'finalizado_en', 'estado', 'resultado', 'error'])
  const comando_id = commandId(result.comando_id)
  const operacion = oneOf(result.operacion, operations)
  if (comando_id !== intento.payload.comando_id || operacion !== intento.operacion) return fail()
  const base = { comando_id, operacion, finalizado_en: timestamp(result.finalizado_en) }
  if (result.estado === 'CONFIRMADO' && result.error === null) return { ...base, estado: 'CONFIRMADO', resultado: accessResult(result.resultado, intento), error: null }
  if (result.estado === 'RECHAZADO' && result.resultado === null) {
    const error = validarErrorEstable(result.error)
    if (error.ambitos.some(id => !intento.payload.ambitos.some(item => item.subcampania_id === id))) return fail()
    return { ...base, estado: 'RECHAZADO', resultado: null, error }
  }
  return fail()
}
