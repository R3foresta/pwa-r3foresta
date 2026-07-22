import Icon from './Icon'
import { Button } from './ui'
import { useAndroidPwaInstallPrompt } from '../hooks/useAndroidPwaInstallPrompt'

type Props = {
  className?: string
}

function PwaInstallPrompt({ className = 'bottom-4' }: Props) {
  const { dismiss, install, isPrompting, isVisible } = useAndroidPwaInstallPrompt()

  if (!isVisible) return null

  return (
    <section
      aria-live="polite"
      className={`fixed inset-x-0 z-50 px-4 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-white p-3 text-brand-700 shadow-2xl shadow-brand-900/20 ring-1 ring-black/5">
        <img
          src="/icon-192.png"
          alt="R3foresta"
          className="h-11 w-11 shrink-0 rounded-xl"
          loading="lazy"
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-brand-700">Instala R3foresta</h2>
          <p className="text-xs font-medium leading-5 text-neutral-600">
            Accede desde la pantalla principal de tu celular.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" onClick={install} disabled={isPrompting}>
            {isPrompting ? 'Abriendo...' : 'Instalar'}
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Ocultar sugerencia de instalación"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  )
}

export default PwaInstallPrompt
