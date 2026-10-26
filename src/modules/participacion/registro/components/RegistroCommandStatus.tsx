import { Link } from 'react-router-dom'
import { Button, Card } from '../../../../components/ui'
import type { ReciboRegistro, RegistroIdentity } from '../../registroTypes'

type Props = { state: string; pending: RegistroIdentity | null; receipt: ReciboRegistro | null; busy: boolean; error: string | null; onRecover: () => void; onRetry: () => void; onNewIntent: () => void; onLogin: () => void }

export default function RegistroCommandStatus({ state, pending, receipt, busy, error, onRecover, onRetry, onNewIntent, onLogin }: Props) {
  const cancelled = receipt?.estado === 'RECHAZADO' && receipt.error.codigo === 'PREPARACION_CANCELADA'
  if (receipt?.estado === 'CONFIRMADO') return null
  if (receipt?.estado === 'RECHAZADO') return <Card as="section" className="space-y-3" aria-live="polite">
    <h2 className="font-bold text-brand-800">{cancelled ? 'Preparación cancelada' : 'Plantación rechazada por el servidor'}</h2>
    <p role="alert" className="text-sm text-danger-700">{receipt.error.mensaje}</p><p className="text-xs text-neutral-500">Código: {receipt.error.codigo} · Comando {receipt.comando_id}</p>
    {!cancelled && <p className="text-sm text-neutral-700">No se registró la plantación de este intento. Conservamos la propuesta sin reducir cantidades ni retirar participantes. Revisa los datos antes de confirmar otra intención con identidad nueva.</p>}
    {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
    <Button variant="secondary" disabled={busy} onClick={onNewIntent}>{cancelled ? 'Preparar una nueva captura' : 'Revisar borrador para una intención nueva'}</Button>
    <Link to="/app/home" className="block text-sm font-semibold text-brand-700 underline">Volver a mi participación</Link>
  </Card>

  if (state !== 'unconfirmed' && state !== 'sessionExpired' && state !== 'sending' && state !== 'loading' && !error) return null
  return <Card as="section" className="space-y-3" aria-live="polite">
    <h2 className="font-bold text-brand-800">{state === 'sending' ? 'Guardando o comprobando el intento…' : state === 'loading' ? 'Recuperando el borrador de esta cuenta…' : state === 'sessionExpired' ? 'Se necesita la sesión original' : pending?.payload ? 'Resultado pendiente de confirmar' : 'No se pudo completar la carga'}</h2>
    {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
    {pending && <details className="text-xs text-neutral-500"><summary className="cursor-pointer">Detalles para soporte</summary><p className="mt-2 break-all">Comando {pending.comando_id}</p></details>}
    {pending?.payload && !busy && <div className="space-y-2 text-sm text-neutral-700"><p>Conservamos tus datos y fotos. Al reintentar, buscaremos primero el comprobante de guardado antes de reenviar los mismos datos.</p><p>«Comprobar guardado» solo consulta el estado. Si el servidor indica que el registro está pausado, el equipo debe habilitarlo antes de que puedas completar el envío.</p></div>}
    {state === 'sessionExpired' && <><p className="text-sm text-neutral-700">Ingresa con la cuenta que preparó este comando. Otra cuenta no puede consultarlo ni ver su borrador.</p><Button disabled={busy} variant="secondary" onClick={onLogin}>Recuperar sesión con passkey</Button></>}
    {!busy && state !== 'loading' && state !== 'sessionExpired' && <div className="flex flex-wrap gap-2">{pending?.payload && <Button onClick={onRetry}>Reintentar envío</Button>}<Button variant="secondary" onClick={onRecover}>{pending?.payload ? 'Comprobar guardado' : 'Reintentar carga de fotos'}</Button></div>}
  </Card>
}
