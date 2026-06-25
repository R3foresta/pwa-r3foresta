import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import plantacionHero from '../../../assets/home/plantacion.jpg'
import Icon from '../../../components/Icon'
import SelectorComunidad from '../../comunidades/SelectorComunidad'
import { PlantacionService } from '../../../services/plantacion.service'
import { UsersService } from '../../../services/users.service'
import { loadDraft, saveDraft } from '../../../utils/formDraft'
import type { ComunidadCard } from '../../../tipos/comunidades'
import type { UsuarioResumen } from '../../../types/users'
import {
  TIPO_CAMPANIA_LABEL,
  type Campania,
} from '../types/contracts'

type LocationState = {
  campania?: Campania
}

type SubcampaniaBaseDraft = {
  campania_id: number
  tipo: Campania['tipo']
  comunidad: ComunidadCard | null
  coordinador: UsuarioResumen | null
  fecha_estimada_inicio: string
  fecha_estimada_fin: string
}

type BaseStepErrors = {
  comunidad: boolean
  coordinador: boolean
  fechas: boolean
}

const DEFAULT_PAIS_ID = 1
const COORDINADOR_ROL = 'GENERAL'
const SEARCH_DEBOUNCE_MS = 300

function getDraftKey(campaniaId: number): string {
  return `r3foresta:subcampania-wizard:${campaniaId}:base`
}

function toDateInputValue(value?: string | null): string {
  if (!value) return ''
  return value.includes('T') ? value.split('T')[0] : value
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
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

function resolveCampaniaCoordinator(campania: Campania): UsuarioResumen | null {
  if (campania.coordinador?.id && campania.coordinador.nombre) {
    return campania.coordinador
  }

  if (campania.coordinador_id && campania.coordinador_nombre?.trim()) {
    return {
      id: campania.coordinador_id,
      nombre: campania.coordinador_nombre.trim(),
      rol: COORDINADOR_ROL,
    }
  }

  return null
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
        const usuarios = await UsersService.listUsersByRole(COORDINADOR_ROL, debouncedQuery)

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
        Coordinador <span className="text-red-500">*</span>
      </p>

      <div
        className={`rounded-2xl border bg-white px-4 py-3 shadow-soft ${
          error ? 'border-red-400 bg-red-50' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon name="user" className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Buscar coordinador..."
            className="w-full border-none bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
          />
          {(query || value) && (
            <button
              type="button"
              aria-label="Limpiar coordinador seleccionado"
              onClick={handleClear}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <Icon name="x" className="h-3 w-3" />
            </button>
          )}
        </div>

        {open && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {loading && (
              <p className="px-3 py-2 text-xs font-semibold text-brand-500">
                Buscando coordinadores...
              </p>
            )}

            {!loading && fetchError && (
              <p className="px-3 py-2 text-xs font-semibold text-red-600">{fetchError}</p>
            )}

            {!loading && !fetchError && options.length === 0 && (
              <p className="px-3 py-2 text-xs font-semibold text-slate-500">
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
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left transition hover:bg-brand-50 last:border-b-0"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-700">
                    {getInitials(usuario.nombre)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-brand-700">
                      {usuario.nombre}
                    </span>
                    <span className="block text-xs font-medium text-slate-500">
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

function SubcampaniaBaseStep({ campania }: { campania: Campania }) {
  const [initialDraft] = useState<SubcampaniaBaseDraft | null>(() =>
    loadDraft<SubcampaniaBaseDraft>(getDraftKey(campania.id)),
  )
  const [selectedComunidad, setSelectedComunidad] = useState<ComunidadCard | null>(
    () => initialDraft?.comunidad ?? null,
  )
  const [selectedCoordinador, setSelectedCoordinador] = useState<UsuarioResumen | null>(
    () => initialDraft?.coordinador ?? resolveCampaniaCoordinator(campania),
  )
  const [fechaInicio, setFechaInicio] = useState(
    () => initialDraft?.fecha_estimada_inicio ?? toDateInputValue(campania.fecha_estimada_inicio),
  )
  const [fechaFin, setFechaFin] = useState(
    () => initialDraft?.fecha_estimada_fin ?? toDateInputValue(campania.fecha_estimada_fin),
  )
  const [stepSaved, setStepSaved] = useState(false)
  const [errors, setErrors] = useState<BaseStepErrors>({
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
    setStepSaved(false)
    setErrors((current) => ({ ...current, comunidad: false }))
  }

  const handleCoordinadorChange = (coordinador: UsuarioResumen | null) => {
    setSelectedCoordinador(coordinador)
    setStepSaved(false)
    setErrors((current) => ({ ...current, coordinador: false }))
  }

  const handleFechaInicioChange = (value: string) => {
    setFechaInicio(value)
    setStepSaved(false)
    setErrors((current) => ({ ...current, fechas: false }))
  }

  const handleFechaFinChange = (value: string) => {
    setFechaFin(value)
    setStepSaved(false)
    setErrors((current) => ({ ...current, fechas: false }))
  }

  const handleContinue = () => {
    const nextErrors = {
      comunidad: selectedComunidad === null,
      coordinador: selectedCoordinador === null,
      fechas: Boolean(fechaInicio && fechaFin && fechaInicio > fechaFin),
    }
    setErrors(nextErrors)
    setStepSaved(false)

    if (Object.values(nextErrors).some(Boolean)) {
      return
    }

    saveDraft<SubcampaniaBaseDraft>(getDraftKey(campania.id), {
      campania_id: campania.id,
      tipo: campania.tipo,
      comunidad: selectedComunidad,
      coordinador: selectedCoordinador,
      fecha_estimada_inicio: fechaInicio,
      fecha_estimada_fin: fechaFin,
    })
    setStepSaved(true)
  }

  return (
    <>
      <main className="space-y-4 px-5 pt-4">
        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon name="planting" className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-extrabold text-brand-800">
                {campania.nombre}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {TIPO_CAMPANIA_LABEL[campania.tipo]} · {campania.codigo_trazabilidad}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <SelectorComunidad
            paisId={DEFAULT_PAIS_ID}
            valueId={selectedComunidad?.id}
            onChange={handleComunidadChange}
            label="Zona o comunidad"
            placeholder="Buscar comunidad o localidad..."
            error={errors.comunidad}
          />

          {errors.comunidad && (
            <p className="text-xs font-semibold text-red-500">
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
        </section>

        <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <CoordinadorSelector
            value={selectedCoordinador}
            onChange={handleCoordinadorChange}
            error={errors.coordinador}
          />

          {errors.coordinador && (
            <p className="text-xs font-semibold text-red-500">
              * Selecciona un coordinador.
            </p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                Inicio estimado
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(event) => handleFechaInicioChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-brand-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                Cierre estimado
              </label>
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(event) => handleFechaFinChange(event.target.value)}
                className={`w-full rounded-2xl border bg-white px-3 py-3 text-sm font-extrabold text-brand-800 outline-none focus:ring-2 ${
                  errors.fechas
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                }`}
              />
            </div>
          </div>

          {errors.fechas && (
            <p className="mt-2 text-xs font-semibold text-red-500">
              * La fecha de cierre no puede ser anterior al inicio.
            </p>
          )}
        </section>
      </main>

      <div className="px-5">
        <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
          {stepSaved && (
            <p className="mb-2 rounded-2xl bg-emerald-50 px-4 py-2 text-center text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100">
              Paso guardado
            </p>
          )}
          <button
            type="button"
            onClick={handleContinue}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99]"
          >
            <Icon name="check" className="h-5 w-5" />
            Continuar
          </button>
        </div>
      </div>
    </>
  )
}

function CrearSubcampanaPlaceholderScreen() {
  const navigate = useNavigate()
  const { campaniaId } = useParams()
  const location = useLocation()
  const state = location.state as LocationState | null
  const numericCampaniaId = Number(campaniaId)
  const hasValidCampaniaId = Number.isFinite(numericCampaniaId) && numericCampaniaId > 0
  const [campania, setCampania] = useState<Campania | null>(state?.campania ?? null)
  const [loading, setLoading] = useState(!state?.campania && hasValidCampaniaId)
  const [error, setError] = useState<string | null>(null)
  const visibleError = error ?? (!hasValidCampaniaId ? 'ID de campaña inválido.' : null)
  const dashboardPath = hasValidCampaniaId
    ? `/app/planting/campanias/${numericCampaniaId}`
    : '/app/planting'

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

  const goToDashboard = () => {
    navigate(dashboardPath, { state: campania ? { campania } : undefined })
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
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
          </div>
        </header>

        {loading && (
          <main className="space-y-4 px-5 pt-4">
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
              Cargando campaña...
            </div>
          </main>
        )}

        {visibleError && !loading && (
          <main className="space-y-4 px-5 pt-4">
            <div className="rounded-3xl bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200">
              {visibleError}
            </div>
          </main>
        )}

        {campania && !loading && !visibleError && (
          <SubcampaniaBaseStep key={campania.id} campania={campania} />
        )}
      </div>
    </div>
  )
}

export default CrearSubcampanaPlaceholderScreen
