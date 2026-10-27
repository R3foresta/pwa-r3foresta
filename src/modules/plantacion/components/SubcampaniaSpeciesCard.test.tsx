import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SubcampaniaSpeciesCard from './SubcampaniaSpeciesCard'

describe('foto opcional del plan', () => {
  it('conserva nombre y objetivo cuando una foto falla y admite una foto nueva', () => {
    const item = { id: '50', nombre: 'Lechuga de agua', imagen_url: 'https://example.com/rota.jpg', cantidad_objetivo: 40, porcentaje_objetivo: 20 }
    const { container, rerender } = render(<SubcampaniaSpeciesCard items={[item]} />)
    const image = container.querySelector('img')!
    fireEvent.error(image)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Lechuga de agua')).toBeTruthy()
    expect(screen.getByText('40')).toBeTruthy()
    rerender(<SubcampaniaSpeciesCard items={[{ ...item, imagen_url: 'https://example.com/nueva.jpg' }]} />)
    expect(container.querySelector('img')?.getAttribute('src')).toContain('nueva.jpg')
  })
})
