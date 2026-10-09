import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('mantiene el foco dentro del resumen y lo devuelve al cancelar con Escape', async () => {
    const user = userEvent.setup()
    const confirm = vi.fn()
    function Example() {
      const [open, setOpen] = useState(false)
      return <>
        <button onClick={() => setOpen(true)}>Revisar evento</button>
        <ConfirmDialog open={open} title="Confirmar evento" confirmLabel="Registrar"
          onConfirm={confirm} onCancel={() => setOpen(false)}>
          <p>Este evento quedará en el historial.</p>
        </ConfirmDialog>
      </>
    }
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Revisar evento' })
    await user.click(trigger)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Registrar' }))
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('no permite cerrar o confirmar por teclado durante el envío', async () => {
    const user = userEvent.setup()
    const cancel = vi.fn()
    const confirm = vi.fn()
    render(<ConfirmDialog open loading title="Enviando evento" confirmLabel="Registrar"
      onConfirm={confirm} onCancel={cancel} />)
    await user.keyboard('{Escape}')
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
    await user.keyboard('{Enter}')
    expect(cancel).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('permite cancelar cuando la confirmación está bloqueada por permisos', async () => {
    const user = userEvent.setup()
    const cancel = vi.fn()
    const confirm = vi.fn()
    render(<ConfirmDialog open confirmDisabled title="Revisar plan" confirmLabel="Guardar"
      onConfirm={confirm} onCancel={cancel} />)
    expect(screen.getByRole('button', { name: 'Guardar' }).hasAttribute('disabled')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledOnce()
  })
})
