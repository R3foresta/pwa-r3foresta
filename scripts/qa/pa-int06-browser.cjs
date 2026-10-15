/* QA local exclusivamente contra el launcher sintético INT02C. Sin dependencias nuevas. */
const { mkdir, writeFile } = require('node:fs/promises')
const { resolve } = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')

const apiBase = process.env.PA_QA_API || 'http://127.0.0.1:3304'
const pwaBase = process.env.PA_QA_PWA || 'http://127.0.0.1:5173'
const output = resolve(process.env.PA_QA_OUTPUT || 'docs/qa/pa-int06')
const checks = [], commands = [], errors = [], network = []
let browser
const check = (name, condition = true) => { assert(condition, name); checks.push(name) }

async function run() {
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(apiBase))
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(pwaBase))
  const fixture = await (await fetch(`${apiBase}/__fixture`)).json()
  assert.equal(fixture.entorno, 'SINTETICO_LOCAL_INT02C')
  const profiles = Object.fromEntries(fixture.perfiles.map(profile => [profile.perfil, profile]))
  async function api(profile, path, body) {
    const response = await fetch(`${apiBase}${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${profiles[profile].token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: response.status, body: await response.json() }
  }
  const review = async (profile, person, ids) => (await api(profile, '/api/v1/participacion/accesos/revisar', { usuario_destino_id: person, subcampania_ids: ids })).body.data
  await mkdir(output, { recursive: true })
  browser = await chromium.launch({ headless: true, ...(process.env.PA_QA_CHROMIUM ? { executablePath: process.env.PA_QA_CHROMIUM } : {}) })
  async function account(profile, viewport = { width: 390, height: 844 }) {
    const context = await browser.newContext({ viewport })
    const token = profiles[profile].token
    await context.addInitScript(tokenValue => {
      if (!localStorage.getItem('authToken')) localStorage.setItem('authToken', tokenValue)
    }, token)
    // El launcher C no incluye WebAuthn/perfil. Único adaptador simulado:
    // perfil propio de arranque, ligado a un JWT cuya identidad verifica la API real.
    await context.route('**/api/users/profile', async route => {
      const bearer = route.request().headers().authorization
      const selected = Object.values(profiles).find(item => bearer === `Bearer ${item.token}`)
      if (!selected) return route.fulfill({ status: 401, json: { message: 'Sesión de QA inválida' } })
      const response = await fetch(`${apiBase}/api/v1/participacion/capacidades`, { headers: { Authorization: bearer } })
      if (response.status !== 200) return route.fulfill({ status: response.status, json: { message: 'Cuenta no activa' } })
      const actual = (await response.json()).data.actor
      const claims = JSON.parse(Buffer.from(selected.token.split('.')[1], 'base64url'))
      return route.fulfill({ json: { id: actual.usuario_id, auth_id: claims.sub, username: selected.perfil, nombre: selected.perfil, apellido: null, rol: actual.rol_global, activo: true } })
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      const path = new URL(request.url()).pathname
      if (path.startsWith('/api/')) network.push({ profile, method: request.method(), path })
      if (request.method() === 'POST' && /^\/api\/v1\/participacion\/accesos\/(?!revisar)/.test(path)) commands.push({ profile, path, body: request.postDataJSON() })
    })
    return { context, page }
  }
  async function ready(page) {
    await page.goto(`${pwaBase}/app/participacion/accesos`)
    await page.getByRole('heading', { name: 'Gestión de accesos', exact: true }).waitFor()
    await page.getByRole('combobox', { name: 'Acción', exact: true }).waitFor()
  }
  async function selectScopes(page, names) {
    for (const name of names) await page.getByRole('checkbox', { name: new RegExp(name) }).check()
  }
  async function chooseMember(page, id) {
    const row = page.locator('div.rounded-2xl').filter({ has: page.getByText(`Cuenta ${id}`, { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Elegir persona', exact: true }) }).last()
    await row.getByRole('button', { name: 'Elegir persona', exact: true }).click()
  }
  async function findPerson(page, email) {
    await page.getByRole('combobox', { name: 'Buscar por', exact: true }).selectOption('CORREO_EXACTO')
    await page.getByRole('textbox', { name: 'Correo exacto de la cuenta', exact: true }).fill(email)
    await page.getByRole('button', { name: 'Buscar persona registrada' }).click()
    await page.getByRole('button', { name: 'Seleccionar', exact: true }).click()
  }
  async function confirmation(page) {
    await page.getByRole('button', { name: 'Consultar accesos para revisar' }).click()
    await page.getByRole('button', { name: 'Revisar confirmación' }).click()
    await page.getByRole('dialog').waitFor()
  }
  async function submit(page) {
    await page.getByRole('button', { name: 'Confirmar cambio de acceso' }).click()
    await page.getByRole('heading', { name: /Resultado confirmado por el servidor|Selección rechazada/ }).waitFor()
  }
  async function reset(page) {
    await page.getByRole('button', { name: 'Preparar una nueva revisión' }).click()
    await page.getByRole('combobox', { name: 'Acción', exact: true }).waitFor({ state: 'visible' })
    await page.waitForFunction(() => Array.from(document.querySelectorAll('select')).some(select => select.closest('label')?.textContent?.startsWith('Acción') && !select.disabled))
  }

  for (const profile of ['voluntario', 'plantador', 'logistica']) {
    const { context, page } = await account(profile)
    await page.goto(`${pwaBase}/app/participacion/accesos`)
    await page.getByText('No tienes acciones de gestión de participación disponibles en las subcampañas actuales.').waitFor()
    check(`${profile}: sin acciones de gestión y sin miembros descargados`, !network.some(item => item.profile === profile && item.path.includes('miembros-participacion')))
    if (profile === 'voluntario') await page.screenshot({ path: `${output}/sin-permiso-mobile.png`, fullPage: true })
    await context.close()
  }
  const { context, page } = await account('gestora')
  await page.goto(`${pwaBase}/app/home`)
  await page.getByRole('link', { name: 'Gestionar accesos', exact: true }).click()
  await page.getByRole('combobox', { name: 'Acción', exact: true }).waitFor()
  check('gestora contextual: entrada propia sin descargas internas', !network.some(item => item.profile === 'gestora' && /stock|equipo|\/api\/lotes/.test(item.path)))
  check('gestora: Sur ajena y acciones centrales ausentes', await page.getByRole('checkbox', { name: /Sur ajena/ }).count() === 0 && await page.getByRole('option', { name: /Designar administrador/ }).count() === 0)
  await selectScopes(page, ['Norte propia', 'Borrador'])
  await findPerson(page, 'voluntario@example.invalid')
  await confirmation(page)
  await page.screenshot({ path: `${output}/confirmacion-multiple-mobile.png`, fullPage: true })
  const beforeCancel = commands.length
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  check('cancelar confirmación no envía comando', commands.length === beforeCancel)
  await page.getByRole('button', { name: 'Revisar confirmación' }).click()
  await submit(page)
  check('selección múltiple: un único POST para dos ámbitos', commands.length === beforeCancel + 1 && commands.at(-1).body.ambitos.length === 2)
  const granted = await review('gestora', '604', ['600', '603'])
  check('API/DB: permisos y revisiones confirmados en ambos ámbitos', granted.ambitos.every(scope => scope.permiso_contextual === 'PLANTADOR' && scope.revision_permiso === '1'))
  await reset(page)
  await page.getByRole('combobox', { name: 'Acción', exact: true }).selectOption('RETIRAR_PLANTADOR')
  await selectScopes(page, ['Norte propia', 'Borrador'])
  await chooseMember(page, '604')
  // Perder sólo la respuesta posterior a un commit con cambios reales.
  await confirmation(page)
  let lostCommand
  await page.route('**/api/v1/participacion/accesos/retirar-plantador', async route => {
    lostCommand = route.request().postDataJSON()
    const committed = await route.fetch()
    assert.equal(committed.status(), 200)
    await route.abort('failed')
  }, { times: 1 })
  await page.getByRole('button', { name: 'Confirmar cambio de acceso' }).click()
  await page.getByRole('heading', { name: 'Resultado no confirmado', exact: true }).waitFor()
  check('respuesta perdida: conserva comando e impide confirmación nueva', !!lostCommand && await page.getByRole('button', { name: 'Consultar accesos para revisar' }).isDisabled())
  await page.screenshot({ path: `${output}/resultado-no-confirmado-mobile.png`, fullPage: true })
  const postsAtLoss = commands.length
  await page.reload()
  await page.getByRole('heading', { name: 'Resultado confirmado por el servidor', exact: true }).waitFor()
  check('recarga recupera GET propio sin un POST nuevo', commands.length === postsAtLoss && network.some(item => item.path.endsWith(`/comandos/${lostCommand.comando_id}`)))
  check('recuperación muestra cambios reales una sola vez', await page.getByText('Cambio aplicado', { exact: true }).count() === 2 && (await review('gestora', '604', ['600', '603'])).ambitos.every(scope => scope.permiso_contextual === null && scope.revision_permiso === '2'))
  await page.screenshot({ path: `${output}/recuperado-mobile.png`, fullPage: true })
  // Cuenta nueva en el mismo navegador no recibe el pendiente anterior.
  await page.evaluate(({ token }) => { localStorage.setItem('authToken', token) }, profiles.plantador)
  await page.reload()
  await page.getByText('No tienes acciones de gestión de participación disponibles en las subcampañas actuales.').waitFor()
  check('cambio de cuenta oculta recibos/personas y acciones previos', await page.getByText(lostCommand.comando_id).count() === 0)
  await context.close()

  const global = await account('admin', { width: 1440, height: 1000 })
  await ready(global.page)
  await global.page.getByRole('combobox', { name: 'Acción', exact: true }).selectOption('RETIRAR_ADMINISTRADOR')
  await selectScopes(global.page, ['Norte propia'])
  await chooseMember(global.page, '602')
  await confirmation(global.page)
  await submit(global.page)
  await global.page.getByText('Código: ULTIMO_ADMINISTRADOR_CONTEXTUAL', { exact: true }).waitFor()
  check('ADMIN: último administrador rechazado durable sin cambios', (await review('admin', '602', ['600'])).ambitos[0].permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA')
  await global.page.screenshot({ path: `${output}/rechazo-ultimo-admin-desktop.png`, fullPage: true })
  check('sin desbordamiento horizontal', await global.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  async function adminAction(operation, names, person, replacementEmail) {
    await ready(global.page)
    await global.page.getByRole('combobox', { name: 'Acción', exact: true }).selectOption(operation)
    await selectScopes(global.page, names)
    await chooseMember(global.page, person)
    if (replacementEmail) await findPerson(global.page, replacementEmail)
    await confirmation(global.page)
    await submit(global.page)
    await global.page.getByRole('heading', { name: 'Resultado confirmado por el servidor', exact: true }).waitFor()
  }
  await adminAction('DESIGNAR_ADMINISTRADOR', ['Norte propia'], '603')
  check('C06: segunda administración confirmada', (await review('admin', '603', ['600'])).ambitos[0].permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA')
  await adminAction('CAMBIAR_ADMINISTRADOR_A_PLANTADOR', ['Norte propia'], '603')
  check('C07: cambio conserva otro administrador', (await review('admin', '603', ['600'])).ambitos[0].permiso_contextual === 'PLANTADOR' && (await review('admin', '602', ['600'])).ambitos[0].permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA')
  await adminAction('REEMPLAZAR_ADMINISTRADOR', ['Cerrada con administrador'], '602', 'voluntario@example.invalid')
  const closedOld = await review('admin', '602', ['602']), closedNew = await review('admin', '604', ['602'])
  check('C09: reemplazo protegido en cerrada sin reapertura', closedOld.ambitos[0].permiso_contextual === null && closedNew.ambitos[0].permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA' && (await api('admin', '/api/v1/participacion/capacidades')).body.data.subcampanias.find(scope => scope.subcampania_id === '602').estado === 'COMPLETADA')
  await global.page.screenshot({ path: `${output}/reemplazo-cerrada-desktop.png`, fullPage: true })
  await adminAction('DESIGNAR_ADMINISTRADOR', ['Borrador'], '600')
  await adminAction('RETIRAR_ADMINISTRADOR', ['Borrador'], '600')
  check('C08: retirar contexto a ADMIN conserva su acceso global', await global.page.getByText('Conserva acceso global de administrador.', { exact: true }).count() === 1 && (await review('admin', '600', ['603'])).ambitos[0].acceso_global === true)
  await global.page.screenshot({ path: `${output}/retiro-conserva-global-desktop.png`, fullPage: true })
  // Carrera de revisión: otra intención cambia sólo Norte después de revisar dos ámbitos.
  await ready(global.page)
  await selectScopes(global.page, ['Norte propia', 'Borrador'])
  await findPerson(global.page, 'voluntario@example.invalid')
  await confirmation(global.page)
  const beforeRace = await review('admin', '604', ['600', '603'])
  const raced = await api('admin', '/api/v1/participacion/accesos/otorgar-plantador', { comando_id: require('node:crypto').randomUUID(), usuario_destino_id: '604', ambitos: [{ subcampania_id: '600', revision_esperada: beforeRace.ambitos.find(scope => scope.subcampania_id === '600').revision_permiso }] })
  assert.equal(raced.status, 200)
  await submit(global.page)
  await global.page.getByText('Código: REVISION_OBSOLETA', { exact: true }).waitFor()
  const afterRace = await review('admin', '604', ['600', '603'])
  check('revisión obsoleta rechaza toda la selección sin tocar el otro ámbito', afterRace.ambitos.find(scope => scope.subcampania_id === '603').revision_permiso === beforeRace.ambitos.find(scope => scope.subcampania_id === '603').revision_permiso)
  await global.page.screenshot({ path: `${output}/rechazo-multiple-desktop.png`, fullPage: true })
  await global.context.close()
  check('sin errores de ejecución del navegador', errors.length === 0)
  await writeFile(`${output}/resultados.json`, JSON.stringify({ fecha: new Date().toISOString(), entorno: fixture.entorno, backend: { url: apiBase, revision: fixture.revision_backend, cambios_de_trabajo: fixture.cambios_de_trabajo, migraciones_sha256: fixture.migraciones_sha256 }, pwa_base: pwaBase, adaptador_sesion: 'Sólo perfil propio interceptado; JWT sintético verificado por capacidades reales. WebAuthn no incluido.', checks, commands, network, errors }, null, 2) + '\n')
  console.log(JSON.stringify({ checks: checks.length, commands: commands.length, output, errors }, null, 2))
}
run().catch(async error => { console.error(error); process.exitCode = 1 }).finally(async () => { await browser?.close() })
