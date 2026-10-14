import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { compressNonEvidenceImageFile } from '../../../utils/nonEvidenceImageCompression'
import { ProfileService } from '../profile.service'
import type { ProfilePhotoResponse } from '../types'
import { AvatarUpload } from './AvatarUpload'

vi.mock('../../../utils/nonEvidenceImageCompression', () => ({ compressNonEvidenceImageFile: vi.fn() }))

const photo = new File(['photo'], 'mi-foto.png', { type: 'image/png' })
const compressedPhoto = new File(['compressed'], 'mi-foto.jpg', { type: 'image/jpeg' })
const photoUrl = 'https://example.test/mi-foto.jpg'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

function getFileInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('No se encontró el selector de archivos')
  return input
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.mocked(compressNonEvidenceImageFile).mockReset().mockResolvedValue(compressedPhoto)
  vi.spyOn(ProfileService, 'updateProfilePhoto').mockResolvedValue({ foto_perfil_url: photoUrl })
})

describe('Foto de perfil', () => {
  it('comprime, sube y espera a actualizar la sesión antes de confirmar el éxito', async () => {
    const compression = deferred<File>()
    const upload = deferred<ProfilePhotoResponse>()
    const refresh = deferred<void>()
    vi.mocked(compressNonEvidenceImageFile).mockReturnValueOnce(compression.promise)
    vi.mocked(ProfileService.updateProfilePhoto).mockReturnValueOnce(upload.promise)
    const onUploadSuccess = vi.fn().mockReturnValue(refresh.promise)
    const user = userEvent.setup()
    const { container } = render(<AvatarUpload onUploadSuccess={onUploadSuccess} />)
    const input = getFileInput(container)

    await user.upload(input, photo)
    expect(compressNonEvidenceImageFile).toHaveBeenCalledWith(photo)
    expect(ProfileService.updateProfilePhoto).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toContain('Procesando y subiendo')
    expect((screen.getByRole('button', { name: 'Subir foto de perfil' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(input, { target: { files: [photo] } })
    expect(compressNonEvidenceImageFile).toHaveBeenCalledTimes(1)
    await act(async () => compression.resolve(compressedPhoto))
    expect(ProfileService.updateProfilePhoto).toHaveBeenCalledWith(compressedPhoto)
    expect(onUploadSuccess).not.toHaveBeenCalled()
    await act(async () => upload.resolve({ foto_perfil_url: photoUrl }))
    expect(onUploadSuccess).toHaveBeenCalledWith(photoUrl)
    expect(screen.queryByText('Foto actualizada.')).toBeNull()
    expect(input.disabled).toBe(true)

    await act(async () => refresh.resolve())
    expect(screen.getByRole('status').textContent).toBe('Foto actualizada.')
    expect(input.disabled).toBe(false)
    expect(input.value).toBe('')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('muestra el formato inválido en la página sin alert ni solicitudes', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined)
    const onUploadSuccess = vi.fn()
    const user = userEvent.setup({ applyAccept: false })
    const { container } = render(<AvatarUpload onUploadSuccess={onUploadSuccess} />)
    const input = getFileInput(container)
    const invalidFile = new File(['not an image'], 'documento.pdf', { type: 'application/pdf' })

    await user.upload(input, invalidFile)
    expect(screen.getByRole('alert').textContent).toContain('Formato inválido: documento.pdf')
    expect(alert).not.toHaveBeenCalled()
    expect(compressNonEvidenceImageFile).not.toHaveBeenCalled()
    expect(ProfileService.updateProfilePhoto).not.toHaveBeenCalled()
    expect(onUploadSuccess).not.toHaveBeenCalled()
    expect(input.value).toBe('')
    expect(input.files?.length).toBe(0)
  })

  it('limpia el archivo tras fallo de API y permite reintentar exactamente la misma foto', async () => {
    vi.mocked(ProfileService.updateProfilePhoto).mockRejectedValueOnce(new Error('No se pudo subir la foto.'))
    const onUploadSuccess = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    const { container } = render(<AvatarUpload onUploadSuccess={onUploadSuccess} />)
    const input = getFileInput(container)

    await user.upload(input, photo)
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo subir la foto.')
    expect(onUploadSuccess).not.toHaveBeenCalled()
    expect(input.value).toBe('')
    expect(input.files?.length).toBe(0)
    expect(input.disabled).toBe(false)

    await user.upload(input, photo)
    await screen.findByText('Foto actualizada.')
    expect(ProfileService.updateProfilePhoto).toHaveBeenCalledTimes(2)
    expect(onUploadSuccess).toHaveBeenCalledWith(photoUrl)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(input.value).toBe('')
  })

  it('abre el selector de archivos con el botón y el teclado', async () => {
    const user = userEvent.setup()
    const { container } = render(<AvatarUpload currentPhotoUrl={photoUrl} onUploadSuccess={vi.fn()} />)
    const input = getFileInput(container)
    const openPicker = vi.spyOn(input, 'click')
    const button = screen.getByRole('button', { name: 'Cambiar foto' })

    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(openPicker).toHaveBeenCalledTimes(2)
    expect(ProfileService.updateProfilePhoto).not.toHaveBeenCalled()
  })

  it('bloquea el selector y una carga cuando el padre lo deshabilita', async () => {
    const onUploadSuccess = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<AvatarUpload disabled onUploadSuccess={onUploadSuccess} />)
    const input = getFileInput(container)
    const button = screen.getByRole('button', { name: 'Subir foto de perfil' }) as HTMLButtonElement
    const openPicker = vi.spyOn(input, 'click')

    expect(button.disabled).toBe(true)
    expect(input.disabled).toBe(true)
    await user.click(button)
    fireEvent.change(input, { target: { files: [photo] } })
    expect(openPicker).not.toHaveBeenCalled()
    expect(compressNonEvidenceImageFile).not.toHaveBeenCalled()
    expect(ProfileService.updateProfilePhoto).not.toHaveBeenCalled()
    expect(onUploadSuccess).not.toHaveBeenCalled()
  })

  it('informa un fallo de compresión y recupera el control sin llamar al backend', async () => {
    vi.mocked(compressNonEvidenceImageFile).mockRejectedValueOnce(new Error('No se pudo procesar la imagen.'))
    const user = userEvent.setup()
    const { container } = render(<AvatarUpload onUploadSuccess={vi.fn()} />)
    const input = getFileInput(container)

    await user.upload(input, photo)
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo procesar la imagen.')
    await waitFor(() => expect(input.disabled).toBe(false))
    expect(ProfileService.updateProfilePhoto).not.toHaveBeenCalled()
    expect(input.value).toBe('')
  })
})
