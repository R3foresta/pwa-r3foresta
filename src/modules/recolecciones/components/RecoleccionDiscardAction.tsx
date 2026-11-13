import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Button, Field, Input } from '../../../components/ui'
import { RecoleccionesService, type Recoleccion } from '../../../services/recolecciones.service'
import { formatUnidadCanonicaDisplay, mapToCantidadYUnidadCanonica } from '../../../utils/recoleccionUnidad'
import { canAtVivero } from '../../accesos/accessPolicy'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import { resolveEstadoOperativo, resolveEstadoRegistro } from '../recoleccionStatus'
import { formatRecoleccionCantidad } from '../recoleccionPresentation'

type Props = { recoleccion: Recoleccion; onUpdated: (value: Recoleccion) => void; onReload: () => void }

export default function RecoleccionDiscardAction({ recoleccion, onUpdated, onReload }: Props) {
  const { m2 } = useOperationalAccess()
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [requiresReload, setRequiresReload] = useState(false)
  const pending = useRef(false)
  const active = useRef(false)
  const token = localStorage.getItem('authToken')
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const current = () => active.current && localStorage.getItem('authToken') === token
  const habilitado = recoleccion.m2_estado_habilitacion === undefined
    ? recoleccion.recepcion_conforme === true : recoleccion.m2_estado_habilitacion === 'RECEPCION_CONFORME'
  const allowed = resolveEstadoRegistro(recoleccion) === 'VALIDADO' && habilitado &&
    resolveEstadoOperativo(recoleccion) === 'ABIERTO' && recoleccion.saldo_actual != null && recoleccion.saldo_actual > 0 &&
    (recoleccion.unidad_canonica === 'G' || recoleccion.unidad_canonica === 'UNIDAD') &&
    m2.status === 'ready' && canAtVivero(m2.data, recoleccion.vivero_id, 'desechar_semillas')

  async function discard() {
    const available = recoleccion.saldo_actual
    if (!allowed || available == null || pending.current || requiresReload) return
    let cantidad: number
    try {
      cantidad = mapToCantidadYUnidadCanonica(quantity, recoleccion.unidad_canonica === 'G' ? 'g' : 'units').cantidad_inicial_canonica
      if (cantidad <= 0 || cantidad > available) throw new Error('La cantidad debe ser positiva y no superar el saldo disponible.')
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Cantidad inválida.')
      return
    }
    pending.current = true
    setBusy(true)
    setError(null)
    let confirmed = false
    try {
      const result = await RecoleccionesService.registrarDesecho(recoleccion.id, { cantidad })
      if (!current()) return
      confirmed = true
      setMessage(result.data.message)
      const refreshed = await RecoleccionesService.getById(recoleccion.id)
      if (!current()) return
      onUpdated(refreshed.data)
      setOpen(false)
    } catch (requestError) {
      if (!current()) return
      setOpen(false)
      setRequiresReload(true)
      setError(confirmed ? 'El descarte se confirmó, pero no se pudo actualizar el saldo.' : requestError instanceof Error ? requestError.message : 'No se pudo confirmar el descarte.')
    } finally {
      pending.current = false
      if (current()) setBusy(false)
    }
  }

  if (!allowed && !message && !requiresReload) return null
  return <div className="space-y-3">
    {allowed && <>
      <Button type="button" variant="secondary" fullWidth disabled={busy || requiresReload} onClick={() => { setQuantity(String(recoleccion.saldo_actual)); setError(null); setMessage(null); setOpen(true) }}>Registrar pérdida o descarte</Button>
      <p className="text-xs text-neutral-500">Se descontará del saldo disponible. No requiere foto ni motivo adicional.</p>
    </>}
    {message && <p role="status" className="text-sm text-success-700">{message}</p>}
    {requiresReload && <div role="alert" className="space-y-2 text-sm text-danger-700">
      <p>{error}</p><p>Consulta el saldo actual antes de preparar otro descarte. No se reenviará la operación anterior.</p>
      <Button variant="secondary" onClick={onReload}>Actualizar detalle</Button>
    </div>}
    <ConfirmDialog open={open && allowed} title="Registrar pérdida o descarte" description="Esta acción no se puede deshacer. El saldo se reducirá inmediatamente." confirmLabel="Confirmar descarte" variant="danger" iconName="alert" loading={busy} errorMessage={error} onConfirm={() => void discard()} onCancel={() => { if (!pending.current) setOpen(false) }}>
      <p className="mt-3 text-sm font-semibold">{recoleccion.codigo_trazabilidad}</p>
      <div className="mt-4"><Field label={`Cantidad a desechar (${formatUnidadCanonicaDisplay(recoleccion.unidad_canonica)})`} required htmlFor="discard-quantity" hint={`Saldo disponible: ${formatRecoleccionCantidad(recoleccion.saldo_actual, recoleccion.unidad_canonica)}`}>
        <Input id="discard-quantity" type="number" min="0" max={recoleccion.saldo_actual ?? undefined} step={recoleccion.unidad_canonica === 'UNIDAD' ? '1' : '0.1'} value={quantity} onChange={event => setQuantity(event.target.value)} disabled={busy} />
      </Field></div>
    </ConfirmDialog>
  </div>
}
