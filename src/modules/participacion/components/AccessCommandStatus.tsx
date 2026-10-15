import { Button, Card } from '../../../components/ui'
import type { IntentoAcceso, ReciboAcceso } from '../types'
import { actionDefinition, permissionLabel } from './accessPresentation'

type Props = {
  state: 'idle' | 'sending' | 'unconfirmed' | 'confirmed' | 'rejected' | 'sessionExpired'
  pending: IntentoAcceso | null
  receipt: ReciboAcceso | null
  error: string | null
  busy: boolean
  onRecover: () => void
  onRetry: () => void
  onReset: () => void
  onLogin: () => void
}

export default function AccessCommandStatus({ state, pending, receipt, error, busy, onRecover, onRetry, onReset, onLogin }: Props) {
  if (state === 'idle' && !error) return null
  const terminal = state === 'confirmed' || state === 'rejected'
  return <Card as="section" className="space-y-3 border border-brand-100" aria-live="polite">
    <h2 className="font-bold text-brand-800">{state === 'confirmed' ? 'Resultado confirmado por el servidor' : state === 'rejected' ? 'Selección rechazada: no se aplicó ningún cambio' : state === 'sending' ? 'Consultando o enviando el comando…' : 'Resultado no confirmado'}</h2>
    {pending && <div className="text-sm text-neutral-600"><p>{actionDefinition(pending.operacion).label} · {pending.payload.ambitos.length} subcampaña(s)</p><p className="break-all text-xs">Comando: {pending.payload.comando_id}</p></div>}
    {!terminal && pending && <p className="text-sm text-neutral-700">No se puede afirmar éxito ni ausencia de efectos. Recupera el comando original antes de confirmar otra intención. Consultar o reenviar conserva la misma clave, selección y revisiones.</p>}
    {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
    {receipt?.estado === 'RECHAZADO' && <div className="text-sm text-danger-700"><p>{receipt.error.mensaje}</p><p className="text-xs">Código: {receipt.error.codigo}</p><p className="mt-1">Vuelve a consultar los accesos y revisa otra vez antes de confirmar una intención nueva.</p></div>}
    {receipt?.estado === 'CONFIRMADO' && <div className="space-y-2 text-sm">
      <p className="text-neutral-700">Este recibo describe lo confirmado entonces. Los permisos vigentes se consultan nuevamente.</p>
      {receipt.resultado.cambios.map((scope) => <div key={scope.subcampania_id} className="rounded-2xl bg-brand-50 p-3"><p className="font-bold text-brand-800">Subcampaña {scope.subcampania_id}</p>{scope.usuarios.map((person) => <div key={person.usuario_id} className="mt-1 text-neutral-700"><p>Cuenta {person.usuario_id}: {permissionLabel(person.permiso_anterior)} → {permissionLabel(person.permiso_nuevo)}</p><p className="text-xs font-semibold">{person.cambio === 'SIN_CAMBIOS' ? 'SIN CAMBIOS: el permiso ya coincidía' : 'Cambio aplicado'}</p>{person.conserva_acceso_global && <p className="text-xs font-bold text-warning-800">Conserva acceso global de administrador.</p>}</div>)}</div>)}
    </div>}
    {state === 'sessionExpired' && <div><p className="mb-2 text-sm text-neutral-700">Recupera la sesión de la cuenta original para consultar su comando. Otra cuenta no puede recuperarlo.</p><Button variant="secondary" disabled={busy} onClick={onLogin}>Recuperar sesión con passkey</Button></div>}
    {!terminal && pending && state !== 'sessionExpired' && <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={onRecover}>Consultar resultado original</Button><Button variant="ghost" disabled={busy} onClick={onRetry}>Reenviar el mismo comando</Button></div>}
    {!terminal && !pending && state !== 'sending' && state !== 'sessionExpired' && <Button variant="secondary" disabled={busy} onClick={onRecover}>Volver a comprobar envío conservado</Button>}
    {terminal && <Button variant="secondary" disabled={busy} onClick={onReset}>Preparar una nueva revisión</Button>}
  </Card>
}
