import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { actions, metrics } from '../../data/home'
import type { Screen } from '../../types/navigation'

function HomeScreen() {
  const navigate = useNavigate()
  const targetPath: Record<Screen, string> = {
    home: '/app/home',
    collections: '/app/collections',
    collectionDetail: '/app/collections',
    collectionForm: '/app/collections/new',
    collectionFormStep2: '/app/collections/new/location',
    collectionFormStep3: '/app/collections/new/summary',
    germination: '/app/germination',
    scan: '/app/scan',
    report: '/app/report',
    profile: '/app/profile',
    planting: '/app/planting',
    co2: '/app/co2',
  }

  return (
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
            <p className="mt-1 text-[13px] font-medium text-brand-600">{item.label}</p>
            {item.helper && <p className="mt-1 text-xs text-brand-500">{item.helper}</p>}
          </div>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(targetPath[action.target] ?? '/app/home')}
            className="rounded-2xl bg-brand-500 py-5 text-center text-lg font-semibold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
          >
            {action.label}
          </button>
        ))}
      </section>
    </div>
  )
}

export default HomeScreen
