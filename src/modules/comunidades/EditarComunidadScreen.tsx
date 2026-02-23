import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  actualizarComunidad,
  desactivarComunidad,
  obtenerComunidad,
} from '../../api/comunidades.api'
import Icon from '../../components/Icon'
import {
  RecoleccionService,
  type DivisionCatalogo,
  type PaisCatalogo,
} from '../../services/recoleccion.service'
import type { ComunidadCard } from '../../tipos/comunidades'

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

function buildRutaActual(comunidad: ComunidadCard | null): string {
  if (!comunidad) {
    return ''
  }

  return [
    comunidad.pais?.nombre,
    comunidad.nivel1?.nombre,
    comunidad.nivel2?.nombre,
    comunidad.nivel3?.nombre,
  ]
    .filter(Boolean)
    .join(' / ')
}

function EditarComunidadScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const divisionRequestRef = useRef(0)

  const [comunidad, setComunidad] = useState<ComunidadCard | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingDivisiones, setLoadingDivisiones] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const [loadError, setLoadError] = useState<string | null>(null)
  const [catalogoError, setCatalogoError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const [paises, setPaises] = useState<PaisCatalogo[]>([])
  const [selectedPaisId, setSelectedPaisId] = useState<number | null>(null)
  const [divisionLevels, setDivisionLevels] = useState<DivisionLevel[]>([])
  const [comunidadNombre, setComunidadNombre] = useState('')
  const [activo, setActivo] = useState(true)

  const nombreLimpio = comunidadNombre.trim()
  const selectedNivel1Id = divisionLevels[0]?.selectedId ?? null
  const selectedNivel2Id = divisionLevels[1]?.selectedId ?? null
  const selectedMunicipioId = divisionLevels[2]?.selectedId ?? null

  const rutaActual = useMemo(() => buildRutaActual(comunidad), [comunidad])

  const rutaSeleccionada = useMemo(() => {
    const paisNombre =
      paises.find((pais) => pais.id === selectedPaisId)?.nombre ?? comunidad?.pais?.nombre

    const niveles = divisionLevels
      .slice(0, MAX_LEVELS)
      .map((level) => level.options.find((item) => item.id === level.selectedId)?.nombre)
      .filter(Boolean)

    return [paisNombre, ...niveles].filter(Boolean).join(' / ')
  }, [comunidad?.pais?.nombre, divisionLevels, paises, selectedPaisId])

  const validation = {
    nivel1: selectedNivel1Id === null,
    nivel2: selectedNivel2Id === null,
    nivel3: selectedMunicipioId === null,
    nombre: nombreLimpio.length === 0,
  }

  const canSubmit =
    !loading &&
    !loadingDivisiones &&
    !submitting &&
    !deactivating &&
    Boolean(comunidad) &&
    selectedMunicipioId !== null &&
    nombreLimpio.length > 0

  const loadDivisionesByPath = async (paisId: number, pathIds: number[]) => {
    const requestId = ++divisionRequestRef.current

    try {
      setLoadingDivisiones(true)
      setCatalogoError(null)

      const rootResponse = await RecoleccionService.getDivisiones(paisId)
      const rootOptions = rootResponse.data ?? []

      if (requestId !== divisionRequestRef.current) {
        return
      }

      if (rootOptions.length === 0) {
        setDivisionLevels([])
        return
      }

      const nextLevels: DivisionLevel[] = [
        {
          parentId: null,
          label: rootOptions[0]?.tipo_nombre || 'Nivel 1',
          options: rootOptions,
          selectedId: null,
        },
      ]

      const selectedPath = pathIds.slice(0, MAX_LEVELS)
      for (let index = 0; index < selectedPath.length; index += 1) {
        const divisionId = selectedPath[index]
        const currentLevel = nextLevels[index]

        if (!currentLevel) {
          break
        }

        const match = currentLevel.options.find((item) => item.id === divisionId)
        if (!match) {
          break
        }

        currentLevel.selectedId = divisionId

        if (index >= MAX_LEVELS - 1) {
          break
        }

        const childrenResponse = await RecoleccionService.getDivisiones(paisId, divisionId)
        const children = childrenResponse.data ?? []

        if (children.length === 0) {
          break
        }

        nextLevels.push({
          parentId: divisionId,
          label: children[0]?.tipo_nombre || `Nivel ${nextLevels.length + 1}`,
          options: children,
          selectedId: null,
        })
      }

      if (requestId !== divisionRequestRef.current) {
        return
      }

      setDivisionLevels(nextLevels)
    } catch (error) {
      if (requestId !== divisionRequestRef.current) {
        return
      }

      console.error('Error cargando divisiones por ruta:', error)
      setCatalogoError('No se pudieron cargar los niveles administrativos.')
      setDivisionLevels([])
    } finally {
      if (requestId === divisionRequestRef.current) {
        setLoadingDivisiones(false)
      }
    }
  }

  const loadInitialData = async () => {
    if (!id) {
      setLoadError('ID de comunidad invalido.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setLoadError(null)
      setSubmitError(null)
      setCatalogoError(null)
      setNotFound(false)

      const comunidadResponse = await obtenerComunidad(id)
      const comunidadData = comunidadResponse.data

      if (!comunidadData) {
        setComunidad(null)
        setNotFound(true)
        return
      }

      setComunidad(comunidadData)
      setComunidadNombre(comunidadData.nombre || comunidadData.nivel4?.nombre || '')
      setActivo(Boolean(comunidadData.activo))

      const paisId = comunidadData.pais?.id ?? null
      setSelectedPaisId(paisId)

      try {
        const paisesResponse = await RecoleccionService.getPaises()
        setPaises(paisesResponse.data ?? [])
      } catch (error) {
        console.error('Error cargando paises:', error)
        setCatalogoError('No se pudo cargar el catalogo de paises.')
      }

      if (!paisId) {
        setLoadError('La comunidad no tiene pais asociado.')
        setDivisionLevels([])
        return
      }

      const pathIds = [
        comunidadData.nivel1?.id,
        comunidadData.nivel2?.id,
        comunidadData.nivel3?.id,
      ].filter((value): value is number => typeof value === 'number')

      await loadDivisionesByPath(paisId, pathIds)
    } catch (error) {
      console.error('Error cargando comunidad:', error)
      const apiError = error as ApiError
      if (apiError?.status === 404) {
        setNotFound(true)
        setComunidad(null)
        return
      }
      setLoadError(apiError?.message || 'No se pudo cargar la comunidad.')
    } finally {
      setLoading(false)
    }
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

      const response = await RecoleccionService.getDivisiones(selectedPaisId, selectedId)
      const children = response.data ?? []

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
    if (!id || submitting) {
      return
    }

    setShowErrors(true)
    setSubmitError(null)

    if (
      validation.nivel1 ||
      validation.nivel2 ||
      validation.nivel3 ||
      validation.nombre
    ) {
      return
    }

    if (selectedMunicipioId === null) {
      return
    }

    try {
      setSubmitting(true)

      await actualizarComunidad(id, {
        nombre: nombreLimpio,
        municipio_id: selectedMunicipioId,
        activo,
      })

      navigate('/app/comunidades', {
        state: { successMessage: 'Comunidad actualizada correctamente.' },
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

      setSubmitError(apiError?.message || 'No se pudo actualizar la comunidad.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDesactivar = async () => {
    if (!id || !comunidad || !activo || deactivating) {
      return
    }

    const confirmacion = window.confirm(
      'Esto ocultara la comunidad en seleccion. Continuar?',
    )
    if (!confirmacion) {
      return
    }

    try {
      setDeactivating(true)
      setSubmitError(null)

      await desactivarComunidad(id)

      navigate('/app/comunidades', {
        state: { successMessage: 'Comunidad desactivada correctamente.' },
      })
    } catch (error) {
      const apiError = error as ApiError
      if (apiError?.status === 500) {
        setSubmitError('Error interno, intenta mas tarde.')
        return
      }
      setSubmitError(apiError?.message || 'No se pudo desactivar la comunidad.')
    } finally {
      setDeactivating(false)
    }
  }

  useEffect(() => {
    void loadInitialData()
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
        <section className="mt-8 rounded-2xl bg-white px-4 py-6 text-center text-sm font-semibold text-brand-600 shadow-soft ring-1 ring-black/5">
          Cargando comunidad...
        </section>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
        <section className="mt-8 rounded-2xl bg-white px-4 py-6 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-base font-semibold text-brand-700">Comunidad no encontrada</p>
          <button
            type="button"
            onClick={() => navigate('/app/comunidades')}
            className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Volver al listado
          </button>
        </section>
      </div>
    )
  }

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
            Editar comunidad
          </h1>
          <p className="text-xs font-medium text-brand-500">
            Actualiza nombre, municipio o estado
          </p>
        </div>
      </header>

      {loadError && (
        <section className="mb-4 rounded-2xl bg-red-50 px-4 py-4 text-center shadow-soft ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadInitialData()}
            className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200"
          >
            Reintentar
          </button>
        </section>
      )}

      {submitError && (
        <section className="mb-4 rounded-2xl bg-red-50 px-4 py-3 shadow-soft ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">{submitError}</p>
        </section>
      )}

      <section className="mb-4 space-y-2 rounded-2xl bg-brand-50 px-4 py-4 shadow-soft ring-1 ring-brand-100">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
          Ruta actual
        </p>
        <p className="text-sm font-semibold text-brand-700">
          {rutaActual || 'Sin ruta administrativa disponible'}
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="space-y-4 rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-700">Pais</p>
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 shadow-soft">
              <select
                value={selectedPaisId ?? ''}
                disabled
                className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="">
                  {comunidad?.pais?.nombre || 'Pais no disponible'}
                </option>
                {paises.map((pais) => (
                  <option key={pais.id} value={pais.id}>
                    {pais.nombre}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          {divisionLevels.slice(0, MAX_LEVELS).map((level, index) => (
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
                  disabled={loadingDivisiones || submitting || deactivating}
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
              disabled={submitting || deactivating}
              placeholder="Ingresa el nombre de la comunidad/localidad"
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
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-brand-700">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) => setActivo(event.target.checked)}
              disabled={submitting || deactivating}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            />
            Comunidad activa
          </label>

          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold text-slate-600">
              Ruta seleccionada: {rutaSeleccionada || 'Seleccion pendiente'}
            </p>
          </div>
        </section>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Guardando cambios...' : 'Guardar cambios'}
        </button>

        {activo ? (
          <button
            type="button"
            onClick={() => void handleDesactivar()}
            disabled={deactivating || submitting}
            className="w-full rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deactivating ? 'Desactivando...' : 'Desactivar comunidad'}
          </button>
        ) : (
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600">
            Comunidad inactiva
          </div>
        )}
      </form>
    </div>
  )
}

export default EditarComunidadScreen
