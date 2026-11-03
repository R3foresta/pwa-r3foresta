import { StrictMode, Suspense, lazy } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { RecoleccionesService, type Recoleccion } from '../../services/recolecciones.service'
import { todayLocalISO } from '../../utils/validations/date'
import RecoleccionFormLayout from './RecoleccionFormLayout'
import RecoleccionFormResumenScreen from './RecoleccionFormResumenScreen'
import { useRecoleccionForm } from './useRecoleccionForm'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '7', rol: 'GENERAL' } }),
}))
vi.mock('../../services/recolecciones.service', () => ({
  RecoleccionesService: { getById: vi.fn(), create: vi.fn(), submit: vi.fn() },
}))

// JSDOM no decodifica imágenes ni implementa object URLs. Este registro simula
// su vigencia: una URL revocada deja de resolver al File que creó su preview.
const activePreviews = new Map<string, Blob>()
const revokeObjectURL = vi.fn((url: string) => { activePreviews.delete(url) })

beforeEach(() => {
  activePreviews.clear()
  let nextId = 0
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(file: Blob) {
      const url = `blob:recoleccion-prueba-${++nextId}`
      activePreviews.set(url, file)
      return url
    }
    static revokeObjectURL = revokeObjectURL
  })
  vi.mocked(RecoleccionesService.create).mockResolvedValue({
    success: true,
    data: { id: 12, estado_registro: 'BORRADOR' } as Recoleccion,
  })
})

function FormStep({ title }: { title: string }) {
  const { formData, updateForm, resetForm } = useRecoleccionForm()
  const addPhoto = (field: 'placePhotos' | 'totalPhotos', file?: File) => {
    if (!file) return
    updateForm({
      date: todayLocalISO(),
      quantity: '1',
      unit: 'g',
      metodo_id: 1,
      planta_id: 2,
      vivero_id: 3,
      latitud: '-16.5',
      longitud: '-68.1',
      paisId: '1',
      divisionId: '2',
      [field]: [...formData[field], { file, previewUrl: URL.createObjectURL(file) }],
    })
  }
  return <>
    <h1>{title}</h1>
    <input type="file" aria-label="Foto del lugar" onChange={(event) => addPhoto('placePhotos', event.target.files?.[0])} />
    <input type="file" aria-label="Foto del total" onChange={(event) => addPhoto('totalPhotos', event.target.files?.[0])} />
    {formData.placePhotos.map((photo) => <img key={photo.previewUrl} src={photo.previewUrl} alt="Lugar 1" />)}
    {formData.totalPhotos.map((photo) => <img key={photo.previewUrl} src={photo.previewUrl} alt="Total 1" />)}
    <button onClick={() => updateForm({ placePhotos: [] })}>Quitar lugar</button>
    <button onClick={() => updateForm({ totalPhotos: [] })}>Quitar total</button>
    <button onClick={resetForm}>Reiniciar formulario</button>
    <Link to="/app/collections/new/location">Ir a ubicación</Link>
    <Link to="/app/collections/new/summary">Ir a resumen</Link>
    <Link to="/app/collections">Salir del flujo</Link>
  </>
}

function LocationStep() {
  return <FormStep title="Ubicación" />
}

function deferredStep<T>() {
  let resolve!: (value: { default: T }) => void
  const promise = new Promise<{ default: T }>((done) => { resolve = done })
  return { promise, resolve }
}

function renderFlow() {
  // Promesas controladas para comprobar la ventana de suspensión, incluso si
  // los módulos ya están importados por otra prueba. Layout y Provider reales.
  const location = deferredStep<typeof LocationStep>()
  const summary = deferredStep<typeof RecoleccionFormResumenScreen>()
  const LazyLocation = lazy(() => location.promise)
  const LazySummary = lazy(() => summary.promise)
  const view = render(
    <StrictMode>
      <MemoryRouter initialEntries={['/app/collections/new']}>
        <Suspense fallback={<p>Carga global</p>}>
          <Routes>
            <Route path="/app/collections/new" element={<RecoleccionFormLayout />}>
              <Route index element={<FormStep title="Datos" />} />
              <Route path="location" element={<LazyLocation />} />
              <Route path="summary" element={<LazySummary />} />
            </Route>
            <Route path="/app/collections" element={<p>Listado de recolecciones</p>} />
          </Routes>
        </Suspense>
      </MemoryRouter>
    </StrictMode>,
  )
  return { ...view, location, summary }
}

function addTwoPhotos() {
  const place = new File(['original-lugar'], 'lugar.jpg', { type: 'image/jpeg' })
  const total = new File(['original-total'], 'total.jpg', { type: 'image/jpeg' })
  fireEvent.change(screen.getByLabelText('Foto del lugar'), { target: { files: [place] } })
  fireEvent.change(screen.getByLabelText('Foto del total'), { target: { files: [total] } })
  const placeUrl = screen.getByAltText('Lugar 1').getAttribute('src')!
  const totalUrl = screen.getByAltText('Total 1').getAttribute('src')!
  return { place, total, placeUrl, totalUrl }
}

function expectValidPreviews(photos: ReturnType<typeof addTwoPhotos>) {
  expect(screen.getByAltText('Lugar 1').getAttribute('src')).toBe(photos.placeUrl)
  expect(screen.getByAltText('Total 1').getAttribute('src')).toBe(photos.totalUrl)
  expect(activePreviews.get(photos.placeUrl)).toBe(photos.place)
  expect(activePreviews.get(photos.totalUrl)).toBe(photos.total)
  expect(revokeObjectURL).not.toHaveBeenCalled()
}

describe('previews de Recolección con navegación lazy y StrictMode', () => {
  it('conserva ambas URLs en Datos → Ubicación → Resumen y envía los File originales', async () => {
    const flow = renderFlow()
    const photos = addTwoPhotos()
    expectValidPreviews(photos)

    fireEvent.click(screen.getByRole('link', { name: 'Ir a ubicación' }))
    expect(activePreviews.get(photos.placeUrl)).toBe(photos.place)
    expect(activePreviews.get(photos.totalUrl)).toBe(photos.total)
    await act(async () => { flow.location.resolve({ default: LocationStep }) })
    expect(screen.getByRole('heading', { name: 'Ubicación' })).toBeTruthy()
    expectValidPreviews(photos)

    fireEvent.click(screen.getByRole('link', { name: 'Ir a resumen' }))
    expect(activePreviews.size).toBe(2)
    expect(screen.getByRole('progressbar', { name: 'Cargando el formulario' })).toBeTruthy()
    expect(screen.queryByText('Carga global')).toBeNull()
    await act(async () => { flow.summary.resolve({ default: RecoleccionFormResumenScreen }) })
    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeTruthy()
    expectValidPreviews(photos)

    fireEvent.click(screen.getByRole('button', { name: 'Revisar datos' }))
    expectValidPreviews(photos)
    fireEvent.click(screen.getByRole('link', { name: 'Ir a resumen' }))
    expectValidPreviews(photos)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Borrador' }))
    await waitFor(() => expect(RecoleccionesService.create).toHaveBeenCalledTimes(1))
    const [payload] = vi.mocked(RecoleccionesService.create).mock.calls[0]
    expect(payload.fotos).toHaveLength(2)
    expect(payload.fotos[0]).toBe(photos.place)
    expect(payload.fotos[1]).toBe(photos.total)
    expectValidPreviews(photos)

    flow.unmount()
    expect(activePreviews.size).toBe(0)
    expect(revokeObjectURL).toHaveBeenCalledWith(photos.placeUrl)
    expect(revokeObjectURL).toHaveBeenCalledWith(photos.totalUrl)
  })

  it.each([
    ['Quitar lugar', 'placeUrl', 'totalUrl', 'Lugar 1', 'Total 1'],
    ['Quitar total', 'totalUrl', 'placeUrl', 'Total 1', 'Lugar 1'],
  ] as const)('libera solo la foto eliminada con %s', (button, removed, retained, removedAlt, retainedAlt) => {
    renderFlow()
    const photos = addTwoPhotos()
    fireEvent.click(screen.getByRole('button', { name: button }))
    expect(activePreviews.has(photos[removed])).toBe(false)
    expect(revokeObjectURL).toHaveBeenCalledWith(photos[removed])
    expect(activePreviews.has(photos[retained])).toBe(true)
    expect(revokeObjectURL).not.toHaveBeenCalledWith(photos[retained])
    expect(screen.queryByAltText(removedAlt)).toBeNull()
    expect(screen.getByAltText(retainedAlt)).toBeTruthy()
  })

  it('libera ambas fotos al reiniciar y permite seleccionar otras', () => {
    renderFlow()
    const photos = addTwoPhotos()
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar formulario' }))
    expect(activePreviews.size).toBe(0)
    expect(revokeObjectURL).toHaveBeenCalledWith(photos.placeUrl)
    expect(revokeObjectURL).toHaveBeenCalledWith(photos.totalUrl)
    expect(screen.queryByAltText('Lugar 1')).toBeNull()
    expect(screen.queryByAltText('Total 1')).toBeNull()
    const nextPhotos = addTwoPhotos()
    expect(activePreviews.get(nextPhotos.placeUrl)).toBe(nextPhotos.place)
    expect(activePreviews.get(nextPhotos.totalUrl)).toBe(nextPhotos.total)
  })

  it('libera ambas fotos al abandonar definitivamente las rutas del formulario', () => {
    renderFlow()
    const photos = addTwoPhotos()
    fireEvent.click(screen.getByRole('link', { name: 'Salir del flujo' }))
    expect(screen.getByText('Listado de recolecciones')).toBeTruthy()
    expect(activePreviews.size).toBe(0)
    expect(revokeObjectURL).toHaveBeenCalledWith(photos.placeUrl)
    expect(revokeObjectURL).toHaveBeenCalledWith(photos.totalUrl)
  })
})
