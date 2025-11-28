import { useState } from 'react'
import Icon from '../../components/Icon'
import { methodOptions, speciesOptions } from './data'
import type { CollectionType } from './types'

type Props = {
  onBack: () => void
}

function NewCollectionForm({ onBack }: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<CollectionType>('seed')
  const [species, setSpecies] = useState('')
  const [method, setMethod] = useState('')
  const [quantity, setQuantity] = useState(3)
  const [unit, setUnit] = useState<'Kg' | 'Unidades'>('Kg')
  const [notes, setNotes] = useState('')
  const [isNewFind, setIsNewFind] = useState(false)

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

export default NewCollectionForm
