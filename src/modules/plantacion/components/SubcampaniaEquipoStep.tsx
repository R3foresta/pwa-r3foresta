import { useEffect, useRef, useState } from 'react'
import Icon from '../../../components/Icon'
import { PlantacionService } from '../../../services/plantacion.service'
import { UsersService } from '../../../services/users.service'
import type { UsuarioResumen } from '../../../types/users'
import type { Campania, EquipoMember } from '../types/contracts'
import {
  loadSubcampaniaBaseDraft,
  saveSubcampaniaBaseDraft,
} from '../utils/subcampaniaDraft'

type Props = {
  campania: Campania
  draftId: string
  authId?: string
  onDraftSaved: () => void
  onBackToPolygon: () => void
  onNext: () => void
}

const SEARCH_DEBOUNCE_MS = 300

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function SubcampaniaEquipoStep({
  campania,
  draftId,
  authId,
  onDraftSaved,
  onBackToPolygon,
  onNext,
}: Props) {
  const draft = loadSubcampaniaBaseDraft(campania.id, draftId)
  const subcampaniaId = draft?.subcampania_id ?? null

  // Equipo cargado desde backend
  const [loadingEquipo, setLoadingEquipo] = useState(false)
  const [equipoError, setEquipoError] = useState<string | null>(null)
  const [coordinador, setCoordinador] = useState<EquipoMember | null>(null)
  const [operarios, setOperarios] = useState<EquipoMember[]>([])

  // Buscador de nuevos operarios
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UsuarioResumen[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Errores de mutación
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)

  const searchRequestRef = useRef(0)
  const equipoRequestRef = useRef(0)

  // Cargar equipo al montar
  useEffect(() => {
    if (!subcampaniaId) return

    const requestId = ++equipoRequestRef.current
    setLoadingEquipo(true)
    setEquipoError(null)

    PlantacionService.getSubcampaniaEquipo(subcampaniaId, authId)
      .then((members) => {
        if (requestId !== equipoRequestRef.current) return
        setCoordinador(members.find((m) => m.rol === 'COORDINADOR') ?? null)
        setOperarios(members.filter((m) => m.rol === 'OPERARIO'))
      })
      .catch((err) => {
        if (requestId !== equipoRequestRef.current) return
        setEquipoError(err instanceof Error ? err.message : 'No se pudo cargar el equipo.')
      })
      .finally(() => {
        if (requestId === equipoRequestRef.current) setLoadingEquipo(false)
      })
  }, [subcampaniaId, authId])

  // Debounce del buscador
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  // Buscar usuarios
  useEffect(() => {
    const requestId = ++searchRequestRef.current
    setSearchLoading(true)
    setSearchError(null)

    UsersService.listUsers(debouncedQuery || undefined)
      .then((users) => {
        if (requestId !== searchRequestRef.current) return
        const coordinadorId = coordinador?.usuario_id
        const operariosIds = new Set(operarios.map((o) => o.usuario_id))
        const filtered = users.filter(
          (u) => u.id !== coordinadorId && !operariosIds.has(u.id),
        )
        setSearchResults(filtered)
      })
      .catch((err) => {
        if (requestId !== searchRequestRef.current) return
        setSearchResults([])
        setSearchError(err instanceof Error ? err.message : 'No se pudieron cargar usuarios.')
      })
      .finally(() => {
        if (requestId === searchRequestRef.current) setSearchLoading(false)
      })
  }, [debouncedQuery, coordinador, operarios])

  const persistOperariosInDraft = (nextOperarios: EquipoMember[]) => {
    const currentDraft = loadSubcampaniaBaseDraft(campania.id, draftId)
    if (!currentDraft) return
    saveSubcampaniaBaseDraft({
      ...currentDraft,
      equipo_operarios: nextOperarios.map((o) => ({
        id: o.usuario_id,
        nombre: o.nombre_usuario ?? '',
        rol: 'OPERARIO',
        updated_at: new Date().toISOString(),
      })),
      updated_at: new Date().toISOString(),
    })
  }

  const handleAddOperario = async (usuario: UsuarioResumen) => {
    if (!subcampaniaId) return
    setMutationError(null)
    setAddingId(usuario.id)
    try {
      const members = await PlantacionService.setSubcampaniaEquipo(
        subcampaniaId,
        [{ usuario_id: usuario.id, rol: 'OPERARIO' }],
        authId,
      )
      const newOperarios = members.filter((m) => m.rol === 'OPERARIO')
      setOperarios(newOperarios)
      persistOperariosInDraft(newOperarios)
      // Quitar de resultados de búsqueda
      setSearchResults((prev) => prev.filter((u) => u.id !== usuario.id))
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : 'No se pudo agregar el operario.',
      )
    } finally {
      setAddingId(null)
    }
  }

  const handleRemoveOperario = async (usuarioId: number) => {
    if (!subcampaniaId) return
    setMutationError(null)
    setRemovingId(usuarioId)
    try {
      await PlantacionService.removeSubcampaniaEquipoMember(subcampaniaId, usuarioId, authId)
      const nextOperarios = operarios.filter((o) => o.usuario_id !== usuarioId)
      setOperarios(nextOperarios)
      persistOperariosInDraft(nextOperarios)
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : 'No se pudo quitar el operario.',
      )
    } finally {
      setRemovingId(null)
    }
  }

  const handleDraftSaved = () => {
    persistOperariosInDraft(operarios)
    onDraftSaved()
  }

  // Sin draft → warning
  if (!draft || !subcampaniaId) {
    return (
      <>
        <main className="space-y-4 px-5 pt-4">
          <section className="rounded-3xl bg-amber-50 p-4 shadow-soft ring-1 ring-amber-100">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <Icon name="info" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-amber-950">
                  La subcampaña aún no fue creada
                </p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-amber-900">
                  Completa y guarda los pasos anteriores antes de asignar el equipo.
                </p>
              </div>
            </div>
          </section>
        </main>
        <div className="px-5">
          <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
            <button
              type="button"
              onClick={onBackToPolygon}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99]"
            >
              Volver al paso anterior
            </button>
          </div>
        </div>
      </>
    )
  }

  const totalMiembros = (coordinador ? 1 : 0) + operarios.length
  const allMembers = coordinador ? [coordinador, ...operarios] : operarios

  return (
    <>
      <main className="space-y-4 px-5 pt-4">

        {/* Resumen del equipo */}
        <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-4 text-white shadow-soft">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">
            Equipo asignado
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex -space-x-2">
              {allMembers.slice(0, 5).map((m) => (
                <span
                  key={m.usuario_id}
                  title={m.nombre_usuario ?? String(m.usuario_id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-extrabold text-white ring-2 ring-brand-600"
                >
                  {getInitials(m.nombre_usuario ?? '?')}
                </span>
              ))}
              {allMembers.length > 5 && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-extrabold text-white ring-2 ring-brand-600">
                  +{allMembers.length - 5}
                </span>
              )}
              {allMembers.length === 0 && (
                <span className="text-sm font-semibold text-white/70">Sin miembros aún</span>
              )}
            </div>
            {totalMiembros > 0 && (
              <p className="text-sm font-extrabold text-white">
                {totalMiembros} {totalMiembros === 1 ? 'miembro' : 'miembros'}
              </p>
            )}
          </div>
        </section>

        {/* Coordinador */}
        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Coordinador
          </p>

          {loadingEquipo && (
            <p className="mt-2 text-xs font-semibold text-slate-400">Cargando equipo…</p>
          )}

          {!loadingEquipo && equipoError && (
            <p className="mt-2 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
              {equipoError}
            </p>
          )}

          {!loadingEquipo && !equipoError && coordinador && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-brand-50 px-3 py-3 ring-1 ring-brand-100">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-200 text-xs font-extrabold text-brand-800">
                {getInitials(coordinador.nombre_usuario ?? '?')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-brand-800">
                  {coordinador.nombre_usuario ?? `Usuario ${coordinador.usuario_id}`}
                </p>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-brand-500">
                  Coordinador · Asignado en paso 1
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                COORD
              </span>
            </div>
          )}

          {!loadingEquipo && !equipoError && !coordinador && (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Sin coordinador asignado aún.
            </p>
          )}
        </section>

        {/* Lista de operarios actuales */}
        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <div className="flex items-baseline justify-between">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Operarios
            </p>
            <p className="text-[11px] font-extrabold tabular-nums text-slate-500">
              {operarios.length} asignado{operarios.length !== 1 ? 's' : ''}
            </p>
          </div>

          {!loadingEquipo && operarios.length === 0 && (
            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-5 text-center ring-1 ring-slate-200">
              <p className="text-sm font-extrabold text-brand-800">
                Sin operarios asignados
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Este paso es opcional. Puedes continuar sin operarios.
              </p>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {operarios.map((operario) => (
              <div
                key={operario.usuario_id}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-extrabold text-slate-700">
                  {getInitials(operario.nombre_usuario ?? '?')}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-brand-800">
                  {operario.nombre_usuario ?? `Usuario ${operario.usuario_id}`}
                </p>
                <button
                  type="button"
                  onClick={() => void handleRemoveOperario(operario.usuario_id)}
                  disabled={removingId === operario.usuario_id || addingId !== null}
                  aria-label={`Quitar operario ${operario.nombre_usuario ?? operario.usuario_id}`}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10.5px] font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                >
                  <Icon name="trash" className="h-3 w-3" />
                  {removingId === operario.usuario_id ? 'Quitando…' : 'Quitar'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Buscador para agregar operarios */}
        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Agregar operario
          </p>

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar usuario…"
              className="w-full border-none bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery('')}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <Icon name="x" className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="mt-2">
            {searchLoading && (
              <p className="px-1 py-2 text-xs font-semibold text-slate-400">Buscando…</p>
            )}

            {!searchLoading && searchError && (
              <p className="whitespace-pre-line rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
                {searchError}
              </p>
            )}

            {!searchLoading && !searchError && searchResults.length === 0 && (
              <p className="px-1 py-2 text-xs font-semibold text-slate-500">
                {debouncedQuery
                  ? 'Sin resultados para la búsqueda.'
                  : 'Escribe para buscar usuarios disponibles.'}
              </p>
            )}

            {!searchLoading && !searchError && searchResults.length > 0 && (
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {searchResults.map((usuario) => (
                  <button
                    key={usuario.id}
                    type="button"
                    onClick={() => void handleAddOperario(usuario)}
                    disabled={addingId === usuario.id || removingId !== null}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 text-left transition hover:bg-brand-50 hover:ring-1 hover:ring-brand-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-700">
                      {getInitials(usuario.nombre)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-brand-800">
                        {usuario.nombre}
                      </span>
                      <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                        {usuario.rol}
                      </span>
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700">
                      {addingId === usuario.id ? (
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
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
      </main>

      <div className="px-5">
        <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
          {mutationError && (
            <p className="mb-2 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
              {mutationError}
            </p>
          )}
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onBackToPolygon}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 active:scale-[0.99]"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Atrás
            </button>
            <button
              type="button"
              onClick={handleDraftSaved}
              disabled={addingId !== null || removingId !== null}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
            >
              <Icon name="file" className="h-4 w-4" />
              Guardar borrador
            </button>
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={addingId !== null || removingId !== null}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
          >
            Siguiente
            <Icon name="chevron-right" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  )
}

export default SubcampaniaEquipoStep
