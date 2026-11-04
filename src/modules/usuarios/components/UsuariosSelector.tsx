import { useEffect, useRef } from 'react'
import Icon from '../../../components/Icon'
import { Badge, Button, Card, inputClasses } from '../../../components/ui'
import type { useUsuariosAdministracion } from '../hooks/useUsuariosAdministracion'
import { ROLES_GLOBALES, type RolGlobal, type UsuarioAdministracion } from '../types'
import { ROLE_LABELS } from './rolesPresentation'

type Props = {
  search: string
  roleFilter: RolGlobal | ''
  searchValid: boolean
  dirtyFilters: boolean
  locked: boolean
  focusSearch: boolean
  users: ReturnType<typeof useUsuariosAdministracion>
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: RolGlobal | '') => void
  onSearch: () => void
  onRefresh: () => void
  onRetry: () => void
  onSelect: (person: UsuarioAdministracion) => void
}

export default function UsuariosSelector({ search, roleFilter, searchValid, dirtyFilters, locked, focusSearch, users, onSearchChange, onRoleFilterChange, onSearch, onRefresh, onRetry, onSelect }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (focusSearch) searchRef.current?.focus()
  }, [focusSearch])

  return <Card as="section" padding="none" aria-labelledby="usuarios-selector-title" className="overflow-hidden">
    <div className="space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="usuarios-selector-title" className="font-bold text-brand-800">Escoger usuario</h2>
        <Button variant="ghost" className="min-h-11 min-w-11 px-3" disabled={locked} aria-label="Actualizar lista" title="Actualizar lista" onClick={onRefresh}>
          <span aria-hidden="true"><Icon name="refresh" className="h-4 w-4" /></span>
        </Button>
      </div>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (!locked && searchValid) onSearch() }}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <label className="block space-y-1.5 text-sm font-semibold text-brand-800">
            <span>Buscar por nombre o usuario</span>
            <input ref={searchRef} value={search} maxLength={100} disabled={locked} onChange={(event) => onSearchChange(event.target.value)} className={inputClasses(!searchValid)} placeholder="Nombre o @usuario" autoComplete="off" aria-invalid={!searchValid} aria-describedby={!searchValid ? 'usuarios-search-error' : undefined} />
          </label>
          <Button type="submit" disabled={locked || !searchValid} aria-label="Buscar usuarios" className="min-h-11">Buscar</Button>
        </div>
        {!searchValid && <p id="usuarios-search-error" className="text-xs text-danger-700">Escribe al menos 2 caracteres o deja la búsqueda vacía.</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-neutral-600">
            <span aria-hidden="true"><Icon name="filter" className="h-4 w-4 shrink-0" /></span>
            <span className="sr-only">Filtrar por rol</span>
            <select value={roleFilter} disabled={locked} onChange={(event) => onRoleFilterChange(event.target.value as RolGlobal | '')} className="min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:w-auto">
              <option value="">Todos los roles</option>
              {ROLES_GLOBALES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
            </select>
          </label>
          {!users.loading && !users.error && <p className="text-xs text-neutral-500">{users.rows.length} {users.rows.length === 1 ? 'usuario' : 'usuarios'}{users.cursor ? ' · hay más' : ''}</p>}
        </div>
      </form>
      {dirtyFilters && <p className="text-xs text-neutral-600">Aplica la búsqueda para escoger una cuenta.</p>}
      {users.loading && <p role="status" className="text-sm text-neutral-600">Consultando usuarios…</p>}
      {users.error && <div className="space-y-2"><p role="alert" className="text-sm text-danger-700">{users.error}</p><Button variant="secondary" onClick={onRetry}>{users.sessionExpired ? 'Recuperar sesión con passkey' : 'Reintentar lista'}</Button></div>}
      {!users.loading && !users.error && users.rows.length === 0 && <p className="py-4 text-sm text-neutral-600">No hay usuarios activos que coincidan con la búsqueda.</p>}
    </div>
    <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
      {users.rows.map((person) => <li key={person.usuario_id}>
        <button type="button" disabled={locked || dirtyFilters} aria-label={`Seleccionar a ${person.nombre} (${person.username ?? person.usuario_id})`} onClick={() => onSelect(person)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5">
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-semibold text-brand-800">{person.nombre}</span>
            <span className="block break-all text-xs text-neutral-500">{person.username ? `@${person.username}` : `Cuenta ${person.usuario_id}`}</span>
          </span>
          <Badge size="sm" variant={person.rol_global === 'ADMIN' ? 'brand' : 'neutral'}>{ROLE_LABELS[person.rol_global]}</Badge>
          <span aria-hidden="true"><Icon name="chevron-right" className="h-4 w-4 shrink-0 text-neutral-400" /></span>
        </button>
      </li>)}
    </ul>
    {(users.moreError || users.cursor) && <div className="space-y-2 border-t border-neutral-100 p-4">
      {users.moreError && <p role="alert" className="text-sm text-danger-700">{users.moreError}</p>}
      {users.cursor && <Button variant="secondary" fullWidth disabled={locked || dirtyFilters} loading={users.loadingMore} onClick={() => void users.loadMore()}>{users.moreError ? 'Reintentar siguiente página' : 'Cargar más usuarios'}</Button>}
    </div>}
  </Card>
}
