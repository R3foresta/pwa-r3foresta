/* Sólo fixture D local: cliente Vite real, HTTP/RPC/objetos reales, SQL de lectura. */
const { mkdir, writeFile } = require('node:fs/promises')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { execFileSync } = require('node:child_process')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')

const apiBase = process.env.PA_QA_API || 'http://127.0.0.1:3305'
const pwaBase = process.env.PA_QA_PWA || 'http://127.0.0.1:5175'
const output = resolve(process.env.PA_QA_OUTPUT || 'docs/qa/pa-int04')
const socket = process.env.PA_QA_SOCKET
const psql = process.env.PA_QA_PSQL
const png = readFileSync(resolve(__dirname, '../../public/icon-192.png')).toString('base64')
const checks = [], network = [], errors = [], balances = []
let browser
const safe = value => String(value).replace(/Bearer\s+\S+/gi, 'Bearer [redactado]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid')
const check = (name, condition = true) => { assert(condition, name); checks.push(name) }
function readSql(query) {
  assert(/^\/private\/tmp\/pa-int03a-[a-z0-9_]+\/socket$/.test(socket || ''), 'Socket exclusivo de fixture requerido')
  assert(psql && psql.endsWith('/psql'), 'psql explícito del runtime aislado requerido')
  return execFileSync(psql, ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', socket, '-p', '55435', '-U', 'postgres', '-d', 'pa_int03a_ensayo'], {
    input: `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='10s'; ${query}; COMMIT;`, encoding: 'utf8', timeout: 15000,
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG'))),
  }).trim()
}
function balance(stage) {
  const value = JSON.parse(readSql(`SELECT jsonb_build_object(
    'consumido_reposicion',(SELECT cantidad_consumida FROM public.asignacion_vivero_subcampania WHERE id=82099 AND subcampania_id=820 AND proposito='REPOSICION'),
    'repuesto_origen',(SELECT cantidad_repuesta_acumulada FROM public.registro_plantacion WHERE id=820000),
    'registros_reposicion',(SELECT count(*) FROM public.registro_plantacion WHERE subcampania_id=820 AND es_reposicion),
    'saldo_vivero',(SELECT saldo_vivo_actual FROM public.lote_vivero WHERE id=81))`))
  balances.push({ stage, ...value }); return value
}
async function run() {
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(apiBase), 'API únicamente localhost')
  assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(pwaBase), 'PWA únicamente localhost')
  const sessions = {}
  for (const actor of ['901', '803', '801']) {
    const response = await fetch(`${apiBase}/_fixture/sesion/${actor}`)
    assert.equal(response.status, 200, 'Launcher sintético disponible')
    const session = await response.json()
    assert(session.sintetico === true && session.actor_id === actor && /^Bearer /.test(session.authorization), 'Sesión exclusivamente sintética')
    sessions[actor] = session.authorization
  }
  check('API/PWA localhost y tres sesiones explícitamente sintéticas')
  const marker = readSql("SELECT count(*) FROM public.usuario WHERE id=901 AND rol='GENERAL' AND auth_id='a-http-901'")
  check('Cluster aislado D con GENERAL/OPERARIO sintético 901', marker === '1')
  await mkdir(output, { recursive: true })
  browser = await chromium.launch({ headless: true, executablePath: process.env.PA_QA_CHROMIUM || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  const account = async actor => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    await context.addInitScript(token => localStorage.setItem('authToken', token), sessions[actor].replace(/^Bearer /, ''))
    // Único adaptador: perfil de arranque. La autoridad se consulta realmente
    // con el mismo Bearer; servicios/HTTP de reposición no se interceptan.
    await context.route('**/api/users/profile', async route => {
      const authorization = route.request().headers().authorization
      const selected = Object.keys(sessions).find(id => sessions[id] === authorization)
      if (!selected) return route.fulfill({ status: 401, json: { message: 'Sesión sintética inválida' } })
      const actual = await fetch(`${apiBase}/api/v1/participacion/capacidades`, { headers: { Authorization: authorization } })
      const body = await actual.json()
      if (actual.status !== 200) return route.fulfill({ status: actual.status, json: { message: 'Cuenta no activa' } })
      assert.equal(body.data.actor.usuario_id, selected)
      const claims = JSON.parse(Buffer.from(authorization.split('.')[1], 'base64url'))
      return route.fulfill({ json: { id: selected, auth_id: claims.sub, username: `fixture${selected}`, nombre: `Cuenta sintética ${selected}`, apellido: null, rol: body.data.actor.rol_global, activo: true } })
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(safe(error.message)))
    page.on('response', response => {
      const request = response.request(), path = new URL(request.url()).pathname
      if (!path.startsWith('/api/')) return
      const item = { actor, method: request.method(), path: safe(path), status: response.status() }
      if (path === '/api/registros-plantacion/evidencias-pendientes' && request.method() === 'POST') {
        const body = request.postDataBuffer()?.toString('latin1') || ''
        item.multipart_scope = /name="subcampania_id"\r\n\r\n820/.test(body)
        item.multipart_reposicion = /name="es_reposicion"\r\n\r\ntrue/.test(body)
        item.multipart_fotos = body.includes('name="fotos"')
      }
      if (path === '/api/registros-plantacion/evidencias-pendientes' && request.method() === 'DELETE') {
        const body = request.postDataJSON(); item.descarta_con_ambito = body.subcampania_id === 820 && body.es_reposicion === true
      }
      network.push(item)
    })
    await page.goto(`${pwaBase}/app/participacion/registrar`)
    await page.waitForFunction(() => Boolean(localStorage.getItem('auth_id')))
    return { context, page }
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const call = (page, action, evidenceIds = [], origin = 820000) => page.evaluate(async ({ action, png, today, evidenceIds, origin }) => {
    const { PlantacionService } = await import('/src/services/plantacion.service.ts')
    const scope = { subcampania_id: 820, es_reposicion: true }
    try {
      let data
      if (action === 'upload') {
        const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0))
        data = await PlantacionService.uploadEvidenciasPendientesPlantacion({ ...scope, fotos: [new File([bytes], 'reposicion-sintetica.png', { type: 'image/png' })] })
      } else if (action === 'discard') data = await PlantacionService.descartarEvidenciasPendientesPlantacion({ ...scope, evidencia_ids: evidenceIds })
      else data = await PlantacionService.registrarPlantacion({ ...scope, registro_plantacion_origen_id: origin, fecha_plantacion: today, latitud: -16.5, longitud: -68.1, detalles: [{ asignacion_id: 82099, lote_vivero_id: 81, planta_id: 8, cantidad: 1 }], evidencia_ids: evidenceIds, coresponsable_ids: [] })
      return { ok: true, data }
    } catch (error) { return { ok: false, status: error.status ?? null } }
  }, { action, png, today, evidenceIds, origin })

  const internal = await account('901')
  let after, evidenceIds
  if (process.argv.includes('--continue-denials')) {
    // Continuar una verificación interrumpida después del commit sin repetir
    // la reposición ni alterar el fixture. Sólo se admite nuestra evidencia.
    const prior = JSON.parse(readFileSync(`${output}/reposicion.json`, 'utf8'))
    assert(prior.entorno === 'SINTETICO_LOCAL_INT02D' && prior.api === apiBase && prior.pwa === pwaBase)
    assert(prior.checks.includes('Descarte mediante servicio conserva ámbito y propósito explícitos'))
    checks.push(...prior.checks.slice(2)); network.push(...prior.network); balances.push(...prior.balances)
    after = balance('continuacion_antes_denegaciones')
    assert.deepEqual(after, Object.fromEntries(Object.entries(prior.balances.at(-1)).filter(([key]) => key !== 'stage')), 'El estado confirmado debe conservarse antes de continuar')
    evidenceIds = JSON.parse(readSql(`SELECT jsonb_agg(id ORDER BY id) FROM public.evidencias_trazabilidad WHERE creado_por_usuario_id=901 AND entidad_id=(SELECT id FROM public.registro_plantacion WHERE subcampania_id=820 AND es_reposicion AND responsable_id=901 ORDER BY id DESC LIMIT 1) AND eliminado_en IS NULL`))
    assert(Array.isArray(evidenceIds) && evidenceIds.length > 0)
  } else {
  const initial = balance('antes')
  const uploaded = await call(internal.page, 'upload')
  check('PlantacionService real desde navegador sube una foto de reposición propia', uploaded.ok && uploaded.data.evidencia_ids.length === 1)
  evidenceIds = uploaded.data.evidencia_ids
  check('Multipart real declara subcampania820, es_reposicion:true y fotos', network.some(item => item.actor === '901' && item.multipart_scope && item.multipart_reposicion && item.multipart_fotos && item.status === 201))
  const privatePhoto = await fetch(`${apiBase}/api/v1/impact/imagenes/${evidenceIds[0]}`)
  check('Pendiente de reposición no tiene fotografía pública', privatePhoto.status === 404)
  const wrong = await call(internal.page, 'register', evidenceIds, 821000)
  check('Origen821000 ajeno a820 es rechazado por backend real', !wrong.ok && wrong.status === 400)
  check('Rechazo de origen ajeno no consume ni crea registro ni modifica origen/Vivero', JSON.stringify(balance('origen_ajeno_rechazado')) === JSON.stringify(initial))
  const saved = await call(internal.page, 'register', evidenceIds)
  check('GENERAL901 con OPERARIO820 confirma reposición de una unidad', saved.ok && saved.data.cantidad_total_plantada === 1 && Boolean(saved.data.registro_plantacion_id))
  after = balance('reposicion_confirmada')
  check('DB confirma un registro, consumo1 y reposición1 del origen, sin segundo débito M2', after.consumido_reposicion === initial.consumido_reposicion + 1 && after.registros_reposicion === initial.registros_reposicion + 1 && after.repuesto_origen === initial.repuesto_origen + 1 && after.saldo_vivero === initial.saldo_vivero)
  const image = await fetch(`${apiBase}/api/v1/impact/imagenes/${evidenceIds[0]}`)
  check('Foto vinculada elegible responde JPEG público sin JWT', image.status === 200 && /image\/jpeg/.test(image.headers.get('content-type') || ''))
  const discardUpload = await call(internal.page, 'upload')
  assert(discardUpload.ok)
  const discarded = await call(internal.page, 'discard', discardUpload.data.evidencia_ids)
  check('Descarte mediante servicio conserva ámbito y propósito explícitos', discarded.ok && discarded.data.evidencia_ids_descartadas.includes(discardUpload.data.evidencia_ids[0]) && network.some(item => item.descarta_con_ambito && item.status === 200))
  check('Descartar pendientes no altera consumo ni registros', JSON.stringify(balance('descarte_confirmado')) === JSON.stringify(after))
  }

  for (const actor of ['803', '801']) {
    const other = await account(actor)
    if (actor === '803') {
      await other.page.goto(`${pwaBase}/app/planting/subcampanias/820/plantaciones/new`)
      await other.page.waitForURL(`${pwaBase}/app/participacion/subcampanias/820/registrar`)
      await other.page.locator('input[type=file]').waitFor({ state: 'attached' })
      if (!checks.includes('Entrada interna inicial redirige al formulario v1 compartido')) check('Entrada interna inicial redirige al formulario v1 compartido')
      await other.page.screenshot({ path: `${output}/reposicion-desktop.png`, fullPage: true })
    }
    const deniedUpload = await call(other.page, 'upload'), deniedWrite = await call(other.page, 'register', evidenceIds)
    // La RPC interna conserva su adaptador legado 400 para rechazo de negocio;
    // upload/guard rechazan con403. En ambos casos se comprueba ausencia de efectos.
    check(`${actor === '803' ? 'ADMIN803 sin equipo' : 'PLANTADOR801 contextual'} no obtiene upload ni registro de reposición`, !deniedUpload.ok && deniedUpload.status === 403 && !deniedWrite.ok && [400, 403].includes(deniedWrite.status))
    await other.context.close()
  }
  check('Intentos no autorizados conservan exactamente saldos y registros de reposición', JSON.stringify(balance('sin_autorizacion_rechazada')) === JSON.stringify(after))
  check('QA reposición no emite ningún POST de plantación inicial', !network.some(item => item.path === '/api/v1/plantaciones/iniciales' && item.method === 'POST'))
  check('Sin errores JavaScript de navegador', errors.length === 0)
  await internal.context.close(); await browser.close(); browser = null
}
async function report(ok, error) {
  await mkdir(output, { recursive: true })
  const before = balances[0], after = balances.at(-1)
  const resumen = {
    reposiciones_creadas: before && after ? after.registros_reposicion - before.registros_reposicion : null,
    consumo_reposicion: before && after ? after.consumido_reposicion - before.consumido_reposicion : null,
    posts_iniciales: network.filter(item => item.path === '/api/v1/plantaciones/iniciales' && item.method === 'POST').length,
    continuacion_sin_repetir_registro: process.argv.includes('--continue-denials'),
  }
  await writeFile(`${output}/reposicion.json`, JSON.stringify({ entorno: 'SINTETICO_LOCAL_INT02D', ok, api: apiBase, pwa: pwaBase, adaptador: 'Solo perfil de arranque; autoridad de capacidades real y servicios de reposición sin interceptar', resumen, checks, balances, network, errors, ...(error ? { fallo: safe(error.message) } : {}) }, null, 2) + '\n')
}
run().then(async () => { await report(true); console.log(JSON.stringify({ ok: true, checks: checks.length, output: `${output}/reposicion.json` })) }).catch(async error => {
  await report(false, error)
  console.error(JSON.stringify({ ok: false, checks: checks.length, error: safe(error.message), output: `${output}/reposicion.json` }))
  if (browser) await browser.close()
  process.exitCode = 1
})
