import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImpactoService } from '../api/impacto.api'
import { validarImpactoConsulta, validarImpactoRegistro } from '../api/impacto.contract'
import examples from '../api/impacto.test-fixtures.json'
import type { ImpactoConsulta, ImpactoPunto, ImpactoRegistro, ImpactoSubcampania } from '../types'
import ImpactoConsultaScreen from './ImpactoConsultaScreen'
import ImpactoRegistroScreen from './ImpactoRegistroScreen'

vi.mock('../api/impacto.api', () => ({ ImpactoService: { consultar: vi.fn(), registro: vi.fn() }, imagenPublicaUrl: (id: string) => `http://localhost/api/v1/impact/imagenes/${id}` }))
vi.mock('../components/ImpactoActions', () => ({ default: () => <p>Las acciones de cuenta no están disponibles.</p> }))
vi.mock('../components/ImpactoMapPanel', () => ({ default: ({ subcampanias, puntos, onSelect }: { subcampanias: ImpactoSubcampania[]; puntos: ImpactoPunto[]; onSelect: (value: string) => void }) => <div aria-label="Mapa de prueba" role="region"><p>{puntos.length} puntos públicos</p>{subcampanias.map((scope) => <button key={scope.id} onClick={() => onSelect(`s:${scope.id}`)}>Mapa zona {scope.id}</button>)}{puntos.map((point) => <button key={point.registro_id} onClick={() => onSelect(`r:${point.registro_id}`)}>Mapa registro {point.registro_id}</button>)}</div> }))
const query = vi.mocked(ImpactoService.consultar)
const detail = vi.mocked(ImpactoService.registro)
const globalResponse = () => validarImpactoConsulta(structuredClone(examples.global))
const subResponse = () => validarImpactoConsulta(structuredClone(examples.subcampania), { tipo: 'subcampania', id: '826' })
const recordResponse = () => validarImpactoRegistro(structuredClone(examples.registro), '826000')

function LocationControls() {
  const location = useLocation(), navigate = useNavigate()
  return <><output data-testid="current-location">{location.pathname + location.search}</output><button onClick={() => navigate('/impacto/registros/827000')}>Abrir otro registro de prueba</button><button onClick={() => navigate('/impacto/registros/826000')}>Volver al registro de prueba</button></>
}
function renderPublic(path: string, state?: unknown) {
  const split = path.indexOf('?')
  return render(<MemoryRouter initialEntries={[{ pathname: split < 0 ? path : path.slice(0, split), search: split < 0 ? '' : path.slice(split), state }]}><LocationControls /><Routes>
    <Route path="/impacto" element={<ImpactoConsultaScreen />} />
    <Route path="/impacto/campanias/:campaniaId" element={<ImpactoConsultaScreen />} />
    <Route path="/impacto/subcampanias/:subcampaniaId" element={<ImpactoConsultaScreen />} />
    <Route path="/impacto/registros/:registroId" element={<ImpactoRegistroScreen />} />
    <Route path="/app/participacion/mis-registros" element={<h1>Mis registros de prueba</h1>} />
  </Routes></MemoryRouter>)
}

beforeEach(() => { query.mockReset(); detail.mockReset() })

describe('Impacto público y navegación por ámbitos', () => {
  it.each([
    ['/impacto', { tipo: 'global' }, 'global'],
    ['/impacto/campanias/800', { tipo: 'campania', id: '800' }, 'campania'],
    ['/impacto/subcampanias/826', { tipo: 'subcampania', id: '826' }, 'subcampania'],
  ] as const)('abre %s y consulta directamente su proyección aunque las acciones de cuenta fallen', async (path, scope, fixture) => {
    query.mockResolvedValueOnce(validarImpactoConsulta(examples[fixture], scope))
    renderPublic(path)
    await screen.findByRole('region', { name: 'Indicadores de impacto' })
    expect(query).toHaveBeenCalledWith(scope, {}, expect.any(AbortSignal))
    expect(screen.getByText('Las acciones de cuenta no están disponibles.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /gestionar|stock/i })).toBeNull()
  })

  it('presenta el avance 125% sin limitarlo y separa meta, faltantes y seguimiento', async () => {
    query.mockResolvedValueOnce(subResponse())
    renderPublic('/impacto/subcampanias/826')
    expect(await screen.findByText('Avance inicial: 125%')).toBeTruthy()
    const scope = screen.getByRole('heading', { name: 'Meta y avance inicial' }).parentElement!
    expect(within(scope).getByText('Meta vigente').nextElementSibling?.textContent).toBe('20')
    expect(within(scope).getByText('Faltantes').nextElementSibling?.textContent).toBe('0')
    const progress = within(scope).getByRole('progressbar')
    expect(progress.getAttribute('value')).toBe('100')
    expect(progress.getAttribute('aria-valuetext')).toBe('125%')
    expect(within(scope).getByText('Bajas reportadas: 6 · Reposiciones: 4')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Indicadores de impacto' })).getByText('25')).toBeTruthy()
  })

  it('anexa páginas sin volver a sumar los totales ni multiplicar puntos', async () => {
    const first = globalResponse(), second = globalResponse()
    first.data.registros = first.data.registros.slice(0, 2); first.data.siguiente_cursor = '826001'
    second.data.registros = second.data.registros.slice(2)
    query.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    renderPublic('/impacto')
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más registros' }))
    await screen.findByText('Mostrando 4 de 4 registros grupales.')
    const metrics = screen.getByRole('region', { name: 'Indicadores de impacto' })
    expect(within(metrics).getByText('50')).toBeTruthy()
    expect(within(metrics).getByText('Bajas reportadas: 11 · Reposiciones: 4')).toBeTruthy()
    expect(screen.getByText('4 puntos públicos')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /^Ver registro público/ })).toHaveLength(4)
    expect(screen.queryByText('100')).toBeNull()
  })

  it('conserva filtro y selección al abrir registro y volver al mapa, sin enviarla al backend', async () => {
    query.mockResolvedValue(globalResponse()); detail.mockResolvedValueOnce(recordResponse())
    renderPublic('/impacto?planta_id=8&desde=2026-10-15')
    fireEvent.click(await screen.findByRole('button', { name: 'Mapa registro 826000' }))
    expect(query).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('current-location').textContent).toContain('seleccion=r%3A826000')
    fireEvent.click(screen.getByRole('link', { name: 'Abrir detalle público' }))
    await screen.findByRole('heading', { name: 'INT05-GRUPO-25' })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('region', { name: 'Resumen del registro seleccionado' })
    expect(screen.getByTestId('current-location').textContent).toBe('/impacto?planta_id=8&desde=2026-10-15&seleccion=r%3A826000')
    expect(query).toHaveBeenLastCalledWith({ tipo: 'global' }, { planta_id: '8', desde: '2026-10-15' }, expect.any(AbortSignal))
  })

  it('selecciona polígono en la misma vista y profundiza conservando los filtros compatibles', async () => {
    query.mockResolvedValueOnce(globalResponse()).mockResolvedValueOnce(subResponse())
    renderPublic('/impacto?organizacion_id=1&planta_id=8&desde=2026-10-15')
    fireEvent.click(await screen.findByRole('button', { name: 'Mapa zona 826' }))
    const summary = screen.getByRole('region', { name: 'Resumen de zona seleccionada' })
    const link = within(summary).getByRole('link', { name: 'Abrir subcampaña' })
    expect(link.getAttribute('href')).toBe('/impacto/subcampanias/826?organizacion_id=1&planta_id=8&desde=2026-10-15')
    fireEvent.click(link)
    await waitFor(() => expect(query).toHaveBeenLastCalledWith({ tipo: 'subcampania', id: '826' }, { organizacion_id: '1', planta_id: '8', desde: '2026-10-15' }, expect.any(AbortSignal)))
    expect(await screen.findByText('Avance inicial filtrado: 125%')).toBeTruthy()
    expect(screen.getByText('Los filtros reducen los hechos comparados; la meta vigente conserva el total de la subcampaña.')).toBeTruthy()
  })

  it('aplica filtros desde el formulario y retira selección y cursor de la consulta anterior', async () => {
    query.mockResolvedValueOnce(globalResponse()).mockResolvedValueOnce(subResponse())
    renderPublic('/impacto?cursor=827001&seleccion=r%3A826000')
    await screen.findByRole('region', { name: 'Indicadores de impacto' })
    fireEvent.click(screen.getByText('Filtrar impacto público'))
    fireEvent.change(screen.getByLabelText('Especie'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(query).toHaveBeenLastCalledWith({ tipo: 'global' }, { planta_id: '8', desde: '2026-10-15' }, expect.any(AbortSignal)))
    expect(screen.getByTestId('current-location').textContent).toBe('/impacto?planta_id=8&desde=2026-10-15')
    expect(screen.queryByRole('region', { name: 'Resumen del registro seleccionado' })).toBeNull()
    expect((screen.getByLabelText('Especie') as HTMLInputElement).value).toBe('8')
  })

  it.each([
    '/impacto?planta_id=', '/impacto?inventado=8', '/impacto?planta_id=8&planta_id=9',
    '/impacto?seleccion=r%3A0', '/impacto?limite=101', '/impacto/campanias/800?campania_id=801',
    '/impacto/subcampanias/826?subcampania_id=827',
    '/impacto?desde=2026-02-30', '/impacto?desde=2026-10-16&hasta=2026-10-15',
    '/impacto?planta_id=01', '/impacto?cursor=0',
  ])('rechaza filtros inválidos %s sin consultar otro alcance', async (path) => {
    renderPublic(path)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Indicadores de impacto' })).toBeNull()
    expect(query).not.toHaveBeenCalled()
  })

  it('distingue vacío filtrado de 503 y permite limpiar o reintentar sin publicar ceros de error', async () => {
    const empty: { data: ImpactoConsulta } = { data: { indicadores: { plantacion_inicial: 0, reposiciones: 0, bajas_reportadas: 0, registros: 0 }, campanias: [], subcampanias: [], registros: [], mapa: [], siguiente_cursor: null } }
    query.mockRejectedValueOnce(Object.assign(new Error('Lectura temporalmente no disponible'), { status: 503 })).mockResolvedValueOnce(empty).mockResolvedValueOnce(globalResponse())
    renderPublic('/impacto?planta_id=99')
    await screen.findByText('Lectura temporalmente no disponible')
    expect(screen.queryByText(/Sin registros para estos filtros/)).toBeNull()
    expect(screen.queryByRole('region', { name: 'Indicadores de impacto' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar consulta' }))
    await screen.findByText('Sin registros para estos filtros')
    fireEvent.click(within(screen.getByRole('heading', { name: 'Sin registros para estos filtros' }).parentElement!).getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(screen.getByTestId('current-location').textContent).toBe('/impacto'))
    await screen.findByText('50')
    expect(query).toHaveBeenLastCalledWith({ tipo: 'global' }, {}, expect.any(AbortSignal))
  })

  it('un 404 de ámbito no se presenta como campaña vacía y admite reintento', async () => {
    query.mockRejectedValueOnce(Object.assign(new Error('Recurso no visible'), { status: 404 })).mockResolvedValueOnce(subResponse())
    renderPublic('/impacto/subcampanias/826')
    await screen.findByRole('heading', { name: 'Ámbito público no disponible' })
    expect(screen.queryByText(/Sin registros/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar consulta' }))
    await screen.findByRole('region', { name: 'Indicadores de impacto' })
  })
})

describe('detalle público de registro grupal', () => {
  it('muestra snapshots mixtos, contexto organizacional separado, GPS y fotos públicas elegibles', async () => {
    const record = recordResponse()
    record.data.personas.push({ nombre: null, es_responsable: false, afiliacion: { estado: 'HISTORICA_NO_DISPONIBLE', tipo: null, nombre: null, organizacion_id: null } })
    detail.mockResolvedValueOnce(record)
    renderPublic('/impacto/registros/826000')
    await screen.findByRole('heading', { name: 'INT05-GRUPO-25' })
    expect(detail).toHaveBeenCalledWith('826000', expect.any(AbortSignal))
    expect(query).not.toHaveBeenCalled()
    expect(screen.getByText('Cantidad del registro grupal, sin reparto individual por persona u organización.')).toBeTruthy()
    expect(screen.getByText('Organización sintética al plantar')).toBeTruthy()
    expect(screen.getByText('Afiliación no declarada')).toBeTruthy()
    expect(screen.getByText('Afiliación histórica no disponible')).toBeTruthy()
    const campaign = screen.getByRole('heading', { name: 'Organizaciones de la campaña' }).parentElement!
    expect(within(campaign).getByText('Organización sintética')).toBeTruthy()
    expect(within(campaign).queryByText('Organización sintética al plantar')).toBeNull()
    expect(screen.getByText('GPS: -16.51, -68.11')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Foto pública del registro, evidencia 900050' }).getAttribute('src')).toBe('http://localhost/api/v1/impact/imagenes/900050')
    expect(screen.queryByRole('heading', { name: /Observaciones|Stock|Equipo/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /editar|eliminar|borrar/i })).toBeNull()
  })

  it('expande bajas y reposiciones vinculadas sin inventar fechas para acumulados legados', async () => {
    const response = recordResponse()
    detail.mockResolvedValueOnce(response)
    renderPublic('/impacto/registros/826000')
    const summary = await screen.findByText('Seguimiento del registro: bajas y reposiciones')
    fireEvent.click(summary)
    expect(summary.closest('details')?.open).toBe(true)
    expect(screen.getByText('Historial auditable de hechos registrados.')).toBeTruthy()
    expect(screen.getByText(/6 plantas · Evento 900060/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Registro 826001' }).getAttribute('href')).toBe('/impacto/registros/826001')
    expect(screen.queryByText(/no se conservan fechas/)).toBeNull()
  })

  it('un acumulado histórico sin eventos conserva su cifra y comunica ausencia de fechas', async () => {
    const response = recordResponse()
    response.data.seguimiento.bajas = []; response.data.seguimiento.reposiciones = []
    detail.mockResolvedValueOnce(response)
    renderPublic('/impacto/registros/826000')
    fireEvent.click(await screen.findByText('Seguimiento del registro: bajas y reposiciones'))
    expect(screen.getByText('El acumulado está disponible; no se conservan fechas de sus eventos históricos.')).toBeTruthy()
    expect(screen.getByText('El acumulado está disponible; no se conservan fechas de sus registros históricos.')).toBeTruthy()
    expect(screen.queryByText('Sin bajas reportadas.')).toBeNull()
  })

  it('rechaza query en un enlace de registro y ofrece el mismo destino sin filtros', async () => {
    detail.mockResolvedValueOnce(recordResponse())
    renderPublic('/impacto/registros/826000?planta_id=8')
    expect(screen.getByRole('alert').textContent).toBe('El detalle público no admite filtros en el enlace.')
    expect(detail).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link', { name: 'Abrir enlace sin filtros' }))
    await screen.findByRole('heading', { name: 'INT05-GRUPO-25' })
    expect(detail).toHaveBeenCalledWith('826000', expect.any(AbortSignal))
  })

  it('descarta un detalle tardío al cambiar de ID y mantiene distinto el 404 del vacío', async () => {
    let finish!: (response: { data: ImpactoRegistro }) => void
    detail.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve })).mockRejectedValueOnce(Object.assign(new Error('Recurso no visible'), { status: 404 }))
    renderPublic('/impacto/registros/826000')
    const signal = detail.mock.calls[0][1]!
    fireEvent.click(screen.getByRole('button', { name: 'Abrir otro registro de prueba' }))
    expect(signal.aborted).toBe(true)
    await screen.findByRole('heading', { name: 'Registro público no disponible' })
    await act(async () => { finish(recordResponse()); await Promise.resolve() })
    expect(screen.queryByRole('heading', { name: 'INT05-GRUPO-25' })).toBeNull()
    expect(screen.queryByText(/Sin registros|Sin bajas/)).toBeNull()
  })

  it('vuelve a Mis registros por state permitido y comparte únicamente la URL pública', async () => {
    detail.mockResolvedValueOnce(recordResponse())
    renderPublic('/impacto/registros/826000', { impactoReturnTo: '/app/participacion/mis-registros' })
    await screen.findByRole('heading', { name: 'INT05-GRUPO-25' })
    fireEvent.click(screen.getByRole('button', { name: 'Compartir enlace público' }))
    const link = await screen.findByRole('textbox', { name: 'Enlace público' })
    expect((link as HTMLInputElement).value).toBe('http://localhost/impacto/registros/826000')
    expect((link as HTMLInputElement).value).not.toContain('/app/')
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('heading', { name: 'Mis registros de prueba' })
  })

  it('volver al mismo ID anterior no restaura un detalle previo mientras consulta otra vez', async () => {
    let finish!: (response: { data: ImpactoRegistro }) => void
    detail.mockResolvedValueOnce(recordResponse()).mockImplementationOnce(() => new Promise(() => {})).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    renderPublic('/impacto/registros/826000')
    await screen.findByRole('heading', { name: 'INT05-GRUPO-25' })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir otro registro de prueba' }))
    fireEvent.click(screen.getByRole('button', { name: 'Volver al registro de prueba' }))
    expect(screen.queryByRole('heading', { name: 'INT05-GRUPO-25' })).toBeNull()
    expect(screen.getByText('Consultando registro público…')).toBeTruthy()
    expect(detail).toHaveBeenCalledTimes(3)
    await act(async () => { finish(recordResponse()); await Promise.resolve() })
    expect(screen.getByRole('heading', { name: 'INT05-GRUPO-25' })).toBeTruthy()
  })

  it('un state ajeno no abre gestión privada al volver', async () => {
    detail.mockResolvedValueOnce(recordResponse()); query.mockResolvedValueOnce(subResponse())
    renderPublic('/impacto/registros/826000', { impactoReturnTo: '/app/campanias/800/stock' })
    await screen.findByRole('heading', { name: 'INT05-GRUPO-25' })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('region', { name: 'Indicadores de impacto' })
    expect(screen.getByTestId('current-location').textContent).toBe('/impacto/subcampanias/826')
  })
})
