import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import {
  PlantacionService,
  getPlantacionErrorStatus,
} from '../../../services/plantacion.service'
import type {
  BloqueoDesactivacionCampania,
  PreviewDesactivacionCampania,
  ResultadoDesactivacionCampania,
} from '../types/contracts'

type Props = {
  campaniaId: number
  campaniaNombre: string
  campaniaCodigo?: string | null
  authId?: string
  /** Cerrar sin navegar. Se ignora mientras hay una ejecución activa. */
  onClose: () => void
  /** Navegar al listado de campañas (`/app/planting`, replace). */
  onFinished: () => void
}

// Fases visualmente distinguibles del flujo. `ready` cubre tanto el preview
// elegible como el no elegible (se decide con `preview.elegible`).
type Phase =
  | 'loading'
  | 'ready'
  | 'submitting'
  | 'success'
  | 'gone'
  | 'load-error'

const MIN_MOTIVO = 3
const MAX_MOTIVO = 1000

function formatNumber(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  return safe.toLocaleString('es-BO')
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

// Agrupa los bloqueos por subcampaña conservando el orden de llegada. No deduce
// ni elimina causas: una misma subcampaña puede tener varios bloqueos.
function groupBloqueosBySubcampania(
  bloqueos: BloqueoDesactivacionCampania[],
): Array<{ subcampaniaId: number; bloqueos: BloqueoDesactivacionCampania[] }> {
  const orden: number[] = []
  const mapa = new Map<number, BloqueoDesactivacionCampania[]>()
  for (const bloqueo of bloqueos) {
    if (!mapa.has(bloqueo.subcampania_id)) {
      mapa.set(bloqueo.subcampania_id, [])
      orden.push(bloqueo.subcampania_id)
    }
    mapa.get(bloqueo.subcampania_id)!.push(bloqueo)
  }
  return orden.map((subcampaniaId) => ({
    subcampaniaId,
    bloqueos: mapa.get(subcampaniaId)!,
  }))
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[12.5px] font-semibold text-neutral-600">{label}</span>
      <span className="text-[13px] font-extrabold tabular-nums text-brand-900">
        {formatNumber(value)}
      </span>
    </div>
  )
}

function DesactivarCampaniaModal({
  campaniaId,
  campaniaNombre,
  campaniaCodigo,
  authId,
  onClose,
  onFinished,
}: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [preview, setPreview] = useState<PreviewDesactivacionCampania | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [goneMessage, setGoneMessage] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoDesactivacionCampania | null>(null)
  const [motivo, setMotivo] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [motivoFieldError, setMotivoFieldError] = useState<string | null>(null)
  const [authBlocked, setAuthBlocked] = useState(false)

  // Protección de request obsoleto (ver CLAUDE.md · "Stale request protection"):
  // cada fetch captura un id; una respuesta se descarta si su id ya no coincide.
  const requestIdRef = useRef(0)

  // Consulta el preview autoritativo. El `setState` ocurre solo tras el `await`
  // y detrás del guard de request obsoleto, por lo que puede llamarse de forma
  // segura desde el efecto de montaje sin disparar renders en cascada. No toca
  // `submitError`: el banner de un fallo previo (409/422/500) sigue visible
  // mientras se re-consulta.
  const fetchPreview = useCallback(async () => {
    if (!Number.isFinite(campaniaId) || campaniaId <= 0) return
    const requestId = ++requestIdRef.current
    try {
      const data = await PlantacionService.previewDesactivacionCampania(campaniaId, authId)
      if (requestId !== requestIdRef.current) return
      setPreview(data)
      setPhase('ready')
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      const status = getPlantacionErrorStatus(error)
      if (status === 404) {
        setGoneMessage(getErrorMessage(error, 'La campaña ya no está disponible.'))
        setPhase('gone')
        return
      }
      setLoadError(getErrorMessage(error, 'No se pudo consultar la desactivación.'))
      setPhase('load-error')
    }
  }, [campaniaId, authId])

  // Re-consulta desde handlers de eventos (reintento, "actualizar preview" y
  // refetch tras 409/422/500). El reset a `loading` es síncrono aquí porque
  // ocurre en respuesta a una interacción, no dentro de un efecto.
  const reloadPreview = useCallback(() => {
    setPhase('loading')
    setLoadError(null)
    setMotivoFieldError(null)
    void fetchPreview()
  }, [fetchPreview])

  // Un único GET de preview al abrir (montaje). El componente se monta/desmonta
  // desde el padre, por lo que el estado arranca limpio en cada apertura.
  // El `setState` de `fetchPreview` ocurre solo tras el `await` (fetch de red) y
  // detrás del guard de request obsoleto: no hay render síncrono en cascada, que
  // es justamente lo que la regla previene.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; setState solo tras await
    void fetchPreview()
  }, [fetchPreview])

  const canDismiss = phase === 'loading' || phase === 'ready' || phase === 'load-error'

  const handleClose = useCallback(() => {
    if (!canDismiss) return
    onClose()
  }, [canDismiss, onClose])

  // Escape solo cuando no hay ejecución activa ni estado terminal (success/gone).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canDismiss) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [canDismiss, onClose])

  const motivoTrim = motivo.trim()
  const motivoLen = motivoTrim.length
  const motivoValido = motivoLen >= MIN_MOTIVO && motivoLen <= MAX_MOTIVO
  const elegible = preview?.elegible === true
  const canConfirm =
    phase === 'ready' && elegible && motivoValido && !authBlocked

  const handleMotivoChange = (value: string) => {
    setMotivo(value)
    if (motivoFieldError) setMotivoFieldError(null)
  }

  const handleConfirm = async () => {
    if (phase !== 'ready' || !elegible || !motivoValido || authBlocked) return
    setPhase('submitting')
    setSubmitError(null)
    setMotivoFieldError(null)
    try {
      const data = await PlantacionService.desactivarCampaniaMasiva(
        campaniaId,
        motivoTrim,
        authId,
      )
      setResultado(data)
      setPhase('success')
    } catch (error) {
      const status = getPlantacionErrorStatus(error)
      const message = getErrorMessage(error, 'No se pudo desactivar la campaña.')
      if (status === 400) {
        // Motivo rechazado por backend: error junto al campo, sin reintento auto.
        setMotivoFieldError(message)
        setPhase('ready')
        return
      }
      if (status === 401 || status === 403) {
        // Sin permiso/autenticación: informar y deshabilitar la confirmación.
        setSubmitError(message)
        setAuthBlocked(true)
        setPhase('ready')
        return
      }
      if (status === 404) {
        setGoneMessage(message)
        setPhase('gone')
        return
      }
      // 409/422/500 y fallos operativos: invalidar el preview anterior y
      // re-consultar antes de volver a habilitar la confirmación. Exige una
      // nueva confirmación manual y no asume cambios parciales.
      setSubmitError(message)
      reloadPreview()
    }
  }

  const grupos = useMemo(
    () => (preview ? groupBloqueosBySubcampania(preview.bloqueos) : []),
    [preview],
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="desactivar-campania-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose()
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-danger-500">
              Desactivar campaña
            </p>
            <h2
              id="desactivar-campania-title"
              className="mt-1 truncate text-lg font-extrabold text-brand-800"
            >
              {campaniaNombre}
            </h2>
            {campaniaCodigo && (
              <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                {campaniaCodigo}
              </p>
            )}
          </div>
          {canDismiss && (
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
          {phase === 'loading' && <LoadingState />}

          {phase === 'load-error' && (
            <LoadErrorState message={loadError} onRetry={reloadPreview} />
          )}

          {phase === 'gone' && <GoneState message={goneMessage} />}

          {phase === 'success' && resultado && <SuccessState resultado={resultado} />}

          {(phase === 'ready' || phase === 'submitting') && preview && (
            <>
              {submitError && (
                <p className="mb-3 whitespace-pre-line rounded-2xl bg-danger-50 px-3 py-2 text-xs font-extrabold text-danger-700 ring-1 ring-danger-100">
                  {submitError}
                </p>
              )}

              {authBlocked && (
                <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-neutral-50 p-3 ring-1 ring-neutral-200">
                  <Icon name="shield" className="h-5 w-5 shrink-0 text-neutral-500" />
                  <p className="text-[12px] font-bold leading-snug text-neutral-700">
                    No tienes permiso para completar esta acción. Cierra el diálogo;
                    la desactivación queda deshabilitada.
                  </p>
                </div>
              )}

              {elegible ? (
                <ElegibleState
                  preview={preview}
                  motivo={motivo}
                  motivoLen={motivoLen}
                  motivoFieldError={motivoFieldError}
                  submitting={phase === 'submitting'}
                  onMotivoChange={handleMotivoChange}
                />
              ) : (
                <NoElegibleState preview={preview} grupos={grupos} />
              )}
            </>
          )}
        </div>

        <ModalFooter
          phase={phase}
          elegible={elegible}
          canConfirm={canConfirm}
          onClose={handleClose}
          onConfirm={() => void handleConfirm()}
          onRetryPreview={reloadPreview}
          onFinished={onFinished}
        />
      </div>
    </div>
  )
}

// ================= Sub-vistas por estado =================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <svg
        className="h-8 w-8 animate-spin text-brand-500"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
      </svg>
      <p className="text-sm font-bold text-neutral-600">
        Consultando elegibilidad y efectos…
      </p>
    </div>
  )
}

function LoadErrorState({
  message,
  onRetry,
}: {
  message: string | null
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
        <Icon name="alert" className="h-6 w-6" />
      </span>
      <p className="text-sm font-bold text-danger-700">
        {message ?? 'No se pudo consultar la desactivación.'}
      </p>
      <Button variant="secondary" leftIcon="refresh" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

function GoneState({ message }: { message: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
        <Icon name="info" className="h-6 w-6" />
      </span>
      <p className="text-sm font-bold text-brand-800">
        {message ?? 'La campaña ya no está disponible.'}
      </p>
      <p className="text-[12px] font-semibold text-neutral-500">
        Vuelve al listado para ver el estado actualizado.
      </p>
    </div>
  )
}

function ElegibleState({
  preview,
  motivo,
  motivoLen,
  motivoFieldError,
  submitting,
  onMotivoChange,
}: {
  preview: PreviewDesactivacionCampania
  motivo: string
  motivoLen: number
  motivoFieldError: string | null
  submitting: boolean
  onMotivoChange: (value: string) => void
}) {
  const devuelveStock = preview.asignaciones_con_saldo > 0
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-brand-50 p-3 ring-1 ring-brand-100">
        <p className="text-[12.5px] font-bold leading-snug text-brand-900">
          Esta campaña tiene{' '}
          <strong>{formatNumber(preview.subcampanias_vivas)}</strong> subcampañas vivas.{' '}
          <strong>{formatNumber(preview.subcampanias_a_cancelar)}</strong> serán canceladas.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-neutral-200">
        <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
          Efectos del preview
        </p>
        <div className="divide-y divide-neutral-100">
          <StatRow label="Subcampañas vivas" value={preview.subcampanias_vivas} />
          <StatRow label="Serán canceladas" value={preview.subcampanias_a_cancelar} />
          <StatRow label="Borradores" value={preview.borradores} />
          <StatRow label="Activas sin plantar" value={preview.activas_sin_plantar} />
          <StatRow label="Ya canceladas" value={preview.ya_canceladas} />
          <StatRow label="Asignaciones con saldo" value={preview.asignaciones_con_saldo} />
          <StatRow label="Unidades a devolver al vivero" value={preview.unidades_a_devolver} />
        </div>
      </div>

      {devuelveStock && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-success-50 p-3 ring-1 ring-success-100">
          <Icon name="package" className="h-5 w-5 shrink-0 text-success-600" />
          <p className="text-[12px] font-bold leading-snug text-success-900">
            El backend devolverá <strong>{formatNumber(preview.unidades_a_devolver)}</strong>{' '}
            unidades de stock disponible al vivero automáticamente, dentro de la misma
            transacción.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="desactivar-motivo"
          className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500"
        >
          Motivo <span className="text-danger-500">*</span>
        </label>
        <textarea
          id="desactivar-motivo"
          value={motivo}
          onChange={(event) => onMotivoChange(event.target.value)}
          placeholder="Ej. Reorganización del programa de plantación."
          maxLength={MAX_MOTIVO}
          rows={4}
          disabled={submitting}
          className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none placeholder:font-medium placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-neutral-50"
        />
        <p className="mt-1 flex items-center justify-between text-[10.5px] font-bold text-neutral-400">
          <span>Mínimo {MIN_MOTIVO} caracteres.</span>
          <span className="tabular-nums">
            {motivoLen}/{MAX_MOTIVO}
          </span>
        </p>
        {motivoFieldError && (
          <p className="mt-1 rounded-xl bg-danger-50 px-2.5 py-1.5 text-[12px] font-extrabold text-danger-700 ring-1 ring-danger-100">
            {motivoFieldError}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-warning-50 p-3 ring-1 ring-warning-100">
        <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-warning-800">
          <Icon name="info" className="h-3.5 w-3.5" />
          Antes de confirmar
        </p>
        <ul className="mt-1.5 space-y-1 text-[12px] font-bold leading-snug text-warning-900">
          <li>· La campaña y las subcampañas se conservan como historial.</li>
          <li>· Es una desactivación lógica, no un borrado físico.</li>
          <li>· El stock disponible indicado volverá al vivero.</li>
          <li>· No se asume éxito hasta recibir respuesta del servidor.</li>
        </ul>
      </div>
    </div>
  )
}

function NoElegibleState({
  preview,
  grupos,
}: {
  preview: PreviewDesactivacionCampania
  grupos: Array<{ subcampaniaId: number; bloqueos: BloqueoDesactivacionCampania[] }>
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 rounded-2xl bg-danger-50 p-3 ring-1 ring-danger-100">
        <Icon name="alert" className="h-5 w-5 shrink-0 text-danger-600" />
        <p className="text-[12px] font-bold leading-snug text-danger-900">
          Esta campaña <strong>no es elegible</strong> para desactivación masiva. Revisa los
          bloqueos por subcampaña. No se puede confirmar hasta resolverlos.
        </p>
      </div>

      {grupos.length === 0 ? (
        <p className="rounded-2xl bg-neutral-50 px-3 py-3 text-center text-[12.5px] font-semibold text-neutral-500 ring-1 ring-neutral-200">
          El backend marcó la campaña como no elegible sin detallar bloqueos.
        </p>
      ) : (
        <div className="space-y-2.5">
          {grupos.map((grupo) => {
            const primero = grupo.bloqueos[0]
            return (
              <div
                key={grupo.subcampaniaId}
                className="rounded-2xl bg-white p-3 ring-1 ring-neutral-200"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-extrabold text-brand-900">
                    Subcampaña #{grupo.subcampaniaId}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-neutral-600">
                    {primero.estado}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-neutral-600">
                    plantado: {formatNumber(primero.total_plantado_inicial)}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {grupo.bloqueos.map((bloqueo, index) => (
                    <li
                      key={`${bloqueo.codigo}-${index}`}
                      className="flex items-start gap-2 text-[12px] font-semibold leading-snug text-neutral-700"
                    >
                      <Icon
                        name="alert"
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-500"
                      />
                      <span className="min-w-0 flex-1">
                        {bloqueo.mensaje}
                        <span className="ml-1 rounded bg-neutral-100 px-1 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-neutral-500">
                          {bloqueo.codigo}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[11.5px] font-semibold text-neutral-400">
        Datos de diagnóstico del backend. No se ofrecen acciones para cambiar estados ni
        borrar datos desde este flujo. Subcampañas vivas: {formatNumber(preview.subcampanias_vivas)}.
      </p>
    </div>
  )
}

function SuccessState({ resultado }: { resultado: ResultadoDesactivacionCampania }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-600">
          <Icon name="check-circle" className="h-8 w-8" />
        </span>
        <p className="text-base font-extrabold text-brand-800">Campaña desactivada</p>
        <p className="text-[12.5px] font-semibold text-neutral-600">{resultado.message}</p>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-neutral-200">
        <div className="divide-y divide-neutral-100">
          <StatRow
            label="Subcampañas canceladas"
            value={resultado.subcampanias_canceladas}
          />
          <StatRow
            label="Asignaciones devueltas"
            value={resultado.asignaciones_devueltas}
          />
          <StatRow label="Unidades devueltas al vivero" value={resultado.unidades_devueltas} />
        </div>
      </div>
    </div>
  )
}

// ================= Footer (acciones por estado) =================

function ModalFooter({
  phase,
  elegible,
  canConfirm,
  onClose,
  onConfirm,
  onRetryPreview,
  onFinished,
}: {
  phase: Phase
  elegible: boolean
  canConfirm: boolean
  onClose: () => void
  onConfirm: () => void
  onRetryPreview: () => void
  onFinished: () => void
}) {
  if (phase === 'success' || phase === 'gone') {
    return (
      <footer className="border-t border-neutral-100 px-5 pb-5 pt-4">
        <Button variant="primary" fullWidth leftIcon="arrow-left" onClick={onFinished}>
          Volver a campañas
        </Button>
      </footer>
    )
  }

  if (phase === 'load-error') {
    return (
      <footer className="border-t border-neutral-100 px-5 pb-5 pt-4">
        <Button variant="secondary" fullWidth onClick={onClose}>
          Cerrar
        </Button>
      </footer>
    )
  }

  if (phase === 'loading') {
    return (
      <footer className="border-t border-neutral-100 px-5 pb-5 pt-4">
        <Button variant="secondary" fullWidth disabled onClick={onClose}>
          Cargando…
        </Button>
      </footer>
    )
  }

  // ready | submitting
  const submitting = phase === 'submitting'

  if (!elegible) {
    return (
      <footer className="grid grid-cols-2 gap-2 border-t border-neutral-100 px-5 pb-5 pt-4">
        <Button variant="secondary" fullWidth onClick={onClose}>
          Cerrar
        </Button>
        <Button variant="secondary" fullWidth leftIcon="refresh" onClick={onRetryPreview}>
          Actualizar preview
        </Button>
      </footer>
    )
  }

  return (
    <footer className="grid grid-cols-2 gap-2 border-t border-neutral-100 px-5 pb-5 pt-4">
      <Button variant="secondary" fullWidth onClick={onClose} disabled={submitting}>
        Cancelar
      </Button>
      <Button
        variant="danger"
        fullWidth
        loading={submitting}
        disabled={!canConfirm}
        onClick={onConfirm}
      >
        {submitting ? 'Desactivando…' : 'Desactivar campaña'}
      </Button>
    </footer>
  )
}

export default DesactivarCampaniaModal
