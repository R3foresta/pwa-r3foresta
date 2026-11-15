import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import { canAtVivero } from '../../accesos/accessPolicy'
import { Button, PageHeader } from '../../../components/ui'
import ConfirmDialog from '../../../components/ConfirmDialog'
import SuccessModal from '../../../components/SuccessModal'
import EvidencePhoto from '../components/EvidencePhoto'
import { formatViveroPhotoDate } from '../utils/presentation'
import { useIncorporacionCommand } from './useIncorporacionCommand'
import IncorporacionForm from './IncorporacionForm'
import IncorporacionResumen from './IncorporacionResumen'
import type { IntentoIncorporacion } from './incorporacion.store'

export default function IncorporacionScreen() {
  const { user } = useAuth()
  const { m2 } = useOperationalAccess()
  const token = localStorage.getItem('authToken') ?? ''
  const admin = !!user && user.rol === 'ADMIN' && m2.status === 'ready' && m2.data?.usuario_id === user.id && m2.data.activo && m2.data.rol_global === 'ADMIN'
  const scope = JSON.stringify([user?.id, token, m2.status, m2.data])
  return user && token ? <IncorporacionAccount key={scope} actor={user.id} token={token} admin={admin} permissionKey={scope} responsable={[user.nombre, user.apellido].filter(Boolean).join(' ') || user.username || 'Cuenta actual'} /> : <p className="p-6">Inicia sesión con la cuenta original para recuperar tu incorporación.</p>
}
function OriginalPhoto({ file }: { file: File }) {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    const image = ref.current
    if (image) image.src = url
    return () => { if (image) image.removeAttribute('src'); URL.revokeObjectURL(url) }
  }, [file])
  return <div className="space-y-1"><img ref={ref} alt={file.name} className="h-24 w-24 rounded-2xl object-cover" /><p className="text-xs text-neutral-600">{file.name} · {file.type || 'Tipo por extensión'} · {file.size.toLocaleString('es-BO')} bytes</p></div>
}
function OriginalPhotos({ attempt }: { attempt: IntentoIncorporacion }) {
  return <div className="space-y-2"><h3 className="text-sm font-bold">Fotos originales conservadas</h3>{attempt.files.map((file, index) => <OriginalPhoto key={index} file={file} />)}</div>
}
function IncorporacionAccount({ actor, token, admin, permissionKey, responsable }: { actor: string; token: string; admin: boolean; permissionKey: string; responsable: string }) {
  const navigate = useNavigate()
  const { m2 } = useOperationalAccess()
  const command = useIncorporacionCommand(actor, token, admin, permissionKey)
  const [confirming, setConfirming] = useState<'alta' | 'fotos' | 'descartar' | null>(null)
  const [showSuccess, setShowSuccess] = useState(true)
  const attempt = command.attempt
  const receipt = command.receipt
  const canOpenLot = !!receipt && m2.status === 'ready' && canAtVivero(m2.data, receipt.data.vivero_id, 'operar')
  const canConfirm = admin && !command.storageError && (attempt?.fase === 'LISTO_PARA_CONFIRMAR' || command.canReplay)
  const busy = !!command.busy
  const submit = () => { const action = confirming; setConfirming(null); if (action === 'alta') void command.confirmar(); if (action === 'fotos') void command.repetirFotos(); if (action === 'descartar') void command.descartar() }
  return <main className="mx-auto max-w-md space-y-4 px-5 pb-36 pt-6 text-brand-900">
    <PageHeader eyebrow="Vivero" title="Incorporar plantas" subtitle="Recepción y saldo inicial de plantas vivas" backTo="/app/home" />
    {command.error && <div role="alert" className={`space-y-2 rounded-2xl p-4 text-sm ${command.rejected ? 'bg-danger-50 text-danger-700' : 'bg-warning-50 text-neutral-700'}`}>
      <p className="font-bold">{command.rejected ? attempt?.fase === 'ALTA_POR_CONSULTAR' ? 'La solicitud de alta fue rechazada explícitamente.' : 'La carga de fotos recibió un rechazo explícito. Consulta el resultado del ingreso antes de continuar.' : receipt ? 'El ingreso está confirmado; falta actualizar este dispositivo.' : 'La operación requiere revisión.'}</p><p>{command.error}</p>
      <Button variant="secondary" size="sm" onClick={command.load} disabled={busy}>Releer intento conservado</Button>
    </div>}
    {!command.ready && !command.error && <p role="status">Recuperando la preparación de esta cuenta…</p>}
    {busy && command.busy !== 'loading' && <p role="status" className="rounded-2xl bg-brand-50 p-4 text-sm">{command.busy === 'upload' ? 'Conservando y preparando fotos…' : command.busy === 'post' ? 'Consultando o confirmando la misma incorporación…' : command.busy === 'recover' ? 'Consultando el resultado y las fotos de esta solicitud…' : 'Actualizando este dispositivo…'}</p>}
    {attempt && <section className="space-y-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <h2 className="text-lg font-extrabold">{receipt ? 'Ingreso confirmado' : attempt.fase === 'ALTA_POR_CONSULTAR' ? 'Resultado pendiente de consulta' : 'Ingreso preparado'}</h2>
      <p className="break-all text-xs text-neutral-500">Solicitud: {attempt.solicitud_id}</p>
      <IncorporacionResumen base={attempt.base} labels={attempt.labels} evidencias={attempt.evidencia_ids.length || attempt.files.length} />
      {!receipt && <OriginalPhotos attempt={attempt} />}
      {!receipt && command.photos.length > 0 && <div className="space-y-2"><h3 className="text-sm font-bold">Fotos recuperadas del vivero</h3>{command.photos.map(photo => <EvidencePhoto key={`${photo.id}-${photo.signed_url}`} photo={{ id: photo.id, url: photo.signed_url, titulo: photo.titulo ?? `Evidencia #${photo.id}`, fecha: formatViveroPhotoDate(photo.tomado_en ?? photo.creado_en), expiraEn: photo.expiraEn, mimeType: photo.mime_type ?? photo.tipo_archivo ?? null, tamanoBytes: photo.tamano_bytes ?? null }} onRenew={command.recuperar} renewing={busy} />)}</div>}
      {!receipt && <div className="space-y-2">
        <p className="text-sm text-neutral-600">{attempt.fase === 'ALTA_POR_CONSULTAR' ? 'Conserva esta solicitud. Una espera agotada o una consulta sin resultado no permite crear otro ingreso. Primero consulta; cualquier reenvío mantendrá exactamente los mismos datos.' : 'Las fotos preparadas todavía no incorporan plantas. Revisa el resumen y confirma el ingreso para crear el lote.'}</p>
        <Button variant="secondary" fullWidth onClick={command.recuperar} disabled={busy}>Consultar resultado y fotos</Button>
        {canConfirm && <Button fullWidth onClick={() => setConfirming('alta')} disabled={busy}>{command.canReplay ? 'Reenviar los mismos datos' : 'Revisar y confirmar incorporación'}</Button>}
        {admin && command.canRepeatPhotos && <Button variant="secondary" fullWidth onClick={() => setConfirming('fotos')} disabled={busy}>Repetir expresamente las mismas fotos</Button>}
        {admin && attempt.fase !== 'ALTA_POR_CONSULTAR' && <Button variant="ghost" fullWidth onClick={() => setConfirming('descartar')} disabled={busy}>Descartar sólo esta preparación local</Button>}
        {!admin && <p className="text-sm text-neutral-600">Tu cuenta puede consultar su resultado confirmado. Una incorporación nueva y las cargas pendientes requieren ADMIN.</p>}
      </div>}
      {receipt && <div className="space-y-3"><p className="text-sm">Lote {receipt.data.codigo_trazabilidad} · {receipt.data.cantidad} UNIDAD iniciales. El saldo actual se consulta por separado en su ficha.</p>
        <Button variant="secondary" fullWidth onClick={command.recuperar} disabled={busy}>Consultar recibo propio</Button>
        {canOpenLot && <Button fullWidth onClick={() => navigate(`/app/vivero/${receipt.data.lote_vivero_id}`)}>Ver ficha del lote</Button>}
        <Button variant="secondary" fullWidth onClick={() => void command.nueva()} disabled={busy}>{admin ? 'Preparar otro ingreso' : 'Cerrar recibo en este dispositivo'}</Button>
      </div>}
    </section>}
    {command.ready && !attempt && !receipt && (admin ? <IncorporacionForm token={token} responsable={responsable} disabled={busy || command.storageError} onPrepare={(base, labels, files) => { setShowSuccess(true); void command.preparar(base, labels, files) }} /> : <section className="space-y-3 rounded-3xl bg-white p-4"><p>No hay una incorporación conservada en este dispositivo para tu cuenta. El alta de plantas requiere ADMIN.</p><Button variant="secondary" onClick={command.load}>Volver a consultar este dispositivo</Button>{m2.status === 'error' && <Button variant="secondary" onClick={m2.refresh}>Reintentar permisos</Button>}</section>)}
    <ConfirmDialog open={confirming !== null} title={confirming === 'descartar' ? '¿Descartar la preparación local?' : confirming === 'fotos' ? '¿Repetir la misma carga de fotos?' : '¿Confirmar la incorporación?'}
      description={confirming === 'descartar' ? 'El alta no se envió. Se quitarán los datos de este dispositivo; las fotos ya cargadas en el vivero no se borran con esta acción.' : confirming === 'fotos' ? 'Se consultará otra vez el resultado y las fotos antes de subir. La carga anterior podría haber dejado archivos; sólo se repetirá si no se recuperan fotos pendientes.' : 'La operación creará un lote nuevo y un evento inmutable. Comprueba vivero, especie, procedencia y cantidad.'}
      confirmLabel={confirming === 'descartar' ? 'Descartar preparación local' : confirming === 'fotos' ? 'Consultar y repetir las mismas fotos' : command.canReplay ? 'Reenviar la misma incorporación' : 'Confirmar ingreso de plantas'} onCancel={() => setConfirming(null)} onConfirm={submit} loading={busy} confirmDisabled={confirming === 'alta' && !canConfirm}>
      {attempt && confirming === 'alta' && <IncorporacionResumen base={attempt.base} labels={attempt.labels} evidencias={attempt.evidencia_ids.length} />}
    </ConfirmDialog>
    {receipt && showSuccess && <SuccessModal title="Plantas incorporadas" description="El ingreso está confirmado y conserva su procedencia." summaryText={`${receipt.data.cantidad} UNIDAD · ${receipt.data.codigo_trazabilidad}`} primaryLabel="Ver recibo confirmado" onPrimaryAction={() => setShowSuccess(false)} errorMessage={command.error} />}
  </main>
}
