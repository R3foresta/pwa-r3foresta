/* Fotos inválidas/otra preparación: sólo fixture D local, SQL de lectura. */
const { mkdir, writeFile } = require('node:fs/promises')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { execFileSync } = require('node:child_process')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const apiBase = process.env.PA_QA_API || 'http://127.0.0.1:3305'
const pwaBase = process.env.PA_QA_PWA || 'http://127.0.0.1:5175'
const output = resolve(process.env.PA_QA_OUTPUT || 'docs/qa/pa-int04')
const socket = process.env.PA_QA_SOCKET, psql = process.env.PA_QA_PSQL
const validPng = readFileSync(resolve(__dirname, '../../public/icon-192.png')).toString('base64')
const checks = [], network = [], balances = [], errors = []
let browser, result
const safe = value => String(value).replace(/Bearer\s+\S+/gi, 'Bearer [redactado]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid')
const check = (name, condition = true) => { assert(condition, name); checks.push(name) }
function balance(stage) {
  assert(/^\/private\/tmp\/pa-int03a-[a-z0-9_]+\/socket$/.test(socket || ''), 'Socket exclusivo del fixture')
  assert(psql && psql.endsWith('/psql'), 'Runtime psql explícito')
  const raw = execFileSync(psql, ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', socket, '-p', '55435', '-U', 'postgres', '-d', 'pa_int03a_ensayo'], {
    input: `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='10s'; SELECT jsonb_build_object(
      'stock_consumido',(SELECT COALESCE(sum(cantidad_consumida),0) FROM public.asignacion_vivero_subcampania WHERE subcampania_id=824 AND proposito='PLANTACION_INICIAL'),
      'registros',(SELECT count(*) FROM public.registro_plantacion WHERE subcampania_id=824 AND NOT es_reposicion),
      'saldo_vivero',(SELECT sum(saldo_vivo_actual) FROM public.lote_vivero)); COMMIT;`, encoding: 'utf8', timeout: 15000,
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG'))),
  }).trim()
  const value = JSON.parse(raw); balances.push({ stage, ...value }); return value
}
async function readLocalPhoto(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('r3foresta-participacion', 1)
    request.onerror = () => reject(new Error('No se pudo leer almacenamiento privado'))
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('registro_commands', 'readonly'), read = tx.objectStore('registro_commands').get('802:824')
      read.onsuccess = () => {
        const row = read.result
        resolve({ files: row.files.length, actor: row.actor_id, scope: row.subcampania_id, validFile: row.files[0]?.file instanceof File, name: row.files[0]?.file.name ?? null, size: row.files[0]?.file.size ?? 0, terminal: row.terminal?.estado ?? null, code: row.terminal?.error?.codigo ?? null })
      }
      tx.oncomplete = () => db.close(); tx.onerror = () => reject(new Error('Falló lectura del borrador privado'))
    }
  }))
}
async function run() {
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(apiBase) && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(pwaBase), 'Sólo localhost')
  const sessionResponse = await fetch(`${apiBase}/_fixture/sesion/802`), session = await sessionResponse.json()
  assert(sessionResponse.status === 200 && session.sintetico === true && session.actor_id === '802' && /^Bearer /.test(session.authorization))
  check('API/PWA locales y actor802 explícitamente sintético')
  const before = balance('antes')
  await mkdir(output, { recursive: true })
  browser = await chromium.launch({ headless: true, executablePath: process.env.PA_QA_CHROMIUM || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(token => { if (!localStorage.getItem('authToken')) localStorage.setItem('authToken', token) }, session.authorization.replace(/^Bearer /, ''))
  // Adaptador exclusivo del perfil de arranque, acreditado por capacidades.
  await context.route('**/api/users/profile', async route => {
    if (route.request().headers().authorization !== session.authorization) return route.fulfill({ status: 401, json: { message: 'Sesión sintética inválida' } })
    const response = await fetch(`${apiBase}/api/v1/participacion/capacidades`, { headers: { Authorization: session.authorization } }), body = await response.json()
    assert.equal(body.data.actor.usuario_id, '802')
    const claims = JSON.parse(Buffer.from(session.authorization.split('.')[1], 'base64url'))
    return route.fulfill({ status: response.status, json: { id: '802', auth_id: claims.sub, username: 'fixture802', nombre: 'Cuenta sintética 802', apellido: null, rol: body.data.actor.rol_global, activo: true } })
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(safe(error.message)))
  page.on('response', response => {
    const request = response.request(), path = new URL(request.url()).pathname
    if (path.startsWith('/api/')) network.push({ method: request.method(), path: safe(path), status: response.status() })
  })
  await page.goto(`${pwaBase}/app/participacion/subcampanias/824/registrar`)
  await page.locator('input[type=file]').waitFor({ state: 'attached' })
  await page.waitForFunction(() => !document.querySelector('input[type=file]').disabled)
  await page.locator('input[type=file]').setInputFiles({ name: 'foto-invalida-sintetica.png', mimeType: 'image/png', buffer: Buffer.from('PNG declarado, bytes sin imagen') })
  await page.getByRole('button', { name: 'Preparar y subir fotos pendientes' }).waitFor()
  await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(button => button.textContent.includes('Preparar y subir fotos pendientes') && !button.disabled))
  const uploadResponse = page.waitForResponse(response => response.request().method() === 'PUT' && /\/cargas\//.test(new URL(response.url()).pathname))
  await page.getByRole('button', { name: 'Preparar y subir fotos pendientes' }).click()
  const rejectedUpload = await uploadResponse, rejectedBody = await rejectedUpload.json()
  check('PNG declarado con bytes inválidos llega a decoder real y es rechazado', rejectedUpload.status() >= 400 && Boolean(rejectedBody.error?.codigo))
  result = { foto_invalida: { http: rejectedUpload.status(), codigo: rejectedBody.error.codigo } }
  check('Foto inválida no emite POST inicial ni consume stock', !network.some(item => item.method === 'POST' && item.path === '/api/v1/plantaciones/iniciales') && JSON.stringify(balance('decoder_rechazado')) === JSON.stringify(before))
  await page.reload()
  await page.locator('input[type=file]').waitFor({ state: 'attached' })
  const restored = await readLocalPhoto(page)
  check('Recarga conserva un File privado con sus bytes en actor802/ámbito824', restored.files === 1 && restored.actor === '802' && restored.scope === '824' && restored.validFile && restored.name === 'foto-invalida-sintetica.png' && restored.size > 0)
  await page.getByRole('button', { name: 'Volver', exact: true }).click()
  await page.getByRole('dialog', { name: 'Salir de la captura' }).waitFor()
  await page.getByRole('button', { name: 'Descartar borrador y cerrar preparación' }).click()
  await page.waitForURL(`${pwaBase}/app/participacion/registrar`)
  const cancelled = await readLocalPhoto(page)
  check('Descarte UI clausura preparación por servidor antes de eliminar File local', cancelled.files === 0 && cancelled.terminal === 'RECHAZADO' && cancelled.code === 'PREPARACION_CANCELADA')
  check('Clausura no crea registro ni consumo', JSON.stringify(balance('captura_cancelada')) === JSON.stringify(before))

  const cross = await page.evaluate(async png => {
    const { RegistroParticipacionService: Service } = await import('/src/modules/participacion/api/registro.api.ts')
    const context = (await Service.contexto('802', '824')).data
    const identity = () => ({ actor_id: '802', subcampania_id: '824', comando_id: crypto.randomUUID() })
    const source = identity(), destination = identity()
    const first = await Service.preparar(source), second = await Service.preparar(destination)
    if ('estado' in first || 'estado' in second) throw new Error('Se requiere preparación nueva sin terminal')
    const bytes = Uint8Array.from(atob(png), value => value.charCodeAt(0))
    const upload = await Service.subirCarga(source, crypto.randomUUID(), new File([bytes], 'valida-sintetica.png', { type: 'image/png' }))
    if (upload.data.estado !== 'DISPONIBLE' || !upload.data.evidencia_id) throw new Error('No se confirmó carga disponible')
    const species = context.especies.find(item => item.saldo_elegible > 0)
    if (!species) throw new Error('El fixture debe conservar saldo en824')
    const receipt = await Service.enviar({ ...destination, payload: { comando_id: destination.comando_id, subcampania_id: '824', plan_revision_esperada: context.subcampania.plan_revision, fecha_plantacion: context.reglas.hoy_operativo, latitud: -16.5, longitud: -68.1, especies: [{ planta_id: species.planta_id, cantidad: 1 }], coresponsable_ids: [], evidencia_ids: [upload.data.evidencia_id], observaciones: null } })
    const cancelledSource = await Service.cancelar(source)
    return { preparaciones: 2, carga: upload.data.estado, estado: receipt.estado, codigo: receipt.error?.codigo ?? null, original_clausurado: cancelledSource.estado === 'RECHAZADO' && cancelledSource.error.codigo === 'PREPARACION_CANCELADA' }
  }, validPng)
  result.otra_preparacion = cross
  check('Cliente v1 real prepara dos comandos y confirma PNG válido sólo en origen', cross.preparaciones === 2 && cross.carga === 'DISPONIBLE')
  check('Evidencia de otra preparación produce RECHAZADO durable sin registro', cross.estado === 'RECHAZADO' && cross.codigo === 'EVIDENCIA_NO_DISPONIBLE')
  check('Preparación de la foto válida queda clausurada explícitamente', cross.original_clausurado)
  check('DB conserva exactamente registros, consumo y saldo Vivero tras foto ajena', JSON.stringify(balance('evidencia_otra_preparacion_rechazada')) === JSON.stringify(before))
  check('Único POST inicial es el rechazo esperado de evidencia ajena', network.filter(item => item.method === 'POST' && item.path === '/api/v1/plantaciones/iniciales').length === 1)
  check('Sin errores JavaScript de navegador', errors.length === 0)
  await context.close(); await browser.close(); browser = null
}
async function report(ok, error) {
  await mkdir(output, { recursive: true })
  await writeFile(`${output}/fotos.json`, JSON.stringify({ entorno: 'SINTETICO_LOCAL_INT02D', ok, api: apiBase, pwa: pwaBase, actor: '802', subcampania: '824', adaptador: 'Sólo perfil; capacidades/decoder/servicios/RPC reales', checks, result, balances, network, errors, ...(error ? { fallo: safe(error.message) } : {}) }, null, 2) + '\n')
}
run().then(async () => { await report(true); console.log(JSON.stringify({ ok: true, checks: checks.length, output: `${output}/fotos.json` })) }).catch(async error => {
  await report(false, error); console.error(JSON.stringify({ ok: false, checks: checks.length, error: safe(error.message), output: `${output}/fotos.json` }))
  if (browser) await browser.close(); process.exitCode = 1
})
