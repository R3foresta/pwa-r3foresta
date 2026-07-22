import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../../components/Icon'
import { PlantacionService } from '../../../services/plantacion.service'
import { UsersService } from '../../../services/users.service'
import type { UsuarioResumen } from '../../../types/users'
import type { EquipoMember, Subcampania } from '../types/contracts'
import { formatDate } from '../utils/subcampaniaFormatters'
import { UserAvatar } from './UserAvatar'

const SEARCH_DEBOUNCE_MS = 300

// Nota de negocio: la gestión de equipo va por su propio servicio
// (POST/DELETE /subcampanias/:id/equipo) y NO está sujeta a
// `EdicionPorEstadoPolicy` (que solo aplica al PATCH de la subcampaña), por eso
// `canManage` puede ser true incluso con la subcampaña ACTIVA. El coordinador
// no se puede cambiar desde acá; solo se agregan/quitan operarios (el backend
// además rechaza quitar al coordinador mientras está ACTIVA, caso que acá nunca
// se ofrece). El padre decide `canManage` — ver EQUIPO_EDITABLE_ESTADOS.

function RolBadge({ rol }: { rol: EquipoMember['rol'] }) {
  if (rol === 'COORDINADOR') {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-100">
        Coordinador
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-600 ring-1 ring-brand-100">
      Operario
    </span>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

type Props = {
  subcampania: Subcampania
  equipo: EquipoMember[]
  /** true solo si el usuario es ADMIN y el estado permite gestionar el equipo. */
  canManage: boolean
  authId?: string
  /** Sube el equipo actualizado al padre (estado compartido con el resto del detalle). */
  onEquipoChange: (members: EquipoMember[]) => void
}

export function SubcampaniaEquipoManager({
  subcampania,
  equipo,
  canManage,
  authId,
  onEquipoChange,
}: Props) {
  const [editing, setEditing] = useState(false)

  // Buscador de operarios a agregar
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UsuarioResumen[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Errores/estado de mutación
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const searchRequestRef = useRef(0)

  const coordinador = useMemo(
    () => equipo.find((m) => m.rol === 'COORDINADOR') ?? null,
    [equipo],
  )
  const operarios = useMemo(
    () => equipo.filter((m) => m.rol === 'OPERARIO'),
    [equipo],
  )

  const busy = addingId !== null || removingId !== null

  // Si el estado deja de permitir gestión (o el usuario deja de ser admin),
  // salimos del modo edición para no dejar controles colgados.
  useEffect(() => {
    if (!canManage && editing) setEditing(false)
  }, [canManage, editing])

  // Debounce del buscador
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  // Buscar usuarios (solo mientras se edita)
  useEffect(() => {
    if (!editing) return

    const requestId = ++searchRequestRef.current
    setSearchLoading(true)
    setSearchError(null)

    UsersService.listUsers(debouncedQuery || undefined)
      .then((users) => {
        if (requestId !== searchRequestRef.current) return
        setSearchResults(users)
      })
      .catch((err) => {
        if (requestId !== searchRequestRef.current) return
        setSearchResults([])
        setSearchError(
          err instanceof Error ? err.message : 'No se pudieron cargar usuarios.',
        )
      })
      .finally(() => {
        if (requestId === searchRequestRef.current) setSearchLoading(false)
      })
  }, [editing, debouncedQuery])

  // Excluir del buscador a quienes ya están en el equipo (coordinador incluido).
  const visibleSearchResults = useMemo(() => {
    const ids = new Set(equipo.map((m) => m.usuario_id))
    return searchResults.filter((u) => !ids.has(u.id))
  }, [searchResults, equipo])

  const handleToggleEditing = () => {
    setMutationError(null)
    setSearchError(null)
    setQuery('')
    setEditing((prev) => !prev)
  }

  const handleAddOperario = async (usuario: UsuarioResumen) => {
    setMutationError(null)
    setAddingId(usuario.id)

    const prevEquipo = equipo
    const optimisticMember: EquipoMember = {
      id: -Date.now(),
      usuario_id: usuario.id,
      nombre_usuario: usuario.nombre,
      rol: 'OPERARIO',
      foto_perfil_url: usuario.foto_perfil_url ?? null,
    }
    onEquipoChange([...equipo, optimisticMember])
    setQuery('')

    try {
      const members = await PlantacionService.setSubcampaniaEquipo(
        subcampania.id,
        [{ usuario_id: usuario.id, rol: 'OPERARIO' }],
        authId,
      )
      // El POST devuelve el equipo completo actualizado. Solo lo usamos si trae
      // al menos tantos miembros como el optimista (evita pisar el equipo si el
      // backend respondiera con una lista parcial).
      if (members.length >= prevEquipo.length + 1) {
        onEquipoChange(members)
      }
    } catch (err) {
      onEquipoChange(prevEquipo)
      setMutationError(
        err instanceof Error ? err.message : 'No se pudo agregar el operario.',
      )
    } finally {
      setAddingId(null)
    }
  }

  const handleRemoveOperario = async (usuarioId: number) => {
    setMutationError(null)
    setRemovingId(usuarioId)

    const prevEquipo = equipo
    onEquipoChange(equipo.filter((m) => m.usuario_id !== usuarioId))

    try {
      await PlantacionService.removeSubcampaniaEquipoMember(
        subcampania.id,
        usuarioId,
        authId,
      )
    } catch (err) {
      onEquipoChange(prevEquipo)
      setMutationError(
        err instanceof Error ? err.message : 'No se pudo quitar el operario.',
      )
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Encabezado + toggle de edición */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          {equipo.length} {equipo.length === 1 ? 'miembro' : 'miembros'}
        </p>
        {canManage && (
          <button
            type="button"
            onClick={handleToggleEditing}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${
              editing
                ? 'bg-brand-600 text-white shadow-soft hover:bg-brand-700'
                : 'bg-white text-brand-700 ring-1 ring-brand-100 shadow-soft hover:bg-brand-50'
            }`}
          >
            <Icon name={editing ? 'check' : 'user'} className="h-3.5 w-3.5" />
            {editing ? 'Listo' : 'Editar equipo'}
          </button>
        )}
      </div>

      {mutationError && (
        <p className="whitespace-pre-line rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
          {mutationError}
        </p>
      )}

      {/* Coordinador (siempre de solo lectura) */}
      {coordinador && (
        <section className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <UserAvatar
              nombre={coordinador.nombre_usuario ?? 'C'}
              fotoUrl={coordinador.foto_perfil_url}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-extrabold text-amber-700"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-extrabold leading-tight text-brand-800">
                  {coordinador.nombre_usuario ?? `Usuario #${coordinador.usuario_id}`}
                </p>
                <RolBadge rol="COORDINADOR" />
              </div>
              {coordinador.agregado_at && (
                <p className="mt-0.5 text-[10.5px] font-bold text-neutral-500">
                  Desde {formatDate(coordinador.agregado_at.slice(0, 10))}
                </p>
              )}
            </div>
            {editing && (
              <span className="shrink-0 rounded-full bg-neutral-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-neutral-400 ring-1 ring-neutral-100">
                Fijo
              </span>
            )}
          </div>
        </section>
      )}

      {/* Operarios */}
      <div className="flex items-baseline justify-between">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Operarios
        </p>
        <p className="text-[11px] font-extrabold tabular-nums text-neutral-500">
          {operarios.length} asignado{operarios.length !== 1 ? 's' : ''}
        </p>
      </div>

      {operarios.length === 0 ? (
        <section className="rounded-2xl bg-white p-5 text-center shadow-soft ring-1 ring-black/5">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-50 text-neutral-400">
            <Icon name="user" className="h-5 w-5" />
          </div>
          <p className="mt-2 text-sm font-extrabold text-brand-800">
            Sin operarios asignados
          </p>
          {canManage && !editing && (
            <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-neutral-500">
              Tocá “Editar equipo” para agregar operarios.
            </p>
          )}
        </section>
      ) : (
        <ul className="space-y-2">
          {operarios.map((operario) => (
            <li
              key={operario.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5"
            >
              <UserAvatar
                nombre={operario.nombre_usuario ?? 'U'}
                fotoUrl={operario.foto_perfil_url}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-700"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-extrabold leading-tight text-brand-800">
                    {operario.nombre_usuario ?? `Usuario #${operario.usuario_id}`}
                  </p>
                  <RolBadge rol="OPERARIO" />
                </div>
                {operario.agregado_at && (
                  <p className="mt-0.5 text-[10.5px] font-bold text-neutral-500">
                    Desde {formatDate(operario.agregado_at.slice(0, 10))}
                  </p>
                )}
              </div>
              {editing && canManage && (
                <button
                  type="button"
                  onClick={() => void handleRemoveOperario(operario.usuario_id)}
                  disabled={busy}
                  aria-label={`Quitar operario ${operario.nombre_usuario ?? operario.usuario_id}`}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10.5px] font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                >
                  {removingId === operario.usuario_id ? (
                    <Spinner className="h-3 w-3 animate-spin" />
                  ) : (
                    <Icon name="trash" className="h-3 w-3" />
                  )}
                  {removingId === operario.usuario_id ? 'Quitando…' : 'Quitar'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Buscador para agregar operarios (solo en modo edición) */}
      {editing && canManage && (
        <section className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Agregar operario
          </p>

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-3 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <Icon name="search" className="h-4 w-4 shrink-0 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar usuario…"
              className="w-full border-none bg-transparent text-sm font-semibold text-neutral-700 outline-none placeholder:font-medium placeholder:text-neutral-400"
            />
            {query && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery('')}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
              >
                <Icon name="x" className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="mt-2">
            {searchLoading && (
              <p className="px-1 py-2 text-xs font-semibold text-neutral-400">Buscando…</p>
            )}

            {!searchLoading && searchError && (
              <p className="whitespace-pre-line rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
                {searchError}
              </p>
            )}

            {!searchLoading && !searchError && visibleSearchResults.length === 0 && (
              <p className="px-1 py-2 text-xs font-semibold text-neutral-500">
                {debouncedQuery
                  ? 'Sin resultados para la búsqueda.'
                  : 'Escribe para buscar usuarios disponibles.'}
              </p>
            )}

            {!searchLoading && !searchError && visibleSearchResults.length > 0 && (
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {visibleSearchResults.map((usuario) => (
                  <button
                    key={usuario.id}
                    type="button"
                    onClick={() => void handleAddOperario(usuario)}
                    disabled={busy}
                    className="flex w-full items-center gap-3 rounded-2xl border border-neutral-100 bg-white px-3 py-2.5 text-left transition hover:bg-brand-50 hover:ring-1 hover:ring-brand-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    <UserAvatar
                      nombre={usuario.nombre}
                      fotoUrl={usuario.foto_perfil_url}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-700"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-brand-800">
                        {usuario.nombre}
                      </span>
                      <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500">
                        {usuario.rol}
                      </span>
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700">
                      {addingId === usuario.id ? (
                        <Spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon name="plus" className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default SubcampaniaEquipoManager
