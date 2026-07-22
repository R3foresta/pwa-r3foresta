import { useNavigate } from 'react-router-dom'
import Icon, { type IconName } from './Icon'

type DrawerItem = {
  label: string
  path: string
  icon: IconName
}

type Props = {
  isOpen: boolean
  onClose: () => void
}

const ITEMS: DrawerItem[] = [
  { label: 'Comunidades', path: '/app/comunidades', icon: 'map' },
  { label: 'Organizaciones', path: '/app/organizaciones', icon: 'flag' },
  { label: 'Plantas', path: '/app/plantas', icon: 'leaf' },
]

function MenuLateral({ isOpen, onClose }: Props) {
  const navigate = useNavigate()

  const handleNavigate = (path: string) => {
    onClose()
    navigate(path)
  }

  return (
    <div
      className={`fixed inset-0 z-[60] transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Cerrar menú lateral"
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        className={`absolute left-0 top-0 h-full w-[82%] max-w-[320px] bg-white px-4 py-5 shadow-2xl transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-500">Menú</p>
            <h2 className="text-xl font-extrabold text-brand-700">Navegación</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-full bg-neutral-100 p-2 text-neutral-700 transition hover:bg-neutral-200"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {ITEMS.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigate(item.path)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-brand-700 transition hover:bg-brand-50"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </div>
  )
}

export default MenuLateral
