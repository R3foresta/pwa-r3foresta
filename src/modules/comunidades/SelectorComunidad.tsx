import { useEffect, useRef, useState } from 'react'
import { listarComunidades, obtenerComunidad } from '../../api/comunidades.api'
import Icon from '../../components/Icon'
import type { ComunidadCard } from '../../tipos/comunidades'

type SelectorComunidadProps = {
  paisId: number | string
  valueId?: number
  onChange: (comunidad: ComunidadCard | null) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  error?: boolean
}

const SEARCH_DEBOUNCE_MS = 300

function buildRutaCorta(comunidad: ComunidadCard): string {
  return [
    comunidad.nivel3?.nombre,
    comunidad.nivel2?.nombre,
    comunidad.nivel1?.nombre,
  ]
    .filter(Boolean)
    .join(' / ')
}

function SelectorComunidad({
  paisId,
  valueId,
  onChange,
  label = 'Comunidad',
  placeholder = 'Buscar comunidad...',
  disabled = false,
  error = false,
}: SelectorComunidadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const requestCounterRef = useRef(0)

  const [selected, setSelected] = useState<ComunidadCard | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [options, setOptions] = useState<ComunidadCard[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [search])

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

  useEffect(() => {
    if (!open) {
      setSearch(selected?.nombre || '')
    }
  }, [open, selected])

  useEffect(() => {
    if (!paisId || disabled) {
      setOptions([])
      setFetchError(null)
      return
    }

    const requestId = ++requestCounterRef.current

    const loadOptions = async () => {
      try {
        setLoading(true)
        setFetchError(null)

        const response = await listarComunidades({
          paisId,
          q: searchDebounced || undefined,
          page: 1,
          limit: 20,
          incluirInactivas: false,
        })

        if (requestId !== requestCounterRef.current) {
          return
        }

        setOptions(response.data ?? [])
      } catch (error) {
        if (requestId !== requestCounterRef.current) {
          return
        }

        setOptions([])
        setFetchError(
          error instanceof Error ? error.message : 'No se pudieron cargar comunidades.',
        )
      } finally {
        if (requestId === requestCounterRef.current) {
          setLoading(false)
        }
      }
    }

    void loadOptions()
  }, [disabled, open, paisId, searchDebounced])

  useEffect(() => {
    if (!valueId) {
      setSelected(null)
      return
    }

    if (selected?.id === valueId) {
      return
    }

    const fromOptions = options.find((item) => item.id === valueId)
    if (fromOptions) {
      setSelected(fromOptions)
      return
    }

    let isActive = true
    const loadSelected = async () => {
      try {
        const response = await obtenerComunidad(valueId)
        if (!isActive || !response.data) {
          return
        }
        setSelected(response.data)
      } catch {
        if (isActive) {
          setSelected(null)
        }
      }
    }

    void loadSelected()
    return () => {
      isActive = false
    }
  }, [options, selected?.id, valueId])

  const handleSelect = (comunidad: ComunidadCard) => {
    setSelected(comunidad)
    setSearch(comunidad.nombre)
    setOpen(false)
    onChange(comunidad)
  }

  const handleClear = () => {
    setSelected(null)
    setSearch('')
    setSearchDebounced('')
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

  return (
    <div ref={containerRef} className="space-y-2">
      <p className="text-sm font-semibold text-brand-700">
        {label} <span className="text-red-500">*</span>
      </p>

      <div
        className={`rounded-2xl border bg-white px-4 py-3 shadow-soft ${
          error ? 'border-red-400 bg-red-50' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon name="search" className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full border-none bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {(search || selected) && !disabled ? (
            <button
              type="button"
              aria-label="Limpiar comunidad seleccionada"
              onClick={handleClear}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <Icon name="x" className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {open && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="px-3 py-2 text-xs font-semibold text-brand-500">
                Buscando comunidades...
              </p>
            ) : null}

            {!loading && fetchError && (
              <p className="px-3 py-2 text-xs font-semibold text-red-600">{fetchError}</p>
            )}

            {!loading && !fetchError && options.length === 0 && (
              <p className="px-3 py-2 text-xs font-semibold text-slate-500">
                No hay comunidades para esta busqueda.
              </p>
            )}

            {!loading &&
              !fetchError &&
              options.map((comunidad) => (
                <button
                  key={comunidad.id}
                  type="button"
                  onClick={() => handleSelect(comunidad)}
                  className="flex w-full flex-col items-start gap-1 border-b border-slate-100 px-3 py-2 text-left transition hover:bg-brand-50 last:border-b-0"
                >
                  <span className="text-sm font-semibold text-brand-700">{comunidad.nombre}</span>
                  <span className="text-xs font-medium text-slate-500">
                    {buildRutaCorta(comunidad) || 'Sin ruta de niveles previos'}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SelectorComunidad
