import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button, inputClasses } from '../../../components/ui'
import { ParticipacionService } from '../api/participacion.api'
import type { AccionBusqueda, PersonaMinima, PersonasLectura } from '../types'
import { EquipoMemberCard, EquipoSearchField } from '../../plantacion/components/EquipoVisual'
import { accessError } from './accessPresentation'

type Props = { action: AccionBusqueda; scopeIds: string[]; disabled: boolean; onSelect: (person: PersonaMinima) => void; excludeId?: string; variant?: 'default' | 'equipo' }

export default function AccessPersonSearch({ action, scopeIds, disabled, onSelect, excludeId, variant = 'default' }: Props) {
  const [mode, setMode] = useState<'NOMBRE' | 'CORREO_EXACTO'>('NOMBRE')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<{ key: string; page: PersonasLectura } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const queryKey = JSON.stringify([mode, query.trim().normalize('NFC')])
  const visible = result?.key === queryKey ? result.page : null
  useEffect(() => () => request.current?.abort(), [])

  async function search(cursor?: string) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError(null)
    try {
      const page = await ParticipacionService.buscar({ modo: mode, consulta: query.trim().normalize('NFC'), accion: action, subcampania_ids: scopeIds, limite: 20, ...(cursor ? { cursor } : {}) }, controller.signal)
      if (!controller.signal.aborted) setResult({ key: queryKey, page })
    } catch (failure) {
      if (!controller.signal.aborted) { setResult(null); setError(accessError(failure)) }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void search() }

  return <div className="space-y-3">
    {variant === 'default' && <p className="text-sm text-neutral-600">Busca una cuenta registrada. La afiliación es opcional y no concede permisos. Ante homónimos, usa el correo exacto para localizar a la persona.</p>}
    <form onSubmit={submit} className="space-y-2">
      {variant === 'equipo' ? <button type="button" className="text-xs font-semibold text-brand-700 underline" disabled={disabled || loading}
        onClick={() => { setMode(mode === 'NOMBRE' ? 'CORREO_EXACTO' : 'NOMBRE'); setQuery(''); setResult(null) }}>
        {mode === 'NOMBRE' ? 'Buscar por correo exacto' : 'Buscar por nombre'}
      </button> : <label className="block text-sm font-semibold text-brand-800">Buscar por<select aria-label="Buscar por" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} disabled={disabled || loading} className={inputClasses(false)}><option value="NOMBRE">Nombre</option><option value="CORREO_EXACTO">Correo exacto</option></select></label>}
      {variant === 'equipo' ? <EquipoSearchField value={query} onChange={setQuery} placeholder={mode === 'NOMBRE' ? 'Buscar por nombre…' : 'Correo exacto…'} ariaLabel={mode === 'NOMBRE' ? 'Nombre de la persona' : 'Correo exacto de la cuenta'} type={mode === 'NOMBRE' ? 'text' : 'email'} disabled={disabled || loading} />
        : <label className="block text-sm font-semibold text-brand-800">{mode === 'NOMBRE' ? 'Nombre de la persona' : 'Correo exacto de la cuenta'}<input value={query} onChange={(event) => setQuery(event.target.value)} type={mode === 'CORREO_EXACTO' ? 'email' : 'text'} minLength={mode === 'NOMBRE' ? 2 : undefined} maxLength={mode === 'NOMBRE' ? 100 : 254} required disabled={disabled || loading} autoComplete="off" className={inputClasses(false)} /></label>}
      <Button type="submit" variant="secondary" loading={loading} disabled={disabled || query.trim().length < (mode === 'NOMBRE' ? 2 : 3)}>{variant === 'equipo' ? 'Buscar' : 'Buscar persona registrada'}</Button>
    </form>
    {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
    {visible && <div aria-live="polite" className="space-y-2">
      {visible.data.length === 0 && <p className="rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-700">{variant === 'equipo' ? 'No encontramos esa cuenta. La persona debe registrarse antes de que puedas agregarla.' : 'No se encontraron cuentas. Coordina el registro de la persona por el canal acordado del piloto y vuelve a buscar. Esta pantalla no crea cuentas ni invitaciones.'}</p>}
      {variant === 'equipo' ? <ul className="space-y-2">{visible.data.map((person) => <EquipoMemberCard key={person.usuario_id} nombre={person.nombre} rol="Persona" subtitle={person.organizacion ?? 'Sin afiliación declarada'} action={<Button size="sm" variant="secondary" disabled={disabled || person.usuario_id === excludeId} onClick={() => onSelect(person)}>Seleccionar</Button>} />)}</ul> : visible.data.map((person) => <div key={person.usuario_id} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-3">
        <p className="text-sm"><strong className="block text-brand-800">{person.nombre}</strong><span className="text-neutral-600">{person.organizacion ?? 'Sin afiliación declarada'}</span><span className="block text-xs text-neutral-500">Cuenta {person.usuario_id}</span></p>
        <Button size="sm" variant="secondary" disabled={disabled || person.usuario_id === excludeId} onClick={() => onSelect(person)}>Seleccionar</Button>
      </div>)}
      {visible.siguiente_cursor && <Button variant="ghost" size="sm" loading={loading} disabled={disabled} onClick={() => void search(visible.siguiente_cursor!)}>Siguiente página de personas</Button>}
    </div>}
  </div>
}
