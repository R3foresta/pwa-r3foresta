import { useEffect, useRef, useState, type ReactNode } from 'react'
import DialogoReporte from './DialogoReporte'
import { Button } from '../../components/ui'
import { WebAuthnService } from '../../services/webauthn.service'
import { ReporteConsultaError, verificarPermisoExportacion } from './reporte-plantaciones.api'

type Props = {
  token: string
  onClose: () => void
  onDownload?: (vigente: () => boolean) => Promise<void>
  children: ReactNode
}

export default function DialogoReportePdf({ token, onClose, onDownload, children }: Props) {
  const pendingExport = useRef<AbortController | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => pendingExport.current?.abort(), [])

  async function descargar() {
    if (!onDownload || pendingExport.current) return
    const controller = new AbortController()
    pendingExport.current = controller
    setDescargando(true)
    setError(null)
    try {
      await verificarPermisoExportacion(token, controller.signal)
      if (controller.signal.aborted) return
      if (WebAuthnService.getToken()?.trim() !== token) throw new ReporteConsultaError(401)
      await onDownload(() => !controller.signal.aborted && WebAuthnService.getToken()?.trim() === token)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof ReporteConsultaError ? cause.message : 'No se pudo descargar el PDF. Vuelve a intentarlo.')
    } finally {
      pendingExport.current = null
      if (!controller.signal.aborted) setDescargando(false)
    }
  }

  return <DialogoReporte titulo="Vista previa del PDF" onClose={onClose} pie={
    <div className="flex flex-wrap items-center justify-end gap-3">
      {error && <p role="alert" className="mr-auto text-sm font-medium text-danger-700">{error}</p>}
      <Button leftIcon="arrow-down" loading={descargando} disabled={!onDownload} onClick={() => void descargar()}>
        {descargando ? 'Preparando PDF…' : 'Descargar PDF'}
      </Button>
    </div>
  }>
    {children}
  </DialogoReporte>
}
