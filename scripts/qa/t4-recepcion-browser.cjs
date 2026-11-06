/* T4: PWA real y API HTTP sintética desechable. Sin SQL, JWT real ni servicios externos. */
const http = require('node:http')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const PWA = process.env.T4_QA_PWA || 'http://127.0.0.1:5194'
const PORT = Number(process.env.T4_QA_API_PORT || 3344)
const OUTPUT = path.resolve(process.env.T4_QA_OUTPUT || 'docs/qa/t4-recepcion-2026-11-06')
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
// Este servidor modela solo el contrato de UI. SQL/locks/JWT reales se prueban en Backend.
accounts.get('7').m2.set(A,{id:'12',at:NOW})
const DAY=new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const records=new Map()
for(const [id,owner,vivero] of [['9007199254740993','9',A],['102','9',A],['103','7',A],['104','9',A],['105','9',B],['106','9',A]])records.set(id,{recoleccion_id:id,vivero_id:vivero,recolector_id:owner,codigo_trazabilidad:'REC-SINT-'+id,fecha_recoleccion:DAY,tipo_material:'SEMILLA',nombre_cientifico_snapshot:'Especie sintética',nombre_comercial_snapshot:'Tara sintética',nombre_recolector_snapshot:'Recolector sintético',cantidad_declarada:100,unidad_declarada:'G',saldo_actual:id==='104'?60:100,revision:'9007199254740992',estado_registro:id==='104'?'VALIDADO':'PENDIENTE_VALIDACION',recepcion:null,incidencia:null,requiere_conciliacion:id==='104',historial:[],evidencias:[]})
let nextEvidence=9007199254740994n,nextObservation=20n,loseReception=false,recoverAbsent=false
const canRead=(u,r)=>effective(u) && (u.role==='ADMIN' || u.m2.has(r.vivero_id))
const project=(u,r)=>({...r,puede_recibir_validar:canRead(u,r) && r.recolector_id!==u.id && !r.recepcion && !r.requiere_conciliacion})
const server=http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','authorization, content-type, x-auth-id, x-user-role');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Cache-Control','private, no-store')
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
  const url=new URL(req.url,`http://127.0.0.1:${PORT}`),route=url.pathname,u=accounts.get((req.headers.authorization||'').replace('Bearer synthetic-',''))
  network.push({actor:u?.id,path:route,method:req.method})
  const reply=(b,s=200)=>{res.writeHead(s,{'Content-Type':'application/json'});res.end(JSON.stringify(b))}
  const deny=()=>reply(outside('CAPACIDAD_INSUFICIENTE','El origen no está autorizado para esta cuenta.'),403)
  try{
    if(route==='/api/v1/impact/global'){const f=JSON.parse(await fs.readFile('src/modules/impacto/api/impacto.test-fixtures.json','utf8'));return reply(f.global)}
    if(!u?.active)return reply(outside('SESION_INVALIDA','Sesión sintética no disponible.','RECUPERAR_SESION'),401)
    if(route==='/api/users/profile')return reply({id:u.id,auth_id:'synthetic-auth-'+u.id,username:'synthetic'+u.id,nombre:u.name,rol:u.role,activo:true})
    if(route==='/api/v1/participacion/capacidades')return reply(capabilities(u))
    if(route==='/api/v1/me/acceso-recoleccion')return reply(readAccess(u,'M1'))
    if(route==='/api/v1/me/acceso-viveros')return reply(readAccess(u,'M2'))
    if(route==='/api/viveros')return reply({success:true,data:[{id:A,codigo:'VA',nombre:'Vivero sintético A'},{id:B,codigo:'VB',nombre:'Vivero sintético B'}]})
    if(route==='/api/recolecciones')return deny()
    let m=route.match(/^\/api\/v1\/recepcion-semillas\/comandos\/([a-f0-9-]+)$/)
    if(m){const r=receipts.get(u.id+':'+m[1]);return r && !recoverAbsent?reply(r):reply({comando_id:m[1],estado:'SIN_RESULTADO',resultado:null,error:null,finalizado_en:null},202)}
    if(route==='/api/v1/recepcion-semillas'){if(!effective(u)||u.role!=='ADMIN'&&!u.m2.size)return deny();return reply({data:[...records.values()].filter(r=>canRead(u,r)&&!r.recepcion).map(r=>project(u,r)),siguiente_antes_de_id:null})}
    m=route.match(/^\/api\/v1\/recepcion-semillas\/(\d+)(?:\/(evidencias|recibir-validar))?$/)
    if(m){
      const r=records.get(m[1]);if(!r)return reply(outside('ORIGEN_NO_DISPONIBLE','Origen no disponible.'),404)
      if(!canRead(u,r))return deny()
      if(!m[2])return reply(project(u,r))
      if(m[2]==='evidencias'){
        const raw=await readBody(req);check('evidencia multipart sin actor/vivero concedidos por cliente',req.headers['content-type'].startsWith('multipart/form-data')&&raw.includes('name="fotos"')&&!raw.includes('name="actor_id"'))
        return reply({evidencia_ids:[(++nextEvidence).toString()],audiencia:'BUCKET_LEGADO_PUBLICO'},201)
      }
      const b=JSON.parse(await readBody(req)),key=u.id+':'+b.comando_id
      if(receipts.has(key))return reply(receipts.get(key))
      commands.push({actor:u.id,origen:r.recoleccion_id,...b})
      const conform=b.cantidad_recibida*(b.unidad_recibida==='KG'?1000:1)===r.cantidad_declarada && (b.unidad_recibida==='KG'?'G':b.unidad_recibida)===r.unidad_declarada
      let error=null
      if(r.recolector_id===u.id)error={codigo:'AUTORRECEPCION_PROHIBIDA'}
      else if(r.revision!==b.revision_esperada)error={codigo:'REVISION_OBSOLETA'}
      else if(r.requiere_conciliacion)error={codigo:'CONCILIACION_HISTORICA_REQUERIDA'}
      else if(r.incidencia && (!conform || r.incidencia.id!==b.incidencia_id || (b.motivo_resolucion||'').length<10))error={codigo:'INCIDENCIA_REQUIERE_COMPROBACION_CONFORME'}
      let result=null
      if(!error){
        const obs=(++nextObservation).toString(),rev=r.revision;r.revision=(BigInt(rev)+1n).toString()
        r.historial.push({id:obs,clase:conform?'CONFORME':'INCIDENCIA',actor_id:u.id,cantidad_declarada:r.cantidad_declarada,unidad_declarada:r.unidad_declarada,cantidad_observada:b.cantidad_recibida,unidad_observada:b.unidad_recibida,fecha_recepcion:b.fecha_recepcion,incidencia_id:b.incidencia_id||null,motivo_resolucion:b.motivo_resolucion||null,registrado_en:new Date().toISOString()})
        if(conform){r.estado_registro='VALIDADO';r.recepcion={id:obs,fecha_recepcion:b.fecha_recepcion,recibido_por:u.id,registrado_en:new Date().toISOString()};r.incidencia=null}
        else r.incidencia={id:obs,cantidad_observada:b.cantidad_recibida,unidad_observada:b.unidad_recibida,fecha_recepcion:b.fecha_recepcion,registrado_en:new Date().toISOString()}
        result={recoleccion_id:r.recoleccion_id,vivero_id:r.vivero_id,observacion_id:obs,recepcion_id:conform?obs:null,incidencia_id:conform?b.incidencia_id||null:obs,revision_anterior:rev,revision_nueva:r.revision,cantidad_recibida:b.cantidad_recibida,unidad_recibida:b.unidad_recibida,fecha_recepcion:b.fecha_recepcion,recibido_por:u.id,saldo_actual:r.saldo_actual,estado_registro:r.estado_registro,anclaje_externo:'PENDIENTE_NO_EJECUTADO'}
      }
      const receipt={comando_id:b.comando_id,estado:error?'RECHAZADO':conform?'CONFIRMADO':'INCIDENCIA',resultado:result,error,finalizado_en:new Date().toISOString()};receipts.set(key,receipt)
      if(loseReception){loseReception=false;return reply(outside('RESULTADO_NO_DETERMINADO','Respuesta sintética perdida. Recupera la misma operación.','MISMA_CLAVE'),503)}
      return reply(receipt,error?409:200)
    }
    if(/^\/api\/(lotes-vivero|subcampanias|campanias)/.test(route))return reply({success:true,data:[],pagination})
    return reply({message:'Ruta de fixture no modelada'},404)
  }catch(e){errors.push(e.message);reply({message:e.message},500)}
})
const readBody=req=>new Promise((resolve,reject)=>{let data='';req.on('data',c=>data+=c);req.on('end',()=>resolve(data));req.on('error',reject)})
let browser
async function main(){
  assert.match(PWA,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);await fs.mkdir(OUTPUT,{recursive:true});await new Promise(r=>server.listen(PORT,'127.0.0.1',r))
  browser=await chromium.launch({headless:true,...(process.env.T4_QA_CHROMIUM?{executablePath:process.env.T4_QA_CHROMIUM}:{})})
  const browserVersion=browser.version()
  async function account(id,width=390){
    const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});await context.addInitScript(t=>localStorage.setItem('authToken',t),'synthetic-'+id)
    await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort())
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));return {page,context}
  }
  async function shot(page,name){await page.screenshot({path:path.join(OUTPUT,name+'.png'),fullPage:true});screenshots.push(name+'.png');const d=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));measures.push({name,...d});check('sin desborde '+name,d.document<=d.viewport)}
  const file={name:'evidencia-sintetica.jpg',mimeType:'image/jpeg',buffer:Buffer.from('bytes de evidencia sintética')}
  async function prepare(page,qty='100'){
    await page.getByLabel('Cantidad recibida',{exact:true}).fill(qty);await page.getByLabel('Fotos de la comprobación').setInputFiles(file);await page.getByRole('button',{name:'Recibir y validar',exact:true}).click();await page.getByRole('dialog').waitFor()
  }
  const {page,context}=await account('7');await page.goto(PWA+'/app/vivero');await page.getByRole('link',{name:'Recibir y validar material'}).click();await page.getByRole('heading',{name:'Recepción de semillas y esquejes'}).waitFor()
  check('entrada real desde Vivero para GENERAL solo M2',accounts.get('7').m1===false && !network.some(n=>n.path==='/api/recolecciones'))
  await shot(page,'cola-390');await page.setViewportSize({width:320,height:800});await shot(page,'cola-320');await page.setViewportSize({width:1280,height:900});await shot(page,'cola-1280')
  await page.goto(PWA+'/app/recepciones-semillas/9007199254740993');await page.getByLabel('Cantidad recibida',{exact:true}).waitFor();await prepare(page)
  const n=commands.length;await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();check('cancelar no envía ni confirma recepción',commands.length===n)
  await page.getByRole('button',{name:'Recibir y validar',exact:true}).click();await shot(page,'confirmacion-1280');await page.getByRole('dialog').getByRole('button',{name:'Recibir y validar',exact:true}).click();await page.getByRole('heading',{name:'Recepción conforme confirmada'}).waitFor()
  check('confirmación conserva IDs y revisión BIGINT exactos',commands.at(-1).origen==='9007199254740993' && commands.at(-1).revision_esperada==='9007199254740992');check('recepción no duplica saldo M1',records.get('9007199254740993').saldo_actual===100)
  await page.getByRole('button',{name:'Ver estado actualizado'}).click();await page.getByText(/Recepción física: conforme el/).waitFor();await shot(page,'conforme-1280')
  await page.setViewportSize({width:390,height:900});await page.goto(PWA+'/app/recepciones-semillas/102');await prepare(page,'80');await page.getByRole('dialog').getByRole('button',{name:'Registrar incidencia'}).click();await page.getByRole('heading',{name:'Incidencia registrada'}).waitFor();await page.getByRole('button',{name:'Ver estado actualizado'}).click();await page.getByRole('heading',{name:'Incidencia física abierta'}).waitFor();await shot(page,'incidencia-390')
  check('diferencia no valida ni consume',records.get('102').estado_registro==='PENDIENTE_VALIDACION' && records.get('102').saldo_actual===100)
  await page.getByLabel('Cantidad recibida',{exact:true}).fill('100');await page.getByLabel('Motivo de resolución').fill('Nueva comprobación física total conforme');await page.getByLabel('Fotos de la comprobación').setInputFiles(file);await page.getByRole('button',{name:'Resolver con recepción conforme'}).click();await page.getByRole('dialog').getByRole('button',{name:'Recibir y validar',exact:true}).click();await page.getByRole('heading',{name:'Recepción conforme confirmada'}).waitFor();await page.getByRole('button',{name:'Ver estado actualizado'}).click();await page.getByRole('heading',{name:'Historial de comprobaciones'}).waitFor();await shot(page,'resolucion-390')
  check('resolución conserva observado y nueva comprobación',records.get('102').historial.length===2 && records.get('102').historial[0].cantidad_observada===80)
  await page.goto(PWA+'/app/recepciones-semillas/103');await page.getByText(/No puedes recibir tu propia/).waitFor();check('autorrecepción bloqueada',await page.getByRole('button',{name:'Recibir y validar',exact:true}).count()===0)
  await page.goto(PWA+'/app/recepciones-semillas/104');await page.getByText(/Requiere conciliación histórica;/).waitFor();await shot(page,'historico-390');check('histórico conserva saldo remanente sin recepción ficticia',records.get('104').saldo_actual===60 && records.get('104').recepcion===null)
  await page.goto(PWA+'/app/recepciones-semillas/105');await page.getByRole('alert').waitFor();check('URL directa de otro vivero denegada',await page.getByRole('button',{name:'Recibir y validar',exact:true}).count()===0)
  await page.goto(PWA+'/app/recepciones-semillas/106');await prepare(page);loseReception=true;recoverAbsent=true;await page.getByRole('dialog').getByRole('button',{name:'Recibir y validar',exact:true}).click();await page.getByRole('button',{name:'Recuperar resultado'}).waitFor();const last=commands.at(-1),posts=commands.length
  await page.getByRole('button',{name:'Recuperar resultado'}).click();await page.getByText(/Aún no hay un resultado confirmado/).waitFor();await shot(page,'incierto-390');check('503/202 conserva intención sin reenvío automático',commands.length===posts && await page.evaluate(k=>localStorage.getItem('r3foresta:t4:recepcion:7').includes(k),last.comando_id))
  accounts.get('7').m2.clear();accounts.get('7').role='VOLUNTARIO';recoverAbsent=false;await page.reload();await page.getByText(/Tu cuenta no tiene un vivero operativo/).waitFor();await page.getByRole('button',{name:'Recuperar resultado'}).click();await page.getByRole('heading',{name:'Recepción conforme confirmada'}).waitFor();await shot(page,'recuperacion-sin-m2-390');check('recuperación propia tras perder M2 y rol interno no duplica comandos',commands.length===posts)
  await context.close()
  for(const id of ['9','11']){const v=await account(id);await v.page.goto(PWA+'/app/recepciones-semillas/102');await v.page.getByText(/Tu cuenta no tiene un vivero operativo/).waitFor();check('solo M1 o VOLUNTARIO no recibe '+id,await v.page.getByLabel('Cantidad recibida',{exact:true}).count()===0);await v.context.close()}
  check('sin errores de página/API sintética',errors.length===0)
  await fs.writeFile(path.join(OUTPUT,'resultados.json'),JSON.stringify({estado:'APROBADO',fecha_local:'2026-11-06',entorno:'PWA_REAL_API_HTTP_SINTETICA',versiones:{node:process.version,navegador:browserVersion,playwright:require((process.env.PLAYWRIGHT_MODULE_PATH||'playwright')+'/package.json').version},pwa:PWA,api:'http://127.0.0.1:'+PORT,checks,network,commands,screenshots,errors,measures,limites:['JWT/cuentas/capacidades/recibos/saldos/Storage simulados en esta QA','SQL/PostGIS/HTTP real independiente en Backend','Sin WebAuthn/servicios reales/despliegue']},null,2)+'\n')
  await browser.close();browser=null;await new Promise(r=>server.close(r));console.log('T4 navegador: '+checks.length+' comprobaciones.')
}
main().catch(async e=>{console.error(e);if(browser){for(const context of browser.contexts())for(const p of context.pages()){console.error((await p.locator('body').innerText()).slice(-4500));await p.screenshot({path:path.join(OUTPUT,'fallo.png'),fullPage:true}).catch(()=>{})}await browser.close()}server.close();process.exitCode=1})
