import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RecoleccionesService, type Recoleccion } from '../../services/recolecciones.service'
import RecoleccionCard from './RecoleccionCard'

function collection(overrides: Partial<Recoleccion> = {}): Recoleccion {
  return {
    id: 306,
    fecha: '2026-11-12',
    nombre_cientifico: 'Jacaranda mimosifolia',
    nombre_comercial: 'Jacarandá',
    tipo_material: 'SEMILLA',
    especie_nueva: false,
    observaciones: null,
    usuario_id: 7,
    vivero_id: 1,
    vivero: { id: 1, codigo: 'VIV-001', nombre: 'Vivero Central' },
    metodo_id: 1,
    planta_id: 2,
    created_at: '2026-11-12T15:00:00Z',
    codigo_trazabilidad: 'REC-2026-007',
    blockchain_url: null,
    token_id: null,
    transaction_hash: null,
    estado_registro: 'BORRADOR',
    unidad_canonica: 'G',
    cantidad_inicial_canonica: 100,
    saldo_actual: 100,
    estado_operativo: 'ABIERTO',
    ...overrides,
  }
}

function received(overrides: Partial<Recoleccion> = {}): Recoleccion {
  return collection({
    estado_registro: 'VALIDADO',
    recepcion_conforme: true,
    recepcion: { id: '1', fecha_recepcion: '2026-11-13', recibido_por: '9', registrado_en: '2026-11-13T14:00:00Z' },
    ...overrides,
  })
}

function renderCard(recoleccion: Recoleccion, options: { canEdit?: boolean; compact?: boolean } = {}) {
  return render(<MemoryRouter initialEntries={['/app/collections']}>
    <Routes>
      <Route path="/app/collections" element={<RecoleccionCard recoleccion={recoleccion} {...options} />} />
      <Route path="/app/collections/new" element={<p>Editor de la misma recolección</p>} />
      <Route path="/app/collections/:id" element={<p>Consulta del detalle</p>} />
    </Routes>
  </MemoryRouter>)
}

function fullText(text: string) {
  return (_content: string, element: Element | null) => {
    if (!element) return false
    const matches = (node: Element) => node.textContent?.replace(/\s+/g, ' ').trim() === text
    return matches(element) && !Array.from(element.children).some(matches)
  }
}

describe('cantidad y recepción en las cards de Recolección', () => {
  it('antes de recibir identifica la cantidad declarada sin sustituirla por el saldo', () => {
    renderCard(collection({ saldo_actual: 75 }))
    expect(screen.getByText(fullText('Cantidad: 100 G'))).toBeTruthy()
    expect(screen.queryByText(/75 G/)).toBeNull()
    expect(screen.getByText(/Destino: Vivero Central/)).toBeTruthy()
    expect(screen.queryByText('ABIERTO')).toBeNull()
  })

  it('después de un consumo conserva la cantidad original y distingue el saldo del origen', () => {
    renderCard(received({ saldo_actual: 75 }))
    expect(screen.getByText(fullText('Saldo en origen: 75 G'))).toBeTruthy()
    expect(screen.getByText(/Cantidad registrada: 100 G/)).toBeTruthy()
    expect(screen.getByText(/Recibida en Vivero Central · 13\/11\/2026/)).toBeTruthy()
    expect(screen.queryByText(/Destino:/)).toBeNull()
  })

  it.each([null, undefined])('un saldo ausente (%s) no se representa como cero', saldo => {
    renderCard(received({ saldo_actual: saldo }))
    expect(screen.getByText(fullText('Saldo en origen: No disponible'))).toBeTruthy()
    expect(screen.queryByText(fullText('Saldo en origen: 0 G'))).toBeNull()
    expect(screen.queryByText('Sin saldo en origen')).toBeNull()
  })

  it('no inventa una cantidad declarada cuando solo está disponible el saldo', () => {
    renderCard(collection({ cantidad_inicial_canonica: null, saldo_actual: 100 }))
    expect(screen.getByText(fullText('Cantidad: No disponible'))).toBeTruthy()
    expect(screen.queryByText(/100 G/)).toBeNull()
    expect(screen.queryByText(fullText('Cantidad: 0 G'))).toBeNull()
  })

  it('mantiene la recepción y el detalle del origen agotado en su card compacta', () => {
    renderCard(received({ saldo_actual: 0, estado_operativo: 'CERRADO' }), { compact: true })
    expect(screen.getByText('Recibida en vivero')).toBeTruthy()
    expect(screen.getByText('Sin saldo en origen')).toBeTruthy()
    expect(screen.getByText(fullText('Saldo en origen: 0 G'))).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver detalle de REC-2026-007' }).getAttribute('href')).toBe('/app/collections/306')
    expect(screen.queryByText('Ver detalle')).toBeNull()
  })

  it('un VALIDADO sin acreditación física no afirma vivero o fecha de recepción', () => {
    renderCard(received({ recepcion_conforme: false, recepcion: null }))
    expect(screen.getByText('Recepción no acreditada')).toBeTruthy()
    expect(screen.queryByText(/Recibida en Vivero Central/)).toBeNull()
    expect(screen.queryByText(/13\/11\/2026/)).toBeNull()
  })
})

describe('acciones de navegación en las cards de Recolección', () => {
  it('la acción del borrador editable abre el editor sin enviar la ficha', async () => {
    const user = userEvent.setup()
    const submit = vi.spyOn(RecoleccionesService, 'submit')
    const view = renderCard(collection(), { canEdit: true })
    expect(screen.getByRole('link', { name: 'Ver detalle de REC-2026-007' }).getAttribute('href')).toBe('/app/collections/306')
    const action = screen.getByRole('link', { name: 'Revisar y enviar' })
    expect(action.getAttribute('href')).toBe('/app/collections/new?editId=306')
    expect(view.container.querySelector('a a, a button')).toBeNull()
    await user.click(action)
    expect(screen.getByText('Editor de la misma recolección')).toBeTruthy()
    expect(submit).not.toHaveBeenCalled()
  })

  it.each([
    ['BORRADOR', false],
    ['RECHAZADO', false],
    ['RECHAZADO', true],
    ['PENDIENTE_VALIDACION', true],
    ['VALIDADO', true],
  ] as const)('el estado %s con permiso de edición %s conserva solo la consulta', async (estado, canEdit) => {
    const user = userEvent.setup()
    renderCard(collection({ estado_registro: estado }), { canEdit })
    expect(screen.queryByRole('link', { name: 'Revisar y enviar' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Corregir recolección' })).toBeNull()
    expect(screen.queryByText('Ver detalle')).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    const action = screen.getByRole('link', { name: 'Ver detalle de REC-2026-007' })
    expect(action.getAttribute('href')).toBe('/app/collections/306')
    await user.click(action)
    expect(screen.getByText('Consulta del detalle')).toBeTruthy()
  })
})
