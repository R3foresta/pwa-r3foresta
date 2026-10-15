/* Sesión entre pestañas: sólo almacenamiento local y lecturas al fixture real. */
const { mkdir, writeFile } = require('node:fs/promises')
const { randomUUID } = require('node:crypto')
const { resolve } = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const apiBase = process.env.PA_QA_API || 'http://127.0.0.1:3304'
const pwaBase = process.env.PA_QA_PWA || 'http://127.0.0.1:5173'
const output = resolve(process.env.PA_QA_OUTPUT || 'docs/qa/pa-int06')
let browser
async function run() {
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(apiBase))
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(pwaBase))
  const fixture = await (await fetch(`${apiBase}/__fixture`)).json()
  assert.equal(fixture.entorno, 'SINTETICO_LOCAL_INT02C')
  const profiles = Object.fromEntries(fixture.perfiles.map(profile => [profile.perfil, profile]))
  browser = await chromium.launch({ headless: true, ...(process.env.PA_QA_CHROMIUM ? { executablePath: process.env.PA_QA_CHROMIUM } : {}) })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(token => { if (!localStorage.getItem('authToken')) localStorage.setItem('authToken', token) }, profiles.gestora.token)
  const checks = [], requests = [], errors = []
  const check = (name, condition = true) => { assert(condition, name); checks.push(name) }
  let holdProfile = false, releaseProfile, profileWaiting = false
  await context.route('**/api/users/profile', async route => {
    const bearer = route.request().headers().authorization
    const selected = Object.values(profiles).find(item => bearer === `Bearer ${item.token}`)
    if (!selected) return route.fulfill({ status: 401, json: { message: 'Sesión de QA inválida' } })
    if (holdProfile && selected.perfil === 'plantador') {
      profileWaiting = true
      await new Promise(resolveHold => { releaseProfile = resolveHold })
    }
    const response = await fetch(`${apiBase}/api/v1/participacion/capacidades`, { headers: { Authorization: bearer } })
    if (response.status !== 200) return route.fulfill({ status: response.status, json: { message: 'Cuenta no activa' } })
    const actor = (await response.json()).data.actor
    const claims = JSON.parse(Buffer.from(selected.token.split('.')[1], 'base64url'))
    return route.fulfill({ json: { id: actor.usuario_id, auth_id: claims.sub, username: selected.perfil, nombre: selected.perfil, apellido: null, rol: actor.rol_global, activo: true } })
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    const path = new URL(request.url()).pathname
    if (path.startsWith('/api/')) requests.push({ method: request.method(), path, actor: Object.values(profiles).find(item => request.headers().authorization === `Bearer ${item.token}`)?.usuario_id ?? null })
  })
  await page.goto(`${pwaBase}/app/participacion/accesos`)
  await page.getByRole('combobox', { name: 'Acción', exact: true }).waitFor()
  const pendingId = randomUUID()
  const pendingKey = 'r3foresta:participacion:acceso:v1:602'
  // Preparar una identidad local aún ausente en servidor. Nunca se envía su POST.
  await page.evaluate(({ key, commandId }) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, intento: { actor_id: '602', operacion: 'OTORGAR_PLANTADOR', payload: { comando_id: commandId, usuario_destino_id: '604', ambitos: [{ subcampania_id: '600', revision_esperada: '0' }] } } }))
  }, { key: pendingKey, commandId: pendingId })
  await page.reload()
  await page.getByRole('heading', { name: 'Resultado no confirmado', exact: true }).waitFor()
  await page.getByText(`Comando: ${pendingId}`, { exact: true }).waitFor()
  const tab = await context.newPage()
  await tab.goto(`${pwaBase}/app/home`)
  await tab.getByRole('link', { name: 'Recuperar envío pendiente de esta cuenta' }).waitFor()
  holdProfile = true
  await tab.evaluate(token => localStorage.setItem('authToken', token), profiles.plantador.token)
  await page.getByText('Verificando sesión...', { exact: true }).waitFor()
  check('cambio en otra pestaña oculta inmediatamente el pendiente anterior', await page.getByText(`Comando: ${pendingId}`, { exact: true }).count() === 0)
  await mkdir(output, { recursive: true })
  await page.screenshot({ path: `${output}/cambio-cuenta-verificando-mobile.png`, fullPage: true })
  assert(profileWaiting)
  holdProfile = false
  releaseProfile()
  await page.getByText('No tienes acciones de gestión de participación disponibles en las subcampañas actuales.').waitFor()
  check('sólo muestra la cuenta nueva después de verificar su perfil', await page.getByText(`Comando: ${pendingId}`, { exact: true }).count() === 0)
  check('la cuenta nueva nunca consulta el comando del actor anterior', !requests.some(request => request.actor === '603' && request.path.endsWith(`/comandos/${pendingId}`)))
  check('el cambio de cuenta conserva el comando privado original', await page.evaluate(key => localStorage.getItem(key) !== null, pendingKey))
  await page.screenshot({ path: `${output}/cambio-cuenta-confirmado-mobile.png`, fullPage: true })
  const resumedGet = page.waitForRequest(request => new URL(request.url()).pathname.endsWith(`/comandos/${pendingId}`) && request.method() === 'GET')
  await tab.evaluate(token => localStorage.setItem('authToken', token), profiles.gestora.token)
  await page.getByText(`Comando: ${pendingId}`, { exact: true }).waitFor()
  await resumedGet
  check('volver al actor original reanuda el mismo comando por GET', requests.filter(request => request.actor === '602' && request.path.endsWith(`/comandos/${pendingId}`)).length >= 2)
  await tab.evaluate(() => localStorage.removeItem('authToken'))
  await page.waitForURL('**/auth/login')
  check('logout en otra pestaña oculta la pantalla privada', await page.getByText(`Comando: ${pendingId}`, { exact: true }).count() === 0)
  check('sin POST de acceso durante la prueba de sesión', !requests.some(request => request.method === 'POST' && /\/accesos\/(?!revisar)/.test(request.path)))
  check('sin errores de ejecución del navegador', errors.length === 0)
  await writeFile(`${output}/session.json`, JSON.stringify({ fecha: new Date().toISOString(), entorno: fixture.entorno, adaptador_sesion: 'Perfil propio sintético ligado al JWT verificado; capacidades y recibos son HTTP real.', checks, requests, errors }, null, 2) + '\n')
  await context.close()
  console.log(JSON.stringify({ checks: checks.length, output, errors }, null, 2))
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => { await browser?.close() })
