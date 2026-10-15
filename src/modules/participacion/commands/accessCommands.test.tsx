import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionApiError, ParticipacionContratoError, ParticipacionService } from '../api/participacion.api'
import type { IntentoAcceso, ReciboAcceso } from '../types'
import {
  accessCommandStorageKey, claimAccessCommand, clearAccessCommand, readAccessCommand,
  type AccessCommandDraft,
} from './accessCommandStore'
import { useAccessCommand } from './useAccessCommand'

vi.mock('../api/participacion.api', async (original) => {
  const actual = await original<typeof import('../api/participacion.api')>()
  return { ...actual, ParticipacionService: { enviar: vi.fn(), recuperar: vi.fn() } }
})

const UUID = '4ff8f9bb-4280-463d-95c8-97a3f11f122c'
const NEXT_UUID = '5ff8f9bb-4280-463d-95c8-97a3f11f122c'
const draft: AccessCommandDraft = { operacion: 'OTORGAR_PLANTADOR', payload: { usuario_destino_id: '21', ambitos: [{ subcampania_id: '11', revision_esperada: '9007199254740993' }] } }
const send = vi.mocked(ParticipacionService.enviar)
const recover = vi.mocked(ParticipacionService.recuperar)
const lockDescriptor = Object.getOwnPropertyDescriptor(navigator, 'locks')

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function inconclusive(status = 0): ParticipacionApiError {
  return new ParticipacionApiError(status, { codigo: 'COMANDO_NO_CONFIRMADO', mensaje: 'Resultado no confirmado.', campos: [], ambitos: [], reintento: status === 401 ? 'RECUPERAR_SESION' : 'MISMA_CLAVE' })
}

function receipt(intento: IntentoAcceso, rejected = false): ReciboAcceso {
  const base = { comando_id: intento.payload.comando_id, operacion: intento.operacion, finalizado_en: '2026-10-15T12:00:00Z' }
  return rejected
    ? { ...base, estado: 'RECHAZADO', resultado: null, error: { codigo: 'REVISION_OBSOLETA', mensaje: 'Revisa nuevamente todos los ámbitos.', campos: [], ambitos: ['11'], reintento: 'NUEVA_CONFIRMACION' } }
    : { ...base, estado: 'CONFIRMADO', error: null, resultado: { tipo: 'ACCESO', cambios: [{ subcampania_id: '11', usuarios: [{ usuario_id: '21', permiso_anterior: null, permiso_nuevo: 'PLANTADOR', revision_anterior: '9007199254740993', revision_nueva: '9007199254740994', cambio: 'CAMBIO_APLICADO', conserva_acceso_global: false }] }] } }
}

beforeEach(() => {
  localStorage.clear()
  send.mockReset().mockRejectedValue(inconclusive())
  recover.mockReset().mockRejectedValue(inconclusive(404))
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(UUID)
  // Cola exclusiva como Web Locks: los competidores comprueban storage sólo
  // cuando su turno empieza, también si una pestaña anterior falló.
  let tail: Promise<unknown> = Promise.resolve()
  Object.defineProperty(navigator, 'locks', { configurable: true, value: {
    request: vi.fn((_name: string, _options: unknown, callback: () => unknown) => {
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

describe('persistencia privada del comando de acceso', () => {
  it('fija UUID, persona, IDs y revisiones exactas antes del POST', async () => {
    send.mockImplementation(async (intento) => {
      expect(readAccessCommand('7')).toEqual(intento)
      expect(intento.payload.ambitos[0]).toEqual({ subcampania_id: '11', revision_esperada: '9007199254740993' })
      return receipt(intento)
    })
    const { result } = renderHook(() => useAccessCommand('7'))
    await act(() => result.current.confirm(draft))
    expect(send).toHaveBeenCalledTimes(1)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(result.current.state).toBe('confirmed')
    expect(localStorage.getItem(accessCommandStorageKey('7'))).toBeNull()
  })

  it('conserva el contenido del momento de confirmar sin compartir el borrador mutable', async () => {
    const editable = structuredClone(draft)
    const intento = await claimAccessCommand('7', editable)
    editable.payload.ambitos[0].subcampania_id = '99'
    expect(intento.payload.ambitos[0].subcampania_id).toBe('11')
    expect(readAccessCommand('7')).toEqual(intento)
    expect(Object.isFrozen(intento.payload.ambitos[0])).toBe(true)
  })

  it('dos pestañas no reemplazan un pendiente ni generan una segunda clave', async () => {
    const result = await Promise.allSettled([claimAccessCommand('7', draft), claimAccessCommand('7', draft)])
    expect(result[0].status).toBe('fulfilled')
    expect(result[1]).toMatchObject({ status: 'rejected', reason: { name: 'AccessCommandPendingError' } })
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(readAccessCommand('7')?.payload.comando_id).toBe(UUID)
  })

  it('no descubre comandos de otra cuenta ni guarda JWT, correo o perfil', async () => {
    localStorage.setItem('authToken', 'jwt-secreto')
    await claimAccessCommand('7', draft)
    expect(readAccessCommand('8')).toBeNull()
    const saved = localStorage.getItem(accessCommandStorageKey('7'))!
    expect(saved).not.toContain('jwt-secreto')
    expect(Object.keys(JSON.parse(saved))).toEqual(['version', 'intento'])
  })

  it('un almacenamiento dañado bloquea el envío y conserva sus bytes', async () => {
    localStorage.setItem(accessCommandStorageKey('7'), '{dañado')
    const { result } = renderHook(() => useAccessCommand('7'))
    await act(() => result.current.confirm(draft))
    expect(result.current.state).toBe('unconfirmed')
    expect(send).not.toHaveBeenCalled()
    expect(localStorage.getItem(accessCommandStorageKey('7'))).toBe('{dañado')
  })

  it.each(['cuota', 'lectura'])('bloquea POST si falla el almacenamiento: %s', async (failure) => {
    if (failure === 'cuota') vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota', 'QuotaExceededError') })
    else vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError') })
    const { result } = renderHook(() => useAccessCommand('7'))
    await act(() => result.current.confirm(draft))
    expect(send).not.toHaveBeenCalled()
    expect(result.current.state).toBe('unconfirmed')
    expect(result.current.error).toBeTruthy()
  })

  it('sin Web Locks permite consultar pero bloquea nuevas escrituras', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
    const { result } = renderHook(() => useAccessCommand('7'))
    await act(() => result.current.confirm(draft))
    expect(send).not.toHaveBeenCalled()
    expect(crypto.randomUUID).not.toHaveBeenCalled()
    expect(result.current.error).toContain('pestañas')
  })

  it('un terminal tardío nunca borra otro comando más reciente', async () => {
    const previous = await claimAccessCommand('7', draft)
    await clearAccessCommand(previous)
    vi.mocked(crypto.randomUUID).mockReturnValue(NEXT_UUID)
    const next = await claimAccessCommand('7', draft)
    await clearAccessCommand(previous)
    expect(readAccessCommand('7')).toEqual(next)
  })
})

describe('conciliación de un envío de acceso', () => {
  it.each([0, 202, 404, 409, 500])('una respuesta inconclusa %i conserva clave/contenido y bloquea nueva confirmación', async (status) => {
    send.mockRejectedValue(inconclusive(status))
    const { result } = renderHook(() => useAccessCommand('7'))
    await act(() => result.current.confirm(draft))
    const first = readAccessCommand('7')
    await act(() => result.current.confirm({ ...draft, payload: { ...draft.payload, usuario_destino_id: '22' } }))
    expect(result.current.state).toBe('unconfirmed')
    expect(send).toHaveBeenCalledTimes(1)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(readAccessCommand('7')).toEqual(first)
    await act(() => result.current.retrySame())
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1][0]).toEqual(first)
  })

  it('un recibo inválido conserva incertidumbre, sin éxito ni eliminación', async () => {
    send.mockRejectedValue(new ParticipacionContratoError())
    const { result } = renderHook(() => useAccessCommand('7'))
    await act(() => result.current.confirm(draft))
    expect(result.current.state).toBe('unconfirmed')
    expect(result.current.receipt).toBeNull()
    expect(readAccessCommand('7')?.payload.comando_id).toBe(UUID)
  })

  it('tras recarga consulta el original sin POST y recupera el terminal perdido', async () => {
    const first = renderHook(() => useAccessCommand('7'))
    await act(() => first.result.current.confirm(draft))
    const original = readAccessCommand('7')!
    first.unmount()
    recover.mockResolvedValue(receipt(original))
    const next = renderHook(() => useAccessCommand('7'))
    await waitFor(() => expect(next.result.current.state).toBe('confirmed'))
    expect(send).toHaveBeenCalledTimes(1)
    expect(recover).toHaveBeenCalledWith(original, expect.any(AbortSignal))
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
  })

  it('el rechazo durable permite revisar una intención nueva con otra clave', async () => {
    send.mockImplementation(async (intento) => receipt(intento, true))
    const { result } = renderHook(() => useAccessCommand('7'))
    await act(() => result.current.confirm(draft))
    expect(result.current.state).toBe('rejected')
    expect(result.current.receipt?.error?.codigo).toBe('REVISION_OBSOLETA')
    await act(() => result.current.resetTerminal())
    vi.mocked(crypto.randomUUID).mockReturnValue(NEXT_UUID)
    await act(() => result.current.confirm(draft))
    expect(send.mock.calls.map(([intento]) => intento.payload.comando_id)).toEqual([UUID, NEXT_UUID])
  })

  it('una sesión vencida conserva el pendiente para la cuenta original renovada', async () => {
    const original = await claimAccessCommand('7', draft)
    recover.mockRejectedValueOnce(inconclusive(401)).mockResolvedValueOnce(receipt(original))
    const { result } = renderHook(() => useAccessCommand('7'))
    await waitFor(() => expect(result.current.state).toBe('sessionExpired'))
    expect(readAccessCommand('7')).toEqual(original)
    await act(() => result.current.recover())
    expect(result.current.state).toBe('confirmed')
    expect(recover.mock.calls.map(([intento]) => intento)).toEqual([original, original])
    expect(send).not.toHaveBeenCalled()
  })

  it('cambiar cuenta oculta el intento y descarta respuestas tardías sin consultar ajenos', async () => {
    const original = await claimAccessCommand('7', draft)
    const late = deferred<ReciboAcceso>()
    recover.mockReturnValueOnce(late.promise)
    const { result, rerender } = renderHook(({ actor }) => useAccessCommand(actor), { initialProps: { actor: '7' } })
    await waitFor(() => expect(recover).toHaveBeenCalledTimes(1))
    rerender({ actor: '8' })
    expect(result.current.pending).toBeNull()
    expect(result.current.receipt).toBeNull()
    expect(result.current.state).toBe('idle')
    await act(async () => late.resolve(receipt(original)))
    expect(result.current.receipt).toBeNull()
    expect(readAccessCommand('7')).toEqual(original)
    expect(recover).toHaveBeenCalledTimes(1)
    recover.mockResolvedValueOnce(receipt(original))
    rerender({ actor: '7' })
    await waitFor(() => expect(result.current.state).toBe('confirmed'))
    expect(send).not.toHaveBeenCalled()
  })

  it('dos instancias concurrentes sólo envían el primer comando y no se sobreescriben', async () => {
    const response = deferred<ReciboAcceso>()
    send.mockReturnValue(response.promise)
    const first = renderHook(() => useAccessCommand('7'))
    const second = renderHook(() => useAccessCommand('7'))
    let firstRequest!: Promise<void>
    let secondRequest!: Promise<void>
    await act(async () => {
      firstRequest = first.result.current.confirm(draft)
      secondRequest = second.result.current.confirm(draft)
      await Promise.resolve()
    })
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    const original = readAccessCommand('7')!
    await act(async () => {
      response.resolve(receipt(original))
      await Promise.all([firstRequest, secondRequest])
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(first.result.current.state).toBe('confirmed')
    expect(second.result.current.pending).toEqual(original)
  })

  it('si otra pestaña libera el slot mantiene el envío propio hasta obtener su recibo', async () => {
    const original = await claimAccessCommand('7', draft)
    const { result } = renderHook(() => useAccessCommand('7'))
    await waitFor(() => expect(result.current.state).toBe('unconfirmed'))
    await clearAccessCommand(original)
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: accessCommandStorageKey('7'), newValue: null })))
    expect(result.current.pending).toEqual(original)
    await act(() => result.current.confirm(draft))
    expect(send).not.toHaveBeenCalled()
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    recover.mockResolvedValueOnce(receipt(original))
    await act(() => result.current.recover())
    expect(result.current.state).toBe('confirmed')
  })

  it('si falla la limpieza local muestra el terminal y conserva la clave para conciliar', async () => {
    send.mockImplementation(async (intento) => receipt(intento))
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('almacenamiento bloqueado') })
    const { result } = renderHook(() => useAccessCommand('7'))
    await act(() => result.current.confirm(draft))
    expect(result.current.state).toBe('confirmed')
    expect(result.current.receipt?.estado).toBe('CONFIRMADO')
    expect(result.current.error).toContain('liberar')
    expect(readAccessCommand('7')?.payload.comando_id).toBe(UUID)
    await act(() => result.current.resetTerminal())
    expect(result.current.state).toBe('confirmed')
    expect(result.current.pending?.payload.comando_id).toBe(UUID)
  })
})
