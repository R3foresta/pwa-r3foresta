import type { AccesoM1, AccesoM2, DominioAcceso, IntentoAcceso, LecturaAcceso, ReciboAcceso } from './types'

export const OBSERVED = '2026-11-05T20:00:00Z'
export const VIVERO_A = '9007199254740992', VIVERO_B = '9007199254740993'
export const COMMAND_ID = '4ff8f9bb-4280-463d-95c8-97a3f11f122c'
export function m1Fixture(overrides: Partial<AccesoM1> = {}): LecturaAcceso<AccesoM1> {
  return { data: { usuario_id: '7', rol_global: 'GENERAL', activo: true, revision_acceso: '0', revision_autoridad: '91', historial: [], siguiente_antes_de_id: null, acceso_explicito: false, acceso_efectivo: false, origen: 'SIN_ACCESO', capacidades: { crear: false, mantener_propias: false, confirmar_propias: false, desechar: false }, vigencia_actual: null, ...overrides }, observado_en: OBSERVED }
}
export function m2Fixture(overrides: Partial<AccesoM2> = {}): LecturaAcceso<AccesoM2> {
  return { data: { usuario_id: '7', rol_global: 'GENERAL', activo: true, revision_acceso: '9007199254740993', revision_autoridad: '91', historial: [], siguiente_antes_de_id: null, alcance_global: false, capacidades_globales: { administrar: false, operar_cualquier_vivero: false, desechar_semillas_cualquier_vivero: false, recibir_y_validar_cualquier_vivero: false }, viveros: [], ...overrides }, observado_en: OBSERVED }
}
export function assigned(vivero_id = VIVERO_A, review = false): AccesoM2['viveros'][number] {
  return { id: '12', vivero_id, otorgado_en: OBSERVED, otorgado_por: '42', acceso_efectivo: true, capacidades: { operar: true, consultar_material: true, desechar_semillas: true, recibir_y_validar: review } }
}
export function accessIntent(domain: DominioAcceso = 'M2'): IntentoAcceso {
  return { actor_id: '42', dominio: domain, operacion: domain === 'M1' ? 'OTORGAR_ACCESO_RECOLECCION' : 'OTORGAR_ACCESO_VIVERO', usuario_id: '7', payload: { comando_id: COMMAND_ID, revision_esperada: '9007199254740993', motivo: 'Habilitación sintética', ...(domain === 'M2' ? { vivero_id: VIVERO_B } : {}) } }
}
export function accessReceipt(intento: IntentoAcceso): ReciboAcceso {
  return { comando_id: intento.payload.comando_id, operacion: intento.operacion, estado: 'CONFIRMADO', error: null, finalizado_en: OBSERVED, resultado: { tipo: intento.dominio === 'M1' ? 'ACCESO_RECOLECCION' : 'ACCESO_VIVERO', usuario_id: intento.usuario_id, ...(intento.dominio === 'M2' ? { vivero_id: intento.payload.vivero_id } : {}), acceso_explicito_anterior: !intento.operacion.startsWith('OTORGAR'), acceso_explicito_nuevo: intento.operacion.startsWith('OTORGAR'), revision_anterior: intento.payload.revision_esperada, revision_nueva: (BigInt(intento.payload.revision_esperada) + 1n).toString(), cambio: 'CAMBIO_APLICADO' } }
}
