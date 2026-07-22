import { useEffect, useState } from 'react'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import type { Subcampania } from '../types/contracts'

type Props = {
  onVer: (subcampaniaId: number) => void
  onRegistrar: (subcampaniaId: number) => void
  onBack: () => void
}

type LoadState = 'loading' | 'error' | 'ready'

type Result = {
  key: string
  subcampanias: Subcampania[] | null
  error: string | null
}

// PLT-FE-001: contenido del bottom sheet del botón rápido «Registrar
// plantación». Lista solo subcampañas ACTIVAS donde el usuario pertenece al
// equipo (COORDINADOR u OPERARIO); ADMIN fuera del equipo no ve nada aquí.
function SubcampaniasOperativasSheet({ onVer, onRegistrar, onBack }: Props) {
  const { user } = useAuth()
  const usuarioId = Number(user?.id)
  const authId = user?.auth_id

  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  // `loading` derivado: mientras el último resultado no corresponda al key
  // actual, se está cargando. Responses obsoletos se descartan por key.
  const key = `${usuarioId}|${authId ?? ''}|${attempt}`

  useEffect(() => {
    let active = true
    PlantacionService.listSubcampaniasOperativas(usuarioId, authId)
      .then((data) => {
        if (active) setResult({ key, subcampanias: data, error: null })
      })
      .catch((fetchError: unknown) => {
        if (!active) return
        setResult({
          key,
          subcampanias: null,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : 'Error al cargar tus subcampañas operativas.',
        })
      })
    return () => {
      active = false
    }
  }, [key, usuarioId, authId])

  const current = result?.key === key ? result : null
  const state: LoadState = !current ? 'loading' : current.error ? 'error' : 'ready'
  const subcampanias = current?.subcampanias ?? []
  const error = current?.error ?? null

  const rolEn = (sub: Subcampania): string | null => {
    const member = (sub.equipo ?? []).find((item) => item.usuario_id === usuarioId)
    return member?.rol ?? null
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto px-2 pb-3 pt-2">
      {state === 'loading' && (
        <div className="space-y-2 px-2 py-1">
          {[0, 1].map((key) => (
            <div key={key} className="animate-pulse rounded-2xl bg-neutral-100 p-4">
              <div className="h-3 w-2/3 rounded bg-neutral-200" />
              <div className="mt-2 h-3 w-1/3 rounded bg-neutral-200" />
            </div>
          ))}
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-3 rounded-2xl bg-danger-50 p-4 text-center">
          <p className="text-sm font-semibold text-danger-600">{error}</p>
          <Button variant="danger" size="sm" onClick={() => setAttempt((prev) => prev + 1)}>
            Reintentar
          </Button>
        </div>
      )}

      {state === 'ready' && subcampanias.length === 0 && (
        <div className="space-y-2 rounded-2xl bg-brand-50 p-5 text-center">
          <Icon name="planting" className="mx-auto h-8 w-8 text-brand-400" />
          <p className="text-sm font-extrabold text-brand-700">
            No tienes subcampañas operativas
          </p>
          <p className="text-xs font-semibold text-brand-500">
            Para registrar una plantación debes ser coordinador u operario del
            equipo de una subcampaña activa.
          </p>
        </div>
      )}

      {state === 'ready' &&
        subcampanias.map((sub) => {
          const rol = rolEn(sub)
          return (
            <div
              key={sub.id}
              className="mb-2 rounded-2xl border border-neutral-100 bg-white p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-brand-800">
                    {sub.nombre}
                  </p>
                  <p className="truncate text-[11px] font-semibold text-brand-500">
                    {[sub.codigo_trazabilidad, sub.zona_nombre]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {rol && (
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600">
                    {rol === 'COORDINADOR' ? 'Coordinador' : 'Operario'}
                  </span>
                )}
              </div>

              {typeof sub.plantados === 'number' && (
                <p className="mt-1 text-[11px] font-semibold text-neutral-500">
                  {sub.plantados} / {sub.meta_total_arboles} árboles plantados
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => onVer(sub.id)}>
                  Ver subcampaña
                </Button>
                <Button variant="primary" size="sm" className="flex-1" onClick={() => onRegistrar(sub.id)}>
                  Registrar plantación
                </Button>
              </div>
            </div>
          )
        })}

      <Button variant="ghost" size="sm" fullWidth leftIcon="arrow-left" onClick={onBack} className="mt-1">
        Volver a acciones rápidas
      </Button>
    </div>
  )
}

export default SubcampaniasOperativasSheet
