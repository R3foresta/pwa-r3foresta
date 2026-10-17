import { Link } from 'react-router-dom'
import { Button, Card } from '../../../../components/ui'
import type { ReciboRegistro, RegistroIdentity } from '../../registroTypes'

type Props = { state: string; pending: RegistroIdentity | null; receipt: ReciboRegistro | null; busy: boolean; error: string | null; onRecover: () => void; onRetry: () => void; onNewIntent: () => void; onLogin: () => void }

export default function RegistroCommandStatus({ state, pending, receipt, busy, error, onRecover, onRetry, onNewIntent, onLogin }: Props) {
  const cancelled = receipt?.estado === 'RECHAZADO' && receipt.error.codigo === 'PREPARACION_CANCELADA'
  if (receipt?.estado === 'CONFIRMADO') {
    const result = receipt.resultado
    return <Card as="section" className="space-y-3 border border-success-200" aria-live="polite">
      <h1 className="text-xl font-extrabold text-success-800">Plantación guardada</h1>
      <p className="break-all font-bold text-brand-800">{result.codigo_trazabilidad}</p>
      <dl className="space-y-1 text-sm text-neutral-700"><div><dt className="inline font-bold">Registro: </dt><dd className="inline">{result.registro_plantacion_id}</dd></div><div><dt className="inline font-bold">Subcampaña: </dt><dd className="inline">{result.subcampania_id}</dd></div><div><dt className="inline font-bold">Fecha: </dt><dd className="inline">{result.fecha_plantacion}</dd></div><div><dt className="inline font-bold">Total: </dt><dd className="inline">{result.cantidad_total_plantada} plantas</dd></div><div><dt className="inline font-bold">Responsable: </dt><dd className="inline">Cuenta {result.responsable_id}</dd></div></dl>
      <p className="text-sm text-neutral-700">{result.gps_dentro_poligono ? 'Ubicación evaluada dentro del polígono.' : 'Ubicación exterior aceptada y evaluada por el servidor.'}</p>
      <p className="text-xs text-neutral-500">Este comprobante conserva lo confirmado entonces. El detalle muestra los datos propios persistidos.</p>
      {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
      <div className="flex flex-col gap-3 text-sm font-bold text-brand-700"><Link className="underline" to={`/app/participacion/registros/${result.registro_plantacion_id}`}>Ver detalle propio</Link><Link className="underline" to="/app/home">Volver a mi participación</Link></div>
      <Button variant="secondary" disabled={busy} onClick={onNewIntent}>Preparar otra plantación</Button>
    </Card>
  }
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
    <h2 className="font-bold text-brand-800">{state === 'sending' ? 'Guardando o comprobando el intento…' : state === 'loading' ? 'Recuperando el borrador de esta cuenta…' : state === 'sessionExpired' ? 'Se necesita la sesión original' : pending?.payload ? 'Resultado pendiente de confirmar' : 'Preparación o carga pendiente de comprobar'}</h2>
    {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
    {pending && <p className="break-all text-xs text-neutral-500">Comando {pending.comando_id}</p>}
    {pending?.payload && !busy && <p className="text-sm text-neutral-700">La respuesta no acredita éxito ni ausencia de efectos. Conservamos el contenido exacto. Comprueba el mismo intento antes de otra plantación.</p>}
    {state === 'sessionExpired' && <><p className="text-sm text-neutral-700">Ingresa con la cuenta que preparó este comando. Otra cuenta no puede consultarlo ni ver su borrador.</p><Button disabled={busy} variant="secondary" onClick={onLogin}>Recuperar sesión con passkey</Button></>}
    {!busy && state !== 'loading' && <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={onRecover}>{pending?.payload ? 'Comprobar guardado' : 'Comprobar preparación y cargas'}</Button>{pending?.payload && state !== 'sessionExpired' && <Button variant="ghost" onClick={onRetry}>Reenviar el mismo intento</Button>}</div>}
  </Card>
}
