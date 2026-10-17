/* Entorno D sintético: navegador → API → PostGIS/objetos privados. Nunca remoto. */
const { mkdir, writeFile } = require('node:fs/promises')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const apiBase = process.env.PA_QA_API || 'http://127.0.0.1:3303'
const pwaBase = process.env.PA_QA_PWA || 'http://127.0.0.1:5173'
const output = resolve(process.env.PA_QA_OUTPUT || 'docs/qa/pa-int04')
const socket = process.env.PA_QA_SOCKET
const psql = process.env.PA_QA_PSQL
const checks = [], commands = [], errors = [], network = [], db = []
let browser, evaluatorWrapped = false
const check = (name, condition = true) => { assert(condition, name); checks.push(name); console.log(`${checks.length}: ${name}`) }
const roles = { 800: 'ADMIN', 801: 'VOLUNTARIO', 802: 'VOLUNTARIO', 803: 'ADMIN', 804: 'VOLUNTARIO', 901: 'GENERAL' }
const png = readFileSync(resolve(__dirname, '../../public/icon-192.png'))
function sql(query) {
  assert(/^\/private\/tmp\/pa-int03a-[a-z0-9_]+\/socket$/.test(socket || ''), 'Socket exclusivo del launcher D requerido')
  assert(psql && psql.endsWith('/psql'))
  return execFileSync(psql, ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', socket, '-p', '55435', '-U', 'postgres', '-d', 'pa_int03a_ensayo'], { input: query, encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG'))), timeout: 15000 }).trim()
}
function restoreEvaluator() {
  if (evaluatorWrapped) { sql('DROP FUNCTION public.gps_dentro_poligono_con_tolerancia(bigint,numeric,numeric); ALTER FUNCTION public.pa_int04_fixture_gps_real(bigint,numeric,numeric) RENAME TO gps_dentro_poligono_con_tolerancia;'); evaluatorWrapped = false }
}
const read = query => sql(`BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='10s'; ${query}; COMMIT;`)
async function run() {
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(apiBase))
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(pwaBase))
  const sessions = {}
  for (const actor of Object.keys(roles)) {
    const session = await (await fetch(`${apiBase}/_fixture/sesion/${actor}`)).json()
    assert(session.sintetico && session.actor_id === actor)
    sessions[actor] = session.authorization
  }
  const api = async (actor, path, body, method = body ? 'POST' : 'GET') => {
    const response = await fetch(`${apiBase}${path}`, { method, headers: { Authorization: sessions[actor], ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: response.status, body: await response.json() }
  }
  check('Fixture D explícito y sesiones exclusivamente sintéticas')
  const beforeVivero = read('SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM public.lote_vivero l')
  await mkdir(output, { recursive: true })
  browser = await chromium.launch({ headless: true, executablePath: process.env.PA_QA_CHROMIUM || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  async function account(actor, viewport = { width: 390, height: 844 }) {
    const context = await browser.newContext({ viewport })
    await context.addInitScript(token => { if (!localStorage.getItem('authToken')) localStorage.setItem('authToken', token) }, sessions[actor].replace(/^Bearer /, ''))
    // D no incluye WebAuthn/perfil. Único adaptador: perfil de arranque de una
    // identidad que capacidades confirma realmente con ese mismo Bearer.
    await context.route('**/api/users/profile', async route => {
      const authorization = route.request().headers().authorization
      const selected = Object.keys(sessions).find(id => sessions[id] === authorization)
      if (!selected) return route.fulfill({ status: 401, json: { message: 'Sesión sintética inválida' } })
      const actual = await api(selected, '/api/v1/participacion/capacidades')
      if (actual.status !== 200) return route.fulfill({ status: actual.status, json: { message: 'Cuenta no activa' } })
      const claims = JSON.parse(Buffer.from(authorization.split('.')[1], 'base64url'))
      return route.fulfill({ json: { id: selected, auth_id: claims.sub, username: `fixture${selected}`, nombre: `Cuenta sintética ${selected}`, apellido: null, rol: actual.body.data.actor.rol_global, activo: true } })
    })
    async function pageForContext() {
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      page.on('request', request => {
        const path = new URL(request.url()).pathname
        if (path.startsWith('/api/')) network.push({ actor, method: request.method(), path: path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ':uuid') })
        if (path.endsWith('/api/v1/plantaciones/iniciales') && request.method() === 'POST') commands.push({ actor, body: request.postDataJSON() })
      })
      return page
    }
    return { context, page: await pageForContext(), newPage: pageForContext }
  }
  const pathFor = scope => `${pwaBase}/app/participacion/subcampanias/${scope}/registrar`
  async function open(page, scope) {
    await page.goto(pathFor(scope))
    await page.getByRole('heading', { name: 'Fotos y ubicación', exact: true }).waitFor()
    await page.locator('input[type=file]').waitFor({ state: 'attached' })
    await page.waitForFunction(() => !document.querySelector('input[type=file]').disabled)
  }
  async function addPhoto(page, name = 'trabajo-sintetico.png') {
    await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'image/png', buffer: png })
    await page.getByRole('button', { name: 'Preparar y subir fotos pendientes' }).waitFor()
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Preparar y subir fotos pendientes') && !b.disabled))
  }
  async function upload(page) {
    await page.getByRole('button', { name: 'Preparar y subir fotos pendientes' }).click()
    await page.getByText('Disponible · validada por servidor', { exact: true }).waitFor()
  }
  async function location(page, longitude = '-68.1') {
    await page.getByRole('button', { name: 'Editar coordenadas manualmente' }).click()
    await page.getByRole('textbox', { name: 'Latitud', exact: true }).fill('-16.5')
    await page.getByRole('textbox', { name: 'Longitud', exact: true }).fill(longitude)
    await page.getByRole('button', { name: 'Confirmar ubicación y continuar' }).click()
    await page.getByRole('heading', { name: 'Especies y cantidades', exact: true }).waitFor()
  }
  async function quantities(page, amount = '7', note = 'Nota privada sintética de INT04') {
    await page.getByRole('textbox', { name: /^Cantidad de/ }).fill(amount)
    await page.getByRole('textbox', { name: 'Observaciones (opcional)', exact: true }).fill(note)
    await page.getByRole('button', { name: 'Continuar a participantes' }).click()
    await page.getByRole('heading', { name: 'Participantes y confirmación', exact: true }).waitFor()
  }
  async function confirm(page) {
    await page.getByRole('button', { name: 'Confirmar plantación', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('button', { name: 'Confirmar y guardar plantación', exact: true }).click()
  }
  async function draftState(page, scope) {
    return page.evaluate(async scopeId => {
      const { readRegistrationDraft } = await import('/src/modules/participacion/commands/registrationDraftStore.ts')
      const r = await readRegistrationDraft('801', scopeId)
      return r ? { comando_id: r.comando_id, files: r.files.length, bytes: r.files.reduce((sum, photo) => sum + photo.file.size, 0), draft: r.draft, terminal: r.terminal?.estado ?? null } : null
    }, scope)
  }
  const first = await account('801')
  await first.page.goto(`${pwaBase}/app/participacion/registrar`)
  await first.page.getByRole('combobox', { name: 'Subcampaña activa' }).selectOption('820')
  await first.page.getByRole('button', { name: 'Registrar en esta subcampaña' }).click()
  await first.page.locator('input[type=file]').waitFor({ state: 'attached' })
  await addPhoto(first.page); await upload(first.page)
  check('Preparación, PUT y preview privados confirmados por API real')
  await first.page.screenshot({ path: `${output}/fotos-mobile.png`, fullPage: true })
  await location(first.page); await quantities(first.page)
  await first.page.getByRole('button', { name: 'Consultar personas habilitadas' }).click()
  await first.page.getByRole('checkbox').filter({ hasText: '' }).first().waitFor()
  const participant = first.page.getByRole('checkbox', { name: /Cuenta 802/ })
  await participant.check()
  check('Participante opcional del mismo ámbito seleccionado sin duplicar al responsable', await first.page.getByRole('checkbox', { name: /Cuenta 801/ }).count() === 0)
  await first.page.screenshot({ path: `${output}/resumen-mobile.png`, fullPage: true })
  const beforePost = commands.length
  await first.page.getByRole('button', { name: 'Confirmar plantación', exact: true }).click()
  await first.page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  check('Cancelar diálogo final no envía POST', commands.length === beforePost)
  await confirm(first.page)
  await first.page.getByRole('heading', { name: 'Plantación guardada', exact: true }).waitFor()
  check('Tres pasos: meta superada dentro del saldo y un único POST confirmado', commands.length === beforePost + 1 && commands.at(-1).body.especies[0].cantidad === 7)
  const firstCommand = commands.at(-1).body
  const firstReceipt = await api('801', `/api/v1/participacion/comandos/${firstCommand.comando_id}?operacion=REGISTRAR_PLANTACION_INICIAL`)
  assert.equal(firstReceipt.status, 200)
  await first.page.reload(); await first.page.getByRole('heading', { name: 'Plantación guardada', exact: true }).waitFor()
  check('Recarga del comprobante no crea otro POST', commands.length === beforePost + 1)
  await first.page.getByRole('link', { name: 'Ver detalle propio' }).click()
  await first.page.getByText('Nota privada sintética de INT04', { exact: true }).waitFor()
  await first.page.screenshot({ path: `${output}/detalle-mobile.png`, fullPage: true })
  const own = await api('802', `/api/v1/plantaciones/${firstReceipt.body.resultado.registro_plantacion_id}/detalle-propio`)
  check('Autor ve observaciones y participante recibe histórico sin observaciones del autor', own.status === 200 && own.body.data.observaciones_autor === null)
  check('Registro participante sin descargas internas de equipo/lotes/stock', !network.some(item => item.actor === '801' && /\/equipo|\/lotes|\/stock/.test(item.path)))
  // Respuesta perdida después de commit: dos pestañas comparten la intención.
  const lost = await account('801')
  await open(lost.page, '821'); await addPhoto(lost.page); await upload(lost.page)
  await location(lost.page, '-67.5'); await quantities(lost.page, '2', 'Exterior y respuesta perdida')
  const secondTab = await lost.newPage()
  await secondTab.goto(pathFor('821'))
  await secondTab.getByRole('heading', { name: 'Participantes y confirmación', exact: true }).waitFor()
  // La recuperación de B actualiza la revisión local; A debe leerla antes de confirmar.
  await lost.page.reload()
  await lost.page.getByRole('heading', { name: 'Participantes y confirmación', exact: true }).waitFor()
  let lostPayload
  await lost.page.route('**/api/v1/plantaciones/iniciales', async route => {
    lostPayload = route.request().postDataJSON()
    const committed = await route.fetch(); assert.equal(committed.status(), 200)
    await route.abort('failed')
  }, { times: 1 })
  const lossStart = commands.length
  await confirm(lost.page)
  await lost.page.getByRole('heading', { name: 'Resultado pendiente de confirmar', exact: true }).waitFor()
  await lost.page.screenshot({ path: `${output}/respuesta-perdida-mobile.png`, fullPage: true })
  check('POST perdido después de commit conserva intención congelada y bloquea edición', !!lostPayload && await lost.page.locator('input[type=file]').count() === 0)
  await confirm(secondTab)
  await secondTab.getByRole('heading', { name: 'Resultado pendiente de confirmar', exact: true }).waitFor()
  check('Segunda pestaña detecta revisión local cambiada sin enviar otro POST', commands.length === lossStart + 1)
  await secondTab.getByRole('button', { name: 'Comprobar guardado', exact: true }).click()
  await secondTab.getByRole('heading', { name: 'Plantación guardada', exact: true }).waitFor()
  await lost.page.reload()
  await lost.page.getByRole('heading', { name: 'Plantación guardada', exact: true }).waitFor()
  check('Ambas pestañas concilian por GET y no repiten el efecto', commands.length === lossStart + 1)
  const lostResult = (await api('801', `/api/v1/participacion/comandos/${lostPayload.comando_id}?operacion=REGISTRAR_PLANTACION_INICIAL`)).body
  check('PostGIS real admite punto exterior y devuelve advertencia del recibo', lostResult.resultado.gps_dentro_poligono === false && lostResult.resultado.gps_distancia_a_poligono_m > 0)
  // El storage event real debe ocultar la cuenta anterior en la otra pestaña.
  await secondTab.evaluate(token => localStorage.setItem('authToken', token), sessions['802'].replace(/^Bearer /, ''))
  await lost.page.getByRole('heading', { name: 'Fotos y ubicación', exact: true }).waitFor()
  check('Cambio de cuenta en otra pestaña oculta comprobante/fotos/nombres previos', await lost.page.getByText(lostResult.resultado.codigo_trazabilidad, { exact: true }).count() === 0 && await lost.page.getByText('Exterior y respuesta perdida', { exact: true }).count() === 0)
  await secondTab.evaluate(token => localStorage.setItem('authToken', token), sessions['801'].replace(/^Bearer /, ''))
  await lost.page.getByRole('heading', { name: 'Plantación guardada', exact: true }).waitFor()
  check('Volver a la cuenta original recupera el mismo comprobante', commands.length === lossStart + 1)
  await lost.context.close()

  // Preparación con respuesta perdida antes de PUT: reanudar edición, misma clave.
  const prepared = await account('801')
  await open(prepared.page, '822'); await addPhoto(prepared.page)
  const preparationStart = network.filter(item => item.method === 'POST' && item.path.endsWith('/preparaciones')).length
  await prepared.page.route('**/api/v1/participacion/comandos/preparaciones', async route => { const response = await route.fetch(); assert.equal(response.status(), 200); await route.abort('failed') }, { times: 1 })
  await prepared.page.getByRole('button', { name: 'Preparar y subir fotos pendientes' }).click()
  await prepared.page.getByRole('heading', { name: 'Preparación o carga pendiente de comprobar', exact: true }).waitFor()
  const prepBefore = await draftState(prepared.page, '822')
  await prepared.page.reload(); await prepared.page.locator('input[type=file]').waitFor({ state: 'attached' })
  await upload(prepared.page)
  const prepAfter = await draftState(prepared.page, '822')
  check('Pérdida de preparación y recarga conservan bytes/comando; GET202 permite captura', prepBefore.comando_id === prepAfter.comando_id && prepAfter.bytes === png.length && prepAfter.files === 1)
  check('Recuperar preparación evita otro POST de preparación y no crea registro', network.filter(item => item.method === 'POST' && item.path.endsWith('/preparaciones')).length === preparationStart + 1 && !commands.some(item => item.body.subcampania_id === '822'))
  await prepared.page.getByRole('button', { name: 'Volver', exact: true }).click()
  await prepared.page.getByRole('button', { name: 'Descartar borrador y cerrar preparación' }).click()
  await prepared.page.getByRole('heading', { name: 'Registrar plantación', exact: true }).waitFor()
  const cancelled = await api('801', `/api/v1/participacion/comandos/${prepAfter.comando_id}?operacion=REGISTRAR_PLANTACION_INICIAL`)
  check('Descarte clausura preparación antes de soltar bytes locales', cancelled.body.error.codigo === 'PREPARACION_CANCELADA' && (await draftState(prepared.page, '822')).bytes === 0)
  await prepared.context.close()

  // PUT con respuesta perdida: el listado acredita la carga sin reenviarla.
  const uploaded = await account('801')
  await open(uploaded.page, '823'); await addPhoto(uploaded.page)
  let putCount = 0
  uploaded.page.on('request', request => { if (request.method() === 'PUT' && request.url().includes('/cargas/')) putCount += 1 })
  await uploaded.page.route('**/api/v1/participacion/comandos/*/cargas/*?*', async route => {
    if (route.request().method() !== 'PUT') return route.continue()
    const response = await route.fetch(); assert.equal(response.status(), 201); await route.abort('failed')
  }, { times: 1 })
  await uploaded.page.getByRole('button', { name: 'Preparar y subir fotos pendientes' }).click()
  await uploaded.page.getByRole('heading', { name: 'Preparación o carga pendiente de comprobar', exact: true }).waitFor()
  const uploadedBefore = await draftState(uploaded.page, '823')
  await uploaded.page.reload(); await uploaded.page.getByText('Disponible · validada por servidor', { exact: true }).waitFor()
  check('Pérdida de PUT: recarga lista carga disponible sin segundo PUT', putCount === 1 && (await draftState(uploaded.page, '823')).comando_id === uploadedBefore.comando_id)
  await location(uploaded.page); await quantities(uploaded.page, '3', 'Propuesta retenida ante cambio del plan')
  // Inyección limitada al clúster sintético: simula una revisión concurrente.
  sql('UPDATE public.subcampania SET plan_revision=plan_revision+1 WHERE id=823;')
  await confirm(uploaded.page)
  await uploaded.page.getByRole('heading', { name: 'Plantación rechazada por el servidor', exact: true }).waitFor()
  const rejected = await draftState(uploaded.page, '823')
  check('Plan cambiado: rechazo durable conserva cantidad y fotos sin ajuste silencioso', rejected.draft.especies[0].cantidad === 3 && rejected.bytes === png.length && rejected.terminal === 'RECHAZADO')
  await uploaded.page.screenshot({ path: `${output}/rechazo-plan-mobile.png`, fullPage: true })
  await uploaded.page.getByRole('button', { name: 'Revisar borrador para una intención nueva' }).click()
  await uploaded.page.getByRole('button', { name: 'Comenzar nueva revisión' }).click()
  await uploaded.page.getByRole('heading', { name: 'Especies y cantidades', exact: true }).waitFor()
  const revised = await draftState(uploaded.page, '823')
  check('Nueva revisión explícita crea otra clave y conserva propuesta/bytes permitidos', revised.comando_id !== rejected.comando_id && revised.draft.especies[0].cantidad === 3 && revised.bytes === png.length)
  await uploaded.page.getByRole('button', { name: 'Volver a fotos y ubicación' }).click()
  await upload(uploaded.page); await location(uploaded.page); await quantities(uploaded.page, '3', 'Propuesta retenida ante cambio del plan')
  await confirm(uploaded.page); await uploaded.page.getByRole('heading', { name: 'Plantación guardada', exact: true }).waitFor()
  check('Revisión rechazada exige nueva carga y confirmación; no transfiere evidencia', putCount === 2 && commands.filter(item => item.body.subcampania_id === '823').length === 2)
  await uploaded.context.close()

  // Fallo confirmado del evaluador, distinto de un timeout de transporte.
  const evaluator = await account('801')
  await open(evaluator.page, '824'); await addPhoto(evaluator.page); await upload(evaluator.page)
  await location(evaluator.page); await quantities(evaluator.page, '1', 'Propuesta con evaluador indisponible')
  sql('ALTER FUNCTION public.gps_dentro_poligono_con_tolerancia(bigint,numeric,numeric) RENAME TO pa_int04_fixture_gps_real; CREATE FUNCTION public.gps_dentro_poligono_con_tolerancia(bigint,numeric,numeric) RETURNS TABLE(dentro boolean,distancia_m numeric) LANGUAGE SQL AS $$ SELECT d.dentro,d.distancia_m FROM public.pa_int04_fixture_gps_real($1,$2,$3) d WHERE $1<>824 $$;')
  evaluatorWrapped = true
  await confirm(evaluator.page)
  await evaluator.page.getByRole('heading', { name: 'Plantación rechazada por el servidor', exact: true }).waitFor()
  const evaluatorDraft = await draftState(evaluator.page, '824')
  const evaluatorResponse = await api('801', `/api/v1/participacion/comandos/${evaluatorDraft.comando_id}?operacion=REGISTRAR_PLANTACION_INICIAL`)
  check('503 del evaluador es RECHAZADO durable, conserva borrador y no se presenta incierto', evaluatorResponse.body.error.codigo === 'EVALUADOR_NO_DISPONIBLE' && evaluatorDraft.bytes === png.length && evaluatorDraft.terminal === 'RECHAZADO')
  await evaluator.page.screenshot({ path: `${output}/evaluador-rechazado-mobile.png`, fullPage: true })
  restoreEvaluator()
  await evaluator.page.reload(); await evaluator.page.getByRole('heading', { name: 'Plantación rechazada por el servidor', exact: true }).waitFor()
  const terminalPreparation = await evaluator.page.evaluate(async ({ actor, scope, command }) => {
    const { RegistroParticipacionService } = await import('/src/modules/participacion/api/registro.api.ts')
    const result = await RegistroParticipacionService.preparar({ actor_id: actor, subcampania_id: scope, comando_id: command })
    return 'estado' in result ? result.estado : result.data.estado
  }, { actor: '801', scope: '824', command: evaluatorDraft.comando_id })
  check('Preparación de clave ya terminal se discrimina sin reabrir cargas', terminalPreparation === 'RECHAZADO')
  await evaluator.context.close()

  const empty = await account('801')
  await empty.page.goto(pathFor('825'))
  await empty.page.getByRole('heading', { name: 'Sin stock disponible para plantación inicial' }).waitFor()
  check('SIN_STOCK conserva autorización y se distingue de error o falta de permiso', await empty.page.getByText('Tu autorización se conserva.', { exact: false }).count() === 1)
  await empty.context.close()
  const forbidden = await account('804')
  await forbidden.page.goto(`${pwaBase}/app/participacion/registrar`)
  await forbidden.page.getByText(/No tienes subcampañas activas habilitadas/).waitFor()
  await forbidden.page.goto(pathFor('820'))
  await forbidden.page.getByRole('button', { name: 'Volver a consultar contexto' }).waitFor()
  check('URL ajena rechazada sin descargar stock/equipo/lotes internos', !network.some(item => item.actor === '804' && /\/equipo|\/lotes|\/stock/.test(item.path)))
  await forbidden.page.screenshot({ path: `${output}/sin-permiso-mobile.png`, fullPage: true })
  await forbidden.context.close()

  // Una retirada real por la API de accesos no impide consultar el recibo propio.
  const review = await api('800', '/api/v1/participacion/accesos/revisar', { usuario_destino_id: '801', subcampania_ids: ['820'] })
  const revision = review.body.data.ambitos[0].revision_permiso
  const retired = await api('800', '/api/v1/participacion/accesos/retirar-plantador', { comando_id: randomUUID(), usuario_destino_id: '801', ambitos: [{ subcampania_id: '820', revision_esperada: revision }] })
  assert.equal(retired.body.estado, 'CONFIRMADO')
  const recovery = await account('801')
  // El recibo se consulta por el cliente v1 sin cargar contexto operativo.
  const afterRetirement = await recovery.page.goto(`${pwaBase}/app/participacion/registros/${firstReceipt.body.resultado.registro_plantacion_id}`)
  assert.equal(afterRetirement.status(), 200)
  await recovery.page.getByText('Nota privada sintética de INT04', { exact: true }).waitFor()
  check('Detalle histórico propio continúa tras retiro sin requerir contexto operativo')
  const historical = await recovery.page.evaluate(async value => {
    const { RegistroParticipacionService } = await import('/src/modules/participacion/api/registro.api.ts')
    return (await RegistroParticipacionService.recuperar({ actor_id: '801', subcampania_id: '820', comando_id: value })).estado
  }, firstCommand.comando_id)
  check('GET de comprobante propio continúa tras retiro', historical === 'CONFIRMADO')
  await recovery.context.close()

  // Cotejo read-only del efecto de cada intención enviada por el navegador.
  const unique = [...new Set(commands.map(item => item.body.comando_id))]
  assert(unique.every(key => /^[0-9a-f-]{36}$/.test(key)))
  const rows = JSON.parse(read(`SELECT jsonb_agg(jsonb_build_object('comando_id', c.comando_id, 'estado', c.estado, 'resultado', c.resultado, 'error_codigo', c.error->>'codigo', 'registros', (SELECT count(*) FROM public.registro_plantacion r WHERE r.id::text=c.resultado->>'registro_plantacion_id'), 'consumo', (SELECT coalesce(sum(d.cantidad),0) FROM public.registro_plantacion_detalle d WHERE d.registro_plantacion_id::text=c.resultado->>'registro_plantacion_id'), 'fotos', (SELECT count(*) FROM public.evidencias_trazabilidad e WHERE e.entidad_id::text=c.resultado->>'registro_plantacion_id')) ORDER BY c.id) FROM public.participacion_comando c WHERE c.comando_id IN (${unique.map(key => `'${key}'::uuid`).join(',')})`))
  assert.equal(rows.length, unique.length)
  for (const row of rows) {
    if (row.estado === 'CONFIRMADO') { assert.equal(row.registros, 1); assert.equal(row.consumo, row.resultado.cantidad_total_plantada); assert.equal(row.fotos, 1) }
    else { assert.equal(row.estado, 'RECHAZADO'); assert.equal(row.registros, 0); assert.equal(row.consumo, 0); assert.equal(row.fotos, 0) }
  }
  db.push(...rows)
  check('DB: un recibo/registro/consumo/vínculo por intención confirmada; rechazos sin efectos parciales')
  check('Sin errores JavaScript de navegador', errors.length === 0)
  check('Vivero conserva exactamente sus filas/saldos', beforeVivero === read('SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM public.lote_vivero l'))
  await first.context.close()
  await browser.close(); browser = null
}
run().then(async () => {
  await writeFile(`${output}/resultados.json`, JSON.stringify({ entorno: 'SINTETICO_LOCAL_INT02D', checks, commands, errors, network, db }, null, 2) + '\n')
  console.log(JSON.stringify({ checks: checks.length, commands: commands.length, output }))
}).catch(async error => {
  try { restoreEvaluator() } catch (restoreError) { console.error(restoreError.message) }
  console.error(error.stack); console.error(JSON.stringify({ checks, network: network.slice(-25), commands: commands.length, errors }))
  if (browser) { const contexts = browser.contexts(); for (const context of contexts) for (const page of context.pages()) { console.error((await page.locator('body').innerText()).slice(0, 7000)); await page.screenshot({ path: `${output}/fallo.png`, fullPage: true }).catch(() => {}) }; await browser.close() }
  process.exitCode = 1
})
