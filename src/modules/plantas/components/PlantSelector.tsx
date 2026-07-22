import { useMemo, useState } from 'react'
import Icon from '../../../components/Icon'
import type { PlantaCatalogo } from '../../../types/plantas.types'
import { withImageVersion } from '../../../utils/imageUrl'

type Props = {
  plantas: PlantaCatalogo[]
  loading: boolean
  onSelect: (planta: PlantaCatalogo) => void
  onCreateNew?: () => void
}

function PlantSelector({ plantas, loading, onSelect, onCreateNew }: Props) {
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return plantas
    const term = searchTerm.toLowerCase()
    return plantas.filter((p) => {
      const haystack = [
        p.nombre_comun_principal,
        p.especie,
        p.nombre_cientifico,
        p.nombres_comunes,
        p.variedad,
      ]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [plantas, searchTerm])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar especie..."
          className="w-full rounded-2xl border border-neutral-200 bg-white pl-12 pr-4 py-3 text-base font-semibold text-neutral-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {/* 3. RENDERIZADO CONDICIONAL: Solo mostramos el botón si se pasó la función onCreateNew */}
      {onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 py-4 text-brand-600 transition hover:bg-brand-50 active:scale-[0.99]"
        >
          <Icon name="plus" className="h-5 w-5" />
          <span className="text-base font-extrabold">Añadir nueva planta</span>
        </button>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm font-semibold text-neutral-500 text-center py-4">Cargando catálogo...</p>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-neutral-500">No se encontraron plantas</p>
          </div>
        ) : (
          filtered.map((planta) => {
            const imageUrl = withImageVersion(planta.imagen_url, planta.updated_at)
            return (
            <button
              key={planta.id}
              type="button"
              onClick={() => onSelect(planta)}
              className="w-full flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-soft transition hover:border-brand-300 hover:bg-brand-50 active:scale-[0.99]"
            >
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={planta.nombre_comun_principal || planta.especie}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Icon name="photo" className="h-8 w-8 text-neutral-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-extrabold text-brand-700">
                  {/* Priorizamos el nombre común principal */}
                  {planta.nombre_comun_principal || planta.especie || 'Sin nombre común'}
                </p>
                <p className="text-sm font-semibold text-neutral-500 italic">
                  {planta.nombre_cientifico}
                </p>
              </div>
              {planta.tipo_planta && (
                <div className="rounded-xl border border-brand-500 bg-brand-50 text-brand-600 px-3 py-1.5 text-xs font-bold">
                  {planta.tipo_planta}
                </div>
              )}
            </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default PlantSelector
