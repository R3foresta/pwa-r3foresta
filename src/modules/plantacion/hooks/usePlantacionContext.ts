import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import type { PlantacionContext } from '../types/contracts'

type Result = {
  key: string
  context: PlantacionContext | null
  error: string | null
}

// PLT-FE-002: carga `GET /subcampanias/:id/plantacion/context`.
// `loading` es derivado (result.key !== key), sin setState síncrono en el
// efecto; los responses obsoletos se descartan comparando `key`.
export function usePlantacionContext(subcampaniaId: number | null) {
  const { user } = useAuth()
  const authId = user?.auth_id

  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  const invalidId =
    !subcampaniaId || !Number.isFinite(subcampaniaId) || subcampaniaId <= 0
  const key = `${subcampaniaId ?? 'none'}|${authId ?? ''}|${attempt}`

  useEffect(() => {
    if (invalidId || !subcampaniaId) return

    let active = true
    PlantacionService.getPlantacionContext(subcampaniaId, authId)
      .then((context) => {
        if (active) setResult({ key, context, error: null })
      })
      .catch((fetchError: unknown) => {
        if (!active) return
        setResult({
          key,
          context: null,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : 'Error al cargar el contexto de plantación.',
        })
      })

    return () => {
      active = false
    }
  }, [key, subcampaniaId, authId, invalidId])

  const refetch = useCallback(() => {
    setAttempt((prev) => prev + 1)
  }, [])

  const current = result?.key === key ? result : null

  return {
    context: invalidId ? null : (current?.context ?? null),
    loading: !invalidId && !current,
    error: invalidId ? 'Subcampaña inválida.' : (current?.error ?? null),
    refetch,
  }
}
