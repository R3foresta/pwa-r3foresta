import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionProfileService, type OrganizacionSeleccionable, type PaginaOrganizaciones } from '../participacion.service'
import { AfiliacionSelector } from './AfiliacionSelector'

const firstOrganization = { organizacion_id: '9007199254740992', nombre: 'Bosque Vivo' }
const secondOrganization = { organizacion_id: '9007199254740993', nombre: 'Semillas del Sur' }

function page(data: OrganizacionSeleccionable[] = [firstOrganization], siguiente_cursor: string | null = null): PaginaOrganizaciones {
  return { data, siguiente_cursor, observado_en: '2026-10-14T14:00:00Z' }
}

function deferredPage() {
  let resolve!: (value: PaginaOrganizaciones) => void
  const promise = new Promise<PaginaOrganizaciones>(done => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(ParticipacionProfileService, 'organizaciones').mockResolvedValue(page())
})

describe('Selector de afiliación', () => {
  it('selecciona el ID decimal exacto y destaca la organización elegida', async () => {
    vi.mocked(ParticipacionProfileService.organizaciones).mockResolvedValue(page([firstOrganization, secondOrganization]))
    const onSelect = vi.fn()
    const { rerender } = render(<AfiliacionSelector selected={firstOrganization} onSelect={onSelect} disabled={false} />)

    const secondChoice = await screen.findByRole('button', { name: 'Semillas del Sur' })
    expect(screen.getByRole('button', { name: 'Bosque Vivo' }).getAttribute('aria-pressed')).toBe('true')
    expect(secondChoice.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(secondChoice)
    expect(onSelect).toHaveBeenCalledWith(secondOrganization)

    rerender(<AfiliacionSelector selected={secondOrganization} onSelect={onSelect} disabled={false} />)
    expect(screen.getByRole('button', { name: 'Semillas del Sur' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Bosque Vivo' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('Organización seleccionada')).toBeTruthy()
  })

  it('permite escribir durante carga y busca con Enter sin enviar el formulario padre', async () => {
    const pending = deferredPage()
    vi.mocked(ParticipacionProfileService.organizaciones).mockReturnValueOnce(pending.promise)
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())
    const user = userEvent.setup()
    render(<form onSubmit={onSubmit}><AfiliacionSelector selected={null} onSelect={vi.fn()} disabled={false} /><button type="submit">Guardar perfil</button></form>)

    expect(screen.getByRole('status').textContent).toContain('Consultando')
    await user.type(screen.getByLabelText('Buscar organización'), 'Sur{Enter}')
    await screen.findByRole('button', { name: 'Bosque Vivo' })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(ParticipacionProfileService.organizaciones).toHaveBeenLastCalledWith('Sur', null, expect.any(AbortSignal))
  })

  it('valida caracteres después de NFC y conserva el texto sin truncarlo', async () => {
    render(<AfiliacionSelector selected={null} onSelect={vi.fn()} disabled={false} />)
    await screen.findByRole('button', { name: 'Bosque Vivo' })
    const input = screen.getByLabelText('Buscar organización') as HTMLInputElement
    const search = screen.getByRole('button', { name: 'Buscar' }) as HTMLButtonElement

    fireEvent.change(input, { target: { value: 'e\u0301' } })
    expect(search.disabled).toBe(true)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Escribe al menos 2 caracteres para buscar.')).toBeTruthy()

    const overLimit = '🌱'.repeat(101)
    fireEvent.change(input, { target: { value: overLimit } })
    expect(input.value).toBe(overLimit)
    expect(search.disabled).toBe(true)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(ParticipacionProfileService.organizaciones).toHaveBeenCalledTimes(1)

    const decomposedQuery = 'e\u0301'.repeat(100)
    fireEvent.change(input, { target: { value: `  ${decomposedQuery}  ` } })
    expect(search.disabled).toBe(false)
    fireEvent.click(search)
    await waitFor(() => expect(ParticipacionProfileService.organizaciones).toHaveBeenLastCalledWith('é'.repeat(100), null, expect.any(AbortSignal)))
    expect(input.value).toBe(`  ${decomposedQuery}  `)
  })

  it('conserva los resultados ante error de paginación y reintenta el mismo cursor', async () => {
    vi.mocked(ParticipacionProfileService.organizaciones)
      .mockResolvedValueOnce(page([firstOrganization], 'cursor-opaco'))
      .mockRejectedValueOnce(new Error('Se perdió la conexión.'))
      .mockResolvedValueOnce(page([firstOrganization, secondOrganization]))
    const onSelect = vi.fn()
    render(<AfiliacionSelector selected={null} onSelect={onSelect} disabled={false} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Ver más organizaciones' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Se perdió la conexión.')
    fireEvent.click(screen.getByRole('button', { name: 'Bosque Vivo' }))
    expect(onSelect).toHaveBeenCalledWith(firstOrganization)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByRole('button', { name: 'Semillas del Sur' })
    expect(ParticipacionProfileService.organizaciones).toHaveBeenLastCalledWith('', 'cursor-opaco', expect.any(AbortSignal))
    expect(screen.getAllByRole('button', { name: 'Bosque Vivo' })).toHaveLength(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('aborta una consulta anterior e ignora su respuesta tardía', async () => {
    const oldSearch = deferredPage()
    const newSearch = deferredPage()
    vi.mocked(ParticipacionProfileService.organizaciones)
      .mockResolvedValueOnce(page())
      .mockReturnValueOnce(oldSearch.promise)
      .mockReturnValueOnce(newSearch.promise)
    render(<AfiliacionSelector selected={null} onSelect={vi.fn()} disabled={false} />)
    await screen.findByRole('button', { name: 'Bosque Vivo' })
    const input = screen.getByLabelText('Buscar organización')

    fireEvent.change(input, { target: { value: 'Anterior' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(ParticipacionProfileService.organizaciones).toHaveBeenCalledTimes(2))
    const oldSignal = vi.mocked(ParticipacionProfileService.organizaciones).mock.calls[1][2]
    fireEvent.change(input, { target: { value: 'Sur' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(ParticipacionProfileService.organizaciones).toHaveBeenCalledTimes(3))
    expect(oldSignal?.aborted).toBe(true)

    await act(async () => newSearch.resolve(page([secondOrganization])))
    await screen.findByRole('button', { name: 'Semillas del Sur' })
    await act(async () => oldSearch.resolve(page([firstOrganization])))
    expect(screen.queryByRole('button', { name: 'Bosque Vivo' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Semillas del Sur' })).toBeTruthy()
  })

  it('recupera un error inicial y permite volver al catálogo después de una búsqueda vacía', async () => {
    vi.mocked(ParticipacionProfileService.organizaciones)
      .mockRejectedValueOnce(new Error('Catálogo no disponible.'))
      .mockResolvedValueOnce(page())
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(page([secondOrganization]))
    render(<AfiliacionSelector selected={null} onSelect={vi.fn()} disabled={false} />)
    expect((await screen.findByRole('alert')).textContent).toContain('Catálogo no disponible.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByRole('button', { name: 'Bosque Vivo' })

    fireEvent.change(screen.getByLabelText('Buscar organización'), { target: { value: 'Sin coincidencias' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await screen.findByText('No encontramos organizaciones con ese nombre.')
    fireEvent.click(screen.getByRole('button', { name: 'Ver catálogo completo' }))
    await screen.findByRole('button', { name: 'Semillas del Sur' })
    expect((screen.getByLabelText('Buscar organización') as HTMLInputElement).value).toBe('')
    expect(ParticipacionProfileService.organizaciones).toHaveBeenLastCalledWith('', null, expect.any(AbortSignal))
  })

  it('bloquea búsqueda y selección cuando el formulario está deshabilitado', async () => {
    const onSelect = vi.fn()
    render(<AfiliacionSelector selected={firstOrganization} onSelect={onSelect} disabled />)
    const organization = await screen.findByRole('button', { name: 'Bosque Vivo' }) as HTMLButtonElement
    expect((screen.getByLabelText('Buscar organización') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Buscar' }) as HTMLButtonElement).disabled).toBe(true)
    expect(organization.disabled).toBe(true)
    fireEvent.click(organization)
    fireEvent.keyDown(screen.getByLabelText('Buscar organización'), { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
    expect(ParticipacionProfileService.organizaciones).toHaveBeenCalledTimes(1)
  })
})
