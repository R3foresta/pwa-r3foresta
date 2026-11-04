/* QA sintético PWA → controllers reales → PostgreSQL privado del preview C. */
const { mkdir, writeFile } = require('node:fs/promises')
const { resolve } = require('node:path')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')

const apiBase = process.env.PA_QA_API || 'http://127.0.0.1:3302'
const pwaBase = process.env.PA_QA_PWA || 'http://127.0.0.1:5173'
const output = resolve(process.env.PA_QA_OUTPUT || 'docs/qa/usuarios-administracion')
const checks = [], commands = [], apiCommands = [], errors = [], network = [], screenshots = [], legacyHeaders = []
let browser, fixtureMetadata
const check = (name, condition = true) => { assert(condition, name); checks.push(name); console.log('OK: ' + name) }

async function saveReport(status, failure) {
  await mkdir(output, { recursive: true })
  const report = {
    estado: status, fecha_local: '2026-11-03', fecha_utc: new Date().toISOString(),
    entorno: 'SINTETICO_LOCAL_INT02C', backend: fixtureMetadata ?? null,
    pwa_base: pwaBase,
    adaptador_sesion: 'Únicamente GET del perfil propio de arranque: identidad y rol contrastados con capacidades API/DB reales. Sin ceremonia WebAuthn.',
    alcance: 'Selección y cambios de roles globales, autorización, cancelación, pérdida de respuesta tras commit, recuperación propia y separación entre cuentas.',
    limites: ['No acredita despliegue ni catálogo remoto, WebAuthn, revisión humana de UX o QA del resto del sistema.', 'Solo personas y comandos de la fixture sintética; no se guardan tokens ni headers de autorización.'],
    checks, commands, api_commands: apiCommands, network, screenshots, errors,
    ...(failure ? { fallo: failure instanceof Error ? failure.message : String(failure) } : {}),
  }
  await writeFile(`${output}/resultados.json`, JSON.stringify(report, null, 2) + '\n')
}

async function run() {
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(apiBase))
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(pwaBase))
  const fixtureResponse = await fetch(`${apiBase}/__fixture`)
  assert.equal(fixtureResponse.status, 200)
  const fixture = await fixtureResponse.json()
  assert.equal(fixture.entorno, 'SINTETICO_LOCAL_INT02C')
  assert(Object.keys(fixture.migraciones_sha256).some(name => name.startsWith('091_')))
  const profiles = Object.fromEntries(fixture.perfiles.map(profile => [profile.perfil, profile]))
  fixtureMetadata = { url: apiBase, revision: fixture.revision_backend, cambios_de_trabajo: fixture.cambios_de_trabajo, migraciones_sha256: fixture.migraciones_sha256 }
  const profileForToken = bearer => Object.values(profiles).find(item => bearer === `Bearer ${item.token}`)
  async function api(profile, path, body) {
    const response = await fetch(`${apiBase}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${profiles[profile].token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (body && /\/usuarios\/[^/]+\/roles$/.test(path)) apiCommands.push({ profile, path, usuario_id: path.split('/').at(-2), ...body })
    return { status: response.status, body: await response.json() }
  }
  async function authority(user) {
    const result = await api('admin', `/api/v1/usuarios/${user}/autoridad`)
    assert.equal(result.status, 200)
    return result.body.data
  }
  async function setRole(user, role, reason) {
    const current = await authority(user)
    const response = await api('admin', `/api/v1/usuarios/${user}/roles`, {
      comando_id: randomUUID(), rol_global: role, revision_esperada: current.revision_autoridad, motivo: reason,
    })
    assert.equal(response.status, 200)
    assert.equal(response.body.estado, 'CONFIRMADO')
  }
  const initial = await authority('604')
  assert.equal(initial.rol_global, 'VOLUNTARIO')
  assert.equal(initial.revision_autoridad, '0', 'Iniciar con un preview C nuevo; no reusar las mutaciones de otro ensayo.')
  check('fixture aislada incluye 091 y usuario 604 inicia VOLUNTARIO/revisión 0')
  await mkdir(output, { recursive: true })
  browser = await chromium.launch({ headless: true, ...(process.env.PA_QA_CHROMIUM ? { executablePath: process.env.PA_QA_CHROMIUM } : {}) })

  async function account(profile, viewport = { width: 390, height: 844 }) {
    const context = await browser.newContext({ viewport })
    if (profile) await context.addInitScript(token => {
      if (!localStorage.getItem('authToken')) localStorage.setItem('authToken', token)
    }, profiles[profile].token)
    // El launcher no incluye WebAuthn ni perfil. Este es el único adaptador:
    // el rol y PK vienen de la API real que verifica el mismo Bearer.
    await context.route('**/api/users/profile', async route => {
      const bearer = route.request().headers().authorization
      const selected = profileForToken(bearer)
      if (!selected) return route.fulfill({ status: 401, json: { message: 'Sesión de QA inválida' } })
      const response = await fetch(`${apiBase}/api/v1/participacion/capacidades`, { headers: { Authorization: bearer } })
      if (response.status !== 200) return route.fulfill({ status: response.status, json: { message: 'Cuenta no activa' } })
      const actor = (await response.json()).data.actor
      const claims = JSON.parse(Buffer.from(selected.token.split('.')[1], 'base64url'))
      assert.equal(actor.usuario_id, selected.usuario_id)
      return route.fulfill({ json: { id: actor.usuario_id, auth_id: claims.sub, username: selected.perfil, nombre: selected.perfil, apellido: null, rol: actor.rol_global, activo: true } })
    })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      const path = new URL(request.url()).pathname
      const actualProfile = profileForToken(request.headers().authorization)?.perfil ?? profile ?? 'visitante'
      if (path.startsWith('/api/')) network.push({ profile: actualProfile, method: request.method(), path })
      if (request.method() === 'POST' && /^\/api\/v1\/usuarios\/[^/]+\/roles$/.test(path)) {
        for (const header of ['x-auth-id', 'x-user-role']) if (request.headers()[header]) legacyHeaders.push(header)
        commands.push({ profile: actualProfile, path, usuario_id: path.split('/').at(-2), ...request.postDataJSON() })
      }
    })
    return { context, page }
  }
  const heading = (page, name) => page.getByRole('heading', { name, exact: true })
  async function screenshot(page, file) {
    check(`${file}: sin desbordamiento horizontal`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `${output}/${file}`, fullPage: true })
    screenshots.push(file)
  }
  async function ready(page) {
    await page.goto(`${pwaBase}/app/usuarios`, { waitUntil: 'domcontentloaded' })
    await heading(page, 'Usuarios y permisos').waitFor()
    await page.getByRole('button', { name: 'Buscar usuarios', exact: true }).waitFor()
  }
  async function select(page, query, selectedName) {
    await page.getByRole('textbox', { name: 'Buscar por nombre o usuario', exact: true }).fill(query)
    await page.getByRole('combobox', { name: 'Filtrar por rol', exact: true }).selectOption('')
    await page.getByRole('button', { name: 'Buscar usuarios', exact: true }).click()
    await page.getByRole('button', { name: selectedName, exact: true }).click()
    await page.getByRole('combobox', { name: 'Rol a asignar', exact: true }).waitFor()
  }
  async function propose(page, query, selectedName, role, reason) {
    await select(page, query, selectedName)
    await page.getByRole('combobox', { name: 'Rol a asignar', exact: true }).selectOption(role)
    await page.getByRole('textbox', { name: 'Motivo del cambio', exact: true }).fill(reason)
    await page.getByRole('button', { name: 'Revisar cambio de rol', exact: true }).click()
    await heading(page, 'Confirmar cambio de rol').waitFor()
  }
  async function confirm(page) {
    await page.getByRole('button', { name: 'Confirmar rol', exact: true }).click()
  }
  async function closeSuccess(page) {
    await heading(page, 'Rol confirmado').waitFor()
    await page.getByRole('button', { name: 'Ver resultado', exact: true }).click()
    await heading(page, 'Cambio de rol confirmado').waitFor()
  }

  const visitor = await account(null)
  await visitor.page.goto(`${pwaBase}/app/usuarios`, { waitUntil: 'domcontentloaded' })
  await visitor.page.waitForURL('**/auth/login', { waitUntil: 'domcontentloaded' })
  await visitor.page.getByRole('button', { name: 'Iniciar sesión', exact: true }).waitFor()
  check('visitante: ruta administrativa conduce al login sin descargar usuarios', !network.some(item => item.profile === 'visitante' && item.path.startsWith('/api/v1/usuarios')))
  await screenshot(visitor.page, 'login-mobile.png')
  await visitor.context.close()

  for (const profile of ['gestora', 'voluntario']) {
    const accountState = await account(profile)
    await accountState.page.goto(`${pwaBase}/app/usuarios`, { waitUntil: 'domcontentloaded' })
    await accountState.page.getByText('Solo los administradores globales pueden gestionar los roles de usuarios.', { exact: true }).waitFor()
    check(`${profile}: no ve buscador ni descarga selector administrativo`, await accountState.page.getByRole('button', { name: 'Buscar usuarios', exact: true }).count() === 0 && !network.some(item => item.profile === profile && item.path.startsWith('/api/v1/usuarios')))
    if (profile === 'gestora') await screenshot(accountState.page, 'sin-permiso-mobile.png')
    await accountState.context.close()
  }

  const admin = await account('admin')
  const page = admin.page
  await ready(page)
  check('ADMIN: selector real disponible con identidad contrastada por API/DB', network.some(item => item.profile === 'admin' && item.method === 'GET' && item.path === '/api/v1/usuarios'))
  await propose(page, 'preview-voluntario', 'Seleccionar a Voluntario sin permiso (preview-voluntario)', 'GENERAL', 'QA sintética: asignación General')
  const confirmationText = await page.getByRole('dialog').innerText()
  check('confirmación identifica usuario y roles anterior/nuevo', confirmationText.includes('Cuenta 604') && /Rol actual:.*Voluntario/s.test(confirmationText) && /Nuevo rol:.*General/s.test(confirmationText))
  await screenshot(page, 'confirmacion-mobile.png')
  const beforeCancel = commands.length
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  check('cancelar confirmación no envía POST ni modifica autoridad', commands.length === beforeCancel && (await authority('604')).revision_autoridad === '0')
  await page.getByRole('button', { name: 'Revisar cambio de rol', exact: true }).click()
  await confirm(page)
  await closeSuccess(page)
  const first = await authority('604')
  check('PWA→API→DB: 604 pasa a GENERAL con revisión 1', first.rol_global === 'GENERAL' && first.revision_autoridad === '1')
  check('primera confirmación emite un único POST con revisión leída', commands.length === beforeCancel + 1 && commands.at(-1).rol_global === 'GENERAL' && commands.at(-1).revision_esperada === '0')
  await page.getByRole('button', { name: 'Preparar otro cambio', exact: true }).click()
  await propose(page, 'preview-voluntario', 'Seleccionar a Voluntario sin permiso (preview-voluntario)', 'VALIDADOR', 'QA sintética: asignación Validador con respuesta perdida')
  let lostCommand, committedResult
  await page.route('**/api/v1/usuarios/604/roles', async route => {
    lostCommand = route.request().postDataJSON()
    const response = await route.fetch()
    assert.equal(response.status(), 200)
    const body = await response.json()
    assert.equal(body.estado, 'CONFIRMADO')
    committedResult = body.resultado
    await route.abort('failed')
  }, { times: 1 })
  await confirm(page)
  await heading(page, 'Cambio de rol sin confirmar').waitFor()
  const second = await authority('604')
  check('se pierde solo la respuesta posterior a commit real: VALIDADOR/revisión 2', !!lostCommand && committedResult.revision_nueva === '2' && second.rol_global === 'VALIDADOR' && second.revision_autoridad === '2')
  check('incertidumbre conserva clave por cuenta y bloquea otra intención', await page.evaluate(() => !!localStorage.getItem('r3foresta:usuarios:rol:v1:600')) && await page.getByRole('button', { name: 'Buscar usuarios', exact: true }).isDisabled())
  await screenshot(page, 'sin-confirmar-mobile.png')
  const postsAtLoss = commands.length
  const otherAccountAt = network.length
  await page.evaluate(token => localStorage.setItem('authToken', token), profiles.gestora.token)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('Solo los administradores globales pueden gestionar los roles de usuarios.', { exact: true }).waitFor()
  check('otra cuenta en el mismo navegador no ve ni recupera el pendiente original', await page.getByText(lostCommand.comando_id, { exact: false }).count() === 0 && !network.slice(otherAccountAt).some(item => item.path.endsWith(`/comandos/${lostCommand.comando_id}`)))
  check('cambio de cuenta conserva el pendiente de la cuenta original', await page.evaluate(() => !!localStorage.getItem('r3foresta:usuarios:rol:v1:600')))
  const recoveryAt = network.length
  await page.evaluate(token => localStorage.setItem('authToken', token), profiles.admin.token)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await closeSuccess(page)
  check('recarga de cuenta original recupera por GET sin nuevo POST', commands.length === postsAtLoss && network.slice(recoveryAt).some(item => item.method === 'GET' && item.path.endsWith(`/comandos/${lostCommand.comando_id}`)))
  check('recuperación muestra el rol confirmado y mantiene revisión 2', await page.getByText('Cuenta 604: General → Validador', { exact: true }).count() === 1 && (await authority('604')).revision_autoridad === '2')
  check('terminal validado libera el pendiente de su cuenta', await page.evaluate(() => localStorage.getItem('r3foresta:usuarios:rol:v1:600') === null))
  await screenshot(page, 'recuperado-mobile.png')

  // C exige que permanezca un ADMIN activo. Retirar temporalmente el segundo
  // por su RPC y restaurarlo por otra RPC conserva historia y roles de fixture.
  // Estas dos preparaciones API y el rechazo UI se registran por separado.
  const adminsBefore = await api('admin', '/api/v1/usuarios?rol_global=ADMIN')
  assert.equal(adminsBefore.status, 200)
  assert.deepEqual(adminsBefore.body.data.map(item => item.usuario_id), ['600', '601'])
  let restoreSecond = false
  try {
    await setRole('601', 'GENERAL', 'QA sintética: preparar protección del último ADMIN')
    restoreSecond = true
    await page.getByRole('button', { name: 'Preparar otro cambio', exact: true }).click()
    await propose(page, 'preview-admin', 'Seleccionar a Administradora central (preview-admin)', 'VOLUNTARIO', 'QA sintética: último ADMIN debe conservarse')
    await confirm(page)
    await heading(page, 'Cambio de rol rechazado').waitFor()
    const rejected = await api('admin', `/api/v1/participacion/comandos/${commands.at(-1).comando_id}?operacion=CAMBIAR_ROL_GLOBAL`)
    check('último ADMIN: rechazo durable visible sin degradar cuenta 600', rejected.status === 200 && rejected.body.estado === 'RECHAZADO' && rejected.body.error.codigo === 'ULTIMO_ADMIN_GLOBAL' && (await authority('600')).rol_global === 'ADMIN')
    await page.setViewportSize({ width: 1280, height: 900 })
    await screenshot(page, 'rechazo-ultimo-admin-desktop.png')
  } finally {
    if (restoreSecond) await setRole('601', 'ADMIN', 'QA sintética: restaurar segundo ADMIN tras ensayo')
  }
  const adminsAfter = await api('admin', '/api/v1/usuarios?rol_global=ADMIN')
  check('ensayo del último ADMIN restaura roles de ambos administradores sin borrar historia', adminsAfter.status === 200 && adminsAfter.body.data.map(item => item.usuario_id).join(',') === '600,601')
  await page.getByRole('button', { name: 'Preparar otro cambio', exact: true }).click()
  await page.getByRole('textbox', { name: 'Buscar por nombre o usuario', exact: true }).fill('')
  await page.getByRole('button', { name: 'Buscar usuarios', exact: true }).click()
  await page.getByRole('button', { name: 'Seleccionar a Voluntario sin permiso (preview-voluntario)', exact: true }).waitFor()
  await screenshot(page, 'usuarios-desktop.png')
  check('ninguna solicitud de gestión transmite actor por body o headers legados', legacyHeaders.length === 0 && commands.every(item => !Object.hasOwn(item, 'actor_id') && !Object.hasOwn(item, 'auth_id')))
  await admin.context.close()
  check('sin errores de ejecución del navegador', errors.length === 0)
  await saveReport('CORRECTO')
  console.log(JSON.stringify({ estado: 'CORRECTO', checks: checks.length, comandos_ui: commands.length, comandos_preparacion_api: apiCommands.length, capturas: screenshots.length, output, errors }, null, 2))
}

run().catch(async error => {
  await saveReport('FALLIDO', error)
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}).finally(async () => { await browser?.close() })
