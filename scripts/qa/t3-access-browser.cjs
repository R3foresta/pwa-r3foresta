/* T3: PWA real y API HTTP sintética desechable. Sin SQL, JWT real ni servicios externos. */
const http = require('node:http')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const PWA = process.env.T3_QA_PWA || 'http://127.0.0.1:5188'
const PORT = Number(process.env.T3_QA_API_PORT || 3339)
const OUTPUT = path.resolve(process.env.T3_QA_OUTPUT || 'docs/qa/t3-accesos-correccion-2026-11-06')
const A = '9007199254740992', B = '9007199254740993'
const NOW = '2026-11-05T20:00:00Z'
const checks = [], network = [], commands = [], screenshots = [], errors = [], measures = []
const accounts = new Map([
  ['42', { role: 'ADMIN', name: 'Administrador sintético', active: true }],
  ['7', { role: 'GENERAL', name: 'Operación sintética', active: true }],
  ['8', { role: 'VALIDADOR', name: 'Revisión sintética', active: true }],
  ['9', { role: 'GENERAL', name: 'Captura sintética', active: true }],
  ['10', { role: 'GENERAL', name: 'Cuenta sin accesos', active: true }],
  ['11', { role: 'VOLUNTARIO', name: 'Voluntariado sintético', active: true }],
  ['12', { role: 'GENERAL', name: 'Cuenta inactiva sintética', active: false }],
])
for (const [id, user] of accounts) Object.assign(user, { id, authority: '91', m1: id === '9' || id === '11' || id === '12', m1rev: '0', m2: new Map(id === '8' || id === '11' || id === '12' ? [[A, { id: '12', at: NOW }]] : []), m2rev: '0', history: { M1: [], M2: [] } })
const receipts = new Map()
let originBalance = 5
let indeterminateDiscard = false, materialReadFailure = false, materialReadGate = null
let historyId = 100n, loseResponse = false, recoveryAbsent = false, conflict = false, lateRead = null
const check = (name, value = true) => { assert(value, name); checks.push(name); console.log(`OK: ${name}`) }
function effective(user) { return user.active && ['ADMIN', 'GENERAL', 'VALIDADOR'].includes(user.role) }
function readAccess(user, domain, before) {
  const admin = user.active && user.role === 'ADMIN', explicit = effective(user)
  const history = user.history[domain].filter(row => !before || BigInt(row.id) < BigInt(before)).slice(0, 20)
  const common = { usuario_id: user.id, rol_global: user.role, activo: user.active, revision_autoridad: user.authority, revision_acceso: user[domain === 'M1' ? 'm1rev' : 'm2rev'], historial: history, siguiente_antes_de_id: null }
  return { data: domain === 'M1' ? { ...common, acceso_explicito: user.m1, acceso_efectivo: admin || explicit && user.m1, origen: admin ? 'ADMIN' : explicit && user.m1 ? 'EXPLICITO' : 'SIN_ACCESO', capacidades: { crear: admin || explicit && user.m1, mantener_propias: admin || explicit && user.m1, confirmar_propias: false, desechar: admin }, vigencia_actual: user.m1 ? { id: '13', otorgado_en: NOW, otorgado_por: '42' } : null } : { ...common, alcance_global: admin, viveros: [...user.m2].map(([vivero_id, assignment]) => ({ id: assignment.id, vivero_id, otorgado_en: assignment.at, otorgado_por: '42', acceso_efectivo: explicit, capacidades: { operar: explicit, consultar_material: explicit, desechar_semillas: explicit, revisar_documental: explicit && user.role === 'VALIDADOR' } })), capacidades_globales: { administrar: admin, operar_cualquier_vivero: admin, desechar_semillas_cualquier_vivero: admin, revisar_documental_cualquier_vivero: admin } }, observado_en: NOW }
}
function outside(code, message, retry = 'NO_APLICA') { return { error: { codigo: code, mensaje: message, campos: [], ambitos: [], reintento: retry }, comando_id: null, resultado_concluyente: false } }
function origin(vivero) { return { recoleccion_id: '3', vivero_almacenamiento_id: vivero, recolector_id: '9007199254740993', planta_id: '2', codigo_trazabilidad: 'SINT-REC-3', fecha: '2026-11-05', tipo_material: 'SEMILLA', nombre_cientifico_snapshot: 'Especie sintética', nombre_comercial_snapshot: 'Árbol sintético', variedad_snapshot: null, estado_registro: 'VALIDADO', estado_operativo: 'ABIERTO', saldo_actual: originBalance, unidad_canonica: 'G' } }
const ownRecord = (owner = '7', vivero = A) => ({ id: 3, fecha: '2026-11-05', nombre_comercial: 'Árbol sintético', nombre_cientifico: 'Especie sintética', tipo_material: 'SEMILLA', usuario_id: owner, vivero_id: vivero, codigo_trazabilidad: 'SINT-REC-3', estado_registro: 'PENDIENTE_VALIDACION', estado_operativo: 'ABIERTO', saldo_actual: 5, unidad_canonica: 'G', fotos: [], can_approve: true, can_reject: true })
const pagination = { page: 1, limit: 50, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false }
function capabilities(user) { return { data: { actor: { usuario_id: user.id, rol_global: user.role }, capacidades_globales: { asignar_roles: user.role === 'ADMIN', designar_administradores: user.role === 'ADMIN', leer_plan: true }, subcampanias: [] }, observado_en: NOW, siguiente_cursor: null } }
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-auth-id, x-user-role'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Cache-Control', 'private, no-store')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`), route = url.pathname
  const actor = accounts.get((req.headers.authorization || '').replace('Bearer synthetic-', ''))
  network.push({ actor: actor?.id ?? null, path: route, method: req.method })
  const reply = (body, status = 200) => { if (!res.destroyed) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) } }
  const denied = () => reply(outside('CAPACIDAD_INSUFICIENTE', 'Permiso sintético insuficiente.'), 403)
  try {
    if (route === '/api/viveros') return reply({ success: true, data: [{ id: A, codigo: 'SA', nombre: 'Vivero sintético A' }, { id: B, codigo: 'SB', nombre: 'Vivero sintético B' }] })
    if (route === '/api/v1/impact/global') {
      const fixture = JSON.parse(await fs.readFile(path.resolve('src/modules/impacto/api/impacto.test-fixtures.json'), 'utf8'))
      return reply(fixture.global)
    }
    if (!actor?.active) return reply(outside('SESION_INVALIDA', 'Sesión sintética inválida.', 'RECUPERAR_SESION'), 401)
    if (route === '/api/users/profile') return reply({ id: actor.id, auth_id: `synthetic-auth-${actor.id}`, username: `synthetic${actor.id}`, nombre: actor.name, apellido: null, rol: actor.role, activo: true })
    if (route === '/api/v1/participacion/capacidades') return reply(capabilities(actor))
    if (route === '/api/v1/usuarios') {
      if (actor.role !== 'ADMIN') return denied()
      return reply({ data: [...accounts.values()].filter(user => user.active && (!url.searchParams.get('consulta') || user.name.toLowerCase().includes(url.searchParams.get('consulta').toLowerCase()))).sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1).map(user => ({ usuario_id: user.id, nombre: user.name, username: `synthetic${user.id}`, rol_global: user.role, activo: true, revision_autoridad: user.authority })), observado_en: NOW, siguiente_cursor: null })
    }
    let match = route.match(/^\/api\/v1\/usuarios\/(\d+)\/autoridad$/)
    if (match) { if (actor.role !== 'ADMIN') return denied(); const user = accounts.get(match[1]); return user ? reply({ data: { usuario_id: user.id, nombre: user.name, rol_global: user.role, activo: user.active, revision_autoridad: user.authority }, observado_en: NOW }) : reply(outside('RECURSO_NO_VISIBLE', 'Cuenta ausente.'), 404) }
    match = route.match(/^\/api\/v1\/(?:me|usuarios\/(\d+))\/(acceso-recoleccion|acceso-viveros)$/)
    if (match) {
      if (match[1] && actor.role !== 'ADMIN') return denied()
      const target = accounts.get(match[1] || actor.id)
      if (!target) return reply(outside('RECURSO_NO_VISIBLE', 'Cuenta ausente.'), 404)
      const body = readAccess(target, match[2] === 'acceso-recoleccion' ? 'M1' : 'M2', url.searchParams.get('antes_de_id'))
      if (lateRead && match[1] === '7') { const done = lateRead; lateRead = null; await done }
      return reply(body)
    }
    match = route.match(/^\/api\/v1\/(recoleccion|vivero)\/accesos\/comandos\/([a-f0-9-]+)$/)
    if (match) {
      if (recoveryAbsent) return reply({ comando_id: match[2], estado: 'SIN_RESULTADO', resultado: null, error: null, finalizado_en: null }, 202)
      const result = receipts.get(`${actor.id}:${match[1]}:${match[2]}`)
      return result ? reply(result) : reply({ comando_id: match[2], estado: 'SIN_RESULTADO', resultado: null, error: null, finalizado_en: null }, 202)
    }
    match = route.match(/^\/api\/v1\/usuarios\/(\d+)\/(acceso-recoleccion|acceso-viveros)\/(otorgamientos|retiros)$/)
    if (match) {
      if (actor.role !== 'ADMIN') return denied()
      const body = JSON.parse(await readBody(req)), user = accounts.get(match[1]), domain = match[2] === 'acceso-recoleccion' ? 'M1' : 'M2', grant = match[3] === 'otorgamientos'
      assert.deepEqual(Object.keys(body).sort(), ['comando_id', 'motivo', 'revision_esperada', ...(domain === 'M2' ? ['vivero_id'] : [])].sort())
      assert.match(body.comando_id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/)
      if (domain === 'M2') assert([A, B].includes(body.vivero_id))
      const key = `${actor.id}:${domain === 'M1' ? 'recoleccion' : 'vivero'}:${body.comando_id}`
      if (receipts.has(key)) return reply(receipts.get(key))
      commands.push({ actor: actor.id, usuario_id: user.id, domain, grant, ...body })
      const revisionKey = domain === 'M1' ? 'm1rev' : 'm2rev'
      if (conflict) { user[revisionKey] = (BigInt(user[revisionKey]) + 1n).toString(); conflict = false }
      let error = null
      if (body.revision_esperada !== user[revisionKey]) error = { codigo: 'REVISION_OBSOLETA', mensaje: 'Los accesos cambiaron. Consulta nuevamente.', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' }
      if (grant && (!user.active || !['GENERAL', 'VALIDADOR'].includes(user.role))) error = { codigo: 'DESTINO_NO_ELEGIBLE', mensaje: 'Cuenta no elegible.', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' }
      const previous = domain === 'M1' ? user.m1 : user.m2.has(body.vivero_id), revision = user[revisionKey]
      const operation = `${grant ? 'OTORGAR' : 'RETIRAR'}_ACCESO_${domain === 'M1' ? 'RECOLECCION' : 'VIVERO'}`
      let result = null
      if (!error) {
        const changed = previous !== grant
        if (changed) {
          user[revisionKey] = (BigInt(revision) + 1n).toString()
          if (domain === 'M1') user.m1 = grant
          else if (grant) user.m2.set(body.vivero_id, { id: (++historyId).toString(), at: NOW })
          else user.m2.delete(body.vivero_id)
          user.history[domain].unshift({ id: (++historyId).toString(), ...(domain === 'M2' ? { vivero_id: body.vivero_id } : {}), evento: grant ? 'ACCESO_OTORGADO' : 'ACCESO_RETIRADO', acceso_id: '13', actor_id: actor.id, revision_anterior: revision, revision_nueva: user[revisionKey], motivo: body.motivo, creado_en: NOW, comando_id: body.comando_id, otorgado_en: NOW, revocado_en: grant ? null : NOW })
        }
        result = { tipo: domain === 'M1' ? 'ACCESO_RECOLECCION' : 'ACCESO_VIVERO', usuario_id: user.id, ...(domain === 'M2' ? { vivero_id: body.vivero_id } : {}), acceso_explicito_anterior: previous, acceso_explicito_nuevo: grant, revision_anterior: revision, revision_nueva: user[revisionKey], cambio: changed ? 'CAMBIO_APLICADO' : 'SIN_CAMBIOS' }
      }
      const receipt = { comando_id: body.comando_id, operacion: operation, estado: error ? 'RECHAZADO' : 'CONFIRMADO', resultado: result, error, finalizado_en: NOW }
      receipts.set(key, receipt)
      if (loseResponse) { loseResponse = false; return reply(outside('RESULTADO_NO_DETERMINADO', 'Respuesta sintética perdida.', 'MISMA_CLAVE'), 503) }
      return reply(receipt, error ? 409 : 200)
    }
    match = route.match(/^\/api\/v1\/usuarios\/(\d+)\/roles$/)
    if (match) {
      const body = JSON.parse(await readBody(req))
      const receipt = { comando_id: body.comando_id, operacion: 'CAMBIAR_ROL_GLOBAL', estado: 'RECHAZADO', resultado: null, error: { codigo: 'ULTIMO_ADMIN', mensaje: 'No puedes retirar al último administrador sintético.', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' }, finalizado_en: NOW }
      return reply(receipt, 409)
    }
    if (route === '/api/v1/vivero/origenes') {
      const vivero = url.searchParams.get('vivero_id')
      if (actor.role !== 'ADMIN' && (!effective(actor) || !actor.m2.has(vivero))) return denied()
      if (materialReadFailure) { materialReadFailure = false; return reply(outside('RESULTADO_NO_DETERMINADO', 'Fallo sintético de lectura de material.', 'MISMA_CLAVE'), 503) }
      if (materialReadGate) { const gate = materialReadGate; materialReadGate = null; await gate }
      return reply({ success: true, data: [origin(vivero)], pagination: { page: 1, limit: 20, total: 1 } })
    }
    if (route === '/api/lotes-vivero/evidencias-pendientes') {
      const body = await readBody(req); check('multipart INICIO conserva vivero BIGINT exacto', body.includes(B) && body.includes('name="vivero_id"'))
      return reply({ success: true, data: [], evidencia_ids: [19] })
    }
    if (route === '/api/lotes-vivero' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req)); check('alta INICIO usa origen mínimo y vivero exactos', body.vivero_id === B && body.recoleccion_id === '3' && body.evidencia_ids[0] === 19)
      return reply({ success: true, data: { lote_vivero_id: 20 } })
    }
    if (route === '/api/recolecciones/pending-validation') return reply({ success: true, data: actor.id === '8' ? [ownRecord('7', A), { ...ownRecord('8', A), id: 4, codigo_trazabilidad: 'SINT-REC-4' }] : [ownRecord(actor.id, A)], pagination: { ...pagination, total: 2 } })
    if (/^\/api\/recolecciones\/\d+\/desecho$/.test(route)) { const body = JSON.parse(await readBody(req)); check('DESECHO usa endpoint existente con cantidad observada', body.cantidad === 1); originBalance -= body.cantidad; if (indeterminateDiscard) { indeterminateDiscard = false; return reply({ message: 'Resultado sintético de DESECHO no determinado.' }, 503) } return reply({ success: true, data: { message: 'Desecho sintético confirmado' } }) }
    if (route === '/api/recolecciones') { if (!readAccess(actor, 'M1').data.capacidades.mantener_propias) return denied(); return reply({ success: true, data: [], pagination }) }
    if (/^\/api\/lotes-vivero\/\d+/.test(route)) return denied()
    if (/^\/api\/(campanias|subcampanias|lotes-vivero|recolecciones\/stock-summary)/.test(route)) return reply({ success: true, data: [], pagination })
    return reply({ message: `Ruta sintética no modelada: ${route}` }, 404)
  } catch (error) { errors.push(`API: ${error.message}`); return reply({ message: error.message }, 500) }
})
function readBody(req) { return new Promise((resolve, reject) => { let body = ''; req.on('data', part => { body += part }); req.on('end', () => resolve(body)); req.on('error', reject) }) }
let browser, browserVersion
async function main() {
  assert.match(PWA, /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/)
  await fs.mkdir(OUTPUT, { recursive: true })
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve))
  browser = await chromium.launch({ headless: true, ...(process.env.T3_QA_CHROMIUM ? { executablePath: process.env.T3_QA_CHROMIUM } : {}) })
  browserVersion = browser.version()
  async function account(id, viewport = { width: 390, height: 844 }) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' })
    if (id) await context.addInitScript(token => { if (!localStorage.getItem('authToken')) localStorage.setItem('authToken', token) }, `synthetic-${id}`)
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' || new URL(route.request().url()).hostname === 'localhost' ? route.continue() : route.abort())
    const page = await context.newPage(); page.setDefaultTimeout(15000)
    page.on('pageerror', error => errors.push(error.message))
    return { page, context }
  }
  async function shot(page, name) {
    await page.screenshot({ path: path.join(OUTPUT, `${name}.png`), fullPage: true }); screenshots.push(`${name}.png`)
    const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
    measures.push({ name, ...size }); check(`sin desborde horizontal: ${name}`, size.document <= size.viewport)
  }
  const { page, context } = await account('42')
  async function select(id = '7') { await page.getByRole('button', { name: new RegExp(`Seleccionar a .*\\(synthetic${id}\\)`) }).click(); await page.getByRole('heading', { name: 'Acceso de Recolección (M1)' }).waitFor(); await page.getByRole('heading', { name: 'Viveros asignados (M2)' }).waitFor() }
  async function homeSelect(id = '7') { await page.goto(`${PWA}/app/usuarios`); await select(id) }
  async function submit(domain, grant, vivero, reason = 'Operación de QA sintética') {
    if (domain === 'M1') await page.getByRole('button', { name: grant ? 'Otorgar Recolección' : 'Retirar Recolección' }).click()
    else if (grant) { await page.getByLabel('Vivero a asignar').selectOption(vivero); await page.getByRole('button', { name: 'Asignar vivero' }).click() }
    else await page.getByRole('button', { name: `Retirar Vivero sintético ${vivero === A ? 'A' : 'B'}` }).click()
    await page.getByLabel(`Motivo de ${domain}`).fill(reason)
    await page.getByRole('region', { name: domain === 'M1' ? 'Acceso de Recolección (M1)' : 'Viveros asignados (M2)', exact: true }).getByRole('button', { name: grant ? 'Otorgar acceso' : 'Retirar acceso', exact: true }).click()
    const dialog = page.getByRole('dialog'); await dialog.waitFor()
    return dialog
  }
  async function confirm(domain, dialog) { await dialog.getByRole('button', { name: `Confirmar ${domain}` }).click(); await page.getByRole('button', { name: `Cerrar resultado de ${domain === 'M1' ? 'Recolección' : 'Viveros'}` }).waitFor() }
  async function close(domain) { await page.getByRole('button', { name: `Cerrar resultado de ${domain === 'M1' ? 'Recolección' : 'Viveros'}` }).click(); await select() }
  await homeSelect()
  await page.getByRole('button', { name: 'Otorgar Recolección' }).waitFor()
  await shot(page, 'cuenta-390')
  await page.setViewportSize({ width: 320, height: 800 }); await shot(page, 'cuenta-320')
  await page.setViewportSize({ width: 1280, height: 900 }); await shot(page, 'cuenta-1280')
  let dialog = await submit('M1', true)
  const postsBefore = commands.length
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  check('cancelar confirmación no escribe', commands.length === postsBefore && !accounts.get('7').m1)
  await page.getByRole('button', { name: 'Otorgar acceso' }).click(); dialog = page.getByRole('dialog')
  await confirm('M1', dialog)
  check('solo M1 sin cambiar rol ni M2', accounts.get('7').m1 && accounts.get('7').m2.size === 0 && accounts.get('7').role === 'GENERAL')
  await close('M1')
  dialog = await submit('M2', true, A); await confirm('M2', dialog); await close('M2')
  dialog = await submit('M2', true, B); await confirm('M2', dialog)
  check('M2 concede viveros BIGINT vecinos como asignaciones independientes', accounts.get('7').m2.has(A) && accounts.get('7').m2.has(B))
  await close('M2'); dialog = await submit('M2', false, A); await confirm('M2', dialog)
  check('retirar A conserva B, M1 y rol', !accounts.get('7').m2.has(A) && accounts.get('7').m2.has(B) && accounts.get('7').m1 && accounts.get('7').role === 'GENERAL')
  await close('M2'); dialog = await submit('M1', false); await confirm('M1', dialog)
  check('solo M2 tras retirar M1', !accounts.get('7').m1 && accounts.get('7').m2.has(B))
  await close('M1'); dialog = await submit('M2', false, B); await confirm('M2', dialog)
  check('ningún acceso tras retiros explícitos independientes', !accounts.get('7').m1 && accounts.get('7').m2.size === 0)
  await close('M2'); conflict = true; dialog = await submit('M2', true, A); await confirm('M2', dialog)
  check('revisión obsoleta produce rechazo y no concede acceso', !accounts.get('7').m2.has(A))
  const rejectedCommand = commands.at(-1).comando_id
  await page.getByText(/Los accesos cambiaron/).waitFor(); await shot(page, 'conflicto-1280')
  await close('M2'); dialog = await submit('M2', true, B); await confirm('M2', dialog)
  check('tras 409 se relee y confirma otra intención con otro UUID', commands.at(-1).comando_id !== rejectedCommand && commands.at(-1).revision_esperada === '5')
  await close('M2'); loseResponse = true; recoveryAbsent = true
  dialog = await submit('M2', true, A); await dialog.getByRole('button', { name: 'Confirmar M2' }).click()
  await page.getByRole('button', { name: 'Consultar resultado de Viveros' }).waitFor()
  await page.getByText('Respuesta sintética perdida.').waitFor()
  const uncertainId = commands.at(-1).comando_id
  await page.getByRole('button', { name: 'Consultar resultado de Viveros' }).click()
  await page.getByText(/todavía no prueba un fallo/).waitFor()
  check('503 y GET202 conservan el mismo UUID e intención', await page.evaluate(id => localStorage.getItem('r3foresta:usuarios:acceso:v1:M2:42')?.includes(id), uncertainId))
  await page.setViewportSize({ width: 390, height: 844 }); await shot(page, 'resultado-incierto-390')
  accounts.get('42').role = 'GENERAL'; recoveryAbsent = false
  const directoryCount = network.filter(row => row.path === '/api/v1/usuarios').length
  await page.reload(); await page.getByRole('button', { name: 'Cerrar resultado de Viveros' }).waitFor()
  check('recuperación propia tras perder ADMIN usa el recibo original sin directorio', network.filter(row => row.path === '/api/v1/usuarios').length === directoryCount && !await page.getByRole('button', { name: 'Asignar vivero' }).count())
  await shot(page, 'recuperacion-sin-admin-390')
  accounts.get('42').role = 'ADMIN'
  await page.getByRole('button', { name: 'Cerrar resultado de Viveros' }).click(); await select('42')
  await page.getByText(/ADMIN tiene acceso global a todos/).waitFor()
  check('ADMIN deriva M1 y todos los viveros sin asignaciones', await page.getByText(/ADMIN tiene acceso global a todos/).count() === 1 && accounts.get('42').m2.size === 0)
  await page.getByRole('button', { name: 'Cambiar usuario' }).click(); await select('11')
  check('VOLUNTARIO conserva historia pero no recibe nuevas asignaciones', await page.getByRole('button', { name: 'Asignar vivero' }).isDisabled())
  await page.getByRole('button', { name: 'Cambiar usuario' }).click()
  await page.getByText('Consultar cuenta por ID, incluidas inactivas').click(); await page.getByLabel('ID de cuenta').fill('12'); await page.getByRole('button', { name: 'Consultar cuenta', exact: true }).click()
  await page.getByRole('button', { name: 'Retirar Vivero sintético A' }).waitFor()
  check('cuenta inactiva permite retirar vigencia conservada y bloquea otorgar', !await page.getByRole('button', { name: 'Retirar Vivero sintético A' }).isDisabled() && await page.getByRole('button', { name: 'Asignar vivero' }).isDisabled())
  await homeSelect('42'); await page.getByLabel('Nuevo rol').selectOption('GENERAL'); await page.getByLabel('Motivo del cambio').fill('Ensayo de último ADMIN'); await page.getByRole('button', { name: 'Cambiar rol' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirmar rol' }).click(); await page.getByText(/último administrador sintético/).waitFor()
  check('regresión de rol conserva rechazo de último ADMIN', accounts.get('42').role === 'ADMIN')
  await context.close()
  // Cambio de cuenta y respuesta administrativa tardía dentro del mismo navegador.
  const identity = await account('42')
  await identity.page.goto(`${PWA}/app/usuarios`)
  let releaseLate
  lateRead = new Promise(resolve => { releaseLate = resolve })
  await identity.page.getByRole('button', { name: /Seleccionar a .*\(synthetic7\)/ }).click()
  await identity.page.getByRole('heading', { name: 'Acceso de Recolección (M1)' }).waitFor()
  await identity.page.evaluate(() => { localStorage.setItem('authToken', 'synthetic-10'); window.dispatchEvent(new StorageEvent('storage', { key: 'authToken' })) })
  await identity.page.getByText(/Solo los administradores globales/).waitFor()
  releaseLate()
  await identity.page.getByText(/Solo los administradores globales/).waitFor()
  check('cambio de cuenta descarta selección y lectura administrativa tardía', !await identity.page.getByText('Operación sintética', { exact: true }).count() && !await identity.page.getByLabel('Motivo de M1').count())
  await identity.page.evaluate(() => { localStorage.removeItem('authToken'); window.dispatchEvent(new StorageEvent('storage', { key: 'authToken' })) })
  await identity.page.waitForURL('**/auth/login')
  check('logout retira datos administrativos antes de ofrecer acceso privado')
  await identity.context.close()
  // Operario M2 puro: origen mínimo, evidencia contextual y desecho sin ficha M1 ajena.
  accounts.get('7').m1 = false; accounts.get('7').m2 = new Map([[B, { id: '14', at: NOW }]])
  const operator = await account('7')
  const p = operator.page
  const beforeOrigins = network.length
  await p.goto(`${PWA}/app/vivero/new`); await p.getByRole('combobox').selectOption(B); await p.getByRole('radio').click()
  await p.locator('input[inputmode="decimal"]').fill('2.5')
  await p.locator('input[type="file"]').setInputFiles({ name: 'sintetica.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=', 'base64') })
  await p.getByRole('button', { name: 'Registrar inicio de lote' }).click(); await p.getByRole('dialog').getByRole('button', { name: 'Crear lote e iniciar' }).click()
  await p.waitForURL('**/app/vivero/20')
  check('solo M2 inicia con origen mínimo sin pedir ficha/fotos M1 ajenas', !network.slice(beforeOrigins).some(row => /^\/api\/recolecciones(?:\/3|$)/.test(row.path)))
  await p.goto(`${PWA}/app/vivero/material`); await p.getByLabel('Vivero de almacenamiento').selectOption(B); await p.getByRole('button', { name: 'Registrar desecho de SINT-REC-3' }).click(); await p.getByLabel('Cantidad (G)').fill('1'); await p.getByRole('dialog').getByRole('button', { name: 'Registrar desecho', exact: true }).click(); await p.getByText('Desecho sintético confirmado').waitFor(); await p.getByText('Saldo: 4 G', { exact: true }).waitFor(); check('DESECHO refresca el saldo del servidor después del resultado confirmado')
  await shot(p, 'material-m2-390')
  // El 503 físico no autoriza reenviar. Una sola lectura nueva correcta libera la preparación.
  const discardPosts = () => network.filter(row => row.actor === '7' && row.method === 'POST' && row.path === '/api/recolecciones/3/desecho').length
  const materialReads = () => network.filter(row => row.actor === '7' && row.method === 'GET' && row.path === '/api/v1/vivero/origenes').length
  async function uncertainDiscard() {
    indeterminateDiscard = true
    await p.getByRole('button', { name: 'Registrar desecho de SINT-REC-3' }).click()
    await p.getByLabel('Cantidad (G)').fill('1')
    await p.getByRole('dialog').getByRole('button', { name: 'Registrar desecho', exact: true }).click()
    await p.getByRole('dialog').getByText(/El resultado no está confirmado/).waitFor()
    check('DESECHO incierto deshabilita la confirmación física', await p.getByRole('dialog').getByRole('button', { name: 'Registrar desecho', exact: true }).isDisabled())
  }
  await uncertainDiscard()
  let finishObservation
  materialReadGate = new Promise(resolve => { finishObservation = resolve })
  const readsBeforeObservation = materialReads(), postsBeforeObservation = discardPosts()
  await p.getByRole('dialog').getByRole('button', { name: 'Consultar material actual' }).click()
  await p.getByText('Consultando material…', { exact: true }).waitFor()
  check('durante la consulta no se presenta saldo antiguo ni se prepara otro DESECHO', !await p.getByText('Saldo: 4 G', { exact: true }).count() && !await p.getByRole('button', { name: 'Registrar desecho de SINT-REC-3' }).count() && discardPosts() === postsBeforeObservation)
  await shot(p, 'material-consulta-pendiente-390')
  finishObservation()
  await p.getByText('Saldo: 3 G', { exact: true }).waitFor()
  check('una consulta correcta basta para preparar otra operación, sin otra consulta ni POST automático', await p.getByRole('button', { name: 'Registrar desecho de SINT-REC-3' }).isEnabled() && !await p.getByRole('button', { name: 'Consultar material actual' }).count() && materialReads() === readsBeforeObservation + 1 && discardPosts() === postsBeforeObservation)
  await shot(p, 'material-observado-390')
  await p.setViewportSize({ width: 1280, height: 900 })
  await uncertainDiscard()
  const readsBeforeFailure = materialReads(), postsBeforeFailure = discardPosts()
  materialReadFailure = true
  await p.getByRole('dialog').getByRole('button', { name: 'Consultar material actual' }).click()
  await p.getByText('Fallo sintético de lectura de material.', { exact: true }).waitFor()
  check('fallar la lectura mantiene bloqueado el material y nunca reenvía DESECHO', !await p.getByText('Saldo: 3 G', { exact: true }).count() && !await p.getByRole('button', { name: 'Registrar desecho de SINT-REC-3' }).count() && !await p.getByRole('button', { name: 'Consultar material actual' }).count() && discardPosts() === postsBeforeFailure)
  materialReadGate = new Promise(resolve => { finishObservation = resolve })
  await p.getByRole('button', { name: 'Reintentar material' }).click()
  await p.getByText('Consultando material…', { exact: true }).waitFor()
  check('el reintento consulta material sin preparar ni repetir la operación física', !await p.getByRole('button', { name: 'Registrar desecho de SINT-REC-3' }).count() && discardPosts() === postsBeforeFailure)
  finishObservation()
  await p.getByText('Saldo: 2 G', { exact: true }).waitFor()
  check('tras una lectura fallida, sólo el reintento correcto habilita preparar otro desecho', await p.getByRole('button', { name: 'Registrar desecho de SINT-REC-3' }).isEnabled() && materialReads() === readsBeforeFailure + 2 && discardPosts() === postsBeforeFailure)
  await shot(p, 'material-recuperado-1280')
  await p.goto(`${PWA}/app/collections/new`); await p.getByText(/Tu cuenta no tiene acceso/).waitFor(); check('URL directa M1 denegada para operario M2 puro')
  await p.goto(`${PWA}/app/vivero/99/event/merma`); await p.getByText(/Permiso sintético insuficiente/).waitFor(); check('URL de lote ajeno no monta el formulario ni sube fotos')
  await operator.context.close()
  const reviewer = await account('8', { width: 1280, height: 900 })
  const ownListControl = await fetch(`http://127.0.0.1:${PORT}/api/recolecciones`, { headers: { Authorization: 'Bearer synthetic-8' } })
  check('la fixture exige M1 para GET de la lista propia del revisor', ownListControl.status === 403)
  const reviewerStart = network.length
  await reviewer.page.goto(`${PWA}/app/home`)
  await reviewer.page.getByRole('button', { name: 'Recolección: Ver recolecciones' }).click()
  await reviewer.page.waitForURL('**/app/collections/validate')
  await reviewer.page.getByRole('button', { name: 'Aprobar', exact: true }).first().waitFor()
  check('entrada de Inicio para revisor sólo M2 usa la cola y nunca pide la lista propia M1', !accounts.get('8').m1 && !network.slice(reviewerStart).some(row => row.actor === '8' && row.path === '/api/recolecciones'))
  await shot(reviewer.page, 'revision-desde-inicio-sin-m1-1280')
  await reviewer.page.setViewportSize({ width: 390, height: 844 })
  await reviewer.page.getByRole('button', { name: 'Volver', exact: true }).click()
  await reviewer.page.waitForURL('**/app/home')
  check('Volver del revisor sin M1 sale a Inicio sin bucle a su cola')
  await reviewer.page.getByRole('link', { name: 'Recolección', exact: true }).click()
  await reviewer.page.waitForURL('**/app/collections/validate')
  await reviewer.page.getByRole('button', { name: 'Aprobar', exact: true }).first().waitFor()
  check('entrada del menú para revisor sólo M2 tampoco consulta la lista propia prohibida', !network.slice(reviewerStart).some(row => row.actor === '8' && row.path === '/api/recolecciones'))
  await shot(reviewer.page, 'revision-desde-menu-sin-m1-390')
  await reviewer.page.setViewportSize({ width: 1280, height: 900 })
  await reviewer.page.getByRole('button', { name: 'Aprobar', exact: true }).first().waitFor()
  const approveButtons = reviewer.page.getByRole('button', { name: 'Aprobar', exact: true })
  check('VALIDADOR sin M1 revisa su vivero y nunca aprueba lo propio', await approveButtons.count() === 2 && !await approveButtons.nth(0).isDisabled() && await approveButtons.nth(1).isDisabled())
  await shot(reviewer.page, 'revision-sin-m1-1280'); await reviewer.context.close()
  for (const id of ['9', '10', '11']) {
    const item = await account(id)
    if (id === '9') { await item.page.goto(`${PWA}/app/home`); await item.page.getByRole('button', { name: 'Recolección: Ver recolecciones' }).click(); await item.page.getByRole('heading', { name: 'Recolecciones', exact: true }).waitFor(); check('con M1 la entrada normal conserva la lista propia', new URL(item.page.url()).pathname === '/app/collections'); await item.page.goto(`${PWA}/app/collections/validate`); await item.page.getByRole('button', { name: 'Aprobar', exact: true }).waitFor(); check('M1 permite pendientes propios sin aprobación propia', await item.page.getByRole('button', { name: 'Aprobar', exact: true }).isDisabled()); await item.page.getByRole('button', { name: 'Volver', exact: true }).click(); await item.page.getByRole('heading', { name: 'Recolecciones', exact: true }).waitFor(); check('Volver con M1 conserva el regreso a la lista propia') }
    await item.page.goto(`${PWA}/app/vivero/new`)
    await item.page.getByText(id === '11' ? /Acceso del equipo operativo/ : /Tu cuenta no tiene acceso/).waitFor()
    check(`sin M2 no se monta alta por URL: cuenta sintética ${id}`)
    if (id === '9') { await item.page.goto(`${PWA}/app/planting`); await item.page.getByRole('heading', { name: 'Resumen general' }).waitFor(); check('M3 conserva su entrada independiente de M2') }
    await item.context.close()
  }
  const publicView = await account(null)
  const beforePublic = network.length
  await publicView.page.goto(`${PWA}/impacto?vista=lista`); await publicView.page.getByRole('heading', { name: 'Nuestra huella, juntos' }).waitFor()
  check('Impacto conserva entrada pública sin consultas de capacidades M1/M2', !network.slice(beforePublic).some(row => /\/me\/acceso-/.test(row.path)))
  await publicView.context.close()
  check('UUIDs separados por cada intención y dominio', new Set(commands.map(command => command.comando_id)).size === commands.length)
  check('ninguna llamada de administración agregó actor o rol al payload', commands.every(command => !Object.hasOwn(command, 'rol_global')))
  assert.equal(errors.length, 0, errors.join('\n'))
}
async function report(status, failure) {
  await fs.mkdir(OUTPUT, { recursive: true })
  await fs.writeFile(path.join(OUTPUT, 'resultados.json'), JSON.stringify({ estado: status, fecha_local: '2026-11-06', registrado_en: new Date().toISOString(), entorno: 'SINTETICO_LOCAL_T3_HTTP', versiones: { node: process.version, navegador: browserVersion, playwright: require((process.env.PLAYWRIGHT_MODULE_PATH || 'playwright') + '/package.json').version }, pwa: PWA, api: `http://127.0.0.1:${PORT}`, checks, commands, network, screenshots, medidas_ui: measures, errors, ...(failure ? { fallo: failure.stack } : {}), limites: ['API HTTP de esta fixture simula perfiles/capacidades/comandos y material. No prueba JWT/RPC/SQL reales ni WebAuthn.', 'Sin datos de personas, secretos, SQL remoto, push, despliegue o servicios externos. T4/T5 fuera de alcance.', 'El navegador bloquea hosts externos; mapas y Storage reales no acreditados.'] }, null, 2) + '\n')
}
main().then(() => report('APROBADO')).catch(async error => { console.error(error); await report('FALLIDO', error); process.exitCode = 1 }).finally(async () => { await browser?.close(); server.closeAllConnections(); server.close() })
