import { useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import { collectionFilters, collectionRecords } from './data'
import CollectionCard from './CollectionCard'
import NewCollectionForm from './NewCollectionForm'
import LocationForm from './LocationForm'
import SummaryForm from './SummaryForm'
import type { FilterKey } from './types'

type Props = {
  onBack: () => void
}

type View = 'list' | 'form-step1' | 'form-step2' | 'form-step3'

function CollectionsScreen({ onBack }: Props) {
  const [view, setView] = useState<View>('list')
  const [filter, setFilter] = useState<FilterKey>('Todos')
  const [query, setQuery] = useState('')

  const filteredCollections = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return collectionRecords.filter((record) => {
      const matchesSearch =
        !normalized ||
        [record.id, record.species, record.locationRecolecion]
          .join(' ')
          .toLowerCase()
          .includes(normalized)

      const matchesFilter =
        filter === 'Todos'
          ? true
          : filter === 'Semilla'
            ? record.types.includes('Semilla')
            : filter === 'Esqueje'
              ? record.types.includes('Esqueje')
              : record.types.length > 1

      return matchesSearch && matchesFilter
    })
  }, [filter, query])

  if (view === 'form-step1') {
    return (
      <NewCollectionForm
        onBack={() => setView('list')}
        onContinue={() => setView('form-step2')}
      />
    )
  }

  if (view === 'form-step2') {
    return (
      <LocationForm
        onBack={() => setView('form-step1')}
        onContinue={() => setView('form-step3')}
      />
    )
  }

  if (view === 'form-step3') {
    return (
      <SummaryForm
        onBack={() => setView('form-step2')}
        onConfirm={() => {
          // Aquí iría la lógica para guardar en blockchain
          alert('Registro guardado exitosamente!')
          setView('list')
        }}
      />
    )
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <div className="flex rounded-b-3xl bg-[#0f8351] mb-3 px-5 pb-12 pt-10 text-white shadow-soft">
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
            className="left-4 top-5 mr-4 my-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="flex flex-col justify-center">
            <h1 className="mt-1 text-3xl font-extrabold leading-tight">Recolecciones</h1>
            <p className="text-sm font-medium text-white/90">
              Registro de material forestal
            </p>
          </div>
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
              <button
                key={record.id}
                type="button"
                onClick={() => onSelect(record.id)}
                className="w-full text-left"
              >
                <CollectionCard record={record} />
              </button>
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
        onClick={() => setView('form-step1')}
        className="fixed bottom-24 right-6 mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.98]"
      >
        <Icon name="plus" className="h-6 w-6" />
      </button>
    </div>
  )
}

export default CollectionsScreen
