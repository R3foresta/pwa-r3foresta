import { useEffect, useRef, useState } from 'react'
import Icon from '../../../components/Icon'
import { PlantacionService } from '../../../services/plantacion.service'
import type { Campania } from '../types/contracts'

type SelectorCampaniaProps = {
  valueId?: number
  onChange: (campania: Campania | null) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  error?: boolean
}

function SelectorCampania({
  valueId,
  onChange,
  label = 'Campaña',
  placeholder = 'Buscar campaña...',
  disabled = false,
  error = false,
}: SelectorCampaniaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [selected, setSelected] = useState<Campania | null>(null)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Campania[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Carga inicial de todas las campañas
  useEffect(() => {
    if (disabled) return

    let active = true
    const loadCampaigns = async () => {
      try {
        setLoading(true)
        setFetchError(null)
        const data = await PlantacionService.listCampanias()
        if (active) {
          setOptions(data)
        }
      } catch (err) {
        if (active) {
          setFetchError(
            err instanceof Error ? err.message : 'No se pudieron cargar las campañas.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadCampaigns()
    return () => {
      active = false
    }
  }, [disabled])

  // Manejar el click fuera para cerrar el menú desplegable
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node
      if (!containerRef.current?.contains(targetNode)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sincronizar el input de búsqueda con el elemento seleccionado si el menú está cerrado
  useEffect(() => {
    if (!open) {
      setSearch(selected?.nombre || '')
    }
  }, [open, selected])

  // Sincronizar el valor inicial / externo `valueId`
  useEffect(() => {
    if (!valueId) {
      setSelected(null)
      return
    }

    if (selected?.id === valueId) {
      return
    }

    const found = options.find((item) => item.id === valueId)
    if (found) {
      setSelected(found)
    } else if (options.length > 0) {
      // Si ya cargaron las opciones y no lo encuentra, resetear
      setSelected(null)
    }
  }, [options, valueId, selected?.id])

  const handleSelect = (campania: Campania) => {
    setSelected(campania)
    setSearch(campania.nombre)
    setOpen(false)
    onChange(campania)
  }

  const handleClear = () => {
    setSelected(null)
    setSearch('')
    setOpen(true)
    onChange(null)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setOpen(true)

    if (selected) {
      setSelected(null)
      onChange(null)
    }
  }

  // Filtrado local de opciones
  const filteredOptions = options.filter((campania) => {
    const query = search.toLowerCase().trim()
    if (!query) return true
    return (
      campania.nombre.toLowerCase().includes(query) ||
      (campania.codigo_trazabilidad || '').toLowerCase().includes(query)
    )
  })

  return (
    <div ref={containerRef} className="space-y-2">
      <p className="text-sm font-semibold text-brand-700">
        {label} <span className="text-red-500">*</span>
      </p>

      <div
        className={`rounded-2xl border bg-white px-4 py-3 shadow-soft ${
          error ? 'border-red-400 bg-red-50' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon name="search" className="h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full border-none bg-transparent text-sm font-semibold text-neutral-700 outline-none placeholder:font-medium placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {(search || selected) && !disabled ? (
            <button
              type="button"
              aria-label="Limpiar campaña seleccionada"
              onClick={handleClear}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
            >
              <Icon name="x" className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {open && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
            {loading ? (
              <p className="px-3 py-2 text-xs font-semibold text-brand-500">
                Buscando campañas...
              </p>
            ) : null}

            {!loading && fetchError && (
              <p className="px-3 py-2 text-xs font-semibold text-red-600">{fetchError}</p>
            )}

            {!loading && !fetchError && filteredOptions.length === 0 && (
              <p className="px-3 py-2 text-xs font-semibold text-neutral-500">
                No hay campañas para esta búsqueda.
              </p>
            )}

            {!loading &&
              !fetchError &&
              filteredOptions.map((campania) => (
                <button
                  key={campania.id}
                  type="button"
                  onClick={() => handleSelect(campania)}
                  className="flex w-full flex-col items-start gap-1 border-b border-neutral-100 px-3 py-2 text-left transition hover:bg-brand-50 last:border-b-0"
                >
                  <span className="text-sm font-semibold text-brand-700">{campania.nombre}</span>
                  <span className="text-xs font-medium text-neutral-500">
                    {campania.codigo_trazabilidad} | {campania.tipo}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SelectorCampania
