import { useMemo, useState } from 'react'

type CollectionType = 'seed' | 'cutting'
type Screen =
  | 'home'
  | 'collections'
  | 'collectionForm'
  | 'map'
  | 'scan'
  | 'report'
  | 'profile'
  | 'nursery'
  | 'planting'
  | 'co2'

type FilterKey = 'Todos' | 'Semilla' | 'Esqueje' | 'Ambos'

type CollectionRecord = {
  id: string
  location: string
  species: string
  quantity: string
  date: string
  types: CollectionType[]
}

const metrics = [
  { label: 'Plantaciones', value: '3', helper: '' },
  { label: 'Listos para trasplantar', value: '120', helper: '' },
  { label: 'T CO₂', value: '20,6', helper: '' },
]

const actions: { label: string; target: Screen }[] = [
  { label: 'Recolección', target: 'collections' },
  { label: 'Vivero', target: 'nursery' },
  { label: 'Plantación', target: 'planting' },
  { label: 'CO₂', target: 'co2' },
]

const collectionFilters: FilterKey[] = ['Todos', 'Semilla', 'Esqueje', 'Ambos']

const collectionRecords: CollectionRecord[] = [
  {
    id: 'REC-2025-014',
    location: 'San Juan',
    species: 'Cedrela sp.',
    quantity: '2.88 kg',
    date: '2025-11-05',
    types: ['seed'],
  },
  {
    id: 'REC-2025-013',
    location: 'Samaipata',
    species: 'Quercus sp.',
    quantity: '50 unidades',
    date: '2025-11-03',
    types: ['cutting'],
  },
  {
    id: 'REC-2025-012',
    location: 'Coroico',
    species: 'Pinus sp.',
    quantity: '1.2 kg + 30 unidades',
    date: '2025-11-01',
    types: ['seed', 'cutting'],
  },
]

const navItems: { label: string; icon: string; screen: Screen }[] = [
  { label: 'Inicio', icon: 'home', screen: 'home' },
  { label: 'Recolección', icon: 'leaf', screen: 'collections' },
  { label: 'Mapa', icon: 'map', screen: 'map' },
  { label: 'Escanear', icon: 'scan', screen: 'scan' },
  { label: 'Reporte', icon: 'report', screen: 'report' },
  { label: 'Perfil', icon: 'user', screen: 'profile' },
]

const screenTitle: Record<Screen, string> = {
  home: 'Inicio',
  collections: 'Recolecciones',
  collectionForm: 'Nueva recolección',
  map: 'Mapa',
  scan: 'Escanear',
  report: 'Reporte',
  profile: 'Perfil',
  nursery: 'Vivero',
  planting: 'Plantación',
  co2: 'CO₂',
}

const navActiveFor: Record<Screen, Screen> = {
  home: 'home',
  collections: 'collections',
  collectionForm: 'collections',
  map: 'map',
  scan: 'scan',
  report: 'report',
  profile: 'profile',
  nursery: 'home',
  planting: 'home',
  co2: 'home',
}

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
    case 'search':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.5 15.5 3 3" />
        </svg>
      )
    case 'leaf':
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
            d="M18 5s-3 0-6 1.6C9 8 6 10.5 6 13c0 3 2.5 5 5.5 5 2.5 0 4.5-2 4.5-4.5C16 10 18 5 18 5Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 13.5 8 11" />
        </svg>
      )
    case 'cutting':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <circle cx="7" cy="7" r="2.2" />
          <circle cx="7" cy="17" r="2.2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 7 10-4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 17 10 4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 9-5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 9 5" />
        </svg>
      )
    case 'plus':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path strokeLinecap="round" d="M12 5v14" />
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
      )
    case 'minus':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
      )
    case 'arrow-left':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5 8 12l7 7" />
        </svg>
      )
    case 'pin':
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
            d="M12 21s6-4.5 6-10a6 6 0 1 0-12 0c0 5.5 6 10 6 10Z"
          />
          <circle cx="12" cy="11" r="2.5" />
        </svg>
      )
    case 'chevron-down':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      )
    case 'photo':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h3l2-3 3 5 2-3 2 3h4" />
          <circle cx="9" cy="9" r="1.2" fill="currentColor" />
        </svg>
      )
    case 'info':
      return (
        <svg
          className={`${common} ${className ?? ''}`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6" />
          <circle cx="12" cy="8" r="0.8" fill="currentColor" />
        </svg>
      )
    default:
      return null
  }
}

function CollectionCard({ record }: { record: CollectionRecord }) {
  return (
    <article className="relative rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-800">
            {record.id}
          </h3>
          <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
            <Icon name="pin" className="h-4 w-4 text-brand-500" />
            <span>{record.location}</span>
          </div>
          <p className="text-base font-semibold text-slate-700">{record.species}</p>
          <p className="text-sm font-semibold text-slate-500">{record.quantity}</p>
        </div>
        <div className="flex items-center gap-2">
          {record.types.includes('seed') && (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <Icon name="leaf" className="h-5 w-5" />
            </span>
          )}
          {record.types.includes('cutting') && (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600 ring-1 ring-teal-100">
              <Icon name="cutting" className="h-5 w-5" />
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 text-right text-sm font-semibold text-slate-500">
        {record.date}
      </div>
    </article>
  )
}

function HomeScreen({
  onOpenCollections,
  onOpenPlaceholder,
}: {
  onOpenCollections: () => void
  onOpenPlaceholder: (screen: Screen) => void
}) {
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
            onClick={() =>
              action.target === 'collections'
                ? onOpenCollections()
                : onOpenPlaceholder(action.target)
            }
            className="rounded-2xl bg-brand-500 py-5 text-center text-lg font-semibold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
          >
            {action.label}
          </button>
        ))}
      </section>
    </div>
  )
}

function CollectionsScreen({
  onBack,
  onCreate,
}: {
  onBack: () => void
  onCreate: () => void
}) {
  const [filter, setFilter] = useState<FilterKey>('Todos')
  const [query, setQuery] = useState('')

  const filteredCollections = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return collectionRecords.filter((record) => {
      const matchesSearch =
        !normalized ||
        [record.id, record.species, record.location]
          .join(' ')
          .toLowerCase()
          .includes(normalized)

      const matchesFilter =
        filter === 'Todos'
          ? true
          : filter === 'Semilla'
            ? record.types.includes('seed')
            : filter === 'Esqueje'
              ? record.types.includes('cutting')
              : record.types.length > 1

      return matchesSearch && matchesFilter
    })
  }, [filter, query])

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <div className="relative rounded-b-3xl bg-[#0f8351] px-5 pb-12 pt-10 text-white shadow-soft">
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
            className="absolute left-4 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Recolecciones
          </p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight">Recolecciones</h1>
          <p className="text-sm font-medium text-white/90">
            Registro de material forestal
          </p>
        </div>

        <div className="-mt-10 space-y-4 px-5">
          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-black/5">
            <Icon name="search" className="h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por ID, especie o comunidad..."
              className="w-full border-none bg-transparent text-base font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
              type="search"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            {collectionFilters.map((option) => {
              const isActive = filter === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'border-brand-500 bg-brand-500 text-white shadow-soft'
                      : 'border-brand-100 bg-white text-brand-600 hover:border-brand-300'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>

          <div className="space-y-3">
            {filteredCollections.map((record) => (
              <CollectionCard key={record.id} record={record} />
            ))}
            {filteredCollections.length === 0 && (
              <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
                No se encontraron recolecciones con esos filtros.
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Nueva recolección"
        onClick={onCreate}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.98]"
      >
        <Icon name="plus" className="h-6 w-6" />
      </button>
    </div>
  )
}

function NewCollectionForm({ onBack }: { onBack: () => void }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<CollectionType>('seed')
  const [species, setSpecies] = useState('')
  const [method, setMethod] = useState('')
  const [quantity, setQuantity] = useState(3)
  const [unit, setUnit] = useState<'Kg' | 'Unidades'>('Kg')
  const [notes, setNotes] = useState('')
  const [isNewFind, setIsNewFind] = useState(false)

  const speciesOptions = ['Cedrela sp.', 'Quercus sp.', 'Pinus sp.']
  const methodOptions = ['Recolección manual', 'Post-cosecha', 'Muestreo']

  const changeQuantity = (delta: number) => {
    setQuantity((value) => Math.max(0, value + delta))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="relative flex items-center justify-center px-5 pb-4 pt-6">
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
            className="absolute left-4 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-brand-700">
              Nueva recolección
            </h1>
            <p className="text-sm font-semibold text-brand-500">
              Paso 1 de 3 · <span className="text-slate-500">Datos generales</span>
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-5 px-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-700">Fecha</p>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div className="space-y-3">
            <p className="text-base font-extrabold text-brand-700">Seleccionar tipo</p>
            <div className="flex gap-3">
              {[
                { label: 'Semilla', value: 'seed' as CollectionType },
                { label: 'Esqueje', value: 'cutting' as CollectionType },
              ].map((option) => {
                const isActive = type === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`flex-1 rounded-2xl border px-4 py-3 text-center text-base font-extrabold shadow-soft transition ${
                      isActive
                        ? 'border-brand-500 bg-emerald-50 text-brand-600 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">Especie de la semilla</p>
            <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
              <select
                value={species}
                onChange={(event) => setSpecies(event.target.value)}
                className="w-full bg-transparent py-3 text-base font-semibold text-slate-700 outline-none"
              >
                <option value="">Seleccionar especie</option>
                {speciesOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">Cantidad</p>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-soft">
              <button
                type="button"
                onClick={() => changeQuantity(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-brand-600 transition hover:border-brand-400 hover:bg-brand-50"
              >
                <Icon name="minus" className="h-5 w-5" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-extrabold text-slate-700">
                <input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(0, Number(event.target.value)))}
                  className="w-16 bg-transparent text-center text-lg font-extrabold outline-none"
                />
                <div className="relative flex items-center">
                  <select
                    value={unit}
                    onChange={(event) => setUnit(event.target.value as 'Kg' | 'Unidades')}
                    className="appearance-none bg-transparent pr-6 text-sm font-bold text-slate-600 outline-none"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Unidades">Unidades</option>
                  </select>
                  <Icon name="chevron-down" className="pointer-events-none absolute right-0 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => changeQuantity(1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-brand-600 transition hover:border-brand-400 hover:bg-brand-50"
              >
                <Icon name="plus" className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">Seleccionar método</p>
            <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="w-full bg-transparent py-3 text-base font-semibold text-slate-700 outline-none"
              >
                <option value="">Seleccionar método</option>
                {methodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-extrabold text-brand-700">Evidencia fotográfica</p>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Lugar', 'Total recolectado'].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-600 shadow-soft transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon name="photo" className="h-6 w-6" />
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Icon name="info" className="h-4 w-4 text-brand-500" />
              <span>Obligatorio: 0/2</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">Notas</p>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Acá escribes las notas mientras vas haciendo la recolección, hasta 4000"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft">
            <input
              type="checkbox"
              checked={isNewFind}
              onChange={(event) => setIsNewFind(event.target.checked)}
              className="mt-1 h-5 w-5 accent-brand-600"
            />
            <div className="space-y-1">
              <p className="text-base font-extrabold text-brand-700">
                ¿Puede ser nuevo hallazgo?
              </p>
              <p className="text-sm font-semibold text-brand-600">
                Activa si sospechas que es un nuevo registro.
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-white/80 px-5 pb-6 pt-3">
        <button
          type="button"
          className="w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 pb-28 text-center text-brand-700">
      <div className="rounded-3xl bg-white px-6 py-6 shadow-soft ring-1 ring-black/5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Próximamente
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-brand-700">{title}</h1>
        <p className="mt-2 text-sm font-medium text-brand-600">
          Estamos preparando esta sección.
        </p>
      </div>
    </div>
  )
}

function BottomNav({
  active,
  onChange,
}: {
  active: Screen
  onChange: (screen: Screen) => void
}) {
  const activeNav = navActiveFor[active] ?? 'home'
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-white/60 bg-white/95 px-2 py-2 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        {navItems.map((item) => {
          const isActive = item.screen === activeNav
          return (
            <button
              key={item.label}
              onClick={() => onChange(item.screen)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
                isActive ? 'text-brand-600' : 'text-brand-500'
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  isActive ? 'bg-brand-100 text-brand-600' : 'text-brand-500'
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5" />
              </div>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function App() {
  const [screen, setScreen] = useState<Screen>('home')

  const content = (() => {
    switch (screen) {
      case 'home':
        return (
          <HomeScreen
            onOpenCollections={() => setScreen('collections')}
            onOpenPlaceholder={(target) => setScreen(target)}
          />
        )
      case 'collections':
        return (
          <CollectionsScreen
            onBack={() => setScreen('home')}
            onCreate={() => setScreen('collectionForm')}
          />
        )
      case 'collectionForm':
        return <NewCollectionForm onBack={() => setScreen('collections')} />
      default:
        return <PlaceholderScreen title={screenTitle[screen]} />
    }
  })()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      {content}
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  )
}

export default App
