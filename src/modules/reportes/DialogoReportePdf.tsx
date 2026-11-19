import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  const heading = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const pendingExport = useRef<AbortController | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const element = dialog.current
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    element?.showModal()
    return () => {
      pendingExport.current?.abort()
      element?.close()
      document.body.style.overflow = overflow
      if (focus?.isConnected) focus.focus()
    }
  }, [])

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

  return createPortal(<dialog ref={dialog} aria-labelledby={heading} onCancel={(event) => {
    event.preventDefault()
    onClose()
  }} className="m-auto max-h-[90dvh] w-[calc(100%-1rem)] max-w-4xl overflow-hidden rounded-3xl bg-white p-0 text-brand-900 shadow-xl backdrop:bg-brand-950/60">
    <div className="flex max-h-[90dvh] flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-brand-100 px-4 py-4 sm:px-6">
        <h2 id={heading} className="font-display text-xl font-extrabold">Vista previa del PDF</h2>
        <Button variant="ghost" size="sm" leftIcon="x" onClick={onClose}>Cerrar</Button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-brand-50/50 px-4 py-4 sm:px-6" role="region" aria-label="Contenido del reporte" tabIndex={0}>
        {children}
      </div>
      <footer className="shrink-0 border-t border-brand-100 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {error && <p role="alert" className="mr-auto text-sm font-medium text-danger-700">{error}</p>}
          <Button leftIcon="arrow-down" loading={descargando} disabled={!onDownload} onClick={() => void descargar()}>
            {descargando ? 'Preparando PDF…' : 'Descargar PDF'}
          </Button>
        </div>
      </footer>
    </div>
  </dialog>, document.body)
}
