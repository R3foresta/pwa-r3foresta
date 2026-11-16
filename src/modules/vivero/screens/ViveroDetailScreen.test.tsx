import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assigned, m1Fixture, m2Fixture } from '../../accesos/test-fixtures'
import ViveroDetailScreen from './ViveroDetailScreen'
import ViveroEventScreen from './ViveroEventScreen'
import EvidencePhoto from '../components/EvidencePhoto'
import EvidenciaTab from '../components/EvidenciaTab'
import ViveroLotCard from '../components/ViveroLotCard'
import SubetapasBar from '../components/SubetapasBar'
import { mapLoteToCardData, mapLoteToDetailView, mapTimelineEventToView } from '../mappers/lote.mapper'
import { BIG_A, BIG_B, eventoFixture, loteFixture, m1LoteFixture } from '../t5.test-fixtures'
import type { LoteViveroDetalle, TimelineEventDto } from '../types/contracts'

const session = vi.hoisted(() => ({ actor: '7', revision: '1' }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: session.actor, auth_id: 'synthetic-auth', nombre: 'Ana', rol: 'ADMIN' } }) }))
vi.mock('../../accesos/capabilitiesContext', () => ({ useOperationalAccess: () => ({
  m1: { status: 'ready', data: m1Fixture({ origen: 'ADMIN' }).data },
  m2: { status: 'ready', data: m2Fixture({ revision_acceso: session.revision, rol_global: 'ADMIN', capacidades_globales: { administrar: true, operar_cualquier_vivero: true, desechar_semillas_cualquier_vivero: true, recibir_y_validar_cualquier_vivero: true }, viveros: [assigned('1')] }).data },
}) }))
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })
function mockReads(lot = loteFixture(), events = [eventoFixture()]) {
  return vi.fn(async (url: string | URL | Request) => {
    if (String(url).endsWith('/timeline')) return json({ data: { eventos: events } })
    if (String(url).endsWith('/asignaciones')) return json({ data: [] })
    return json({ data: lot })
  })
}
function Location() { const navigate = useNavigate(); return <><output>{useLocation().pathname}</output><button onClick={() => navigate(`/app/vivero/${BIG_B}`)}>Cambiar lote de prueba</button></> }
function mount(lot: LoteViveroDetalle = loteFixture(), events: TimelineEventDto[] = [eventoFixture()]) {
  vi.stubGlobal('fetch', mockReads(lot, events))
  return render(<MemoryRouter initialEntries={[`/app/vivero/${lot.id}`]}><Location /><Routes>
    <Route path="/app/vivero/:id" element={<ViveroDetailScreen />} />
    <Route path="/app/vivero/:id/event/:tipo" element={<ViveroEventScreen />} />
  </Routes></MemoryRouter>)
}
beforeEach(() => { session.actor = '7'; session.revision = '1'; localStorage.setItem('authToken', 'synthetic-token') })

describe('ficha T5 con componentes y transporte reales, HTTP simulado', () => {
  it('prioriza operación en Resumen y conserva el origen completo al abrirlo desde Historial', async () => {
    mount()
    await screen.findByRole('heading', { name: 'Nombre histórico' })
    expect(screen.queryByRole('button', { name: 'Origen del lote' })).toBeNull()
    expect(screen.queryByText('Nombre registrado')).toBeNull()
    expect(screen.queryByText('Variedad histórica')).toBeNull()
    expect(screen.getAllByText('Saldo inicial · Donación').length).toBeGreaterThan(0)
    expect(screen.queryByText('Nombre actual')).toBeNull()
    expect(screen.queryByText('Material inicial')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ver ficha' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Embolsado' })).toBeNull()
    expect(screen.getByText('UNIDAD · En INCORPORACION')).toBeTruthy()
    expect(screen.getAllByText('180').length).toBeGreaterThan(0)
    expect(screen.queryByText(/^Supervivencia$/)).toBeNull()
    expect(screen.queryByText('REC-null')).toBeNull()
    expect(screen.getByText('Sin registro')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    const originToggle = screen.getByRole('button', { name: 'Origen del lote' })
    expect(originToggle.getAttribute('aria-expanded')).toBe('false')
    expect(originToggle.getAttribute('aria-controls')).toBeTruthy()
    expect(screen.queryByText('Variedad histórica')).toBeNull()
    expect(screen.getByText('Ingreso de plantas vivas')).toBeTruthy()
    fireEvent.click(originToggle)
    expect(originToggle.getAttribute('aria-expanded')).toBe('true')
    const origin = within(document.getElementById(originToggle.getAttribute('aria-controls')!)!)
    expect(origin.getByText('Nombre histórico')).toBeTruthy()
    expect(origin.getByText('Científico histórico')).toBeTruthy()
    expect(origin.getByText('Variedad histórica')).toBeTruthy()
    expect(origin.getByText('Responsable histórico')).toBeTruthy()
    expect(origin.getByText('Vivero sintético')).toBeTruthy()
    expect(origin.getByText('210 UNIDAD')).toBeTruthy()
    expect(origin.getByText('No registrado')).toBeTruthy()
    expect(origin.getByText('No registrada')).toBeTruthy()
    expect(origin.getByText('Conteo sintético')).toBeTruthy()
    expect(origin.getByText(/Historia previa no registrada/)).toBeTruthy()
    expect(origin.queryByText('Nombre actual')).toBeNull()
    expect(origin.queryByRole('button', { name: 'Ver ficha' })).toBeNull()
    fireEvent.click(originToggle)
    expect(originToggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Variedad histórica')).toBeNull()
    expect(screen.getByText('Ingreso de plantas vivas')).toBeTruthy()
  })
  it('muestra incorporación y foto privada con metadatos disponibles en Historial y Evidencia', async () => {
    mount()
    await screen.findByRole('heading', { name: 'Nombre histórico' })
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    const image = await screen.findByRole('img', { name: 'Evidencia #9007199254740994' })
    expect(image.getAttribute('src')).toContain('/signed/')
    expect(screen.getByText('Ingreso de plantas vivas')).toBeTruthy()
    expect(screen.getByText('image/jpeg · Peso no disponible')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar Evidencia #9007199254740994' }))
    expect(screen.getByRole('dialog', { name: 'Evidencia del lote' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar galería' }))
    fireEvent.click(screen.getByRole('button', { name: 'Origen del lote' }))
    expect(screen.getByText('Variedad histórica')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Evidencia #9007199254740994' }).getAttribute('src')).toContain('/signed/')
    fireEvent.click(screen.getByRole('button', { name: 'evidencia' }))
    expect(screen.getByRole('img').getAttribute('src')).toContain('/signed/')
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar Evidencia #9007199254740994' }))
    expect(screen.getByRole('dialog', { name: 'Evidencia del lote' })).toBeTruthy()
    expect(within(screen.getByRole('dialog', { name: 'Evidencia del lote' })).getByRole('img', { name: 'Evidencia #9007199254740994' }).getAttribute('src')).toContain('/signed/')
  })
  it('navega a una acción existente conservando un ID superior a MAX_SAFE_INTEGER', async () => {
    mount(loteFixture({ id: BIG_B }))
    await screen.findByRole('heading', { name: 'Nombre histórico' })
    fireEvent.click(screen.getByRole('button', { name: 'Subetapa' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(`/app/vivero/${BIG_B}/event/adaptabilidad`))
    await screen.findByRole('button', { name: 'Confirmar adaptabilidad' })
    expect(screen.queryByRole('button', { name: 'Embolsado' })).toBeNull()
  })
  it('mantiene INICIO sin saldo vivo y DATE del origen sin desplazamiento', async () => {
    mount(m1LoteFixture(), [eventoFixture('INICIO', { payload: { cantidad_inicial: 5, unidad_medida: 'G' }, evidencias: [] })])
    await screen.findByRole('heading', { name: 'Nombre histórico' })
    expect(screen.getByText('Material inicial')).toBeTruthy()
    expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    fireEvent.click(screen.getByRole('button', { name: 'Origen del lote' }))
    expect(screen.getAllByText('5 G').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^12/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Sustrato A/)).toBeNull()
  })
  it('conserva accesible la ficha FINALIZADO y no inventa su fecha de cierre', async () => {
    mount(loteFixture({ estado_lote: 'FINALIZADO', saldo_vivo_actual: 0, motivo_cierre: 'DESPACHO_TOTAL' }))
    await screen.findByRole('heading', { name: 'Nombre histórico' })
    expect(screen.getByText('Cierre del lote')).toBeTruthy()
    expect(screen.getByText('Fecha Cierre').parentElement?.textContent).toContain('No disponible')
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    expect(screen.getByText('Ingreso de plantas vivas')).toBeTruthy()
  })
  it('separa el fallo del timeline del vacío válido y permite reintento sin perder la ficha', async () => {
    const fetcher = mockReads()
    let failure = true
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/timeline') && failure ? json({ message: 'Fallo sintético de historial' }, 503) : fetcher(url)))
    render(<MemoryRouter initialEntries={[`/app/vivero/${BIG_A}`]}><Routes><Route path="/app/vivero/:id" element={<ViveroDetailScreen />} /></Routes></MemoryRouter>)
    await screen.findByText(/No se pudo consultar el historial/)
    expect(screen.getByRole('heading', { name: 'Nombre histórico' })).toBeTruthy()
    expect(screen.queryByText('Sin registro')).toBeNull()
    expect(screen.queryByText('No hay eventos registrados.')).toBeNull()
    failure = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar historial' }))
    await screen.findByText('Sin registro')
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    expect(await screen.findByText('Ingreso de plantas vivas')).toBeTruthy()
  })
  it('acepta un historial vacío válido y etiqueta la descarga como metadatos', async () => {
    mount(loteFixture(), [])
    await screen.findByRole('heading', { name: 'Nombre histórico' })
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    expect(screen.getByText('Sin eventos en esta consulta.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Metadatos del lote/ }))
    expect(screen.getByRole('button', { name: 'Exportar metadatos JSON' })).toBeTruthy()
    expect(screen.getByText(/no es una exportación auditable completa/)).toBeTruthy()
  })
})

describe('seguimientos, tarjetas y evidencias', () => {
  it('presenta la tarjeta T5 sin atribuir Embolsado, aptitud o supervivencia', () => {
    render(<ViveroLotCard lot={mapLoteToCardData(loteFixture({ saldo_vivo_actual: null }))} />)
    expect(screen.getByText('Saldo inicial · Donación')).toBeTruthy()
    expect(screen.getByText('Incorporación')).toBeTruthy()
    expect(screen.getByText('No disponible')).toBeTruthy()
    expect(screen.queryByText('Embolsado')).toBeNull()
    expect(screen.queryByText('Disponible para entregar')).toBeNull()
    expect(screen.queryByText('Supervivencia')).toBeNull()
  })
  it('admite saltos y repeticiones sin inventar SOMBRA ni terminar en un despacho parcial', () => {
    const events = [
      eventoFixture('EMBOLSADO', { id: '10', payload: { plantas_vivas_iniciales: 100 } }),
      eventoFixture('ADAPTABILIDAD', { id: '11', payload: { subetapa_destino: 'SOL_DIRECTO' } }),
      eventoFixture('DESPACHO', { id: '12', payload: { cantidad_afectada: 10, saldo_vivo_antes: 100, saldo_vivo_despues: 90 } }),
      eventoFixture('ADAPTABILIDAD', { id: '13', payload: { subetapa_destino: 'MEDIA_SOMBRA' } }),
      eventoFixture('ADAPTABILIDAD', { id: '14', payload: { subetapa_destino: 'SOL_DIRECTO' } }),
    ].map(mapTimelineEventToView)
    render(<SubetapasBar detail={mapLoteToDetailView(loteFixture())} events={events} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows.map(row => row.textContent)).toEqual([expect.stringContaining('SOL DIRECTO'), expect.stringContaining('MEDIA SOMBRA'), expect.stringContaining('SOL DIRECTO')])
    expect(screen.queryByText('SOMBRA')).toBeNull()
  })
  it('un fallo de imagen conserva otras fotos y permite renovar por la lectura autorizada', () => {
    const onRenew = vi.fn()
    const event = mapTimelineEventToView(eventoFixture('INCORPORACION', { evidencias: [{ id: '10', signed_url: 'https://example.test/1' }, { id: '11', signed_url: 'https://example.test/2' }] }))
    render(<EvidenciaTab events={[event]} onSelectPhoto={vi.fn()} onRenew={onRenew} />)
    fireEvent.error(screen.getByRole('img', { name: 'Evidencia #10' }))
    expect(screen.getByRole('img', { name: 'Evidencia #11' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Renovar acceso a fotos' }))
    expect(onRenew).toHaveBeenCalledOnce()
  })
  it('retira el acceso temporal expirado y ofrece una renovación explícita', async () => {
    vi.useFakeTimers()
    try {
      const photo = mapTimelineEventToView(eventoFixture()).fotos![0]
      render(<EvidencePhoto photo={{ ...photo, expiraEn: Date.now() + 1000 }} onRenew={vi.fn()} />)
      await act(() => vi.advanceTimersByTimeAsync(1100))
      expect(screen.queryByRole('img')).toBeNull()
      expect(screen.getByText('El acceso temporal a esta foto venció.')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Renovar acceso a fotos' })).toBeTruthy()
    } finally { vi.useRealTimers() }
  })
  it('renderiza devolución, tipo desconocido y ausencia honesta de destino', async () => {
    mount(loteFixture(), [eventoFixture('DEVOLUCION_PLANTACION', { id: '10', payload: { cantidad_afectada: 5, saldo_vivo_antes: 0, saldo_vivo_despues: 5 } }), eventoFixture('FUTURO', { id: '11' }), eventoFixture('DESPACHO', { id: '12', payload: { cantidad_afectada: 10 }, evidencias: [] })])
    await screen.findByRole('heading', { name: 'Nombre histórico' })
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    expect(screen.getByText('Devolución al lote original')).toBeTruthy()
    expect(screen.getByText(/Evento no reconocido: FUTURO/)).toBeTruthy()
    expect(screen.queryByText('Plantación propia')).toBeNull()
    expect(within(screen.getByText('Destino').parentElement!).getByText('No registrado')).toBeTruthy()
  })
})


function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(accept => { resolve = accept })
  return { promise, resolve }
}
function detailRoute() {
  return <MemoryRouter initialEntries={[`/app/vivero/${BIG_A}`]}><Location /><Routes><Route path="/app/vivero/:id" element={<ViveroDetailScreen />} /></Routes></MemoryRouter>
}
function twoPhotos(version = 'vieja', reverse = false) {
  const evidencias = ['10', '11'].map(id => ({ id, bucket: 'vivero_incorporaciones', signed_url: `https://storage.example.test/${id}/${version}`, url_expira_en_segundos: 300 }))
  return eventoFixture('INCORPORACION', { evidencias: reverse ? evidencias.reverse() : evidencias })
}

describe('revisión coordinadora: éxito confirmado y renovación de lectura', () => {
  it('conserva la devolución confirmada con GET pendientes y fallidos, y reintenta sólo las lecturas', async () => {
    const detailAfter = deferred<Response>()
    const assignmentsAfter = deferred<Response>()
    let confirmed = false
    let detailReads = 0
    let assignmentReads = 0
    const assignment = { id: BIG_B, subcampania_id: '4', subcampania_nombre: 'Subcampaña sintética', cantidad_asignada: 5, saldo_asignado_disponible: 5, fecha_asignacion: '2020-01-01' }
    const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        confirmed = true
        return json({ success: true, data: { asignacion_id: BIG_B, lote_vivero_id: BIG_A, cantidad_devuelta: 1, cantidad_devuelta_total: 1, saldo_asignado_disponible: 4, saldo_vivo_antes: 180, saldo_vivo_despues: 181, lote_reabierto: false, evento_lote_vivero_id: '20', evento_plantacion_id: '21', estado: 'ACTIVA' } })
      }
      if (url.endsWith('/timeline')) return json({ data: { eventos: [] } })
      if (url.endsWith('/asignaciones')) {
        assignmentReads += 1
        return assignmentReads === 2 ? assignmentsAfter.promise : json({ data: [{ ...assignment, saldo_asignado_disponible: confirmed ? 4 : 5 }] })
      }
      detailReads += 1
      return detailReads === 2 ? detailAfter.promise : json({ data: loteFixture({ saldo_vivo_actual: confirmed ? 181 : 180 }) })
    })
    vi.stubGlobal('fetch', fetcher)
    render(detailRoute())
    await screen.findByRole('heading', { name: 'Nombre histórico' })
    fireEvent.click(screen.getByRole('button', { name: 'asignaciones' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Devolver al vivero' }))
    const dialog = screen.getByRole('dialog', { name: 'Subcampaña sintética' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sumar 1' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excedente no plantado' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Devolver al vivero' }))
    await screen.findByRole('dialog', { name: 'Devolucion registrada' })
    expect(screen.getByText('Actualizando los saldos de la ficha…')).toBeTruthy()
    expect(screen.getByText('Cargando desglose de asignaciones...')).toBeTruthy()
    await act(async () => { detailAfter.resolve(json({ message: 'Lectura pendiente de recuperar' }, 503)); assignmentsAfter.resolve(json({ message: 'Lectura de asignaciones fallida' }, 503)) })
    expect(screen.getByRole('dialog', { name: 'Devolucion registrada' })).toBeTruthy()
    expect(screen.getByText(/La devolución ya está registrada/)).toBeTruthy()
    expect(screen.getByText(/No se pudieron actualizar los saldos/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar asignaciones' }))
    expect((await screen.findByRole('button', { name: 'Devolver al vivero' })).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar ficha' }))
    await screen.findAllByText('181')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devolver al vivero' }).hasAttribute('disabled')).toBe(false))
    expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)
    expect(fetcher.mock.calls.find(([, options]) => options?.method === 'POST')?.[0]).toContain(`/${BIG_A}/asignaciones/${BIG_B}/devolucion`)
  })
  it('conserva la segunda foto por ID al renovar, fallar y recuperar sin reutilizar la firma vieja', async () => {
    const renewal = deferred<Response>()
    let reads = 0
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('/timeline')) {
        reads += 1
        if (reads === 2) return renewal.promise
        return json({ data: { eventos: [twoPhotos(reads === 1 ? 'vieja' : 'nueva', reads > 1)] } })
      }
      return json({ data: loteFixture() })
    })
    vi.stubGlobal('fetch', fetcher)
    render(detailRoute())
    await screen.findByRole('heading', { name: 'Nombre histórico' })
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Ampliar Evidencia #10' }))
    let gallery = screen.getByRole('dialog', { name: 'Evidencia del lote' })
    fireEvent.click(within(gallery).getByRole('button', { name: 'Siguiente' }))
    fireEvent.error(within(gallery).getByRole('img', { name: 'Evidencia #11' }))
    fireEvent.click(within(gallery).getByRole('button', { name: 'Renovar acceso a fotos' }))
    gallery = screen.getByRole('dialog', { name: 'Evidencia del lote' })
    expect(within(gallery).getByText(/2 \/ 2/)).toBeTruthy()
    expect(within(gallery).queryByRole('img')).toBeNull()
    expect(within(gallery).getByText('Consultando fotos…')).toBeTruthy()
    await act(async () => renewal.resolve(json({ message: 'Fallo de lectura sintético' }, 503)))
    gallery = screen.getByRole('dialog', { name: 'Evidencia del lote' })
    expect(within(gallery).getByText(/la foto seleccionada se conserva/)).toBeTruthy()
    expect(within(gallery).getByText('Evidencia #11')).toBeTruthy()
    expect(within(gallery).queryByRole('img')).toBeNull()
    fireEvent.click(within(gallery).getByRole('button', { name: 'Renovar acceso a fotos' }))
    await waitFor(() => expect(within(screen.getByRole('dialog', { name: 'Evidencia del lote' })).getByRole('img', { name: 'Evidencia #11' }).getAttribute('src')).toBe('https://storage.example.test/11/nueva'))
    expect(within(screen.getByRole('dialog', { name: 'Evidencia del lote' })).getByText(/2 \/ 2/)).toBeTruthy()
    expect(reads).toBe(3)
  })
  it.each(['lote', 'cuenta', 'token', 'permiso'] as const)('cierra y descarta la galería al cambiar %s', async change => {
    vi.stubGlobal('fetch', mockReads(loteFixture(), [twoPhotos()]))
    const view = render(detailRoute())
    await screen.findByRole('heading', { name: 'Nombre histórico' })
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Ampliar Evidencia #10' }))
    expect(screen.getByRole('dialog', { name: 'Evidencia del lote' })).toBeTruthy()
    if (change === 'cuenta') session.actor = '8'
    if (change === 'token') localStorage.setItem('authToken', 'synthetic-new')
    if (change === 'permiso') session.revision = '2'
    if (change === 'lote') fireEvent.click(screen.getByRole('button', { name: 'Cambiar lote de prueba' }))
    else view.rerender(detailRoute())
    expect(screen.queryByRole('dialog', { name: 'Evidencia del lote' })).toBeNull()
    expect(screen.queryByRole('img', { name: 'Evidencia #10' })).toBeNull()
    await screen.findByRole('heading', { name: 'Nombre histórico' })
  })
})
