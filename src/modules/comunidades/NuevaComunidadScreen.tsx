import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearComunidad } from '../../api/comunidades.api'
import Icon from '../../components/Icon'
import {
  UbicacionesService,
  type DivisionCatalogo,
  type PaisCatalogo,
} from '../../services/ubicaciones.service'

type DivisionLevel = {
  parentId: number | null
  label: string
  options: DivisionCatalogo[]
  selectedId: number | null
}

type ApiError = Error & {
  status?: number
}

const MAX_LEVELS = 3

function NuevaComunidadScreen() {
  const navigate = useNavigate()
  const divisionRequestRef = useRef(0)

  const [paises, setPaises] = useState<PaisCatalogo[]>([])
  const [selectedPaisId, setSelectedPaisId] = useState<number | null>(null)
  const [divisionLevels, setDivisionLevels] = useState<DivisionLevel[]>([])
  const [comunidadNombre, setComunidadNombre] = useState('')
  const [activo, setActivo] = useState(true)

  const [loadingPaises, setLoadingPaises] = useState(false)
  const [loadingDivisiones, setLoadingDivisiones] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [catalogoError, setCatalogoError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const selectedNivel1Id = divisionLevels[0]?.selectedId ?? null
  const selectedNivel2Id = divisionLevels[1]?.selectedId ?? null
  const selectedMunicipioId = divisionLevels[2]?.selectedId ?? null
  const showNombreInput = Boolean(selectedMunicipioId)
  const nombreLimpio = comunidadNombre.trim()

  const municipioSeleccionado = useMemo(() => {
    if (!selectedMunicipioId) {
      return null
    }

    const nivelMunicipio = divisionLevels[2]
    return nivelMunicipio?.options.find((option) => option.id === selectedMunicipioId) ?? null
  }, [divisionLevels, selectedMunicipioId])

  const validation = {
    pais: selectedPaisId === null,
    nivel1: selectedNivel1Id === null,
    nivel2: selectedNivel2Id === null,
    nivel3: selectedMunicipioId === null,
    nombre: nombreLimpio.length === 0,
  }

  const loadPaises = async () => {
    try {
      setLoadingPaises(true)
      setCatalogoError(null)

      const nextPaises = await UbicacionesService.getPaises()
      setPaises(nextPaises)

      if (selectedPaisId !== null || nextPaises.length === 0) {
        return
      }

      const bolivia = nextPaises.find(
        (pais) => pais.codigo_iso2?.toLocaleUpperCase('en-US') === 'BO',
      )
      if (bolivia) {
        setSelectedPaisId(bolivia.id)
      }
    } catch (error) {
      console.error('Error cargando paises:', error)
      setCatalogoError('No se pudo cargar el catalogo de paises.')
    } finally {
      setLoadingPaises(false)
    }
  }

  const loadRootDivisiones = async (paisId: number) => {
    const requestId = ++divisionRequestRef.current

    try {
      setLoadingDivisiones(true)
      setCatalogoError(null)

      const rootOptions = await UbicacionesService.getDivisiones(paisId)

      if (requestId !== divisionRequestRef.current) {
        return
      }

      if (rootOptions.length === 0) {
        setDivisionLevels([])
        return
      }

      setDivisionLevels([
        {
          parentId: null,
          label: rootOptions[0]?.tipo_nombre || 'Nivel 1',
          options: rootOptions,
          selectedId: null,
        },
      ])
    } catch (error) {
      if (requestId !== divisionRequestRef.current) {
        return
      }

      console.error('Error cargando nivel raiz:', error)
      setCatalogoError('No se pudo cargar la division administrativa.')
      setDivisionLevels([])
    } finally {
      if (requestId === divisionRequestRef.current) {
        setLoadingDivisiones(false)
      }
    }
  }

  const handlePaisChange = (value: string) => {
    const nextPaisId = value ? Number(value) : null
    divisionRequestRef.current += 1
    setSelectedPaisId(nextPaisId)
    setDivisionLevels([])
    setCatalogoError(null)
    setSubmitError(null)
    setShowErrors(false)
  }

  const handleDivisionSelect = async (levelIndex: number, value: string) => {
    const selectedId = value ? Number(value) : null
    divisionRequestRef.current += 1
    const requestId = divisionRequestRef.current
    const nextLevels = divisionLevels
      .slice(0, levelIndex + 1)
      .map((level, index) =>
        index === levelIndex ? { ...level, selectedId } : level,
      )

    setDivisionLevels(nextLevels)
    setSubmitError(null)

    if (!selectedPaisId || selectedId === null || levelIndex >= MAX_LEVELS - 1) {
      return
    }

    try {
      setLoadingDivisiones(true)
      setCatalogoError(null)

      const children = await UbicacionesService.getDivisiones(selectedPaisId, selectedId)

      if (requestId !== divisionRequestRef.current || children.length === 0) {
        return
      }

      setDivisionLevels([
        ...nextLevels,
        {
          parentId: selectedId,
          label: children[0]?.tipo_nombre || `Nivel ${nextLevels.length + 1}`,
          options: children,
          selectedId: null,
        },
      ])
    } catch (error) {
      if (requestId !== divisionRequestRef.current) {
        return
      }

      console.error('Error cargando sub-divisiones:', error)
      setCatalogoError('No se pudieron cargar los niveles administrativos.')
    } finally {
      if (requestId === divisionRequestRef.current) {
        setLoadingDivisiones(false)
      }
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) {
      return
    }

    setShowErrors(true)
    setSubmitError(null)

    if (
      validation.pais ||
      validation.nivel1 ||
      validation.nivel2 ||
      validation.nivel3 ||
      validation.nombre
    ) {
      return
    }

    if (!selectedPaisId || !selectedMunicipioId) {
      return
    }

    try {
      setSubmitting(true)

      await crearComunidad({
        pais_id: selectedPaisId,
        municipio_id: selectedMunicipioId,
        nombre: nombreLimpio,
        activo,
      })

      navigate('/app/comunidades', {
        state: { successMessage: 'Comunidad creada correctamente.' },
      })
    } catch (error) {
      const apiError = error as ApiError
      if (apiError?.status === 409) {
        setSubmitError('Ya existe una comunidad con ese nombre en ese municipio.')
        return
      }
      if (apiError?.status === 400) {
        setSubmitError('Revisa campos obligatorios.')
        return
      }
      if (apiError?.status === 500) {
        setSubmitError('Error interno, intenta mas tarde.')
        return
      }

      setSubmitError(apiError?.message || 'No se pudo crear la comunidad.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    void loadPaises()
  }, [])

  useEffect(() => {
    if (!selectedPaisId) {
      divisionRequestRef.current += 1
      setDivisionLevels([])
      return
    }

    void loadRootDivisiones(selectedPaisId)
  }, [selectedPaisId])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
      <header className="relative mb-4 flex items-center gap-4">
        <button
          type="button"
          aria-label="Volver a comunidades"
          onClick={() => navigate('/app/comunidades')}
          className="left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-500">Seccion</p>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-700">
            Nueva comunidad
          </h1>
          <p className="text-xs font-medium text-brand-500">
            Registra una comunidad/localidad bajo un municipio
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <section className="rounded-2xl bg-red-50 px-4 py-3 shadow-soft ring-1 ring-red-200">
            <p className="text-sm font-semibold text-red-700">{submitError}</p>
          </section>
        )}

        <section className="space-y-4 rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-700">
              Pais <span className="text-red-500">*</span>
            </p>
            <div
              className={`flex items-center rounded-2xl border px-4 shadow-soft focus-within:ring-2 ${
                showErrors && validation.pais
                  ? 'border-red-400 bg-red-50 focus-within:border-red-400 focus-within:ring-red-200'
                  : 'border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-brand-200'
              }`}
            >
              <select
                value={selectedPaisId ?? ''}
                onChange={(event) => handlePaisChange(event.target.value)}
                disabled={loadingPaises || submitting}
                className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="">
                  {loadingPaises ? 'Cargando paises...' : 'Selecciona un pais'}
                </option>
                {paises.map((pais) => (
                  <option key={pais.id} value={pais.id}>
                    {pais.nombre}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
            </div>
            {showErrors && validation.pais && (
              <p className="text-xs font-semibold text-red-500">Selecciona un pais.</p>
            )}
          </div>

          {selectedPaisId !== null &&
            divisionLevels.slice(0, MAX_LEVELS).map((level, index) => (
              <div key={`${level.parentId ?? 'root'}-${index}`} className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">
                  {level.label || `Nivel ${index + 1}`} <span className="text-red-500">*</span>
                </p>
                <div
                  className={`flex items-center rounded-2xl border px-4 shadow-soft focus-within:ring-2 ${
                    showErrors &&
                    ((index === 0 && validation.nivel1) ||
                      (index === 1 && validation.nivel2) ||
                      (index === 2 && validation.nivel3))
                      ? 'border-red-400 bg-red-50 focus-within:border-red-400 focus-within:ring-red-200'
                      : 'border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-brand-200'
                  }`}
                >
                  <select
                    value={level.selectedId ?? ''}
                    onChange={(event) => {
                      void handleDivisionSelect(index, event.target.value)
                    }}
                    disabled={loadingDivisiones || submitting}
                    className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                  >
                    <option value="">
                      {loadingDivisiones ? 'Cargando...' : `Selecciona ${level.label || 'nivel'}`}
                    </option>
                    {level.options.map((division) => (
                      <option key={division.id} value={division.id}>
                        {division.nombre}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}

          {showErrors && validation.nivel1 && (
            <p className="text-xs font-semibold text-red-500">Completa el Nivel 1.</p>
          )}
          {showErrors && !validation.nivel1 && validation.nivel2 && (
            <p className="text-xs font-semibold text-red-500">Completa el Nivel 2.</p>
          )}
          {showErrors && !validation.nivel2 && validation.nivel3 && (
            <p className="text-xs font-semibold text-red-500">Selecciona un municipio.</p>
          )}

          {catalogoError && (
            <p className="text-xs font-semibold text-red-500">{catalogoError}</p>
          )}
        </section>

        {showNombreInput ? (
          <section className="space-y-4 rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-brand-700">
                Nombre comunidad/localidad <span className="text-red-500">*</span>
              </p>
              <input
                type="text"
                value={comunidadNombre}
                onChange={(event) => {
                  setComunidadNombre(event.target.value)
                  setSubmitError(null)
                }}
                placeholder="Ingresa el nombre de la comunidad/localidad"
                disabled={submitting}
                className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                  showErrors && validation.nombre
                    ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                    : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                }`}
              />
              {showErrors && validation.nombre && (
                <p className="text-xs font-semibold text-red-500">
                  El nombre de la comunidad/localidad es obligatorio.
                </p>
              )}
              {municipioSeleccionado && (
                <p className="text-xs font-semibold text-brand-500">
                  Municipio seleccionado: {municipioSeleccionado.nombre}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-brand-700">
              <input
                type="checkbox"
                checked={activo}
                onChange={(event) => setActivo(event.target.checked)}
                disabled={submitting}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              />
              Comunidad activa
            </label>
          </section>
        ) : (
          <section className="rounded-3xl bg-brand-50 px-4 py-4 shadow-soft ring-1 ring-brand-100">
            <p className="text-sm font-semibold text-brand-700">
              Selecciona pais, nivel 1, nivel 2 y municipio para habilitar el nombre de comunidad.
            </p>
          </section>
        )}

        <button
          type="submit"
          disabled={submitting || loadingPaises || loadingDivisiones}
          className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Guardando comunidad...' : 'Guardar comunidad'}
        </button>
      </form>
    </div>
  )
}

export default NuevaComunidadScreen
