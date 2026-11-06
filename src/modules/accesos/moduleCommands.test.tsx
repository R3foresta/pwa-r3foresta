import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionApiError } from '../participacion/api/participacion.transport'
import { ParticipacionContratoError } from '../participacion/api/participacion.contract'
import { AccesosService } from './accesos.api'
import { accessReceipt } from './test-fixtures'
import type { IntentoAcceso, ReciboAcceso } from './types'
import {
  moduleCommandStorageKey, claimModuleCommand, clearModuleCommand, readModuleCommand,
  type AccesoDraft,
} from './moduleCommandStore'
import { useModuleCommand } from './useModuleCommand'

vi.mock('./accesos.api', async (original) => {
  const actual = await original<typeof import('./accesos.api')>()
  return { ...actual, AccesosService: { enviar: vi.fn(), recuperar: vi.fn() } }
})

const UUID = '4ff8f9bb-4280-463d-95c8-97a3f11f122c'
const NEXT_UUID = '5ff8f9bb-4280-463d-95c8-97a3f11f122c'
const draft: AccesoDraft = { usuario_id: '21', otorgar: true, vivero_id: '9007199254740993', revision_esperada: '9007199254740993', motivo: 'Asignación interna' }
const send = vi.mocked(AccesosService.enviar)
const recover = vi.mocked(AccesosService.recuperar)
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
  return rejected ? { comando_id: intento.payload.comando_id, operacion: intento.operacion, finalizado_en: '2026-11-05T20:00:00Z', estado: 'RECHAZADO', resultado: null, error: { codigo: 'REVISION_OBSOLETA', mensaje: 'Revisa nuevamente la cuenta.', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' } } : accessReceipt(intento)
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

describe('persistencia privada del comando M2', () => {
  it('fija UUID, persona, IDs y revisiones exactas antes del POST', async () => {
    send.mockImplementation(async (intento) => {
      expect(readModuleCommand('7', 'M2')).toEqual(intento)
      expect(intento.usuario_id).toBe('21')
      expect(intento.payload.revision_esperada).toBe('9007199254740993')
      expect(intento.payload.motivo).toBe('Asignación interna')
      return receipt(intento)
    })
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    await act(() => result.current.confirm(draft))
    expect(send).toHaveBeenCalledTimes(1)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(result.current.state).toBe('confirmed')
    expect(localStorage.getItem(moduleCommandStorageKey('7', 'M2'))).toBeNull()
  })

  it('conserva el contenido del momento de confirmar sin compartir el borrador mutable', async () => {
    const editable = structuredClone(draft)
    const intento = await claimModuleCommand('7', 'M2', editable)
    editable.usuario_id = '99'
    editable.motivo = 'Texto cambiado'
    expect(intento.usuario_id).toBe('21')
    expect(intento.payload.motivo).toBe('Asignación interna')
    expect(readModuleCommand('7', 'M2')).toEqual(intento)
    expect(Object.isFrozen(intento.payload)).toBe(true)
  })

  it('dos pestañas no reemplazan un pendiente ni generan una segunda clave', async () => {
    const result = await Promise.allSettled([claimModuleCommand('7', 'M2', draft), claimModuleCommand('7', 'M2', draft)])
    expect(result[0].status).toBe('fulfilled')
    expect(result[1]).toMatchObject({ status: 'rejected', reason: { name: 'ModuleCommandPendingError' } })
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(readModuleCommand('7', 'M2')?.payload.comando_id).toBe(UUID)
  })

  it('no descubre comandos de otra cuenta ni guarda JWT, correo o perfil', async () => {
    localStorage.setItem('authToken', 'jwt-secreto')
    await claimModuleCommand('7', 'M2', draft)
    expect(readModuleCommand('8', 'M2')).toBeNull()
    const saved = localStorage.getItem(moduleCommandStorageKey('7', 'M2'))!
    expect(saved).not.toContain('jwt-secreto')
    expect(Object.keys(JSON.parse(saved))).toEqual(['version', 'intento'])
  })

  it('un almacenamiento dañado bloquea el envío y conserva sus bytes', async () => {
    localStorage.setItem(moduleCommandStorageKey('7', 'M2'), '{dañado')
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    await act(() => result.current.confirm(draft))
    expect(result.current.state).toBe('unconfirmed')
    expect(send).not.toHaveBeenCalled()
    expect(localStorage.getItem(moduleCommandStorageKey('7', 'M2'))).toBe('{dañado')
  })

  it.each(['cuota', 'lectura'])('bloquea POST si falla el almacenamiento: %s', async (failure) => {
    if (failure === 'cuota') vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota', 'QuotaExceededError') })
    else vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError') })
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    await act(() => result.current.confirm(draft))
    expect(send).not.toHaveBeenCalled()
    expect(result.current.state).toBe('unconfirmed')
    expect(result.current.error).toBeTruthy()
  })

  it('sin Web Locks permite consultar pero bloquea nuevas escrituras', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    await act(() => result.current.confirm(draft))
    expect(send).not.toHaveBeenCalled()
    expect(crypto.randomUUID).not.toHaveBeenCalled()
    expect(result.current.error).toContain('pestañas')
  })

  it('un terminal tardío nunca borra otro comando más reciente', async () => {
    const previous = await claimModuleCommand('7', 'M2', draft)
    await clearModuleCommand(previous)
    vi.mocked(crypto.randomUUID).mockReturnValue(NEXT_UUID)
    const next = await claimModuleCommand('7', 'M2', draft)
    await clearModuleCommand(previous)
    expect(readModuleCommand('7', 'M2')).toEqual(next)
  })
})

describe('conciliación de un envío M2', () => {
  it('dos confirmaciones simultáneas de la misma instancia conservan un único comando', async () => {
    const response = deferred<ReciboAcceso>()
    send.mockReturnValue(response.promise)
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    let firstRequest!: Promise<void>
    await act(async () => {
      firstRequest = result.current.confirm(draft)
      await result.current.confirm(draft)
    })
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    const original = readModuleCommand('7', 'M2')!
    expect(original.payload.comando_id).toBe(UUID)
    expect(result.current.pending).toEqual(original)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    await act(async () => {
      response.resolve(receipt(original))
      await firstRequest
    })
    expect(result.current.state).toBe('confirmed')
    expect(result.current.receipt?.comando_id).toBe(UUID)
    expect(send).toHaveBeenCalledTimes(1)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
  })

  it.each([0, 202, 404, 409, 503])('una respuesta inconclusa %i conserva clave/contenido y bloquea nueva confirmación', async (status) => {
    send.mockRejectedValue(inconclusive(status))
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    await act(() => result.current.confirm(draft))
    const first = readModuleCommand('7', 'M2')
    await act(() => result.current.confirm({ ...draft, usuario_id: '22', otorgar: false, motivo: 'Otra asignación' }))
    expect(result.current.state).toBe('unconfirmed')
    expect(send).toHaveBeenCalledTimes(1)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(readModuleCommand('7', 'M2')).toEqual(first)
    await act(() => result.current.retrySame())
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1][0]).toEqual(first)
  })

  it('un recibo inválido conserva incertidumbre, sin éxito ni eliminación', async () => {
    send.mockRejectedValue(new ParticipacionContratoError())
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    await act(() => result.current.confirm(draft))
    expect(result.current.state).toBe('unconfirmed')
    expect(result.current.receipt).toBeNull()
    expect(readModuleCommand('7', 'M2')?.payload.comando_id).toBe(UUID)
  })

  it('tras recarga consulta el original sin POST y recupera el terminal perdido', async () => {
    const first = renderHook(() => useModuleCommand('7', 'M2'))
    await act(() => first.result.current.confirm(draft))
    const original = readModuleCommand('7', 'M2')!
    first.unmount()
    recover.mockResolvedValue(receipt(original))
    const next = renderHook(() => useModuleCommand('7', 'M2'))
    await waitFor(() => expect(next.result.current.state).toBe('confirmed'))
    expect(send).toHaveBeenCalledTimes(1)
    expect(recover).toHaveBeenCalledWith(original, expect.any(AbortSignal))
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
  })

  it('StrictMode recupera el pendiente original y descarta la primera consulta cancelada sin reenviar', async () => {
    const original = await claimModuleCommand('7', 'M2', draft)
    const firstResponse = deferred<ReciboAcceso>()
    const currentResponse = deferred<ReciboAcceso>()
    recover.mockReturnValueOnce(firstResponse.promise).mockReturnValueOnce(currentResponse.promise)
    const { result } = renderHook(() => useModuleCommand('7', 'M2'), { wrapper: StrictMode })
    await waitFor(() => expect(recover).toHaveBeenCalledTimes(2))
    expect(recover.mock.calls.map(([intento]) => intento)).toEqual([original, original])
    expect(recover.mock.calls[0][1]?.aborted).toBe(true)
    expect(recover.mock.calls[1][1]?.aborted).toBe(false)
    await act(async () => firstResponse.resolve(receipt(original)))
    expect(result.current.receipt).toBeNull()
    expect(readModuleCommand('7', 'M2')).toEqual(original)
    await act(async () => currentResponse.resolve(receipt(original)))
    await waitFor(() => expect(result.current.state).toBe('confirmed'))
    expect(result.current.receipt?.comando_id).toBe(UUID)
    expect(readModuleCommand('7', 'M2')).toBeNull()
    expect(send).not.toHaveBeenCalled()
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
  })

  it('el rechazo durable permite revisar una intención nueva con otra clave', async () => {
    send.mockImplementation(async (intento) => receipt(intento, true))
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    await act(() => result.current.confirm(draft))
    expect(result.current.state).toBe('rejected')
    expect(result.current.receipt?.error?.codigo).toBe('REVISION_OBSOLETA')
    await act(() => result.current.resetTerminal())
    vi.mocked(crypto.randomUUID).mockReturnValue(NEXT_UUID)
    await act(() => result.current.confirm(draft))
    expect(send.mock.calls.map(([intento]) => intento.payload.comando_id)).toEqual([UUID, NEXT_UUID])
  })

  it('una sesión vencida conserva el pendiente para la cuenta original renovada', async () => {
    const original = await claimModuleCommand('7', 'M2', draft)
    recover.mockRejectedValueOnce(inconclusive(401)).mockResolvedValueOnce(receipt(original))
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    await waitFor(() => expect(result.current.state).toBe('sessionExpired'))
    expect(readModuleCommand('7', 'M2')).toEqual(original)
    await act(() => result.current.recover())
    expect(result.current.state).toBe('confirmed')
    expect(recover.mock.calls.map(([intento]) => intento)).toEqual([original, original])
    expect(send).not.toHaveBeenCalled()
  })

  it('cambiar cuenta oculta el intento y descarta respuestas tardías sin consultar ajenos', async () => {
    const original = await claimModuleCommand('7', 'M2', draft)
    const late = deferred<ReciboAcceso>()
    recover.mockReturnValueOnce(late.promise)
    const { result, rerender } = renderHook(({ actor }) => useModuleCommand(actor, 'M2'), { initialProps: { actor: '7' } })
    await waitFor(() => expect(recover).toHaveBeenCalledTimes(1))
    rerender({ actor: '8' })
    expect(result.current.pending).toBeNull()
    expect(result.current.receipt).toBeNull()
    expect(result.current.state).toBe('idle')
    await act(async () => late.resolve(receipt(original)))
    expect(result.current.receipt).toBeNull()
    expect(readModuleCommand('7', 'M2')).toEqual(original)
    expect(recover).toHaveBeenCalledTimes(1)
    recover.mockResolvedValueOnce(receipt(original))
    rerender({ actor: '7' })
    await waitFor(() => expect(result.current.state).toBe('confirmed'))
    expect(send).not.toHaveBeenCalled()
  })

  it('dos instancias concurrentes sólo envían el primer comando y no se sobreescriben', async () => {
    const response = deferred<ReciboAcceso>()
    send.mockReturnValue(response.promise)
    const first = renderHook(() => useModuleCommand('7', 'M2'))
    const second = renderHook(() => useModuleCommand('7', 'M2'))
    let firstRequest!: Promise<void>
    let secondRequest!: Promise<void>
    await act(async () => {
      firstRequest = first.result.current.confirm(draft)
      secondRequest = second.result.current.confirm(draft)
      await Promise.resolve()
    })
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    const original = readModuleCommand('7', 'M2')!
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
    const original = await claimModuleCommand('7', 'M2', draft)
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    await waitFor(() => expect(result.current.state).toBe('unconfirmed'))
    await clearModuleCommand(original)
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: moduleCommandStorageKey('7', 'M2'), newValue: null })))
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
    const { result } = renderHook(() => useModuleCommand('7', 'M2'))
    await act(() => result.current.confirm(draft))
    expect(result.current.state).toBe('confirmed')
    expect(result.current.receipt?.estado).toBe('CONFIRMADO')
    expect(result.current.error).toContain('liberar')
    expect(readModuleCommand('7', 'M2')?.payload.comando_id).toBe(UUID)
    await act(() => result.current.resetTerminal())
    expect(result.current.state).toBe('confirmed')
    expect(result.current.pending?.payload.comando_id).toBe(UUID)
  })
})


describe('aislamiento del dominio y la identidad', () => {
  it('M1, M2 y rol conservan slots independientes y sus intenciones exactas', async () => {
    const m2 = await claimModuleCommand('7', 'M2', draft)
    vi.mocked(crypto.randomUUID).mockReturnValue(NEXT_UUID)
    const m1Draft = { usuario_id: draft.usuario_id, otorgar: draft.otorgar, revision_esperada: draft.revision_esperada, motivo: draft.motivo }
    const m1 = await claimModuleCommand('7', 'M1', m1Draft)
    expect(readModuleCommand('7', 'M1')).toEqual(m1)
    expect(readModuleCommand('7', 'M2')).toEqual(m2)
    await clearModuleCommand(m1)
    expect(readModuleCommand('7', 'M2')).toEqual(m2)
    expect(readModuleCommand('8', 'M2')).toBeNull()
  })
  it('logout descarta consultas tardías sin limpiar el original', async () => {
    const original = await claimModuleCommand('7', 'M1', { usuario_id: '21', otorgar: true, revision_esperada: '0', motivo: 'Ensayo sintético' })
    const late = deferred<ReciboAcceso>()
    recover.mockReturnValueOnce(late.promise)
    const { result, rerender } = renderHook(({ actor }: { actor: string | null }) => useModuleCommand(actor, 'M1'), { initialProps: { actor: '7' as string | null } })
    await waitFor(() => expect(recover).toHaveBeenCalledTimes(1))
    rerender({ actor: null })
    await act(async () => late.resolve(receipt(original)))
    expect(result.current.pending).toBeNull()
    expect(result.current.receipt).toBeNull()
    expect(readModuleCommand('7', 'M1')).toEqual(original)
  })
})
