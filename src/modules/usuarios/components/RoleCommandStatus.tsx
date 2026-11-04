import Icon from '../../../components/Icon'
import { Badge, Button, Card } from '../../../components/ui'
import type { useRoleCommand } from '../commands/useRoleCommand'
import { ROLE_LABELS } from './rolesPresentation'

type Props = {
  command: ReturnType<typeof useRoleCommand>
  onReset: () => void
  onLogin: () => void
}

export default function RoleCommandStatus({ command, onReset, onLogin }: Props) {
  const { state, pending, receipt, error, busy } = command
  if (state === 'idle' && !error) return null
  const terminal = receipt !== null
  const confirmed = receipt?.estado === 'CONFIRMADO'
  const rejected = receipt?.estado === 'RECHAZADO'
  return <Card as="section" className="space-y-4" aria-live="polite">
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${confirmed ? 'bg-success-50 text-success-700' : rejected ? 'bg-danger-50 text-danger-700' : 'bg-warning-50 text-warning-700'}`}>
        <Icon name={confirmed ? 'check-circle' : rejected ? 'x' : 'info'} className="h-5 w-5" />
      </span>
      <h2 className="font-bold text-brand-800">{state === 'confirmed' ? 'Cambio de rol confirmado' : state === 'rejected' ? 'Cambio de rol rechazado' : state === 'sending' ? 'Consultando o enviando el cambio…' : 'Cambio de rol sin confirmar'}</h2>
    </div>
    {pending && !confirmed && <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700"><span>Cuenta {pending.usuario_id}</span><span className="text-neutral-500">· Rol solicitado:</span><Badge variant="brand">{ROLE_LABELS[pending.payload.rol_global]}</Badge></div>}
    {!terminal && <p className="text-sm text-neutral-600">Conservamos el cambio original. Consulta su resultado antes de preparar otro cambio.</p>}
    {error && <p role="alert" className="rounded-2xl bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
    {receipt?.estado === 'RECHAZADO' && <div role="alert" className="space-y-2 rounded-2xl bg-danger-50 px-3 py-3 text-sm text-danger-700"><p className="font-semibold">{receipt.error.mensaje}</p><p>No se aplicó este cambio. Revisa el usuario y confirma nuevamente.</p></div>}
    {receipt?.estado === 'CONFIRMADO' && <div className="space-y-3 text-sm text-neutral-700">
      <div className="space-y-2 rounded-2xl bg-neutral-50 p-3">
        <p className="text-xs text-neutral-600">Cuenta {receipt.resultado.usuario_id}</p>
        <p className="font-semibold">{ROLE_LABELS[receipt.resultado.rol_anterior]} <span className="mx-1 text-neutral-400">→</span> {ROLE_LABELS[receipt.resultado.rol_nuevo]}</p>
      </div>
      <p>{receipt.resultado.cambio === 'SIN_CAMBIOS' ? 'El usuario ya tenía ese rol; se confirmó sin cambios.' : 'El servidor confirmó el cambio.'}</p>
    </div>}
    {state === 'sessionExpired' && <Button fullWidth disabled={busy} onClick={onLogin}>Recuperar sesión con passkey</Button>}
    {!terminal && state !== 'sessionExpired' && <div className="flex flex-col gap-2"><Button fullWidth disabled={busy} onClick={() => void command.recover()}>Consultar resultado original</Button>{pending && <Button variant="ghost" className="min-h-11" disabled={busy} onClick={() => void command.retrySame()}>Reenviar el mismo cambio</Button>}</div>}
    {terminal && <Button fullWidth disabled={busy} onClick={onReset}>Preparar otro cambio</Button>}
  </Card>
}
