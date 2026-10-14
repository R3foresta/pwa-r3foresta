import { useEffect, useId, useState } from 'react'
import { Building2, Check, Search } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { inputClasses } from '../../../components/ui/form-classes'
import { ParticipacionProfileService, type OrganizacionSeleccionable } from '../participacion.service'

export function AfiliacionSelector({ selected, onSelect, disabled }: { selected: OrganizacionSeleccionable | null; onSelect: (org: OrganizacionSeleccionable) => void; disabled: boolean }) {
  const searchId = useId()
  const [consulta, setConsulta] = useState('')
  const [page, setPage] = useState({ consulta: '', cursor: null as string | null, attempt: 0 })
  const [items, setItems] = useState<OrganizacionSeleccionable[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const normalizedQuery = consulta.normalize('NFC').trim()
  const queryLength = [...normalizedQuery].length
  const validationError = queryLength === 1
    ? 'Escribe al menos 2 caracteres para buscar.'
    : queryLength > 100
      ? 'La búsqueda admite hasta 100 caracteres. Reduce el texto para continuar.'
      : ''

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const result = await ParticipacionProfileService.organizaciones(page.consulta, page.cursor, controller.signal)
        if (controller.signal.aborted) return
        setItems(previous => page.cursor ? [...previous, ...result.data.filter(row => !previous.some(item => item.organizacion_id === row.organizacion_id))] : result.data)
        setNext(result.siguiente_cursor)
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el catálogo')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [page])

  function loadPage(query: string, cursor: string | null = null) {
    setLoading(true)
    setError('')
    if (!cursor) {
      setItems([])
      setNext(null)
    }
    setPage(previous => ({ consulta: query, cursor, attempt: previous.attempt + 1 }))
  }

  function search() {
    if (!disabled && !validationError) loadPage(normalizedQuery)
  }

  function showCatalog() {
    setConsulta('')
    loadPage('')
  }

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3 sm:p-4">
      {selected && (
        <div aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Check aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-600">Organización seleccionada</p>
            <p className="break-words text-sm font-bold text-brand-800">{selected.nombre}</p>
            <p className="mt-1 text-xs text-brand-700">Puedes elegir otra organización en la lista.</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor={searchId} className="block text-sm font-semibold text-brand-700">Buscar organización</label>
        <div className="flex items-start gap-2">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
            <input
              id={searchId}
              type="search"
              value={consulta}
              onChange={event => setConsulta(event.target.value)}
              onKeyDown={event => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                if (!event.nativeEvent.isComposing) search()
              }}
              disabled={disabled}
              aria-invalid={Boolean(validationError)}
              aria-describedby={`${searchId}-hint`}
              className={`${inputClasses(Boolean(validationError))} min-h-12 pl-10 disabled:cursor-not-allowed disabled:opacity-60`}
              placeholder="Nombre de organización"
              autoComplete="off"
            />
          </div>
          <Button variant="secondary" disabled={disabled || Boolean(validationError)} onClick={search} className="min-h-12 shrink-0 px-3 sm:px-4">Buscar</Button>
        </div>
        <p id={`${searchId}-hint`} className={`text-xs leading-relaxed ${validationError ? 'font-semibold text-danger-600' : 'text-neutral-500'}`}>
          {validationError || 'Escribe de 2 a 100 caracteres o busca con el campo vacío para ver el catálogo.'}
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-3">
          <p className="text-sm font-semibold text-danger-700">{page.cursor ? 'No pudimos cargar más organizaciones.' : 'No pudimos cargar el catálogo.'}</p>
          <p className="mt-1 text-xs leading-relaxed text-danger-700">{error}</p>
          <Button variant="secondary" leftIcon="refresh" disabled={disabled || loading} onClick={() => loadPage(page.consulta, page.cursor)} className="mt-3 min-h-11">Reintentar</Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          <p className="break-words text-xs font-semibold text-neutral-500">
            {items.length} {items.length === 1 ? 'organización disponible' : 'organizaciones disponibles'}{page.consulta ? ` para «${page.consulta}»` : ''}
          </p>
          <ul aria-label="Organizaciones disponibles" className="max-h-72 space-y-2 overflow-y-auto overscroll-y-contain p-0.5">
            {items.map(item => {
              const isSelected = selected?.organizacion_id === item.organizacion_id
              return (
                <li key={item.organizacion_id}>
                  <button
                    type="button"
                    aria-label={item.nombre}
                    aria-pressed={isSelected}
                    disabled={disabled}
                    onClick={() => onSelect(item)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${isSelected ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-neutral-200 bg-white text-neutral-700 hover:border-brand-300 hover:bg-brand-50/50'}`}
                  >
                    <Building2 aria-hidden="true" className={`h-5 w-5 shrink-0 ${isSelected ? 'text-brand-600' : 'text-neutral-400'}`} />
                    <span className="min-w-0 flex-1 break-words text-sm font-semibold">{item.nombre}</span>
                    <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-neutral-300'}`}>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {loading && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-white px-3 py-4 text-sm text-neutral-500">
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 motion-reduce:animate-none" />
          {page.cursor ? 'Cargando más organizaciones…' : 'Consultando organizaciones…'}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div role="status" className="rounded-2xl border border-dashed border-neutral-200 bg-white px-4 py-5 text-center">
          <Building2 aria-hidden="true" className="mx-auto h-7 w-7 text-neutral-400" />
          <p className="mt-2 text-sm font-semibold text-neutral-700">{page.consulta ? 'No encontramos organizaciones con ese nombre.' : 'No hay organizaciones disponibles por ahora.'}</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">{page.consulta ? 'Prueba otro nombre o consulta el catálogo completo.' : 'Puedes continuar sin afiliación o elegir Otra organización.'}</p>
        </div>
      )}

      {next && !error && (
        <Button variant="secondary" fullWidth loading={loading} disabled={disabled} onClick={() => loadPage(page.consulta, next)} className="min-h-11">Ver más organizaciones</Button>
      )}
      {page.consulta && (
        <Button variant="ghost" fullWidth disabled={disabled} onClick={showCatalog} className="min-h-11">Ver catálogo completo</Button>
      )}
    </div>
  )
}
