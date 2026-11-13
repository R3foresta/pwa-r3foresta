import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import ConfirmDialog from '../../components/ConfirmDialog'
import SuccessModal from '../../components/SuccessModal'
import { Button, Card } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { RecoleccionesService } from '../../services/recolecciones.service'
import { useOperationalAccess } from '../accesos/capabilitiesContext'
import { canMaintain, canReview } from '../accesos/accessPolicy'
import { getRecoleccionFormActions, resolveEstadoRegistro } from './recoleccionStatus'
import { formatRecoleccionCantidad } from './recoleccionPresentation'
import { readStockHistorialReturn, stockHistorialPath } from './stockHistorialNavigation'
import { useRecoleccionDetail } from './hooks/useRecoleccionDetail'
import {
  RecoleccionDatosRegistro,
  RecoleccionOrigen,
  RecoleccionRecepcionResumen,
  RecoleccionResumen,
} from './components/RecoleccionDetailSections'
import RecoleccionDeleteAction from './components/RecoleccionDeleteAction'
import RecoleccionDiscardAction from './components/RecoleccionDiscardAction'

function RecoleccionDetail({ id, token }: { id: string | undefined; token: string | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { m1, m2 } = useOperationalAccess()
  const { recoleccion, loading, error, reload, update } = useRecoleccionDetail(id, token)
  const stockReturn = (user?.rol ?? '').toUpperCase() === 'ADMIN' ? readStockHistorialReturn(location.state) : null
  const [submitting, setSubmitting] = useState(false)
  const [submitConfirm, setSubmitConfirm] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletionLocked, setDeletionLocked] = useState(false)
  const pending = useRef(false)
  const active = useRef(false)

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])
  const current = () => active.current && localStorage.getItem('authToken') === token
  const formActions = getRecoleccionFormActions(
    recoleccion ?? {},
    recoleccion && m1.status === 'ready' && canMaintain(m1.data, user?.id, recoleccion.usuario_id) ? user : null,
  )

  async function submit() {
    if (!recoleccion || pending.current || deletionLocked || submitError || !formActions.canSubmit) return
    pending.current = true
    setSubmitting(true)
    let confirmed = false
    try {
      await RecoleccionesService.submit(recoleccion.id)
      if (!current()) return
      confirmed = true
      setSubmitConfirm(false)
      setSubmitSuccess(true)
      const refreshed = await RecoleccionesService.getById(recoleccion.id)
      if (current()) update(refreshed.data)
    } catch (requestError) {
      if (!current()) return
      setSubmitConfirm(false)
      setSubmitError(confirmed
        ? 'Envío confirmado, pero no se pudo actualizar la ficha.'
        : requestError instanceof Error ? requestError.message : 'No se pudo confirmar el envío a recepción.')
    } finally {
      pending.current = false
      if (current()) setSubmitting(false)
    }
  }

  function reloadAfterSubmit() {
    setSubmitError(null)
    reload()
  }

  if (loading) {
    return <div role="status" className="flex min-h-screen items-center justify-center bg-brand-50 text-sm font-semibold text-brand-700">Cargando detalle...</div>
  }
  if (error || !recoleccion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50 px-5">
        <Card className="text-center">
          <h1 className="text-lg font-bold text-neutral-800">No se pudo cargar la recolección</h1>
          <p role="alert" className="mt-1 text-sm text-neutral-600">{error || 'Registro no encontrado.'}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={reload}>Reintentar</Button>
            <Button onClick={() => navigate(stockReturn ? stockHistorialPath(stockReturn) : '/app/collections')}>
              Volver al listado
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const estado = resolveEstadoRegistro(recoleccion)
  const mayReview = m2.status === 'ready'
    && canReview(m2.data, user?.id, recoleccion.usuario_id, recoleccion.vivero_id)
    && ['PENDIENTE_VALIDACION', 'VALIDADO'].includes(estado)
  const locked = submitting || deletionLocked || Boolean(submitError) || submitSuccess

  return (
    <div className="min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="flex items-start gap-3 px-5 pb-4 pt-6">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => stockReturn && recoleccion.planta_id === stockReturn.plantaId ? navigate(stockHistorialPath(stockReturn)) : navigate(-1)}
            disabled={submitting || deletionLocked}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{recoleccion.codigo_trazabilidad}</p>
            <h1 className="text-2xl font-extrabold">Detalle de Recolección</h1>
          </div>
        </header>

        <div className="space-y-4 px-5 pb-8">
          <RecoleccionResumen recoleccion={recoleccion}>
            {(formActions.canEdit || formActions.canSubmit) && (
              <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                <div className="flex flex-wrap gap-2">
                  {formActions.canEdit && (
                    <Button variant="secondary" disabled={locked} onClick={() => navigate(`/app/collections/new?editId=${recoleccion.id}`)}>
                      {estado === 'RECHAZADO' ? 'Corregir recolección' : 'Revisar y enviar'}
                    </Button>
                  )}
                  {formActions.canSubmit && <Button disabled={locked} onClick={() => setSubmitConfirm(true)}>Enviar a recepción</Button>}
                </div>
                {estado === 'RECHAZADO' && <p className="text-xs text-neutral-500">Corrige y guarda la ficha antes de volver a enviarla a recepción.</p>}
              </div>
            )}
            {submitError && (
              <div role="alert" className="mt-3 space-y-2 text-sm text-danger-700">
                <p>{submitError}</p>
                <p>Actualiza la ficha antes de realizar otra acción.</p>
                <Button variant="secondary" onClick={reloadAfterSubmit}>Actualizar detalle</Button>
              </div>
            )}
          </RecoleccionResumen>
          <RecoleccionRecepcionResumen recoleccion={recoleccion}>
            {mayReview && (
              <Button className="mt-3" variant="secondary" onClick={() => navigate(`/app/collections/validate/${recoleccion.id}`)}>
                {estado === 'PENDIENTE_VALIDACION' ? 'Revisar recepción' : 'Consultar recepción'}
              </Button>
            )}
          </RecoleccionRecepcionResumen>
          <RecoleccionOrigen recoleccion={recoleccion} />
          <RecoleccionDatosRegistro recoleccion={recoleccion} />
          <RecoleccionDeleteAction recoleccion={recoleccion} disabled={locked} onLockedChange={setDeletionLocked} onReload={reload} />
          <RecoleccionDiscardAction recoleccion={recoleccion} onUpdated={update} onReload={reload} />
        </div>
      </div>

      <ConfirmDialog
        open={submitConfirm && formActions.canSubmit}
        title="Enviar recolección a recepción"
        description="El vivero revisará el material. La ficha quedará congelada mientras espera la recepción."
        confirmLabel="Confirmar envío"
        loading={submitting}
        onConfirm={() => void submit()}
        onCancel={() => { if (!pending.current) setSubmitConfirm(false) }}
      >
        <p className="mt-3 text-sm font-semibold">
          {recoleccion.codigo_trazabilidad} · {formatRecoleccionCantidad(recoleccion.cantidad_inicial_canonica, recoleccion.unidad_canonica)} · {recoleccion.vivero?.nombre || 'Destino no disponible'}
        </p>
      </ConfirmDialog>
      {submitSuccess && (
        <SuccessModal
          title="Envío exitoso"
          summaryText={recoleccion.codigo_trazabilidad}
          description="La ficha se envió al vivero y está pendiente de recepción."
          primaryLabel="Entendido"
          loading={submitting}
          errorMessage={submitError}
          onPrimaryAction={() => {
            setSubmitSuccess(false)
            if (submitError) reloadAfterSubmit()
          }}
        />
      )}
    </div>
  )
}

export default function RecoleccionDetailScreen() {
  const { id } = useParams()
  const { user } = useAuth()
  const token = localStorage.getItem('authToken')
  return <RecoleccionDetail key={`${id}:${user?.id}:${user?.rol}:${token}`} id={id} token={token} />
}
