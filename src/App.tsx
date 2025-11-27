const metrics = [
  { label: 'Plantaciones', value: '3', helper: '' },
  { label: 'Listos para trasplantar', value: '120', helper: '' },
  { label: 'T CO₂', value: '20,6', helper: '' },
]

const actions = ['Recolección', 'Vivero', 'Plantación', 'CO₂']

const navItems = [
  { label: 'Inicio', active: true, icon: 'home' },
  { label: 'Mapa', active: false, icon: 'map' },
  { label: 'Escanear', active: false, icon: 'scan' },
  { label: 'Reporte', active: false, icon: 'report' },
  { label: 'Perfil', active: false, icon: 'user' },
]

function Icon({ name, className }: { name: string; className?: string }) {
  const common = 'stroke-current'
  switch (name) {
    case 'bell':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5c-2.5 0-4.5 2-4.5 4.5v1.2c0 .5-.2 1-.5 1.4l-.9 1.1c-.6.8-.1 1.9.9 1.9h10c1 0 1.5-1.1.9-1.9l-.9-1.1c-.3-.4-.5-.9-.5-1.4V9c0-2.5-2-4.5-4.5-4.5Z"
          />
          <path strokeLinecap="round" d="M10 19c.3.6.9 1 1.6 1s1.3-.4 1.6-1" />
        </svg>
      )
    case 'dot':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="6" />
        </svg>
      )
    case 'home':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4 10.5 7.2-6.4a1 1 0 0 1 1.4 0l7.4 6.6"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.5 10.5v8.5a.5.5 0 0 0 .5.5h3.5v-5h3v5H17a.5.5 0 0 0 .5-.5v-8.5"
          />
        </svg>
      )
    case 'map':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.5 5.2 7-2.1a1 1 0 0 1 .7.1l3.5 1.7a1 1 0 0 1 .6.9v11.6a1 1 0 0 1-1.3 1l-2.8-1a1 1 0 0 0-.6 0l-7 2.1a1 1 0 0 1-.7-.1l-3.5-1.7a1 1 0 0 1-.6-.9V4.7a1 1 0 0 1 1.3-1l2.8 1a1 1 0 0 0 .6 0Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="m8 5.5 8 3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m8 13.5 8 3" />
        </svg>
      )
    case 'scan':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 9V6a2 2 0 0 1 2-2h3"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 15v3a2 2 0 0 0 2 2h3"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 4h1a2 2 0 0 1 2 2v3"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h1a2 2 0 0 0 2-2v-3"
          />
          <rect x="8" y="9" width="8" height="6" rx="1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 12h3" />
        </svg>
      )
    case 'report':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path strokeLinecap="round" d="M9 9.5h6" />
          <path strokeLinecap="round" d="M9 13h6" />
          <path strokeLinecap="round" d="M9 16.5h3" />
        </svg>
      )
    case 'user':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.5 19a5.5 5.5 0 0 1 11 0"
          />
        </svg>
      )
    default:
      return null
  }
}

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
        <header className="flex items-center justify-between">
          <div className="text-2xl font-semibold tracking-tight text-brand-700">
            R3foresta
          </div>
          <button
            type="button"
            className="rounded-full bg-white/90 p-2 shadow-sm transition hover:shadow-soft"
            aria-label="Notificaciones"
          >
            <Icon name="bell" className="h-5 w-5 text-brand-700" />
          </button>
        </header>

        <section className="mt-5">
          <div className="flex items-center gap-3 rounded-2xl bg-brand-100 px-4 py-3 text-sm font-medium text-brand-700 shadow-sm">
            <Icon name="dot" className="h-3 w-3 text-brand-600" />
            <span>Elementos pendientes de sincronización</span>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          {metrics.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white px-3 py-3 text-brand-700 shadow-soft"
            >
              <div className="text-lg font-semibold leading-tight">{item.value}</div>
              <p className="mt-1 text-[13px] font-medium text-brand-600">
                {item.label}
              </p>
              {item.helper && (
                <p className="mt-1 text-xs text-brand-500">{item.helper}</p>
              )}
            </div>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              className="rounded-2xl bg-brand-500 py-5 text-center text-lg font-semibold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
            >
              {action}
            </button>
          ))}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-white/60 bg-white/95 px-3 py-2 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold transition ${
                item.active ? 'text-brand-600' : 'text-brand-500'
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  item.active ? 'bg-brand-100 text-brand-600' : 'text-brand-500'
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5" />
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default App
