import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import plantacionHero from '../../../assets/home/plantacion.jpg'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import SelectorComunidad from '../../comunidades/SelectorComunidad'
import { useAuth } from '../../../contexts/AuthContext'
import { obtenerComunidad } from '../../../api/comunidades.api'
import { PlantacionService } from '../../../services/plantacion.service'
import { UsersService } from '../../../services/users.service'
import type { ComunidadCard } from '../../../tipos/comunidades'
import type { UsuarioResumen, UsuarioRol } from '../../../types/users'
import SubcampaniaEquipoStep from '../components/SubcampaniaEquipoStep'
import { UserAvatar } from '../components/UserAvatar'
import SubcampaniaEspeciesStep from '../components/SubcampaniaEspeciesStep'
import SubcampaniaPolygonStep from '../components/SubcampaniaPolygonStep'
import SubcampaniaResumenStep from '../components/SubcampaniaResumenStep'
import {
  TIPO_CAMPANIA_LABEL,
  type Campania,
  type EquipoMember,
} from '../types/contracts'
import {
  createSubcampaniaDraftId,
  loadSubcampaniaBaseDraft,
  saveSubcampaniaBaseDraft,
  type SubcampaniaBaseDraft,
} from '../utils/subcampaniaDraft'

type LocationState = {
  campania?: Campania
  draftId?: string
}

type BaseStepErrors = {
  nombre: boolean
  comunidad: boolean
  coordinador: boolean
  fechas: boolean
}

const DEFAULT_PAIS_ID = 1
// Regla actual de negocio: coordinadores disponibles desde ADMIN y GENERAL,
// mostrando ADMIN primero.
const COORDINADOR_ROLES: UsuarioRol[] = ['ADMIN', 'GENERAL']
const COORDINADOR_FALLBACK_ROL: UsuarioRol = 'GENERAL'
const SEARCH_DEBOUNCE_MS = 300

type WizardStep = 1 | 2 | 3 | 4 | 5

const WIZARD_STEP_ORDER: WizardStep[] = [1, 2, 3, 4, 5]
const WIZARD_STEPS = WIZARD_STEP_ORDER.length

const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  1: 'Nombre',
  2: 'Meta',
  3: 'Zona',
  4: 'Equipo',
  5: 'Resumen',
}

function parseWizardStep(raw: string | null): WizardStep {
  if (raw === '5') return 5
  if (raw === '4') return 4
  if (raw === '3') return 3
  if (raw === '2') return 2
  return 1
}

function WizardStepper({
  currentStep,
  onStepChange,
}: {
  currentStep: WizardStep
  onStepChange: (step: WizardStep) => void
}) {
  return (
    <>
      <div className="mt-4 flex items-center gap-1">
        {WIZARD_STEP_ORDER.map((step) => {
          const isCurrent = step === currentStep
          const isCompleted = step < currentStep
          return (
            <button
              key={step}
              type="button"
              onClick={() => onStepChange(step)}
              aria-label={`Ir al paso ${step}: ${WIZARD_STEP_LABELS[step]}`}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex flex-1 flex-col items-center gap-1.5 rounded-lg py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold ring-1 transition ${
                  isCurrent
                    ? 'bg-white text-brand-800 ring-white shadow-soft'
                    : isCompleted
                      ? 'bg-success-300 text-brand-900 ring-success-200'
                      : 'bg-white/10 text-white/80 ring-white/25 hover:bg-white/20'
                }`}
              >
                {isCompleted ? '✓' : step}
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase tracking-[0.12em] transition ${
                  isCurrent
                    ? 'text-white'
                    : isCompleted
                      ? 'text-success-100'
                      : 'text-white/60'
                }`}
              >
                {WIZARD_STEP_LABELS[step]}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">
        Paso {currentStep} de {WIZARD_STEPS} · {WIZARD_STEP_LABELS[currentStep]}
      </p>
    </>
  )
}

function toDateInputValue(value?: string | null): string {
  if (!value) return ''
  return value.includes('T') ? value.split('T')[0] : value
}


function buildComunidadRuta(comunidad: ComunidadCard): string {
  return [
    comunidad.pais?.nombre,
    comunidad.nivel1?.nombre,
    comunidad.nivel2?.nombre,
    comunidad.nivel3?.nombre,
    comunidad.nivel4?.nombre || comunidad.nombre,
  ]
    .filter(Boolean)
    .join(' / ')
}

function buildDefaultSubcampaniaName(comunidad: ComunidadCard): string {
  return `Subcampaña ${comunidad.nombre}`.trim()
}

function resolveCampaniaCoordinator(campania: Campania): UsuarioResumen | null {
  if (campania.coordinador?.id && campania.coordinador.nombre) {
    return campania.coordinador
  }

  if (campania.coordinador_id && campania.coordinador_nombre?.trim()) {
    return {
      id: campania.coordinador_id,
      nombre: campania.coordinador_nombre.trim(),
      rol: COORDINADOR_FALLBACK_ROL,
    }
  }

  return null
}

function dedupeUsuariosById(usuarios: UsuarioResumen[]): UsuarioResumen[] {
  const seen = new Set<number>()
  return usuarios.filter((usuario) => {
    if (seen.has(usuario.id)) return false
    seen.add(usuario.id)
    return true
  })
}

async function listCoordinadores(query: string): Promise<UsuarioResumen[]> {
  const results = await Promise.all(
    COORDINADOR_ROLES.map((rol) => UsersService.listUsersByRole(rol, query)),
  )
  return dedupeUsuariosById(results.flat())
}

function equipoMemberToUsuarioResumen(member: EquipoMember): UsuarioResumen {
  return {
    id: member.usuario_id,
    nombre: member.nombre_usuario?.trim() || `Usuario ${member.usuario_id}`,
    rol: member.rol,
    foto_perfil_url: member.foto_perfil_url ?? null,
  }
}

function CoordinadorSelector({
  value,
  onChange,
  error = false,
}: {
  value: UsuarioResumen | null
  onChange: (usuario: UsuarioResumen | null) => void
  error?: boolean
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const requestCounterRef = useRef(0)
  const [query, setQuery] = useState(value?.nombre ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [options, setOptions] = useState<UsuarioResumen[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

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
      setQuery(value?.nombre ?? '')
    }
  }, [open, value?.nombre])

  useEffect(() => {
    if (!open) return

    const requestId = ++requestCounterRef.current

    const loadUsers = async () => {
      try {
        setLoading(true)
        setFetchError(null)
        const usuarios = await listCoordinadores(debouncedQuery)

        if (requestId !== requestCounterRef.current) {
          return
        }

        setOptions(usuarios)
      } catch (loadError) {
        if (requestId !== requestCounterRef.current) {
          return
        }

        setOptions([])
        setFetchError(
          loadError instanceof Error ? loadError.message : 'No se pudieron cargar coordinadores.',
        )
      } finally {
        if (requestId === requestCounterRef.current) {
          setLoading(false)
        }
      }
    }

    void loadUsers()
  }, [debouncedQuery, open])

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery)
    setOpen(true)

    if (value) {
      onChange(null)
    }
  }

  const handleSelect = (usuario: UsuarioResumen) => {
    onChange(usuario)
    setQuery(usuario.nombre)
    setOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setQuery('')
    setDebouncedQuery('')
    setOpen(true)
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <p className="text-sm font-semibold text-brand-700">
        Coordinador <span className="text-danger-500">*</span>
      </p>

      <div
        className={`rounded-2xl border bg-white px-4 py-3 shadow-soft ${
          error ? 'border-danger-400 bg-danger-50' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon name="user" className="h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Buscar coordinador..."
            className="w-full border-none bg-transparent text-sm font-semibold text-neutral-700 outline-none placeholder:font-medium placeholder:text-neutral-400"
          />
          {(query || value) && (
            <button
              type="button"
              aria-label="Limpiar coordinador seleccionado"
              onClick={handleClear}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
            >
              <Icon name="x" className="h-3 w-3" />
            </button>
          )}
        </div>

        {open && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
            {loading && (
              <p className="px-3 py-2 text-xs font-semibold text-brand-500">
                Buscando coordinadores...
              </p>
            )}

            {!loading && fetchError && (
              <p className="px-3 py-2 text-xs font-semibold text-danger-600">{fetchError}</p>
            )}

            {!loading && !fetchError && options.length === 0 && (
              <p className="px-3 py-2 text-xs font-semibold text-neutral-500">
                Sin coordinadores disponibles.
              </p>
            )}

            {!loading &&
              !fetchError &&
              options.map((usuario) => (
                <button
                  key={usuario.id}
                  type="button"
                  onClick={() => handleSelect(usuario)}
                  className="flex w-full items-center gap-3 border-b border-neutral-100 px-3 py-2 text-left transition hover:bg-brand-50 last:border-b-0"
                >
                  <UserAvatar
                    nombre={usuario.nombre}
                    fotoUrl={usuario.foto_perfil_url}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-700"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-brand-700">
                      {usuario.nombre}
                    </span>
                    <span className="block text-xs font-medium text-neutral-500">
                      {usuario.rol}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SubcampaniaBaseStep({
  campania,
  draftId,
  onDraftSaved,
  onNext,
}: {
  campania: Campania
  draftId: string
  onDraftSaved: () => void
  onNext: () => void
}) {
  const [initialDraft] = useState<SubcampaniaBaseDraft | null>(() =>
    loadSubcampaniaBaseDraft(campania.id, draftId),
  )
  const [createdAt] = useState(() => initialDraft?.created_at ?? new Date().toISOString())
  const [subcampaniaNombre, setSubcampaniaNombre] = useState(
    () =>
      initialDraft?.nombre ??
      (initialDraft?.comunidad ? buildDefaultSubcampaniaName(initialDraft.comunidad) : ''),
  )
  const [nombreEditado, setNombreEditado] = useState(() => Boolean(initialDraft?.nombre))
  const [selectedComunidad, setSelectedComunidad] = useState<ComunidadCard | null>(
    () => initialDraft?.comunidad ?? null,
  )
  const [selectedCoordinador, setSelectedCoordinador] = useState<UsuarioResumen | null>(
    () => initialDraft?.coordinador ?? resolveCampaniaCoordinator(campania),
  )
  const [fechaInicio, setFechaInicio] = useState(
    () => initialDraft?.fecha_estimada_inicio || toDateInputValue(campania.fecha_estimada_inicio),
  )
  const [fechaFin, setFechaFin] = useState(
    () => initialDraft?.fecha_estimada_fin || toDateInputValue(campania.fecha_estimada_fin),
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<BaseStepErrors>({
    nombre: false,
    comunidad: false,
    coordinador: false,
    fechas: false,
  })

  const comunidadRuta = useMemo(
    () => (selectedComunidad ? buildComunidadRuta(selectedComunidad) : ''),
    [selectedComunidad],
  )

  const handleComunidadChange = (comunidad: ComunidadCard | null) => {
    setSelectedComunidad(comunidad)
    setStatusMessage(null)
    if (comunidad && !nombreEditado) {
      setSubcampaniaNombre(buildDefaultSubcampaniaName(comunidad))
      setErrors((current) => ({ ...current, nombre: false }))
    }
    setErrors((current) => ({ ...current, comunidad: false }))
  }

  const handleNombreChange = (value: string) => {
    setSubcampaniaNombre(value)
    setNombreEditado(true)
    setStatusMessage(null)
    setErrors((current) => ({ ...current, nombre: false }))
  }

  const handleCoordinadorChange = (coordinador: UsuarioResumen | null) => {
    setSelectedCoordinador(coordinador)
    setStatusMessage(null)
    setErrors((current) => ({ ...current, coordinador: false }))
  }

  const handleFechaInicioChange = (value: string) => {
    setFechaInicio(value)
    setStatusMessage(null)
    setErrors((current) => ({ ...current, fechas: false }))
  }

  const handleFechaFinChange = (value: string) => {
    setFechaFin(value)
    setStatusMessage(null)
    setErrors((current) => ({ ...current, fechas: false }))
  }

  const handleSaveStep = (action: 'draft' | 'next') => {
    const nombre = subcampaniaNombre.trim().replace(/\s+/g, ' ')
    const nextErrors = {
      nombre: nombre.length < 3,
      comunidad: selectedComunidad === null,
      coordinador: selectedCoordinador === null,
      fechas: Boolean(fechaInicio && fechaFin && fechaInicio > fechaFin),
    }
    setErrors(nextErrors)
    setStatusMessage(null)

    if (Object.values(nextErrors).some(Boolean)) {
      return
    }

    saveSubcampaniaBaseDraft({
      draft_id: draftId,
      campania_id: campania.id,
      tipo: campania.tipo,
      nombre,
      comunidad: selectedComunidad,
      coordinador: selectedCoordinador,
      fecha_estimada_inicio: fechaInicio,
      fecha_estimada_fin: fechaFin,
      created_at: createdAt,
      updated_at: new Date().toISOString(),
    })
    setSubcampaniaNombre(nombre)
    if (action === 'draft') {
      onDraftSaved()
      return
    }
    onNext()
  }

  return (
    <>
      <main className="space-y-4 px-5 pt-4">
        <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <div>
            <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Nombre de subcampaña
            </label>
            <input
              type="text"
              value={subcampaniaNombre}
              onChange={(event) => handleNombreChange(event.target.value)}
              placeholder="Ej. Subcampaña Achocalla"
              maxLength={200}
              className={`w-full rounded-2xl border bg-white px-3 py-3 text-sm font-extrabold text-brand-800 outline-none placeholder:font-medium placeholder:text-neutral-400 focus:ring-2 ${
                errors.nombre
                  ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-200'
                  : 'border-neutral-200 focus:border-brand-500 focus:ring-brand-100'
              }`}
            />
            {errors.nombre && (
              <p className="mt-2 text-xs font-semibold text-danger-500">
                * El nombre debe tener al menos 3 caracteres.
              </p>
            )}
          </div>

          <SelectorComunidad
            paisId={DEFAULT_PAIS_ID}
            valueId={selectedComunidad?.id}
            onChange={handleComunidadChange}
            label="Zona o comunidad"
            placeholder="Buscar comunidad o localidad..."
            error={errors.comunidad}
          />

          {errors.comunidad && (
            <p className="text-xs font-semibold text-danger-500">
              * Selecciona una comunidad existente.
            </p>
          )}

          {comunidadRuta && (
            <div className="rounded-2xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
              <p className="text-xs font-semibold leading-relaxed text-brand-700">
                {comunidadRuta}
              </p>
            </div>
          )}

          <CoordinadorSelector
            value={selectedCoordinador}
            onChange={handleCoordinadorChange}
            error={errors.coordinador}
          />

          {errors.coordinador && (
            <p className="text-xs font-semibold text-danger-500">
              * Selecciona un coordinador.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                Inicio estimado <span className="text-neutral-400">(opcional)</span>
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(event) => handleFechaInicioChange(event.target.value)}
                className={`w-full rounded-2xl border bg-white px-3 py-3 text-sm font-extrabold text-brand-800 outline-none focus:ring-2 ${
                  errors.fechas
                    ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-200'
                    : 'border-neutral-200 focus:border-brand-500 focus:ring-brand-100'
                }`}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                Cierre estimado <span className="text-neutral-400">(opcional)</span>
              </label>
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(event) => handleFechaFinChange(event.target.value)}
                className={`w-full rounded-2xl border bg-white px-3 py-3 text-sm font-extrabold text-brand-800 outline-none focus:ring-2 ${
                  errors.fechas
                    ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-200'
                    : 'border-neutral-200 focus:border-brand-500 focus:ring-brand-100'
                }`}
              />
            </div>
          </div>

          {errors.fechas && (
            <p className="mt-2 text-xs font-semibold text-danger-500">
              * La fecha de cierre no puede ser anterior al inicio.
            </p>
          )}
        </section>
      </main>

      <div className="px-5">
        <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-brand-50 via-brand-50/95 to-transparent px-5 pb-5 pt-3">
          {statusMessage && (
            <p className="mb-2 rounded-2xl bg-success-50 px-4 py-2 text-center text-xs font-extrabold text-success-700 ring-1 ring-success-100">
              {statusMessage}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" fullWidth leftIcon="file" onClick={() => handleSaveStep('draft')}>
              Guardar borrador
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              rightIcon="chevron-right"
              onClick={() => handleSaveStep('next')}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function CrearSubcampanaScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const authId = user?.auth_id
  const { campaniaId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const state = location.state as LocationState | null
  const routeDraftId = searchParams.get('draftId')?.trim() || state?.draftId?.trim()
  const [draftId] = useState(() => routeDraftId || createSubcampaniaDraftId())
  const rawRouteSubcampaniaId = searchParams.get('subcampaniaId')?.trim() || ''
  const routeSubcampaniaId = Number(rawRouteSubcampaniaId || '') || null
  const currentStep: WizardStep = parseWizardStep(searchParams.get('step'))
  const numericCampaniaId = Number(campaniaId)
  const hasValidCampaniaId = Number.isFinite(numericCampaniaId) && numericCampaniaId > 0
  const [campania, setCampania] = useState<Campania | null>(state?.campania ?? null)
  const [loading, setLoading] = useState(!state?.campania && hasValidCampaniaId)
  const [draftHydrationVersion, setDraftHydrationVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const routeSubcampaniaDraft = campania ? loadSubcampaniaBaseDraft(campania.id, draftId) : null
  const needsRouteSubcampaniaHydration = Boolean(
    routeSubcampaniaId &&
      campania &&
      routeSubcampaniaDraft?.subcampania_id !== routeSubcampaniaId,
  )
  const visibleError = error ?? (!hasValidCampaniaId ? 'ID de campaña inválido.' : null)
  const loadingMessage = loading ? 'Cargando campaña...' : 'Cargando subcampaña...'
  const isLoading = loading || (needsRouteSubcampaniaHydration && error === null)
  const dashboardPath = hasValidCampaniaId
    ? `/app/planting/campanias/${numericCampaniaId}`
    : '/app/planting'

  useEffect(() => {
    const hasDraftId = Boolean(searchParams.get('draftId')?.trim())
    const hasStep = Boolean(searchParams.get('step')?.trim())
    if (hasDraftId && hasStep) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('draftId', draftId)
    nextParams.set('step', String(currentStep))
    if (rawRouteSubcampaniaId) {
      nextParams.set('subcampaniaId', rawRouteSubcampaniaId)
    }
    setSearchParams(nextParams, { replace: true })
  }, [currentStep, draftId, rawRouteSubcampaniaId, searchParams, setSearchParams])

  useEffect(() => {
    if (state?.campania) return
    if (!hasValidCampaniaId) return

    PlantacionService.getCampania(numericCampaniaId)
      .then((data) => {
        setCampania(data)
        setError(null)
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la campaña.')
      })
      .finally(() => setLoading(false))
  }, [hasValidCampaniaId, numericCampaniaId, state?.campania])

  useEffect(() => {
    if (!needsRouteSubcampaniaHydration || !routeSubcampaniaId || !campania) return

    let cancelled = false

    const hydrateSubcampaniaDraft = async () => {
      try {
        const subData = await PlantacionService.getSubcampania(routeSubcampaniaId, authId)
        const [comunidad, equipoFallback] = await Promise.all([
          obtenerComunidad(subData.zona_id).then((r) => r.data ?? null).catch(() => null),
          Array.isArray(subData.equipo)
            ? Promise.resolve(null)
            : PlantacionService.getSubcampaniaEquipo(routeSubcampaniaId, authId).catch(() => []),
        ])

        if (cancelled) return

        const equipo = Array.isArray(subData.equipo) ? subData.equipo : equipoFallback ?? []
        const coordinador =
          equipo.find((member) => member.rol === 'COORDINADOR') ?? null
        const operarios = equipo.filter((member) => member.rol === 'OPERARIO')
        const now = new Date().toISOString()

        saveSubcampaniaBaseDraft({
          draft_id: draftId,
          subcampania_id: routeSubcampaniaId,
          campania_id: campania.id,
          tipo: campania.tipo,
          nombre: subData.nombre,
          comunidad,
          coordinador: coordinador ? equipoMemberToUsuarioResumen(coordinador) : null,
          equipo_operarios: operarios.map(equipoMemberToUsuarioResumen),
          fecha_estimada_inicio: subData.fecha_estimada_inicio ?? '',
          fecha_estimada_fin: subData.fecha_estimada_fin ?? '',
          meta_total_arboles: subData.meta_total_arboles ?? null,
          ...(subData.poligono != null ? { poligono_geojson: subData.poligono } : {}),
          created_at: now,
          updated_at: now,
        })
        setError(null)
        setDraftHydrationVersion((current) => current + 1)
      } catch (loadError) {
        if (cancelled) return
        setError(
          loadError instanceof Error ? loadError.message : 'No se pudo cargar la subcampaña.',
        )
      }
    }

    void hydrateSubcampaniaDraft()

    return () => {
      cancelled = true
    }
  }, [authId, campania, draftId, needsRouteSubcampaniaHydration, routeSubcampaniaId])

  const goToDashboard = () => {
    navigate(dashboardPath, { state: campania ? { campania } : undefined })
  }

  // El draft se conserva a propósito: sirve de fallback si el backend no
  // devuelve el `poligono` en GET /subcampanias/:id. Se filtra del dashboard
  // porque tiene `subcampania_id` y se purga por TTL (30 días).
  const goToSubcampania = (subcampaniaId: number) => {
    navigate(`/app/planting/subcampanias/${subcampaniaId}`, { replace: true })
  }

  const goToStep = (step: WizardStep) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('draftId', draftId)
    nextParams.set('step', String(step))
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
          <img src={plantacionHero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-brand-700/70 to-brand-700" />
          <div className="relative px-5 pb-5 pt-6">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goToDashboard}
                aria-label="Volver"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              >
                <Icon name="arrow-left" className="h-5 w-5" />
              </button>
              {campania && (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] ring-1 ring-white/25">
                  {TIPO_CAMPANIA_LABEL[campania.tipo]}
                </span>
              )}
            </div>
            <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
              Nueva subcampaña
            </p>
            <h1 className="mt-1 text-[28px] font-extrabold leading-tight">
              {campania?.nombre ?? 'Cargando campaña'}
            </h1>
            {campania && (
              <p className="mt-2 text-xs font-extrabold tracking-wide text-white/75">
                {campania.codigo_trazabilidad}
              </p>
            )}
            <WizardStepper currentStep={currentStep} onStepChange={goToStep} />
          </div>
        </header>

        {isLoading && (
          <main className="space-y-4 px-5 pt-4">
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-neutral-600 shadow-soft ring-1 ring-black/5">
              {loadingMessage}
            </div>
          </main>
        )}

        {visibleError && !isLoading && (
          <main className="space-y-4 px-5 pt-4">
            <div className="rounded-3xl bg-danger-50 px-4 py-6 text-center text-sm font-semibold text-danger-700 shadow-soft ring-1 ring-danger-200">
              {visibleError}
            </div>
          </main>
        )}

        {campania && !isLoading && !visibleError && currentStep === 1 && (
          <SubcampaniaBaseStep
            key={`${campania.id}-${draftId}-base`}
            campania={campania}
            draftId={draftId}
            onDraftSaved={goToDashboard}
            onNext={() => goToStep(2)}
          />
        )}

        {campania && !isLoading && !visibleError && currentStep === 2 && (
          <SubcampaniaEspeciesStep
            key={`${campania.id}-${draftId}-especies`}
            campania={campania}
            draftId={draftId}
            authId={authId}
            onDraftSaved={goToDashboard}
            onBackToBase={() => goToStep(1)}
            onNext={() => goToStep(3)}
          />
        )}

        {campania && !isLoading && !visibleError && currentStep === 3 && (
          <SubcampaniaPolygonStep
            key={`${campania.id}-${draftId}-polygon`}
            campania={campania}
            draftId={draftId}
            authId={authId}
            onDraftSaved={goToDashboard}
            onBackToBase={() => goToStep(2)}
            onNext={() => goToStep(4)}
          />
        )}

        {campania && !isLoading && !visibleError && currentStep === 4 && (
          <SubcampaniaEquipoStep
            key={`${campania.id}-${draftId}-equipo`}
            campania={campania}
            draftId={draftId}
            authId={authId}
            onDraftSaved={goToDashboard}
            onBackToPolygon={() => goToStep(3)}
            onNext={() => goToStep(5)}
          />
        )}

        {campania && !isLoading && !visibleError && currentStep === 5 && (
          <SubcampaniaResumenStep
            key={`${campania.id}-${draftId}-resumen-${draftHydrationVersion}`}
            campania={campania}
            draftId={draftId}
            authId={authId}
            onBackToEquipo={() => goToStep(4)}
            onSaved={goToSubcampania}
            onActivated={goToSubcampania}
          />
        )}
      </div>
    </div>
  )
}

export default CrearSubcampanaScreen
