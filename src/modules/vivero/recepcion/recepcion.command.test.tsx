import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cargarIntencionRecepcion, guardarIntencionRecepcion, limpiarIntencionRecepcion,
  recepcionStoreKey, RecepcionService,
} from './recepcion.api'
import { useRecepcionCommand } from './useRecepcionCommand'
import type { ReciboRecepcion } from './recepcion.contract'
import { comandoId, origenId, recibirFixture, rechazarFixture, reciboFixture, revisionId } from './recepcion.test-fixtures'

const lockDescriptor = Object.getOwnPropertyDescriptor(navigator, 'locks')
const photo = new File(['foto original'], 'foto.jpg', { type: 'image/jpeg' })
const draft = { revision_esperada: revisionId, cantidad_recibida: 0.1, unidad_recibida: 'KG' as const, fecha_recepcion: '2026-11-12' }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}
beforeEach(() => {
  localStorage.clear()
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(comandoId)
  vi.spyOn(RecepcionService, 'fotos').mockResolvedValue(['9007199254740994'])
  vi.spyOn(RecepcionService, 'comando').mockImplementation(async intention => reciboFixture(intention))
  let tail: Promise<unknown> = Promise.resolve()
  Object.defineProperty(navigator, 'locks', { configurable: true, value: {
    request: vi.fn((_key: string, _options: unknown, callback: () => unknown) => {
      const result = tail.then(callback)
      tail = result.catch(() => undefined)
      return result
    }),
  } })
})
afterEach(() => {
  if (lockDescriptor) Object.defineProperty(navigator, 'locks', lockDescriptor)
  else Reflect.deleteProperty(navigator, 'locks')
})

describe('comando de recepción y rechazo', () => {
  it('persiste la decisión y las evidencias antes del POST final y libera tras terminal', async () => {
    vi.mocked(RecepcionService.comando).mockImplementation(async (intention, recovery) => {
      expect(recovery).toBe(false)
      expect(cargarIntencionRecepcion('7')).toEqual(intention)
      expect(intention).toEqual(recibirFixture())
      return reciboFixture(intention)
    })
    const hook = renderHook(() => useRecepcionCommand('7'))
    await act(() => hook.result.current.confirmar(origenId, draft, [photo]))
    expect(hook.result.current.receipt?.resultado?.estado_registro).toBe('VALIDADO')
    expect(hook.result.current.pending).toBeNull()
    expect(cargarIntencionRecepcion('7')).toBeNull()
  })
  it('rechaza con revisión/motivo persistidos, sin exigir ni cargar fotos', async () => {
    const intention = rechazarFixture()
    const hook = renderHook(() => useRecepcionCommand('7'))
    await act(() => hook.result.current.rechazar(origenId, revisionId, intention.entrada.motivo_rechazo))
    expect(RecepcionService.fotos).not.toHaveBeenCalled()
    expect(RecepcionService.comando).toHaveBeenCalledWith(intention, false, expect.any(AbortSignal))
    expect(hook.result.current.receipt).toMatchObject({ estado: 'CONFIRMADO', resultado: { accion: 'RECHAZAR', estado_registro: 'RECHAZADO' } })
  })
  it('respuesta perdida conserva UUID/payload y solo recupera/reenvía por acción explícita', async () => {
    vi.mocked(RecepcionService.comando).mockRejectedValueOnce(new Error('Respuesta perdida'))
    const hook = renderHook(() => useRecepcionCommand('7'))
    await act(() => hook.result.current.confirmar(origenId, draft, [photo]))
    const pending = cargarIntencionRecepcion('7')!
    expect(hook.result.current.error).toBe('Respuesta perdida')
    expect(RecepcionService.comando).toHaveBeenCalledTimes(1)
    vi.mocked(RecepcionService.comando).mockResolvedValueOnce({ comando_id: comandoId, estado: 'SIN_RESULTADO', resultado: null, error: null, finalizado_en: null })
    await act(() => hook.result.current.recuperar())
    expect(hook.result.current.missing).toBe(true)
    expect(cargarIntencionRecepcion('7')).toEqual(pending)
    await act(() => hook.result.current.reenviar())
    expect(vi.mocked(RecepcionService.comando).mock.calls.map(([intention, recovery]) => [intention, recovery])).toEqual([[pending, false], [pending, true], [pending, false]])
    expect(RecepcionService.fotos).toHaveBeenCalledTimes(1)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
  })
  it('permite recuperar lo propio sin consultar facultades, cola ni detalle', async () => {
    const intention = guardarIntencionRecepcion(rechazarFixture())
    const detail = vi.spyOn(RecepcionService, 'detalle')
    const queue = vi.spyOn(RecepcionService, 'cola')
    const hook = renderHook(() => useRecepcionCommand('7'))
    expect(RecepcionService.comando).not.toHaveBeenCalled()
    await act(() => hook.result.current.recuperar())
    expect(RecepcionService.comando).toHaveBeenCalledWith(intention, true, expect.any(AbortSignal))
    expect(detail).not.toHaveBeenCalled()
    expect(queue).not.toHaveBeenCalled()
    expect(RecepcionService.fotos).not.toHaveBeenCalled()
  })
  it('un rechazo técnico durable libera el slot y un conflicto de clave lo conserva', async () => {
    guardarIntencionRecepcion(rechazarFixture())
    const hook = renderHook(() => useRecepcionCommand('7'))
    vi.mocked(RecepcionService.comando).mockResolvedValueOnce({ comando_id: comandoId, estado: 'CONFLICTO_CLAVE', resultado: null, error: { codigo: 'CLAVE_REUTILIZADA' }, finalizado_en: null })
    await act(() => hook.result.current.reenviar())
    expect(hook.result.current.pending).toBeTruthy()
    vi.mocked(RecepcionService.comando).mockResolvedValueOnce({ comando_id: comandoId, estado: 'RECHAZADO', resultado: null, error: { codigo: 'REVISION_OBSOLETA' }, finalizado_en: '2026-11-12T00:00:00Z' })
    await act(() => hook.result.current.recuperar())
    expect(hook.result.current.pending).toBeNull()
    expect(hook.result.current.receipt?.estado).toBe('RECHAZADO')
  })
})

describe('aislamiento de cuenta, pestañas y almacenamiento', () => {
  it('serializa dos pestañas y no crea dos confirmaciones mientras hay resultado pendiente', async () => {
    const response = deferred<ReciboRecepcion>()
    vi.mocked(RecepcionService.comando).mockReturnValueOnce(response.promise)
    const first = renderHook(() => useRecepcionCommand('7'))
    const second = renderHook(() => useRecepcionCommand('7'))
    let firstSend!: Promise<void>
    let secondSend!: Promise<void>
    act(() => {
      firstSend = first.result.current.confirmar(origenId, draft, [photo])
      secondSend = second.result.current.rechazar(origenId, revisionId, 'La cantidad requiere una corrección.')
    })
    await waitFor(() => expect(RecepcionService.comando).toHaveBeenCalledTimes(1))
    await act(async () => {
      response.resolve(reciboFixture())
      await Promise.all([firstSend, secondSend])
    })
    expect(RecepcionService.comando).toHaveBeenCalledTimes(1)
    expect(RecepcionService.fotos).toHaveBeenCalledTimes(1)
    expect(second.result.current.pending?.entrada.comando_id).toBe(comandoId)
    expect(second.result.current.error).toContain('pendiente')
  })
  it('cambiar actor retira inmediatamente el pendiente y descarta respuesta tardía', async () => {
    guardarIntencionRecepcion(rechazarFixture())
    const response = deferred<ReciboRecepcion>()
    vi.mocked(RecepcionService.comando).mockReturnValueOnce(response.promise)
    const hook = renderHook(({ actor }) => useRecepcionCommand(actor), { initialProps: { actor: '7' } })
    let recovery!: Promise<void>
    act(() => { recovery = hook.result.current.recuperar() })
    await waitFor(() => expect(RecepcionService.comando).toHaveBeenCalledTimes(1))
    const signal = vi.mocked(RecepcionService.comando).mock.calls[0][2]!
    hook.rerender({ actor: '8' })
    expect(hook.result.current.pending).toBeNull()
    expect(hook.result.current.receipt).toBeNull()
    expect(signal.aborted).toBe(true)
    await act(async () => { response.resolve(reciboFixture(rechazarFixture())); await recovery })
    expect(hook.result.current.receipt).toBeNull()
    expect(cargarIntencionRecepcion('7')).toBeTruthy()
  })
  it('StrictMode no envía automáticamente ni pierde el envío conservado al remontar', async () => {
    guardarIntencionRecepcion(rechazarFixture())
    const hook = renderHook(() => useRecepcionCommand('7'), { wrapper: StrictMode })
    expect(RecepcionService.comando).not.toHaveBeenCalled()
    await act(() => hook.result.current.recuperar())
    expect(hook.result.current.receipt?.estado).toBe('CONFIRMADO')
    expect(RecepcionService.comando).toHaveBeenCalledTimes(1)
  })
  it('un desmontaje durante la carga de fotos impide guardar o enviar confirmación tardía', async () => {
    const upload = deferred<string[]>()
    vi.mocked(RecepcionService.fotos).mockReturnValueOnce(upload.promise)
    const hook = renderHook(() => useRecepcionCommand('7'))
    let send!: Promise<void>
    act(() => { send = hook.result.current.confirmar(origenId, draft, [photo]) })
    await waitFor(() => expect(RecepcionService.fotos).toHaveBeenCalled())
    hook.unmount()
    await act(async () => { upload.resolve(['9007199254740994']); await send })
    expect(RecepcionService.comando).not.toHaveBeenCalled()
    expect(cargarIntencionRecepcion('7')).toBeNull()
  })
  it('falta de Web Locks y fallo de persistencia bloquean el POST final', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
    const unsupported = renderHook(() => useRecepcionCommand('7'))
    await act(() => unsupported.result.current.rechazar(origenId, revisionId, 'La cantidad requiere una corrección.'))
    expect(unsupported.result.current.error).toContain('coordinar')
    expect(RecepcionService.comando).not.toHaveBeenCalled()
    unsupported.unmount()
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_key: string, _options: unknown, callback: () => unknown) => callback() } })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Cuota agotada') })
    const failing = renderHook(() => useRecepcionCommand('7'))
    await act(() => failing.result.current.rechazar(origenId, revisionId, 'La cantidad requiere una corrección.'))
    expect(failing.result.current.error).toContain('no se ha enviado')
    expect(RecepcionService.comando).not.toHaveBeenCalled()
  })
  it('conserva y bloquea pendientes legacy sin convertirlos ni borrarlos', async () => {
    const legacy = { actor_id: '7', recoleccion_id: origenId, entrada: recibirFixture().entrada }
    const raw = JSON.stringify(legacy)
    localStorage.setItem(recepcionStoreKey('7'), raw)
    const hook = renderHook(() => useRecepcionCommand('7'))
    expect(hook.result.current.error).toContain('flujo anterior')
    await act(() => hook.result.current.rechazar(origenId, revisionId, 'La cantidad requiere una corrección.'))
    expect(hook.result.current.error).toContain('flujo anterior')
    expect(RecepcionService.comando).not.toHaveBeenCalled()
    expect(localStorage.getItem(recepcionStoreKey('7'))).toBe(raw)
  })
  it('si falla liberar storage mantiene terminal y clave para recuperar sin duplicar', async () => {
    guardarIntencionRecepcion(rechazarFixture())
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Storage no disponible') })
    const hook = renderHook(() => useRecepcionCommand('7'))
    await act(() => hook.result.current.recuperar())
    expect(hook.result.current.receipt?.estado).toBe('CONFIRMADO')
    expect(hook.result.current.pending).toBeTruthy()
    expect(hook.result.current.error).toContain('no se pudo liberar')
    remove.mockRestore()
    await act(() => hook.result.current.recuperar())
    expect(hook.result.current.pending).toBeNull()
    expect(vi.mocked(RecepcionService.comando).mock.calls.every(([, recovery]) => recovery)).toBe(true)
  })
  it('un terminal tardío nunca elimina el slot de otra intención', async () => {
    const original = guardarIntencionRecepcion(recibirFixture())
    const next = rechazarFixture()
    next.entrada.comando_id = '5ff8f9bb-4280-463d-95c8-97a3f11f122c'
    localStorage.setItem(recepcionStoreKey('7'), JSON.stringify(next))
    await limpiarIntencionRecepcion(original)
    expect(cargarIntencionRecepcion('7')).toEqual(next)
  })
  it('un evento storage actualiza solo la cuenta pertinente y no se interpreta como recibo', () => {
    const hook = renderHook(() => useRecepcionCommand('7'))
    guardarIntencionRecepcion(rechazarFixture())
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: recepcionStoreKey('8') })))
    expect(hook.result.current.pending).toBeNull()
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: recepcionStoreKey('7') })))
    expect(hook.result.current.pending).toEqual(rechazarFixture())
    localStorage.removeItem(recepcionStoreKey('7'))
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: recepcionStoreKey('7') })))
    expect(hook.result.current.pending).toEqual(rechazarFixture())
    expect(hook.result.current.receipt).toBeNull()
    expect(RecepcionService.comando).not.toHaveBeenCalled()
  })
})
