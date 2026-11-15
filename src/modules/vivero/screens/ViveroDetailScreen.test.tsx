import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '7', auth_id: 'synthetic-auth', nombre: 'Ana', rol: 'ADMIN' } }) }))
vi.mock('../../accesos/capabilitiesContext', () => ({ useOperationalAccess: () => ({
  m1: { status: 'ready', data: m1Fixture({ origen: 'ADMIN' }).data },
  m2: { status: 'ready', data: m2Fixture({ viveros: [assigned('1')] }).data },
}) }))
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })
function mockReads(lot = loteFixture(), events = [eventoFixture()]) {
  return vi.fn(async (url: string | URL | Request) => {
    if (String(url).endsWith('/timeline')) return json({ data: { eventos: events } })
    if (String(url).endsWith('/asignaciones')) return json({ data: [] })
    return json({ data: lot })
  })
}
function Location() { return <output>{useLocation().pathname}</output> }
function mount(lot: LoteViveroDetalle = loteFixture(), events: TimelineEventDto[] = [eventoFixture()]) {
  vi.stubGlobal('fetch', mockReads(lot, events))
  return render(<MemoryRouter initialEntries={[`/app/vivero/${lot.id}`]}><Location /><Routes>
    <Route path="/app/vivero/:id" element={<ViveroDetailScreen />} />
    <Route path="/app/vivero/:id/event/:tipo" element={<ViveroEventScreen />} />
  </Routes></MemoryRouter>)
}
beforeEach(() => { localStorage.setItem('authToken', 'synthetic-token') })

describe('ficha T5 con componentes y transporte reales, HTTP simulado', () => {
  it('abre incorporación con material null, origen histórico, inicial fijo y saldo actual independiente', async () => {
    mount()
    await screen.findByText('Origen del lote')
    expect(screen.getAllByText('Saldo inicial · Donación').length).toBeGreaterThan(0)
    expect(screen.getByText(/Historia previa no registrada/)).toBeTruthy()
    expect(screen.getByText('Variedad histórica')).toBeTruthy()
    expect(screen.queryByText('Nombre actual')).toBeNull()
    expect(screen.queryByText('Material inicial')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ver ficha' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Embolsado' })).toBeNull()
    expect(screen.getByText('UNIDAD · En INCORPORACION')).toBeTruthy()
    expect(screen.getAllByText('180').length).toBeGreaterThan(0)
    expect(screen.queryByText(/^Supervivencia$/)).toBeNull()
    expect(screen.queryByText('REC-null')).toBeNull()
    expect(screen.getByText('Sin registro')).toBeTruthy()
  })
  it('muestra incorporación y foto privada con metadatos disponibles en Historial y Evidencia', async () => {
    mount()
    await screen.findByText('Origen del lote')
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    const image = await screen.findByRole('img', { name: 'Evidencia #9007199254740994' })
    expect(image.getAttribute('src')).toContain('/signed/')
    expect(screen.getByText('Ingreso de plantas vivas')).toBeTruthy()
    expect(screen.getByText('image/jpeg · Peso no disponible')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar Evidencia #9007199254740994' }))
    expect(screen.getByRole('dialog', { name: 'Evidencia del lote' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar galería' }))
    fireEvent.click(screen.getByRole('button', { name: 'evidencia' }))
    expect(screen.getByRole('img').getAttribute('src')).toContain('/signed/')
  })
  it('navega a una acción existente conservando un ID superior a MAX_SAFE_INTEGER', async () => {
    mount(loteFixture({ id: BIG_B }))
    await screen.findByText('Origen del lote')
    fireEvent.click(screen.getByRole('button', { name: 'Subetapa' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(`/app/vivero/${BIG_B}/event/adaptabilidad`))
    await screen.findByRole('button', { name: 'Confirmar adaptabilidad' })
    expect(screen.queryByRole('button', { name: 'Embolsado' })).toBeNull()
  })
  it('mantiene INICIO sin saldo vivo y DATE del origen sin desplazamiento', async () => {
    mount(m1LoteFixture(), [eventoFixture('INICIO', { payload: { cantidad_inicial: 5, unidad_medida: 'G' }, evidencias: [] })])
    await screen.findByText('Origen del lote')
    expect(screen.getByText('Material inicial')).toBeTruthy()
    expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    expect(screen.getAllByText('5 G').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^12/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Sustrato A/)).toBeNull()
  })
  it('conserva accesible la ficha FINALIZADO y no inventa su fecha de cierre', async () => {
    mount(loteFixture({ estado_lote: 'FINALIZADO', saldo_vivo_actual: 0, motivo_cierre: 'DESPACHO_TOTAL' }))
    await screen.findByText('Origen del lote')
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
    expect(screen.getByText('Origen del lote')).toBeTruthy()
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
    await screen.findByText('Origen del lote')
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
    await screen.findByText('Origen del lote')
    fireEvent.click(screen.getByRole('button', { name: 'historial' }))
    expect(screen.getByText('Devolución al lote original')).toBeTruthy()
    expect(screen.getByText(/Evento no reconocido: FUTURO/)).toBeTruthy()
    expect(screen.queryByText('Plantación propia')).toBeNull()
    expect(within(screen.getByText('Destino').parentElement!).getByText('No registrado')).toBeTruthy()
  })
})
