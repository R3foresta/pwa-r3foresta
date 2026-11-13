import { useEffect, useState } from 'react'
import { RecoleccionesService, type Recoleccion } from '../../../services/recolecciones.service'

type Read = { key: string } & ({ data: Recoleccion; error?: never } | { data?: never; error: string })

export function useRecoleccionDetail(id: string | undefined, token: string | null) {
  const [read, setRead] = useState<Read | null>(null)
  const [attempt, setAttempt] = useState(0)
  const parsedId = Number(id)
  const validId = Boolean(id && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(parsedId))
  const key = JSON.stringify([id, token, attempt])

  useEffect(() => {
    if (!validId) return
    const controller = new AbortController()
    const current = () => !controller.signal.aborted && localStorage.getItem('authToken') === token
    // El detalle canónico ya incluye evidencias; no consultar otra vez la misma información.
    RecoleccionesService.getById(parsedId, controller.signal).then(
      response => { if (current()) setRead({ key, data: response.data }) },
      error => { if (current()) setRead({ key, error: error instanceof Error ? error.message : 'No se pudo cargar el detalle.' }) },
    )
    return () => controller.abort()
  }, [key, parsedId, validId, token])

  const visible = read?.key === key ? read : null
  return {
    recoleccion: visible?.data ?? null,
    loading: validId && visible === null,
    error: validId ? visible?.error ?? null : 'ID de recolección inválido.',
    reload: () => setAttempt(value => value + 1),
    update: (data: Recoleccion) => setRead({ key, data }),
  }
}
