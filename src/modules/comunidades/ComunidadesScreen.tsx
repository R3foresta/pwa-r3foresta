import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'

function ComunidadesScreen() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
      <header className="relative mb-4 flex items-center gap-4">
        <button
          type="button"
          aria-label="Volver"
          onClick={() => navigate(-1)}
          className="left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-500">Sección</p>
          <div className="text-2xl font-semibold tracking-tight text-brand-700">
              Comunidades
          </div>
        </div>
      </header>

      <section className="mt-6 rounded-3xl bg-white px-5 py-6 shadow-soft ring-1 ring-black/5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Próximamente</p>
        <p className="mt-2 text-sm font-medium text-brand-600">
          Estamos preparando esta sección.
        </p>
      </section>
    </div>
  )
}

export default ComunidadesScreen
