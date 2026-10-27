import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import examples from './impacto.test-fixtures.json'
import { imagenPublicaUrl, IMPACTO_REQUEST_TIMEOUT_MS, ImpactoService } from './impacto.api'

const response = (body: unknown, status = 200) => ({ status, json: async () => body, headers: new Headers() })
const api = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`
const absoluteApi = new URL(api, window.location.origin).href
const stableError = (codigo: string, mensaje: string) => ({ error: { codigo, mensaje, campos: [], ambitos: [], reintento: 'NO_APLICA' }, comando_id: null, resultado_concluyente: false })
beforeEach(() => { localStorage.clear() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('cliente de lectura INT05 por audiencia', () => {
  it.each([undefined, 'sesion-vencida', 'sesion-privada'])('Impacto público funciona con token %s sin identidad ni capacidades', async token => {
    if (token) localStorage.setItem('authToken', token)
    const fetch = vi.fn().mockResolvedValue(response(examples.global)); vi.stubGlobal('fetch', fetch)
    await expect(ImpactoService.consultar({ tipo: 'global' })).resolves.toEqual(examples.global)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe(`${absoluteApi}/impact/global`)
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit', cache: 'no-store' })
    expect(fetch.mock.calls[0][1]).not.toHaveProperty('headers')
    expect(fetch.mock.calls[0][1]).not.toHaveProperty('body')
  })
  it('pasa filtros válidos y el grupo completo, sin recortar otras especies', async () => {
    const fetch = vi.fn().mockResolvedValue(response(examples.subcampania)); vi.stubGlobal('fetch', fetch)
    await ImpactoService.consultar({ tipo: 'subcampania', id: '826' }, { organizacion_id: '1', planta_id: '8', desde: '2026-10-15', hasta: '2026-10-16', limite: 20 })
    expect(fetch.mock.calls[0][0]).toBe(`${absoluteApi}/impact/subcampanias/826?organizacion_id=1&planta_id=8&desde=2026-10-15&hasta=2026-10-16&limite=20`)
  })
  it('rechaza entrada inválida antes de hacer HTTP', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    await expect(ImpactoService.registro('826000?token=privado')).rejects.toThrow()
    await expect(ImpactoService.consultar({ tipo: 'campania', id: '800' }, { campania_id: '801' })).rejects.toThrow()
    await expect(ImpactoService.misRegistros({ cursor: '01' })).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('consulta detalle público sin Bearer y comprueba la identidad devuelta', async () => {
    localStorage.setItem('authToken', 'privado')
    const fetch = vi.fn().mockResolvedValue(response(examples.registro)); vi.stubGlobal('fetch', fetch)
    await expect(ImpactoService.registro('826000')).resolves.toEqual(examples.registro)
    expect(fetch.mock.calls[0][0]).toBe(`${absoluteApi}/impact/registros/826000`)
    expect(fetch.mock.calls[0][1]).not.toHaveProperty('headers')
    await expect(ImpactoService.registro('827000')).rejects.toMatchObject({ name: 'ImpactoContratoError' })
  })
  it.each([404, 503])('no convierte HTTP %s en lista vacía o indicadores cero', async status => {
    const codigo = status === 404 ? 'RECURSO_NO_VISIBLE' : 'RESULTADO_NO_DETERMINADO'
    const fetch = vi.fn().mockResolvedValue(response(stableError(codigo, 'Consulta no disponible.'), status)); vi.stubGlobal('fetch', fetch)
    await expect(ImpactoService.consultar({ tipo: 'global' })).rejects.toMatchObject({ name: 'ImpactoApiError', status, codigo })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('un éxito malformado falla, sin conservarlo como dato válido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: { indicadores: { plantacion_inicial: 0 } } })))
    await expect(ImpactoService.consultar({ tipo: 'global' })).rejects.toMatchObject({ name: 'ImpactoContratoError' })
  })
  it.each(['HTTP', 'BODY'] as const)('timeout público cubre %s y limpia los recursos', async kind => {
    vi.useFakeTimers()
    const fetch = vi.fn().mockImplementation(() => kind === 'BODY' ? Promise.resolve({ ...response(null), json: () => new Promise(() => {}) }) : new Promise(() => {})); vi.stubGlobal('fetch', fetch)
    const check = expect(ImpactoService.consultar({ tipo: 'global' })).rejects.toMatchObject({ status: 0, codigo: 'RESULTADO_NO_DETERMINADO' })
    await vi.advanceTimersByTimeAsync(IMPACTO_REQUEST_TIMEOUT_MS + 1)
    await check
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
  it.each([false, true])('cancelación pública antes/durante lectura; antes=%s', async before => {
    vi.useFakeTimers()
    const controller = new AbortController(), remove = vi.spyOn(controller.signal, 'removeEventListener')
    const fetch = vi.fn().mockResolvedValue({ ...response(null), json: () => new Promise(() => {}) }); vi.stubGlobal('fetch', fetch)
    if (before) controller.abort()
    const check = expect(ImpactoService.consultar({ tipo: 'global' }, {}, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    if (!before) { await Promise.resolve(); controller.abort() }
    await check
    expect(fetch).toHaveBeenCalledTimes(before ? 0 : 1)
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
  })
  it('Mis registros usa exclusivamente Bearer vigente y no exige permiso de registro', async () => {
    localStorage.setItem('authToken', 'cuenta-sin-permiso-operativo')
    const fetch = vi.fn().mockResolvedValue(response(examples.mis_registros)); vi.stubGlobal('fetch', fetch)
    await expect(ImpactoService.misRegistros()).resolves.toMatchObject(examples.mis_registros)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/plantaciones/mis-registros`)
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit', cache: 'no-store', headers: { Authorization: 'Bearer cuenta-sin-permiso-operativo' } })
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('x-auth-id')
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('x-user-role')
  })
  it('sin token no consulta la lista propia aunque haya usuario cacheado', async () => {
    localStorage.setItem('r3foresta:user', JSON.stringify({ id: '801', rol: 'ADMIN' }))
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    await expect(ImpactoService.misRegistros()).rejects.toMatchObject({ name: 'ImpactoApiError', status: 401 })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('descarta lista privada tardía si cambia o desaparece el token', async () => {
    localStorage.setItem('authToken', 'cuenta-inicial')
    const fetch = vi.fn().mockImplementation(async () => { localStorage.setItem('authToken', 'otra-cuenta'); return response(examples.mis_registros) }); vi.stubGlobal('fetch', fetch)
    await expect(ImpactoService.misRegistros()).rejects.toMatchObject({ status: 401, codigo: 'SESION_INVALIDA' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it.each([401, 403, 503])('privado HTTP %s conserva el error y no exige capacidad adicional', async status => {
    localStorage.setItem('authToken', 'cuenta')
    const codigo = status === 401 ? 'SESION_INVALIDA' : status === 403 ? 'CUENTA_INACTIVA' : 'RESULTADO_NO_DETERMINADO'
    const fetch = vi.fn().mockResolvedValue(response(stableError(codigo, 'No disponible.'), status)); vi.stubGlobal('fetch', fetch)
    await expect(ImpactoService.misRegistros()).rejects.toMatchObject({ status, codigo })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('foto pública construye URL absoluta y no acepta protocolos/rutas ajenos', () => {
    expect(imagenPublicaUrl('900050')).toBe(`${absoluteApi}/impact/imagenes/900050`)
    expect(() => imagenPublicaUrl('https://privado.test/original')).toThrow()
    vi.stubEnv('VITE_API_URL', 'javascript:alert(1)')
    expect(() => imagenPublicaUrl('900050')).toThrow()
  })
  it('foto propia se descarga con Bearer y ruta validada, sin exponer el token en la URL', async () => {
    localStorage.setItem('authToken', 'cuenta-propia')
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    const fetch = vi.fn().mockResolvedValue({ status: 200, headers: new Headers({ 'Content-Type': 'image/jpeg' }), blob: async () => blob }); vi.stubGlobal('fetch', fetch)
    await expect(ImpactoService.imagenPropia('826000', '901')).resolves.toBe(blob)
    expect(fetch.mock.calls[0][0]).toBe(`${absoluteApi}/plantaciones/826000/imagenes/901`)
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit', cache: 'no-store', headers: { Authorization: 'Bearer cuenta-propia' } })
    await expect(ImpactoService.imagenPropia('826000', '901?token=otra')).rejects.toThrow()
  })
  it('foto propia rechaza respuesta no JPEG o sesión cambiada', async () => {
    localStorage.setItem('authToken', 'cuenta-inicial')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ status: 200, headers: new Headers({ 'Content-Type': 'text/html' }), blob: async () => new Blob(['html']) }).mockImplementationOnce(async () => {
      localStorage.setItem('authToken', 'otra-cuenta')
      return { status: 200, headers: new Headers({ 'Content-Type': 'image/jpeg' }), blob: async () => new Blob(['jpeg'], { type: 'image/jpeg' }) }
    }))
    await expect(ImpactoService.imagenPropia('826000', '901')).rejects.toMatchObject({ name: 'ImpactoContratoError' })
    await expect(ImpactoService.imagenPropia('826000', '901')).rejects.toMatchObject({ status: 401, codigo: 'SESION_INVALIDA' })
  })
})
