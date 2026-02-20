import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { useViveros } from '../../hooks/useViveros'
import { RecoleccionService, type DivisionCatalogo, type PaisCatalogo } from '../../services/recoleccion.service'
import { useCollectionForm } from './CollectionFormContext'

type DivisionLevel = {
  parentId: number | null
  label: string
  options: DivisionCatalogo[]
  selectedId: number | null
}

function LocationForm() {
  const navigate = useNavigate()
  const { formData, updateForm } = useCollectionForm()
  const { viveros, loading: viveroLoading, error: viveroError } = useViveros()

  const [ubicacionNombre, setUbicacionNombre] = useState(formData?.ubicacionNombre || '')
  const [referencia, setReferencia] = useState(formData?.referencia || '')
  const [comunidadNombre, setComunidadNombre] = useState(formData?.comunidadNombre || '')
  const [latitud, setLatitud] = useState(formData?.latitud || '')
  const [longitud, setLongitud] = useState(formData?.longitud || '')
  const [precisionM, setPrecisionM] = useState(formData?.precisionM || '')
  const [selectedPaisId, setSelectedPaisId] = useState<number | null>(
    formData?.paisId ? Number(formData.paisId) : null,
  )
  const [selectedPaisNombre, setSelectedPaisNombre] = useState(formData?.paisNombre || '')
  const [divisionLevels, setDivisionLevels] = useState<DivisionLevel[]>([])
  const [paises, setPaises] = useState<PaisCatalogo[]>([])
  const [loadingPaises, setLoadingPaises] = useState(false)
  const [loadingDivisiones, setLoadingDivisiones] = useState(false)
  const [savingCommunity, setSavingCommunity] = useState(false)
  const [catalogoError, setCatalogoError] = useState<string | null>(null)
  const [selectedViveroId, setSelectedViveroId] = useState<number | null>(formData?.vivero_id ?? null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [errors, setErrors] = useState({
    coordinates: false,
    coordinateRange: false,
    vivero: false,
    pais: false,
    division: false,
  })

  const selectedPath = useMemo(() => {
    const path: DivisionCatalogo[] = []

    for (const level of divisionLevels) {
      if (level.selectedId === null) {
        break
      }
      const selected = level.options.find((option) => option.id === level.selectedId)
      if (!selected) {
        break
      }
      path.push(selected)
    }

    return path
  }, [divisionLevels])

  const deepestDivision = selectedPath.length > 0 ? selectedPath[selectedPath.length - 1] : null
  const hasMissingDivisionSelection = divisionLevels.some(
    (level) => level.options.length > 0 && level.selectedId === null,
  )
  const isMunicipioLeaf = Boolean(
    deepestDivision &&
      !hasMissingDivisionSelection &&
      selectedPath.length === divisionLevels.length &&
      deepestDivision.tipo_nombre?.toLocaleLowerCase('es').includes('municip'),
  )

  const selectedViveroFromName =
    selectedViveroId === null && formData?.almacenamiento
      ? (viveros.find((vivero) => vivero.nombre === formData.almacenamiento)?.id ?? null)
      : null
  const resolvedSelectedViveroId = selectedViveroId ?? selectedViveroFromName

  const loadPaises = async () => {
    try {
      setLoadingPaises(true)
      setCatalogoError(null)
      const response = await RecoleccionService.getPaises()
      const nextPaises = response.data || []
      setPaises(nextPaises)

      if (selectedPaisId) {
        const selectedPais = nextPaises.find((pais) => pais.id === selectedPaisId)
        if (selectedPais) {
          setSelectedPaisNombre(selectedPais.nombre)
        }
      }
    } catch (error) {
      console.error('❌ Error cargando países:', error)
      setCatalogoError('No se pudo cargar el catálogo de países.')
    } finally {
      setLoadingPaises(false)
    }
  }

  const loadDivisionesByPath = async (paisId: number, pathIds: number[] = []) => {
    try {
      setLoadingDivisiones(true)
      setCatalogoError(null)

      const rootResponse = await RecoleccionService.getDivisiones(paisId)
      const rootOptions = rootResponse.data || []

      if (rootOptions.length === 0) {
        setDivisionLevels([])
        return
      }

      const levels: DivisionLevel[] = [
        {
          parentId: null,
          label: rootOptions[0]?.tipo_nombre || 'Nivel 1',
          options: rootOptions,
          selectedId: null,
        },
      ]

      for (const divisionId of pathIds) {
        const currentLevel = levels[levels.length - 1]
        const match = currentLevel.options.find((item) => item.id === divisionId)

        if (!match) {
          break
        }

        currentLevel.selectedId = divisionId
        const childrenResponse = await RecoleccionService.getDivisiones(paisId, divisionId)
        const children = childrenResponse.data || []

        if (children.length === 0) {
          break
        }

        levels.push({
          parentId: divisionId,
          label: children[0]?.tipo_nombre || `Nivel ${levels.length + 1}`,
          options: children,
          selectedId: null,
        })
      }

      setDivisionLevels(levels)
    } catch (error) {
      console.error('❌ Error cargando divisiones:', error)
      setCatalogoError('No se pudo cargar el catálogo de divisiones administrativas.')
      setDivisionLevels([])
    } finally {
      setLoadingDivisiones(false)
    }
  }

  const extractCommunityLabel = (geoData: any): string => {
    const address = geoData?.address || {}
    const candidates = [
      address.hamlet,
      address.village,
      address.suburb,
      address.neighbourhood,
      address.quarter,
      address.city_district,
      address.town,
      address.city,
    ]

    const firstValid = candidates.find(
      (value) => typeof value === 'string' && value.trim().length > 0,
    )

    if (firstValid) {
      return firstValid.trim()
    }

    if (typeof geoData?.display_name === 'string') {
      const firstChunk = geoData.display_name.split(',')[0]?.trim()
      if (firstChunk) {
        return firstChunk
      }
    }

    return ''
  }

  const getLocation = () => {
    setLoadingLocation(true)

    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en tu navegador')
      setLoadingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6)
        const lng = position.coords.longitude.toFixed(6)
        const accuracy = Math.round(position.coords.accuracy || 0)

        setLatitud(lat)
        setLongitud(lng)
        setPrecisionM(accuracy > 0 ? String(accuracy) : '')
        setErrors((prev) => ({ ...prev, coordinates: false, coordinateRange: false }))

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`,
          )
          const data = await response.json()

          if (data.display_name) {
            setReferencia(data.display_name)
          }

          const community = extractCommunityLabel(data)
          if (community && !comunidadNombre.trim()) {
            setComunidadNombre(community)
          }
        } catch (error) {
          console.error('Error al obtener la referencia:', error)
        }

        setLoadingLocation(false)
      },
      (error) => {
        console.error('Error al obtener ubicación:', error)
        alert('No se pudo obtener tu ubicación. Verifica los permisos.')
        setLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  const handlePaisChange = (paisIdRaw: string) => {
    const nextPaisId = paisIdRaw ? Number(paisIdRaw) : null
    setSelectedPaisId(nextPaisId)
    setErrors((prev) => ({ ...prev, pais: false, division: false }))

    if (!nextPaisId) {
      setSelectedPaisNombre('')
      setDivisionLevels([])
      return
    }

    const selectedPais = paises.find((pais) => pais.id === nextPaisId)
    setSelectedPaisNombre(selectedPais?.nombre || '')
  }

  const handleDivisionSelect = async (levelIndex: number, selectedIdRaw: string) => {
    const selectedId = selectedIdRaw ? Number(selectedIdRaw) : null
    const nextLevels = divisionLevels
      .slice(0, levelIndex + 1)
      .map((level, index) =>
        index === levelIndex ? { ...level, selectedId } : level,
      )

    setDivisionLevels(nextLevels)
    setErrors((prev) => ({ ...prev, division: false }))

    if (!selectedPaisId || selectedId === null) {
      return
    }

    try {
      setLoadingDivisiones(true)
      const response = await RecoleccionService.getDivisiones(selectedPaisId, selectedId)
      const children = response.data || []

      if (children.length === 0) {
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
      console.error('❌ Error cargando sub-divisiones:', error)
      setCatalogoError('No se pudieron cargar los niveles administrativos siguientes.')
    } finally {
      setLoadingDivisiones(false)
    }
  }

  const handleContinue = async () => {
    const parsedLat = Number(latitud)
    const parsedLon = Number(longitud)
    const hasCoords = Boolean(latitud.trim() && longitud.trim())
    const coordinatesAreValid =
      hasCoords &&
      Number.isFinite(parsedLat) &&
      Number.isFinite(parsedLon) &&
      parsedLat >= -90 &&
      parsedLat <= 90 &&
      parsedLon >= -180 &&
      parsedLon <= 180

    const divisionSelectionIsValid =
      selectedPath.length > 0 &&
      !hasMissingDivisionSelection &&
      selectedPath.length === divisionLevels.length

    const newErrors = {
      coordinates: !hasCoords,
      coordinateRange: hasCoords && !coordinatesAreValid,
      vivero: resolvedSelectedViveroId === null,
      pais: selectedPaisId === null,
      division: !divisionSelectionIsValid,
    }
    setErrors(newErrors)

    if (Object.values(newErrors).some(Boolean)) {
      return
    }

    if (!selectedPaisId || !deepestDivision) {
      return
    }

    const selectedVivero = viveros.find((vivero) => vivero.id === resolvedSelectedViveroId)
    let finalDivisionId = deepestDivision.id
    let finalDivisionPath = selectedPath.map((item) => item.nombre)
    let finalDivisionPathIds = selectedPath.map((item) => item.id)

    try {
      setSavingCommunity(true)

      if (isMunicipioLeaf && comunidadNombre.trim().length > 0) {
        const flexibleDivision = await RecoleccionService.ensureFlexibleDivision({
          pais_id: selectedPaisId,
          parent_id: deepestDivision.id,
          nombre: comunidadNombre.trim(),
        })

        finalDivisionId = flexibleDivision.data.id
        finalDivisionPath = [...finalDivisionPath, flexibleDivision.data.nombre]
        finalDivisionPathIds = [...finalDivisionPathIds, flexibleDivision.data.id]
      }

      updateForm({
        ubicacionNombre,
        referencia,
        comunidadNombre,
        latitud,
        longitud,
        paisId: String(selectedPaisId),
        paisNombre: selectedPaisNombre,
        divisionId: String(finalDivisionId),
        divisionPathIds: finalDivisionPathIds,
        divisionRuta: finalDivisionPath,
        precisionM,
        fuenteUbicacion: 'GPS_MOVIL',
        almacenamiento: selectedVivero?.nombre ?? formData.almacenamiento,
        vivero_id: selectedVivero?.id ?? formData.vivero_id,
      })

      navigate('/app/collections/new/summary')
    } catch (error) {
      console.error('❌ Error resolviendo división comunitaria:', error)
      alert('No se pudo guardar la comunidad/localidad. Intenta nuevamente.')
    } finally {
      setSavingCommunity(false)
    }
  }

  useEffect(() => {
    loadPaises()
  }, [])

  useEffect(() => {
    if (!latitud && !longitud) {
      const timer = setTimeout(() => {
        getLocation()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!selectedPaisId) {
      setDivisionLevels([])
      return
    }

    const savedPath =
      formData?.paisId &&
      Number(formData.paisId) === selectedPaisId &&
      Array.isArray(formData.divisionPathIds)
        ? formData.divisionPathIds
        : []

    void loadDivisionesByPath(selectedPaisId, savedPath)
  }, [selectedPaisId])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="sticky top-0 z-40 flex items-center justify-center border-b border-slate-200/50 bg-white/10 pb-4 pt-6 shadow-sm backdrop-blur-md">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/collections/new')}
            className="absolute left-5 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-brand-700">Recoleccion</h1>
            <p className="text-sm font-semibold text-brand-500">
              Paso 2 de 3 · <span className="text-slate-500">Ubicación y almacén</span>
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-5 px-5 pb-7">
          <div>
            <h2 className="mb-3 text-lg font-extrabold text-brand-700">Registrar ubicación</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">Nombre del punto</p>
                <input
                  type="text"
                  value={ubicacionNombre}
                  onChange={(event) => setUbicacionNombre(event.target.value)}
                  placeholder="Parcela Don Lucho"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">
                  Referencia GPS (automática)
                </p>
                <div className="flex gap-2">
                  <textarea
                    value={referencia}
                    readOnly
                    rows={2}
                    placeholder="Se llenará al capturar GPS..."
                    className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none"
                  />
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={loadingLocation}
                    className="rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600 shadow-soft transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingLocation ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Icon name="pin" className="h-4 w-4" />
                        <span>GPS</span>
                      </span>
                    )}
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Fuente: GPS_MOVIL{precisionM ? ` · Precisión aproximada: ${precisionM} m` : ''}
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">
                    Latitud <span className="text-red-500">*</span>
                  </p>
                  <input
                    type="text"
                    value={latitud}
                    onChange={(event) => {
                      setLatitud(event.target.value)
                      setErrors((prev) => ({ ...prev, coordinates: false, coordinateRange: false }))
                    }}
                    placeholder="-16.500000"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                      errors.coordinates || errors.coordinateRange
                        ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                        : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                    }`}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">
                    Longitud <span className="text-red-500">*</span>
                  </p>
                  <input
                    type="text"
                    value={longitud}
                    onChange={(event) => {
                      setLongitud(event.target.value)
                      setErrors((prev) => ({ ...prev, coordinates: false, coordinateRange: false }))
                    }}
                    placeholder="-68.150000"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                      errors.coordinates || errors.coordinateRange
                        ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                        : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                    }`}
                  />
                </div>
              </div>
              {errors.coordinates && (
                <p className="text-xs font-semibold text-red-500">
                  * Latitud y longitud son obligatorias.
                </p>
              )}
              {errors.coordinateRange && (
                <p className="text-xs font-semibold text-red-500">
                  * Coordenadas inválidas. Latitud debe estar entre -90 y 90, longitud entre -180 y
                  180.
                </p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">
                  País <span className="text-red-500">*</span>
                </p>
                <div
                  className={`flex items-center rounded-2xl border px-4 shadow-soft focus-within:ring-2 ${
                    errors.pais
                      ? 'border-red-400 bg-red-50 focus-within:border-red-400 focus-within:ring-red-200'
                      : 'border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-brand-200'
                  }`}
                >
                  <select
                    value={selectedPaisId ?? ''}
                    onChange={(event) => handlePaisChange(event.target.value)}
                    className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                    disabled={loadingPaises}
                  >
                    <option value="">
                      {loadingPaises ? 'Cargando países...' : 'Selecciona un país'}
                    </option>
                    {paises.map((pais) => (
                      <option key={pais.id} value={pais.id}>
                        {pais.nombre}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
                </div>
                {errors.pais && (
                  <p className="text-xs font-semibold text-red-500">
                    * Selecciona un país.
                  </p>
                )}
              </div>

              {divisionLevels.map((level, index) => (
                <div key={`${level.parentId ?? 'root'}-${index}`} className="space-y-2">
                  <p className="text-sm font-semibold text-brand-700">
                    {level.label || `Nivel ${index + 1}`}
                    {index === 0 ? <span className="text-red-500"> *</span> : null}
                  </p>
                  <div
                    className={`flex items-center rounded-2xl border px-4 shadow-soft focus-within:ring-2 ${
                      errors.division
                        ? 'border-red-400 bg-red-50 focus-within:border-red-400 focus-within:ring-red-200'
                        : 'border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-brand-200'
                    }`}
                  >
                    <select
                      value={level.selectedId ?? ''}
                      onChange={(event) => {
                        void handleDivisionSelect(index, event.target.value)
                      }}
                      className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                      disabled={loadingDivisiones}
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
              {errors.division && (
                <p className="text-xs font-semibold text-red-500">
                  * Completa la ruta administrativa seleccionando los niveles disponibles.
                </p>
              )}

              {isMunicipioLeaf && (
                <div className="space-y-2 rounded-2xl border border-brand-200 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-700">
                    Comunidad/Localidad (flexible)
                  </p>
                  <input
                    type="text"
                    value={comunidadNombre}
                    onChange={(event) => setComunidadNombre(event.target.value)}
                    placeholder="Se sugiere desde GPS, puedes corregir el nombre"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  />
                  <p className="text-xs font-semibold text-brand-600">
                    Si escribes un nombre, se guardará automáticamente como nueva división bajo el
                    municipio seleccionado.
                  </p>
                </div>
              )}

              {catalogoError && (
                <p className="text-xs font-semibold text-red-500">{catalogoError}</p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">Almacenamiento</p>
                {viveroLoading ? (
                  <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600 shadow-soft">
                    Cargando viveros...
                  </div>
                ) : (
                  <>
                    <div
                      className={`flex items-center rounded-2xl border px-4 shadow-soft focus-within:ring-2 ${
                        errors.vivero
                          ? 'border-red-400 bg-red-50 focus-within:border-red-400 focus-within:ring-red-200'
                          : 'border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-brand-200'
                      }`}
                    >
                      <select
                        value={resolvedSelectedViveroId ?? ''}
                        onChange={(event) => {
                          const nextId = event.target.value ? Number(event.target.value) : null
                          setSelectedViveroId(nextId)
                          if (nextId !== null) {
                            setErrors((prev) => ({ ...prev, vivero: false }))
                          }
                        }}
                        className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                      >
                        <option value="">Selecciona un vivero</option>
                        {viveros.map((vivero) => (
                          <option key={vivero.id} value={vivero.id}>
                            {vivero.nombre} ({vivero.codigo})
                          </option>
                        ))}
                      </select>
                      <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
                    </div>
                    {viveroError && <p className="text-xs font-semibold text-red-500">{viveroError}</p>}
                    {errors.vivero && (
                      <p className="text-xs font-semibold text-red-500">
                        * El vivero es obligatorio para continuar.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={savingCommunity}
            onClick={() => {
              void handleContinue()
            }}
            className="mb-8 w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {savingCommunity ? 'Guardando comunidad...' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocationForm

