import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ImpactoRegistro } from '../../impacto/types'
import SubcampaniaAdminHistorial from './SubcampaniaAdminHistorial'

const record: ImpactoRegistro = {
  id: '9007199254740993', codigo_trazabilidad: 'PLA-NORTE-01',
  campania_id: '7', subcampania_id: '51', campania_nombre: 'Palca', subcampania_nombre: 'Norte',
  fecha_plantacion: '2026-10-27', cantidad_total_plantada: 12, es_reposicion: false,
  registro_plantacion_origen_id: null, latitud: -16.5, longitud: -68.15, gps_dentro_poligono: false,
  especies: [{ planta_id: '8', nombre: 'Molle', cantidad: 12 }],
  personas: [{ nombre: 'Ana histórica', es_responsable: true, afiliacion: { estado: 'DECLARADA', tipo: 'OTRA', nombre: 'Equipo del barrio', organizacion_id: null } }],
  fotos: [{ id: '10', url: '/api/v1/impact/imagenes/10' }],
  seguimiento: { bajas_reportadas: 2, reposiciones_registradas: 1, bajas: [{ evento_id: '22', fecha: '2026-10-27', cantidad: 2 }], reposiciones: [{ registro_id: '30', fecha: '2026-10-27', cantidad: 1, url_publica: '/impacto/registros/30' }] },
  organizaciones_campania: [], url_publica: '/impacto/registros/9007199254740993',
}

function props() {
  return {
    records: [record], loading: false, error: null, onRetry: vi.fn(),
    hasMore: false, loadingMore: false, pageError: null, onLoadMore: vi.fn(),
    onShowMap: vi.fn(), confirmedEmpty: false,
  }
}

describe('Historial detallado del ADMIN interno', () => {
  it('conserva la identidad exacta al seleccionar mapa y abre los detalles históricos sin escrituras', async () => {
    const current = props()
    render(<MemoryRouter><SubcampaniaAdminHistorial {...current} returnTo="/app/planting/subcampanias/51?pestana=resumen" /></MemoryRouter>)
    expect(screen.getByText(/no incluye una auditoría administrativa completa/)).toBeTruthy()
    expect(screen.getByText('Ana histórica')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ver en mapa' }))
    expect(current.onShowMap).toHaveBeenCalledExactlyOnceWith(record.id)
    expect(screen.getByRole('link', { name: 'Abrir ficha pública' }).getAttribute('href')).toBe(`/impacto/registros/${record.id}`)

    const details = screen.getByText(/Ver detalle del registro/).closest('details')!
    details.open = true
    fireEvent(details, new Event('toggle'))
    await waitFor(() => expect(screen.getByText('Equipo del barrio')).toBeTruthy())
    expect(screen.getByText('Molle')).toBeTruthy()
    expect(screen.getByText('GPS: -16.5, -68.15')).toBeTruthy()
    expect(screen.getByText('Ubicación exterior al polígono registrada.')).toBeTruthy()
    expect(screen.getByRole('img', { name: /evidencia 10/ }).getAttribute('src')).toContain('/api/v1/impact/imagenes/10')
    expect(screen.getByRole('link', { name: 'Registro 30' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /editar|borrar|eliminar/i })).toBeNull()
  })

  it('permite reintentar la lectura sin convertir carga o error en un historial vacío', () => {
    const current = props()
    const view = render(<MemoryRouter><SubcampaniaAdminHistorial {...current} records={[]} loading confirmedEmpty /></MemoryRouter>)
    expect(screen.getByText('Consultando historial de plantaciones…')).toBeTruthy()
    expect(screen.queryByText(/Todavía no hay plantaciones/)).toBeNull()
    view.rerender(<MemoryRouter><SubcampaniaAdminHistorial {...current} records={[]} error={new Error('Sin conexión')} confirmedEmpty /></MemoryRouter>)
    expect(screen.getByRole('alert').textContent).toContain('Sin conexión')
    expect(screen.queryByText(/Todavía no hay plantaciones/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar historial' }))
    expect(current.onRetry).toHaveBeenCalledOnce()
  })

  it('mantiene registros al fallar una página y usa la recuperación de paginación', () => {
    const current = props()
    render(<MemoryRouter><SubcampaniaAdminHistorial {...current} hasMore pageError={new Error('Página pendiente')} /></MemoryRouter>)
    expect(screen.getByText(record.codigo_trazabilidad)).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Página pendiente')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar más registros' }))
    expect(current.onLoadMore).toHaveBeenCalledOnce()
    expect(current.onRetry).not.toHaveBeenCalled()
  })

  it('distingue un vacío confirmado de registros todavía no disponibles', () => {
    const current = props()
    const view = render(<MemoryRouter><SubcampaniaAdminHistorial {...current} records={[]} /></MemoryRouter>)
    expect(screen.getByText('Los registros no están disponibles en esta consulta.')).toBeTruthy()
    expect(screen.queryByText(/Todavía no hay plantaciones/)).toBeNull()
    view.rerender(<MemoryRouter><SubcampaniaAdminHistorial {...current} records={[]} confirmedEmpty /></MemoryRouter>)
    expect(screen.getByText('Todavía no hay plantaciones registradas en la consulta pública.')).toBeTruthy()
  })

  it('explica la falta de publicación sin afirmar inexistencia de plantaciones', () => {
    const current = props()
    render(<MemoryRouter><SubcampaniaAdminHistorial {...current} records={[]} error={Object.assign(new Error('No visible'), { status: 404 })} confirmedEmpty /></MemoryRouter>)
    expect(screen.getByText(/Esto no significa que no existan plantaciones/)).toBeTruthy()
    expect(screen.queryByText(/Todavía no hay plantaciones/)).toBeNull()
  })
})
