import { useEffect, useRef, useState } from 'react'
import { Button, Card, inputClasses } from '../../../../components/ui'
import { RegistroParticipacionService } from '../../api/registro.api'
import type { PersonaMinima, PersonasLectura } from '../../types'

type Props = { actorId: string; scopeId: string; selected: string[]; disabled: boolean; onChange: (ids: string[]) => void; onNames: (people: PersonaMinima[]) => void }

export default function RegistroParticipants({ actorId, scopeId, selected, disabled, onChange, onNames }: Props) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState<PersonasLectura | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const namesCallback = useRef(onNames)
  useEffect(() => { namesCallback.current = onNames }, [onNames])
  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    RegistroParticipacionService.participantes(actorId, scopeId, { limite: 20 }, controller.signal).then((response) => {
      if (!controller.signal.aborted) { setPage(response); namesCallback.current(response.data) }
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'No se pudo consultar las personas habilitadas.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort(); controllerRef.current?.abort() }
  }, [actorId, scopeId])

  async function load(cursor?: string) {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true); setError(null)
    try {
      const response = await RegistroParticipacionService.participantes(actorId, scopeId, { limite: 20, ...(query.trim() ? { q: query.trim().normalize('NFC') } : {}), ...(cursor ? { cursor } : {}) }, controller.signal)
      if (!controller.signal.aborted) { setPage(response); namesCallback.current(response.data) }
    } catch (failure) {
      if (!controller.signal.aborted) { setPage(null); setError(failure instanceof Error ? failure.message : 'No se pudo consultar las personas habilitadas.') }
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }

  return <Card as="section" className="space-y-3">
    <h2 className="font-bold text-brand-800">Otras personas participantes (opcional)</h2>
    <p className="text-sm text-neutral-600">Solo cuentas registradas y habilitadas en esta subcampaña. Elegir personas no guarda ni multiplica las cantidades. El servidor revalida el conjunto.</p>
    <form onSubmit={(event) => { event.preventDefault(); void load() }} className="space-y-2"><label className="block text-sm font-semibold text-brand-800">Buscar participante por nombre<input value={query} maxLength={100} disabled={disabled || loading} onChange={(event) => setQuery(event.target.value)} className={inputClasses(false)} /></label><Button type="submit" size="sm" variant="secondary" disabled={disabled} loading={loading}>Consultar personas habilitadas</Button></form>
    {error && <p role="alert" className="text-sm text-danger-700">{error} Puedes conservar la selección y volver a consultar.</p>}
    {loading && <p role="status" className="text-sm text-neutral-600">Consultando participantes…</p>}
    {!loading && page?.data.length === 0 && <p className="text-sm text-neutral-600">No hay más personas disponibles con esta búsqueda.</p>}
    <fieldset disabled={disabled || loading} className="space-y-2"><legend className="sr-only">Personas adicionales habilitadas</legend>{page?.data.filter((person) => person.usuario_id !== actorId).map((person) => <label key={person.usuario_id} className="flex gap-3 rounded-2xl border border-neutral-200 p-3 text-sm"><input type="checkbox" checked={selected.includes(person.usuario_id)} disabled={!selected.includes(person.usuario_id) && selected.length >= 100} onChange={() => onChange(selected.includes(person.usuario_id) ? selected.filter((id) => id !== person.usuario_id) : [...selected, person.usuario_id])} className="accent-brand-600" /><span><strong className="block text-brand-800">{person.nombre}</strong><span className="text-neutral-600">{person.organizacion ?? 'Sin afiliación declarada'}</span><span className="block text-xs text-neutral-500">Cuenta {person.usuario_id}</span></span></label>)}</fieldset>
    {page?.siguiente_cursor && <Button variant="ghost" size="sm" disabled={disabled} loading={loading} onClick={() => void load(page.siguiente_cursor!)}>Siguiente página de participantes</Button>}
    <p className="text-xs font-semibold text-brand-700">{selected.length}/100 personas adicionales seleccionadas.</p>
  </Card>
}
