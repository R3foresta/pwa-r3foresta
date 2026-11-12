import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionService } from '../participacion/api/participacion.api'
import { AccesosService } from './accesos.api'
import { validarIntentoAcceso, validarM1, validarM2, validarReciboAcceso } from './accesos.contract'
import { canAtVivero, canMaintain, canReview, exactId } from './accessPolicy'
import { accessIntent, accessReceipt, assigned, m1Fixture, m2Fixture, OBSERVED, VIVERO_A, VIVERO_B } from './test-fixtures'

const response = (body: unknown, status = 200) => ({ status, json: async () => body, headers: new Headers() })
const api = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`
let sequence = 0
beforeEach(() => { localStorage.setItem('authToken', `t3-synthetic-${++sequence}`) })
async function prime(actor = '42', role = 'ADMIN') {
  localStorage.setItem('authToken', `t3-synthetic-${++sequence}`)
  const fetch = vi.fn().mockResolvedValue(response({ data: { actor: { usuario_id: actor, rol_global: role }, capacidades_globales: { asignar_roles: role === 'ADMIN', designar_administradores: false, leer_plan: true }, subcampanias: [] }, observado_en: OBSERVED, siguiente_cursor: null }))
  vi.stubGlobal('fetch', fetch)
  await ParticipacionService.capacidades()
  fetch.mockClear()
  return fetch
}

describe('T3 contratos independientes y autoridad por vivero', () => {
  it('mantiene revisiones y viveros vecinos como texto y admite ADMIN sin filas', () => {
    expect(validarM1(m1Fixture(), '7')).toEqual(m1Fixture())
    const data = m2Fixture({ viveros: [assigned(VIVERO_A), { ...assigned(VIVERO_B), id: '13' }] })
    expect(validarM2(data, '7').data.viveros.map(row => row.vivero_id)).toEqual([VIVERO_A, VIVERO_B])
    const admin = m2Fixture({ alcance_global: true, rol_global: 'ADMIN', capacidades_globales: { administrar: true, operar_cualquier_vivero: true, desechar_semillas_cualquier_vivero: true, recibir_y_validar_cualquier_vivero: true } })
    expect(validarM2(admin, '7').data.viveros).toEqual([])
    expect(canAtVivero(admin.data, VIVERO_B, 'operar')).toBe(true)
    expect(() => exactId(Number(VIVERO_B))).toThrow()
  })
  it.each(['usuario_id', 'revision_acceso', 'revision_autoridad'])('rechaza Number o autoridad de otra cuenta en %s', key => {
    expect(() => validarM1({ ...m1Fixture(), data: { ...m1Fixture().data, [key]: 7 } }, '7')).toThrow()
    expect(() => validarM2(m2Fixture(), '8')).toThrow()
  })
  it('no acepta ampliar silenciosamente DTOs ni mezclar los dominios', () => {
    expect(() => validarM1({ ...m1Fixture(), data: { ...m1Fixture().data, viveros: [] } }, '7')).toThrow()
    expect(() => validarM2(m1Fixture(), '7')).toThrow()
    expect(() => validarIntentoAcceso({ ...accessIntent(), dominio: 'M1' })).toThrow()
    expect(() => validarIntentoAcceso({ ...accessIntent('M1'), payload: { ...accessIntent('M1').payload, vivero_id: VIVERO_A } })).toThrow()
  })
  it('no transforma autoría, M1 o el vivero vecino en autoridad M2; prohíbe recepción propia', () => {
    const m2 = m2Fixture({ viveros: [assigned(VIVERO_B, true)] }).data
    expect(canAtVivero(m2, VIVERO_A, 'desechar_semillas')).toBe(false)
    expect(canAtVivero(m2, Number(VIVERO_B), 'desechar_semillas')).toBe(false)
    expect(canAtVivero(m2, VIVERO_B, 'desechar_semillas')).toBe(true)
    expect(canReview(m2, '9007199254740992', '9007199254740993', VIVERO_B)).toBe(true)
    expect(canReview(m2, '7', '7', VIVERO_B)).toBe(false)
    expect(canReview(m2, '7', undefined, VIVERO_B)).toBe(false)
    expect(canReview(m2, '7', Number(VIVERO_B), VIVERO_B)).toBe(false)
    expect(canMaintain(m1Fixture({ acceso_efectivo: true, capacidades: { crear: true, mantener_propias: true, confirmar_propias: false, desechar: false } }).data, VIVERO_A, VIVERO_B)).toBe(false)
  })
  it('GENERAL asignado opera sin recibir; VALIDADOR asignado recibe sin requerir M1', () => {
    const general = m2Fixture({ rol_global: 'GENERAL', viveros: [assigned()] }).data
    const receptor = m2Fixture({ rol_global: 'VALIDADOR', viveros: [assigned(VIVERO_A, true)] }).data
    expect(canAtVivero(general, VIVERO_A, 'operar')).toBe(true)
    expect(canAtVivero(general, VIVERO_A, 'recibir_y_validar')).toBe(false)
    expect(canReview(general, '7', '8', VIVERO_A)).toBe(false)
    expect(canReview(receptor, '7', '8', VIVERO_A)).toBe(true)
  })
  it.each(['GENERAL', 'VALIDADOR', 'VOLUNTARIO', 'ADMIN'] as const)('una vigencia sin efectividad no concede operaciones con rol %s', role => {
    const vigencia = { ...assigned(), acceso_efectivo: false, capacidades: { operar: false, consultar_material: false, desechar_semillas: false, recibir_y_validar: false } }
    expect(canAtVivero(m2Fixture({ rol_global: role, viveros: [vigencia] }).data, VIVERO_A, 'operar')).toBe(false)
  })
  it('recibos contrastan UUID, operación, usuario, vivero y revisión BIGINT exacta', () => {
    const intent = accessIntent(), receipt = accessReceipt(intent)
    expect(validarReciboAcceso(receipt, intent)).toEqual(receipt)
    if (receipt.estado !== 'CONFIRMADO') throw new Error('fixture')
    for (const override of [{ usuario_id: '8' }, { vivero_id: VIVERO_A }, { revision_anterior: '91' }, { revision_nueva: '9007199254740995' }, { acceso_explicito_nuevo: false }, { tipo: 'ACCESO_RECOLECCION' }]) {
      expect(() => validarReciboAcceso({ ...receipt, resultado: { ...receipt.resultado, ...override } }, intent)).toThrow()
    }
  })
})

describe.each(['M1', 'M2'] as const)('API de acceso %s', domain => {
  it('usa sólo endpoint/payload del dominio con Bearer y sin actor ni rol enviados', async () => {
    const fetch = await prime(), intent = accessIntent(domain)
    fetch.mockResolvedValue(response(accessReceipt(intent)))
    await AccesosService.enviar(intent)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/usuarios/7/${domain === 'M1' ? 'acceso-recoleccion' : 'acceso-viveros'}/otorgamientos`)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(intent.payload)
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit', headers: { Authorization: `Bearer t3-synthetic-${sequence}` } })
    expect(Object.keys(fetch.mock.calls[0][1].headers)).toEqual(['Authorization', 'Content-Type'])
  })
  it('recupera lo propio tras perder ADMIN sin leer directorio ni autoridad ajena', async () => {
    const fetch = await prime('42', 'VOLUNTARIO'), intent = accessIntent(domain)
    fetch.mockResolvedValue(response(accessReceipt(intent)))
    await expect(AccesosService.recuperar(intent)).resolves.toEqual(accessReceipt(intent))
    expect(fetch.mock.calls[0][0]).toBe(`${api}/${domain === 'M1' ? 'recoleccion' : 'vivero'}/accesos/comandos/${intent.payload.comando_id}`)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('no consulta un pendiente ajeno, ni acepta respuestas tras cambiar token o cerrar sesión', async () => {
    const fetch = await prime('43'), intent = accessIntent(domain)
    await expect(AccesosService.recuperar(intent)).rejects.toMatchObject({ status: 401 })
    expect(fetch).not.toHaveBeenCalled()
    await prime('42')
    const transport = vi.mocked(globalThis.fetch)
    transport.mockImplementationOnce(async () => { localStorage.removeItem('authToken'); return response(accessReceipt(intent)) as never })
    await expect(AccesosService.enviar(intent)).rejects.toMatchObject({ status: 401 })
  })
  it.each([202, 503])('HTTP %s conserva incertidumbre incluso con un cuerpo que aparenta terminal', async status => {
    const fetch = await prime(), intent = accessIntent(domain)
    fetch.mockResolvedValue(response(accessReceipt(intent), status))
    await expect(AccesosService.recuperar(intent)).rejects.toMatchObject({ status, resultado_concluyente: false })
  })
  it('HTTP409 durable conserva el rechazo para releer y confirmar una intención nueva', async () => {
    const fetch = await prime(), intent = accessIntent(domain)
    const receipt = { ...accessReceipt(intent), estado: 'RECHAZADO', resultado: null, error: { codigo: 'REVISION_OBSOLETA', mensaje: 'Relee la revisión.', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' } }
    fetch.mockResolvedValue(response(receipt, 409))
    await expect(AccesosService.enviar(intent)).resolves.toEqual(receipt)
  })
  it('lectura propia/administrativa pagina historia sin confundir revisión del rol', async () => {
    const fetch = await prime()
    fetch.mockResolvedValueOnce(response(domain === 'M1' ? m1Fixture() : m2Fixture())).mockResolvedValueOnce(response(domain === 'M1' ? m1Fixture({ usuario_id: '42' }) : m2Fixture({ usuario_id: '42' })))
    if (domain === 'M1') { await AccesosService.m1('42', '7', '9007199254740993'); await AccesosService.m1('42') }
    else { await AccesosService.m2('42', '7', '9007199254740993'); await AccesosService.m2('42') }
    expect(fetch.mock.calls[0][0]).toBe(`${api}/usuarios/7/${domain === 'M1' ? 'acceso-recoleccion' : 'acceso-viveros'}?limite=20&antes_de_id=9007199254740993`)
    expect(fetch.mock.calls[1][0]).toContain('/me/acceso-')
  })
})
