import { Button, Card } from '../../../components/ui'
import type { useModuleCommand } from '../../accesos/useModuleCommand'

export default function ModuleCommandStatus({ command, domain, onReset, onLogin, canManage }: {
  command: ReturnType<typeof useModuleCommand>; domain: 'M1' | 'M2'; onReset: () => void; onLogin: () => void; canManage: boolean
}) {
  const { state, pending, receipt, error, busy } = command
  if (state === 'idle' && !error) return null
  const name = domain === 'M1' ? 'Recolección' : 'Viveros'
  return <Card as="section" className="space-y-3" aria-live="polite">
    <h2 className="font-bold">{name}: {state === 'sending' ? 'enviando o consultando…' : receipt ? receipt.estado === 'CONFIRMADO' ? 'acceso confirmado' : 'cambio rechazado' : 'resultado sin confirmar'}</h2>
    {pending && <div className="break-words text-sm"><p>Cuenta {pending.usuario_id} · {pending.operacion.startsWith('OTORGAR') ? 'Otorgar' : 'Retirar'} acceso</p>{pending.payload.vivero_id && <p>Vivero {pending.payload.vivero_id}</p>}<p>Motivo: {pending.payload.motivo}</p><p className="break-all text-xs text-neutral-500">Comando: {pending.payload.comando_id}</p></div>}
    {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
    {receipt?.estado === 'RECHAZADO' && <p role="alert" className="text-sm text-danger-700">{receipt.error.mensaje} Relee los accesos y confirma una intención nueva.</p>}
    {receipt?.estado === 'CONFIRMADO' && <p className="text-sm">{receipt.resultado.cambio === 'SIN_CAMBIOS' ? 'La vigencia ya estaba en el estado solicitado.' : 'El servidor confirmó el cambio de vigencia.'} Este recibo es histórico; el acceso actual se consulta por separado.</p>}
    {!receipt && <p className="text-sm text-neutral-600">Conservamos la intención original y su clave. La falta de un resultado todavía no prueba un fallo.</p>}
    {state === 'sessionExpired' ? <Button disabled={busy} onClick={onLogin}>Recuperar sesión con passkey</Button> : !receipt && <><Button disabled={busy} onClick={() => void command.recover()}>Consultar resultado de {name}</Button>{pending && canManage && <Button variant="secondary" disabled={busy} onClick={() => void command.retrySame()}>Reenviar el mismo cambio de {name}</Button>}</>}
    {receipt && <Button onClick={onReset} disabled={busy}>Cerrar resultado de {name}</Button>}
  </Card>
}
