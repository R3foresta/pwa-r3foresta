import { row, text } from '../../accesos/accesos.contract'
import { verificarActorParticipacion } from '../../participacion/api/participacion.api'
import { validarId, validarRevision } from '../../participacion/api/participacion.contract'
import { requestPrivada } from '../../participacion/api/participacion.transport'

const ESTADOS = ['FUERA_PADRON', 'PENDIENTE', 'CONFORME', 'INCIDENCIA', 'RETIRADO'] as const

function contratoInvalido(): never {
  throw new Error('La ficha de conciliación no corresponde al origen solicitado.')
}

function campoOpcional<T>(value: unknown, validar: (value: unknown) => T): T | null {
  return value === null ? null : validar(value)
}

function lista<T>(value: unknown, validar: (value: unknown) => T): T[] {
  if (!Array.isArray(value)) return contratoInvalido()
  return value.map(validar)
}

function cantidad(value: unknown): string {
  const decimal = text(value)
  if (!/^(?:-?\d+(?:\.\d+)?|NaN|-?Infinity)$/.test(decimal)) return contratoInvalido()
  return decimal
}

function unidad(value: unknown): 'G' | 'UNIDAD' {
  if (value !== 'G' && value !== 'UNIDAD') return contratoInvalido()
  return value
}

function marca(value: unknown): string {
  const huella = text(value)
  if (!/^[0-9a-f]{64}$/.test(huella)) return contratoInvalido()
  return huella
}

function estadoFicha(value: unknown) {
  return ESTADOS.find(estado => estado === value) ?? contratoInvalido()
}

export function validarFichaConciliacion(value: unknown, origen: string) {
  const ficha = row(value, [
    'recoleccion_id', 'vivero_id', 'codigo_trazabilidad', 'fecha_recoleccion', 'revision_captura',
    'revision', 'en_padron', 'estado', 'cantidad_inicial', 'saldo_actual', 'unidad_canonica',
    'saldo_calculado', 'marca_movimientos', 'trazabilidad_conforme', 'inconsistencias', 'ultimo_movimiento_en',
    'puede_conciliar', 'movimientos', 'lotes', 'asignaciones', 'historial', 'evidencias',
  ])
  const recoleccion_id = validarId(ficha.recoleccion_id)
  if (recoleccion_id !== origen || typeof ficha.en_padron !== 'boolean' ||
    (ficha.codigo_trazabilidad !== null && typeof ficha.codigo_trazabilidad !== 'string') || typeof ficha.puede_conciliar !== 'boolean' || typeof ficha.trazabilidad_conforme !== 'boolean') return contratoInvalido()

  return {
    recoleccion_id,
    vivero_id: validarId(ficha.vivero_id),
    codigo_trazabilidad: ficha.codigo_trazabilidad,
    fecha_recoleccion: text(ficha.fecha_recoleccion),
    revision_captura: validarRevision(ficha.revision_captura),
    revision: validarRevision(ficha.revision),
    en_padron: ficha.en_padron,
    estado: estadoFicha(ficha.estado),
    cantidad_inicial: cantidad(ficha.cantidad_inicial),
    saldo_actual: cantidad(ficha.saldo_actual),
    unidad_canonica: unidad(ficha.unidad_canonica),
    saldo_calculado: cantidad(ficha.saldo_calculado),
    marca_movimientos: marca(ficha.marca_movimientos),
    ultimo_movimiento_en: campoOpcional(ficha.ultimo_movimiento_en, text),
    trazabilidad_conforme: ficha.trazabilidad_conforme,
    inconsistencias: lista(ficha.inconsistencias, text),
    puede_conciliar: ficha.puede_conciliar,
    movimientos: lista(ficha.movimientos, value => {
      const m = row(value, ['id', 'tipo', 'delta', 'unidad', 'lote_id', 'evento_id', 'fecha'])
      return { id: validarId(m.id), tipo: text(m.tipo), delta: cantidad(m.delta), unidad: campoOpcional(m.unidad, text),
        lote_id: campoOpcional(m.lote_id, validarId), evento_id: campoOpcional(m.evento_id, text), fecha: campoOpcional(m.fecha, text) }
    }),
    lotes: lista(ficha.lotes, value => {
      const l = row(value, ['id', 'vivero_id', 'codigo_trazabilidad', 'cantidad_inicial', 'unidad', 'evento_inicio_ids'])
      return { id: validarId(l.id), vivero_id: validarId(l.vivero_id), codigo_trazabilidad: text(l.codigo_trazabilidad),
        cantidad_inicial: cantidad(l.cantidad_inicial), unidad: unidad(l.unidad), evento_inicio_ids: lista(l.evento_inicio_ids, validarId) }
    }),
    asignaciones: lista(ficha.asignaciones, value => {
      const a = row(value, ['id', 'lote_id', 'subcampania_id'])
      return { id: validarId(a.id), lote_id: validarId(a.lote_id), subcampania_id: validarId(a.subcampania_id) }
    }),
    historial: lista(ficha.historial, value => {
      const h = row(value, [
        'id', 'accion', 'estado', 'actor_id', 'revision', 'motivo', 'saldo_esperado',
        'cantidad_observada', 'unidad_observada', 'fecha_comprobacion', 'marca_movimientos',
        'inconsistencias', 'registrado_en',
      ])
      return { id: validarId(h.id), accion: text(h.accion), estado: estadoFicha(h.estado), actor_id: validarId(h.actor_id),
        revision: validarRevision(h.revision), motivo: campoOpcional(h.motivo, text), saldo_esperado: campoOpcional(h.saldo_esperado, cantidad),
        cantidad_observada: campoOpcional(h.cantidad_observada, cantidad), unidad_observada: campoOpcional(h.unidad_observada, unidad),
        fecha_comprobacion: campoOpcional(h.fecha_comprobacion, text), marca_movimientos: campoOpcional(h.marca_movimientos, marca),
        inconsistencias: lista(h.inconsistencias, text), registrado_en: text(h.registrado_en) }
    }),
    evidencias: lista(ficha.evidencias, value => {
      const e = row(value, ['id', 'observacion_id', 'titulo', 'mime_type'])
      return { id: validarId(e.id), observacion_id: validarId(e.observacion_id), titulo: campoOpcional(e.titulo, text), mime_type: text(e.mime_type) }
    }),
  }
}

export type FichaConciliacion = ReturnType<typeof validarFichaConciliacion>

export const ConciliacionService = {
  async detalle(actor: string, origen: string, signal?: AbortSignal): Promise<FichaConciliacion> {
    const id = validarId(origen)
    const token = await verificarActorParticipacion(validarId(actor), signal)
    const response = await requestPrivada(`/vivero/conciliaciones/${id}`, { signal }, token)
    if (response.status === 401) throw new Error('La sesión venció. Ingresa nuevamente para consultar la ficha.')
    if (response.status === 403 || response.status === 404) throw new Error('Ficha de conciliación no disponible para esta cuenta.')
    if (response.status !== 200) throw new Error('No se pudo consultar la ficha de conciliación.')
    return validarFichaConciliacion(response.body, id)
  },
}
