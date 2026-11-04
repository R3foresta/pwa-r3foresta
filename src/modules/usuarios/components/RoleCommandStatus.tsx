import { Button, Card } from '../../../components/ui'
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
  return <Card as="section" className="space-y-3" aria-live="polite">
    <h2 className="font-bold text-brand-800">{state === 'confirmed' ? 'Cambio de rol confirmado' : state === 'rejected' ? 'Cambio de rol rechazado' : state === 'sending' ? 'Consultando o enviando el cambio…' : 'Cambio de rol sin confirmar'}</h2>
    {pending && <p className="text-sm text-neutral-700">Cuenta {pending.usuario_id} · Rol solicitado: {ROLE_LABELS[pending.payload.rol_global]}</p>}
    {!terminal && <p className="text-sm text-neutral-600">Conservamos el cambio original. Consulta su resultado antes de preparar otro cambio.</p>}
    {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
    {receipt?.estado === 'RECHAZADO' && <div role="alert" className="space-y-1 text-sm text-danger-700"><p>{receipt.error.mensaje}</p><p>No se aplicó este cambio. Revisa el usuario y confirma nuevamente.</p></div>}
    {receipt?.estado === 'CONFIRMADO' && <div className="space-y-1 text-sm text-neutral-700"><p>Cuenta {receipt.resultado.usuario_id}: {ROLE_LABELS[receipt.resultado.rol_anterior]} → {ROLE_LABELS[receipt.resultado.rol_nuevo]}</p><p>{receipt.resultado.cambio === 'SIN_CAMBIOS' ? 'El usuario ya tenía ese rol; se confirmó sin cambios.' : 'El servidor confirmó el cambio.'}</p><p className="text-xs text-neutral-600">La autorización actual se consulta de nuevo antes de otra operación.</p></div>}
    {state === 'sessionExpired' && <Button variant="secondary" disabled={busy} onClick={onLogin}>Recuperar sesión con passkey</Button>}
    {!terminal && state !== 'sessionExpired' && <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => void command.recover()}>Consultar resultado original</Button>{pending && <Button variant="ghost" disabled={busy} onClick={() => void command.retrySame()}>Reenviar el mismo cambio</Button>}</div>}
    {terminal && <Button variant="secondary" disabled={busy} onClick={onReset}>Preparar otro cambio</Button>}
  </Card>
}
