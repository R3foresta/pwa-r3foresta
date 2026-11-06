import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OperationalAccessContext } from '../../accesos/capabilitiesContext'
import { assigned, m1Fixture, m2Fixture, VIVERO_A, VIVERO_B } from '../../accesos/test-fixtures'
import { validarIntencionRecepcion, validarReciboRecepcion, type DetalleRecepcion, type IntencionRecepcion, type ReciboRecepcion } from './recepcion.contract'
import { cargarIntencionRecepcion, recepcionStoreKey, RecepcionService } from './recepcion.api'
import RecepcionScreen from './RecepcionScreen'
import { coincideCantidadRecepcion } from './recepcion.cantidad'
import { canOpenAppPath } from '../../../utils/appAccess'
vi.mock('../../../contexts/AuthContext',()=>({useAuth:()=>({user:{id:'7',auth_id:'fixture-7'},login:vi.fn()})}))
const origen='9007199254740993',revision='9007199254740992'
const hoy=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
function detail(overrides:Partial<DetalleRecepcion>={}):DetalleRecepcion { return {recoleccion_id:origen,vivero_id:VIVERO_A,recolector_id:'8',codigo_trazabilidad:'REC-T4-SINTETICA',fecha_recoleccion:hoy(),tipo_material:'SEMILLA',nombre_cientifico_snapshot:'Especie sintética',nombre_comercial_snapshot:'Tara',nombre_recolector_snapshot:'Autor sintético',cantidad_declarada:100,unidad_declarada:'G',saldo_actual:100,revision,estado_registro:'PENDIENTE_VALIDACION',recepcion:null,incidencia:null,requiere_conciliacion:false,puede_recibir_validar:true,evidencias:[],historial:[],...overrides} }
function intention():IntencionRecepcion {return {actor_id:'7',recoleccion_id:origen,entrada:{comando_id:'4ff8f9bb-4280-463d-95c8-97a3f11f122c',revision_esperada:revision,cantidad_recibida:100,unidad_recibida:'G',fecha_recepcion:hoy(),evidencia_ids:['9007199254740994']}}}
function receipt(i:IntencionRecepcion,estado:'CONFIRMADO'|'INCIDENCIA'='CONFIRMADO'):ReciboRecepcion {return {comando_id:i.entrada.comando_id,estado,error:null,finalizado_en:new Date().toISOString(),resultado:{recoleccion_id:i.recoleccion_id,vivero_id:VIVERO_A,observacion_id:'23',recepcion_id:estado==='CONFIRMADO'?'24':null,incidencia_id:estado==='INCIDENCIA'?'23':null,revision_anterior:i.entrada.revision_esperada,revision_nueva:(BigInt(i.entrada.revision_esperada)+1n).toString(),cantidad_recibida:i.entrada.cantidad_recibida,unidad_recibida:i.entrada.unidad_recibida,fecha_recepcion:i.entrada.fecha_recepcion,recibido_por:i.actor_id,saldo_actual:100,estado_registro:estado==='CONFIRMADO'?'VALIDADO':'PENDIENTE_VALIDACION',anclaje_externo:'PENDIENTE_NO_EJECUTADO'}}}
function view(path=`/app/recepciones-semillas/${origen}`,access=true) {
 const m1={status:'ready' as const,data:m1Fixture().data,error:null,refresh:vi.fn()},m2={status:'ready' as const,data:m2Fixture({viveros:access?[assigned()]:[]}).data,error:null,refresh:vi.fn()}
 return render(<OperationalAccessContext.Provider value={{m1,m2}}><MemoryRouter initialEntries={[path]}><Routes><Route path="/app/recepciones-semillas" element={<RecepcionScreen/>}/><Route path="/app/recepciones-semillas/:id" element={<RecepcionScreen/>}/></Routes></MemoryRouter></OperationalAccessContext.Provider>)
}
beforeEach(()=>{
 vi.restoreAllMocks();localStorage.clear();localStorage.setItem('authToken','fixture-7')
 vi.spyOn(RecepcionService,'detalle').mockResolvedValue(detail());vi.spyOn(RecepcionService,'cola').mockResolvedValue({data:[detail()],siguiente_antes_de_id:null})
 vi.spyOn(RecepcionService,'fotos').mockResolvedValue(['9007199254740994']);vi.spyOn(RecepcionService,'comando').mockImplementation(async i=>receipt(i))
})
describe('contrato e intención T4',()=>{
 it('permite recuperar tras perder rol interno sin abrir Vivero',()=>{expect(canOpenAppPath('/app/recepciones-semillas/'+origen,'VOLUNTARIO')).toBe(true);expect(canOpenAppPath('/app/vivero','VOLUNTARIO')).toBe(false)})
 it('conserva vecinos BIGINT y revisión exacta; rechaza Number inseguro',()=>{
   const i=intention();expect(validarIntencionRecepcion(i).recoleccion_id).toBe(origen)
   expect(validarReciboRecepcion(receipt(i),i).resultado?.revision_nueva).toBe('9007199254740993')
   expect(()=>validarIntencionRecepcion({...i,recoleccion_id:Number(origen)})).toThrow()
   expect(()=>validarIntencionRecepcion({...i,entrada:{...i.entrada,revision_esperada:Number(revision)}})).toThrow()
 })
 it('no acepta recibos de otra persona/origen/revisión',()=>{
   const i=intention(),r=receipt(i)
   for(const extra of [{recoleccion_id:'9007199254740992'},{recibido_por:'8'},{revision_anterior:'9007199254740993'},{revision_nueva:'9007199254740992'}])expect(()=>validarReciboRecepcion({...r,resultado:{...r.resultado,...extra}},i)).toThrow()
 })
 it('el store no convierte intención de otra cuenta en una operación propia',()=>{
   localStorage.setItem(recepcionStoreKey('7'),JSON.stringify({...intention(),actor_id:'8'}));expect(()=>cargarIntencionRecepcion('7')).toThrow()
 })
})
describe('cantidades canónicas de recepción',()=>{
 it.each([
   [1.001,'KG',1001,'G',true],
   [1.001000001,'KG',1001,'G',false],
   [0.000000001,'KG',0.000001,'G',true],
   [0.1,'KG',100,'G',true],
   [1001.000001,'G',1001,'G',false],
   [100,'UNIDAD',100,'UNIDAD',true],
   [100.1,'UNIDAD',100,'UNIDAD',false],
   [100,'UNIDAD',100,'G',false],
 ] as const)('compara %s %s con %s %s sin tolerancia', (observada,unidad,declarada,unidadDeclarada,coincide)=>{
   expect(coincideCantidadRecepcion(observada,unidad,declarada,unidadDeclarada)).toBe(coincide)
 })
})
describe('recepción operativa solo M2',()=>{
 it('abre cola y detalle sin fichas M1; muestra cantidades y aprobación separadas',async()=>{
   view('/app/recepciones-semillas');expect(await screen.findByText('Tara')).toBeTruthy();expect(RecepcionService.cola).toHaveBeenCalledWith('7',undefined,expect.any(AbortSignal))
   expect(screen.getByRole('link',{name:'Ver recepción'}).getAttribute('href')).toBe(`/app/recepciones-semillas/${origen}`)
 })
 it('requiere confirmación explícita y permite GENERAL con M2 sin M1',async()=>{
   const u=userEvent.setup();view();await screen.findByRole('button',{name:'Recibir y validar'})
   await u.upload(screen.getByLabelText('Fotos de la comprobación'),new File(['foto'],'foto.jpg',{type:'image/jpeg'}))
   await u.click(screen.getByRole('button',{name:'Recibir y validar'}));expect(RecepcionService.comando).not.toHaveBeenCalled()
   const dialog=screen.getByRole('dialog');await u.click(within(dialog).getByRole('button',{name:'Cancelar'}));expect(RecepcionService.fotos).not.toHaveBeenCalled()
   await u.click(screen.getByRole('button',{name:'Recibir y validar'}));await u.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Recibir y validar'}))
   expect(await screen.findByText('Recepción conforme confirmada')).toBeTruthy()
   expect(RecepcionService.comando).toHaveBeenCalledTimes(1)
   const i=vi.mocked(RecepcionService.comando).mock.calls[0][0];expect(i.entrada.revision_esperada).toBe(revision);expect(i.recoleccion_id).toBe(origen)
 })
 it('bloquea autorrecepción y conciliación histórica en URLs directas',async()=>{
   vi.mocked(RecepcionService.detalle).mockResolvedValue(detail({recolector_id:'7',puede_recibir_validar:false,requiere_conciliacion:true}))
   view();expect(await screen.findByText(/No puedes recibir tu propia/)).toBeTruthy();expect(screen.queryByRole('button',{name:'Recibir y validar'})).toBeNull()
 })
 it('solo M1 sin M2 no carga cola ni detalle; muestra denegación',async()=>{
   view(undefined,false);expect(await screen.findByText(/Tu cuenta no tiene un vivero/)).toBeTruthy();expect(RecepcionService.detalle).not.toHaveBeenCalled()
 })
 it('cantidades distintas registran incidencia sin mostrar recepción conforme',async()=>{
   vi.mocked(RecepcionService.comando).mockImplementation(async i=>receipt(i,'INCIDENCIA'))
   const u=userEvent.setup();view();await screen.findByLabelText('Cantidad recibida');await u.clear(screen.getByLabelText('Cantidad recibida'));await u.type(screen.getByLabelText('Cantidad recibida'),'80')
   await u.upload(screen.getByLabelText('Fotos de la comprobación'),new File(['foto'],'foto.jpg',{type:'image/jpeg'}));await u.click(screen.getByRole('button',{name:'Recibir y validar'}));await u.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Registrar incidencia'}))
   expect(await screen.findByText('Incidencia registrada')).toBeTruthy();expect(screen.queryByText('Recepción conforme confirmada')).toBeNull()
 })
 it('incidencia requiere motivo y comprobación conforme; conserva original visible',async()=>{
   vi.mocked(RecepcionService.detalle).mockResolvedValue(detail({incidencia:{id:'23',cantidad_observada:80,unidad_observada:'G',fecha_recepcion:hoy(),registrado_en:new Date().toISOString()}}))
   view();await screen.findByText('Incidencia física abierta');expect(screen.getByLabelText('Motivo de resolución')).toBeTruthy()
   fireEvent.change(screen.getByLabelText('Cantidad recibida'),{target:{value:'80'}});fireEvent.submit(screen.getByLabelText('Cantidad recibida').closest('form')!)
   expect(await screen.findByRole('alert')).toBeTruthy();expect(RecepcionService.comando).not.toHaveBeenCalled()
 })
 it('respuesta incierta conserva UUID, no reenvía y recupera aun sin M2',async()=>{
   const i=intention();localStorage.setItem(recepcionStoreKey('7'),JSON.stringify(i));vi.mocked(RecepcionService.comando).mockRejectedValueOnce(new Error('Respuesta incierta')).mockResolvedValueOnce(receipt(i))
   const u=userEvent.setup();view(undefined,false);await u.click(await screen.findByRole('button',{name:'Recuperar resultado'}));expect(await screen.findByRole('alert')).toBeTruthy()
   expect(cargarIntencionRecepcion('7')).toEqual(i);expect(RecepcionService.comando).toHaveBeenCalledTimes(1)
   await u.click(screen.getByRole('button',{name:'Recuperar resultado'}));expect(await screen.findByText('Recepción conforme confirmada')).toBeTruthy();expect(cargarIntencionRecepcion('7')).toBeNull()
   expect(vi.mocked(RecepcionService.comando).mock.calls.every(([v,recovery])=>v.entrada.comando_id===i.entrada.comando_id && recovery)).toBe(true)
 })
 it('resuelve una incidencia de 1001 G con 1.001 KG sin confundirla con un faltante',async()=>{
   vi.mocked(RecepcionService.detalle).mockResolvedValue(detail({cantidad_declarada:1001,saldo_actual:1001,incidencia:{id:'23',cantidad_observada:900,unidad_observada:'G',fecha_recepcion:hoy(),registrado_en:new Date().toISOString()}}))
   const u=userEvent.setup();view();await screen.findByLabelText('Cantidad recibida')
   fireEvent.change(screen.getByLabelText('Cantidad recibida'),{target:{value:'1.001'}})
   await u.selectOptions(screen.getByLabelText('Unidad recibida'),'KG')
   await u.type(screen.getByLabelText('Motivo de resolución'),'Nueva comprobación física total conforme')
   await u.upload(screen.getByLabelText('Fotos de la comprobación'),new File(['foto'],'foto.jpg',{type:'image/jpeg'}))
   await u.click(screen.getByRole('button',{name:'Resolver con recepción conforme'}))
   expect(screen.queryByRole('alert')).toBeNull()
   expect(screen.getByRole('dialog',{name:'Confirmar recepción conforme'})).toBeTruthy()
   await u.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Recibir y validar'}))
   await waitFor(()=>expect(RecepcionService.comando).toHaveBeenCalledTimes(1))
   expect(vi.mocked(RecepcionService.comando).mock.calls[0][0].entrada).toMatchObject({cantidad_recibida:1.001,unidad_recibida:'KG',incidencia_id:'23'})
 })
 it('retira el detalle y sus fotos al perder ese vivero aunque conserve otro',async()=>{
   vi.mocked(RecepcionService.detalle).mockResolvedValueOnce(detail({evidencias:[{id:'41',public_url:'https://example.invalid/origen.jpg',titulo:'Foto del vivero retirado',mime_type:'image/jpeg',observacion_id:null}]})).mockRejectedValue(new Error('Sin acceso al vivero retirado'))
   const page=(both:boolean)=><OperationalAccessContext.Provider value={{m1:{status:'ready',data:m1Fixture().data,error:null,refresh:vi.fn()},m2:{status:'ready',data:m2Fixture({revision_acceso:both?'4':'5',viveros:both?[assigned(),assigned(VIVERO_B)]:[assigned(VIVERO_B)]}).data,error:null,refresh:vi.fn()}}}><MemoryRouter initialEntries={[`/app/recepciones-semillas/${origen}`]}><Routes><Route path="/app/recepciones-semillas/:id" element={<RecepcionScreen/>}/></Routes></MemoryRouter></OperationalAccessContext.Provider>
   const v=render(page(true));await screen.findByAltText('Foto del vivero retirado')
   const firstSignal=vi.mocked(RecepcionService.detalle).mock.calls[0][2]
   v.rerender(page(false))
   expect(screen.queryByAltText('Foto del vivero retirado')).toBeNull()
   expect(screen.queryByText('REC-T4-SINTETICA')).toBeNull()
   await waitFor(()=>expect(firstSignal?.aborted).toBe(true))
   expect(await screen.findByText('Sin acceso al vivero retirado')).toBeTruthy()
 })
 it('descarta lecturas obsoletas al desmontar',async()=>{
   let finish!:(d:DetalleRecepcion)=>void;vi.mocked(RecepcionService.detalle).mockReturnValueOnce(new Promise(r=>{finish=r}));const v=view();await waitFor(()=>expect(RecepcionService.detalle).toHaveBeenCalled())
   const signal=vi.mocked(RecepcionService.detalle).mock.calls[0][2];v.unmount();await act(async()=>finish(detail()));expect(signal?.aborted).toBe(true)
 })
})
