import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ImpactoFilters from './ImpactoFilters'

const options = {
  campanias: [{ id: '800', nombre: 'Reforestación Cotacota' }],
  subcampanias: [{ id: '826', nombre: 'Calle 32' }],
  organizaciones: [{ id: '17', nombre: 'Aliados del bosque' }],
  especies: [{ id: '8', nombre: 'Queñua' }, { id: '9', nombre: 'Molle' }],
}

function props(search = '') {
  return { scope: { tipo: 'global' as const }, search, options, onApply: vi.fn(), onClear: vi.fn() }
}

describe('filtros públicos por nombre', () => {
  it('permite elegir nombres reconocibles y envía solamente los IDs contractuales', async () => {
    const user = userEvent.setup()
    const config = props()
    render(<ImpactoFilters {...config} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Campaña' }), screen.getByRole('option', { name: 'Reforestación Cotacota' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Zona' }), screen.getByRole('option', { name: 'Calle 32' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Organización de campaña' }), screen.getByRole('option', { name: 'Aliados del bosque' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Especie' }), screen.getByRole('option', { name: 'Queñua' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).toHaveBeenCalledWith({ campania_id: '800', subcampania_id: '826', organizacion_id: '17', planta_id: '8' })
    expect(screen.queryByPlaceholderText(/ID/)).toBeNull()
    expect(screen.getByText(/no son un catálogo completo/)).toBeTruthy()
    const species = screen.getByRole('combobox', { name: 'Especie' })
    expect(species.getAttribute('aria-describedby')).toBe('impacto-filter-suggestions')
  })

  it('conserva una selección del enlace ausente de las sugerencias hasta cambiarla explícitamente', async () => {
    const user = userEvent.setup()
    const config = props('?planta_id=9223372036854775807')
    render(<ImpactoFilters {...config} />)
    const species = screen.getByRole('combobox', { name: 'Especie' }) as HTMLSelectElement
    expect(species.value).toBe('9223372036854775807')
    expect(within(species).getByRole('option', { name: 'Selección conservada · nombre no disponible' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).toHaveBeenLastCalledWith({ planta_id: '9223372036854775807' })
    await user.selectOptions(species, screen.getByRole('option', { name: 'Molle' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).toHaveBeenLastCalledWith({ planta_id: '9' })
  })

  it('restaura los nombres de un enlace y permite retirar un filtro sin retirar los demás', async () => {
    const user = userEvent.setup()
    const config = props('?campania_id=800&planta_id=8&desde=2026-10-15')
    render(<ImpactoFilters {...config} />)
    const campaign = screen.getByRole('combobox', { name: 'Campaña' }) as HTMLSelectElement
    expect(campaign.selectedOptions[0].textContent).toBe('Reforestación Cotacota')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Especie' }), '')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).toHaveBeenCalledWith({ campania_id: '800', desde: '2026-10-15' })
  })

  it('conserva el ID del enlace mientras llegan sus opciones y muestra su nombre al completar la carga', async () => {
    const user = userEvent.setup()
    const config = props('?planta_id=8')
    const pendingOptions = { ...options, especies: [] }
    const view = render(<ImpactoFilters {...config} options={pendingOptions} />)
    const species = screen.getByRole('combobox', { name: 'Especie' }) as HTMLSelectElement
    expect(species.value).toBe('8')
    view.rerender(<ImpactoFilters {...config} />)
    expect(species.value).toBe('8')
    expect(species.selectedOptions[0].textContent).toBe('Queñua')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).toHaveBeenCalledWith({ planta_id: '8' })
  })

  it('conserva la propuesta elegida cuando las sugerencias desaparecen y reaparecen', async () => {
    const user = userEvent.setup()
    const config = props('?planta_id=8')
    const view = render(<ImpactoFilters {...config} />)
    const species = screen.getByRole('combobox', { name: 'Especie' }) as HTMLSelectElement
    await user.selectOptions(species, screen.getByRole('option', { name: 'Molle' }))
    view.rerender(<ImpactoFilters {...config} options={{ ...options, especies: [] }} />)
    expect(species.value).toBe('9')
    expect(species.selectedOptions[0].textContent).toBe('Selección conservada · nombre no disponible')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).toHaveBeenLastCalledWith({ planta_id: '9' })
    view.rerender(<ImpactoFilters {...config} />)
    expect(species.value).toBe('9')
    expect(species.selectedOptions[0].textContent).toBe('Molle')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).toHaveBeenLastCalledWith({ planta_id: '9' })
  })

  it('usa el nombre conservado solo para su filtro aplicado sin convertirlo en otra sugerencia', async () => {
    const user = userEvent.setup()
    const config = props('?planta_id=8')
    const names = { planta_id: 'Queñua' }
    const view = render(<ImpactoFilters {...config} options={{ ...options, especies: [] }} selectedNames={names} />)
    const species = screen.getByRole('combobox', { name: 'Especie' }) as HTMLSelectElement
    expect(species.value).toBe('8')
    expect(species.selectedOptions[0].textContent).toBe('Queñua')
    view.rerender(<ImpactoFilters {...config} selectedNames={names} />)
    await user.selectOptions(species, '9')
    view.rerender(<ImpactoFilters {...config} options={{ ...options, especies: [] }} selectedNames={names} />)
    expect(species.value).toBe('9')
    expect(species.selectedOptions[0].textContent).toBe('Selección conservada · nombre no disponible')
    expect(within(species).queryByRole('option', { name: 'Queñua' })).toBeNull()
  })

  it('rechaza un intervalo invertido en español, enfoca el error y conserva la propuesta al corregirlo', async () => {
    const user = userEvent.setup()
    const config = props()
    render(<ImpactoFilters {...config} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Especie' }), '8')
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-16' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-15' } })
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('La fecha hasta debe ser igual o posterior a la fecha desde.')
    expect(document.activeElement).toBe(screen.getByLabelText('Hasta'))
    expect((screen.getByRole('combobox', { name: 'Especie' }) as HTMLSelectElement).value).toBe('8')
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-16' } })
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).toHaveBeenCalledWith({ planta_id: '8', desde: '2026-10-16', hasta: '2026-10-16' })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('no trata una fecha que el navegador informa como incompleta como si fuera un filtro vacío', async () => {
    const user = userEvent.setup()
    const config = props()
    render(<ImpactoFilters {...config} />)
    const date = screen.getByLabelText('Desde')
    // jsdom no implementa la captura parcial del selector de fecha nativo.
    Object.defineProperty(date, 'validity', { configurable: true, value: { badInput: true } })
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Ingresa una fecha válida y completa.')
    expect(document.activeElement).toBe(date)
  })

  it('no reenvía un ID inválido del enlace como filtro aceptado', async () => {
    const user = userEvent.setup()
    const config = props('?planta_id=01')
    render(<ImpactoFilters {...config} />)
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(config.onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('La selección del enlace no es válida.')
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Especie' }))
  })

  it('navegar a otros filtros restaura el formulario y retira errores de la propuesta anterior', async () => {
    const user = userEvent.setup()
    const config = props('?desde=2026-10-16&hasta=2026-10-15')
    const view = render(<ImpactoFilters {...config} />)
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(screen.getByRole('alert')).toBeTruthy()
    view.rerender(<ImpactoFilters {...config} search="?planta_id=9" />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect((screen.getByRole('combobox', { name: 'Especie' }) as HTMLSelectElement).selectedOptions[0].textContent).toBe('Molle')
    expect((screen.getByLabelText('Desde') as HTMLInputElement).value).toBe('')
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(config.onClear).toHaveBeenCalledOnce()
    expect(config.onApply).not.toHaveBeenCalled()
  })

  it('respeta los filtros disponibles para un detalle de zona', () => {
    render(<ImpactoFilters {...props()} scope={{ tipo: 'subcampania', id: '826' }} />)
    expect(screen.queryByRole('combobox', { name: 'Campaña' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Zona' })).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Especie' })).toBeTruthy()
  })
})
