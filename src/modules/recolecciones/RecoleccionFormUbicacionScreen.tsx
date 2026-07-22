import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerComunidad } from '../../api/comunidades.api'
import Icon from '../../components/Icon'
import SelectorComunidad from '../comunidades/SelectorComunidad'
import { useViveros } from '../../hooks/useViveros'
import { UbicacionesService, type PaisCatalogo } from '../../services/ubicaciones.service'
import type { ComunidadCard } from '../../tipos/comunidades'
import { useRecoleccionForm } from './useRecoleccionForm'

function RecoleccionFormUbicacionScreen() {
  const navigate = useNavigate()
  const { formData, updateForm } = useRecoleccionForm()
  const { viveros, loading: viveroLoading, error: viveroError } = useViveros()

  const [ubicacionNombre, setUbicacionNombre] = useState(formData?.ubicacionNombre || '')
  const [referencia, setReferencia] = useState(formData?.referencia || '')
  const [latitud, setLatitud] = useState(formData?.latitud || '')
  const [longitud, setLongitud] = useState(formData?.longitud || '')
  const [precisionM, setPrecisionM] = useState(formData?.precisionM || '')
  const [selectedPaisId, setSelectedPaisId] = useState<number | null>(
    formData?.paisId ? Number(formData.paisId) : 1,
  )
  const [selectedPaisNombre, setSelectedPaisNombre] = useState(formData?.paisNombre || '')
  const [selectedComunidad, setSelectedComunidad] = useState<ComunidadCard | null>(null)
  const [paises, setPaises] = useState<PaisCatalogo[]>([])
  const [loadingPaises, setLoadingPaises] = useState(false)
  const [loadingComunidad, setLoadingComunidad] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [didHydrateSavedComunidad, setDidHydrateSavedComunidad] = useState(false)
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

  const selectedDivisionRuta = useMemo(() => {
    if (!selectedComunidad) {
      return []
    }

    return [
      selectedComunidad.nivel1?.nombre,
      selectedComunidad.nivel2?.nombre,
      selectedComunidad.nivel3?.nombre,
      selectedComunidad.nivel4?.nombre || selectedComunidad.nombre,
    ].filter((value): value is string => Boolean(value))
  }, [selectedComunidad])

  const selectedComunidadRuta = useMemo(() => {
    if (!selectedComunidad) {
      return []
    }

    return [
      selectedComunidad.pais?.nombre,
      selectedComunidad.nivel1?.nombre,
      selectedComunidad.nivel2?.nombre,
      selectedComunidad.nivel3?.nombre,
      selectedComunidad.nivel4?.nombre || selectedComunidad.nombre,
    ].filter((value): value is string => Boolean(value))
  }, [selectedComunidad])

  const selectedDivisionPathIds = useMemo(() => {
    if (!selectedComunidad) {
      return []
    }

    return [
      selectedComunidad.nivel1?.id,
      selectedComunidad.nivel2?.id,
      selectedComunidad.nivel3?.id,
      selectedComunidad.nivel4?.id ?? selectedComunidad.id,
    ].filter((value): value is number => typeof value === 'number')
  }, [selectedComunidad])

  const selectedViveroFromName =
    selectedViveroId === null && formData?.almacenamiento
      ? (viveros.find((vivero) => vivero.nombre === formData.almacenamiento)?.id ?? null)
      : null
  const resolvedSelectedViveroId = selectedViveroId ?? selectedViveroFromName

  const getLocation = () => {
    setLoadingLocation(true)

    if (!navigator.geolocation) {
      alert('La geolocalizacion no esta disponible en tu navegador')
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
        } catch (error) {
          console.error('Error al obtener la referencia:', error)
        }

        setLoadingLocation(false)
      },
      (error) => {
        console.error('Error al obtener ubicacion:', error)
        alert('No se pudo obtener tu ubicacion. Verifica los permisos.')
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
    setSelectedComunidad(null)
    setErrors((prev) => ({ ...prev, pais: false, division: false }))

    if (!nextPaisId) {
      setSelectedPaisNombre('')
      return
    }

    const selectedPais = paises.find((pais) => pais.id === nextPaisId)
    setSelectedPaisNombre(selectedPais?.nombre || '')
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

    const divisionSelectionIsValid = selectedComunidad !== null

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

    if (!selectedPaisId || !selectedComunidad) {
      return
    }

    const selectedVivero = viveros.find((vivero) => vivero.id === resolvedSelectedViveroId)

    try {
      setSubmitting(true)

      updateForm({
        ubicacionNombre,
        referencia,
        comunidadNombre: selectedComunidad.nombre,
        latitud,
        longitud,
        paisId: String(selectedPaisId),
        paisNombre: selectedPaisNombre,
        divisionId: String(selectedComunidad.id),
        divisionPathIds: selectedDivisionPathIds,
        divisionRuta: selectedDivisionRuta,
        precisionM,
        fuenteUbicacion: 'GPS_MOVIL',
        almacenamiento: selectedVivero?.nombre ?? formData.almacenamiento,
        vivero_id: selectedVivero?.id ?? formData.vivero_id,
      })

      navigate('/app/collections/new/summary')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    let isActive = true

    const loadPaises = async () => {
      try {
        setLoadingPaises(true)
        setCatalogoError(null)
        const nextPaises = await UbicacionesService.getPaises()
        if (!isActive) {
          return
        }

        setPaises(nextPaises)

        if (selectedPaisId) {
          const selectedPais = nextPaises.find((pais) => pais.id === selectedPaisId)
          if (selectedPais) {
            setSelectedPaisNombre(selectedPais.nombre)
          }
        }
      } catch (error) {
        if (isActive) {
          console.error('Error cargando paises:', error)
          setCatalogoError('No se pudo cargar el catalogo de paises.')
        }
      } finally {
        if (isActive) {
          setLoadingPaises(false)
        }
      }
    }

    void loadPaises()

    return () => {
      isActive = false
    }
  }, [selectedPaisId])

  useEffect(() => {
    if (!latitud && !longitud) {
      const timer = setTimeout(() => {
        getLocation()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [latitud, longitud])

  useEffect(() => {
    const savedDivisionId = formData?.divisionId ? Number(formData.divisionId) : null
    if (
      didHydrateSavedComunidad ||
      !savedDivisionId ||
      !selectedPaisId ||
      selectedComunidad?.id === savedDivisionId
    ) {
      return
    }

    let isActive = true
    const loadSavedComunidad = async () => {
      try {
        setLoadingComunidad(true)
        const response = await obtenerComunidad(savedDivisionId)
        if (!isActive) {
          return
        }

        if (!response.data) {
          setDidHydrateSavedComunidad(true)
          return
        }

        if (response.data.pais?.id !== selectedPaisId) {
          setDidHydrateSavedComunidad(true)
          return
        }

        setSelectedComunidad(response.data)
      } catch (error) {
        if (isActive) {
          console.error('Error cargando comunidad guardada:', error)
        }
      } finally {
        if (isActive) {
          setLoadingComunidad(false)
          setDidHydrateSavedComunidad(true)
        }
      }
    }

    void loadSavedComunidad()
    return () => {
      isActive = false
    }
  }, [
    didHydrateSavedComunidad,
    formData?.divisionId,
    selectedComunidad?.id,
    selectedPaisId,
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="sticky top-0 z-40 flex items-center justify-center border-b border-neutral-200/50 bg-white/10 pb-4 pt-6 shadow-sm backdrop-blur-md">
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
              Paso 2 de 3 · <span className="text-neutral-500">Ubicacion y almacen</span>
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-5 px-5 pb-7">
          <div>
            <h2 className="mb-3 text-lg font-extrabold text-brand-700">Registrar ubicacion</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">Nombre del punto</p>
                <input
                  type="text"
                  value={ubicacionNombre}
                  onChange={(event) => setUbicacionNombre(event.target.value)}
                  placeholder="Parcela Don Lucho"
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">
                  Referencia GPS (automatica)
                </p>
                <div className="flex gap-2">
                  <textarea
                    value={referencia}
                    readOnly
                    rows={2}
                    placeholder="Se llenara al capturar GPS..."
                    className="flex-1 resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-700 shadow-soft outline-none"
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
                <p className="text-xs font-semibold text-neutral-500">
                  Fuente: GPS_MOVIL{precisionM ? ` · Precision aproximada: ${precisionM} m` : ''}
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">
                    Latitud <span className="text-danger-500">*</span>
                  </p>
                  <input
                    type="text"
                    value={latitud}
                    onChange={(event) => {
                      setLatitud(event.target.value)
                      setErrors((prev) => ({ ...prev, coordinates: false, coordinateRange: false }))
                    }}
                    placeholder="-16.500000"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-neutral-700 shadow-soft outline-none transition focus:ring-2 ${
                      errors.coordinates || errors.coordinateRange
                        ? 'border-danger-400 bg-danger-50 focus:border-danger-400 focus:ring-danger-200'
                        : 'border-neutral-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                    }`}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">
                    Longitud <span className="text-danger-500">*</span>
                  </p>
                  <input
                    type="text"
                    value={longitud}
                    onChange={(event) => {
                      setLongitud(event.target.value)
                      setErrors((prev) => ({ ...prev, coordinates: false, coordinateRange: false }))
                    }}
                    placeholder="-68.150000"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-neutral-700 shadow-soft outline-none transition focus:ring-2 ${
                      errors.coordinates || errors.coordinateRange
                        ? 'border-danger-400 bg-danger-50 focus:border-danger-400 focus:ring-danger-200'
                        : 'border-neutral-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                    }`}
                  />
                </div>
              </div>
              {errors.coordinates && (
                <p className="text-xs font-semibold text-danger-500">
                  * Latitud y longitud son obligatorias.
                </p>
              )}
              {errors.coordinateRange && (
                <p className="text-xs font-semibold text-danger-500">
                  * Coordenadas invalidas. Latitud debe estar entre -90 y 90, longitud entre -180 y
                  180.
                </p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">
                  Pais <span className="text-danger-500">*</span>
                </p>
                <div
                  className={`flex items-center rounded-2xl border px-4 shadow-soft focus-within:ring-2 ${
                    errors.pais
                      ? 'border-danger-400 bg-danger-50 focus-within:border-danger-400 focus-within:ring-danger-200'
                      : 'border-neutral-200 bg-white focus-within:border-brand-400 focus-within:ring-brand-200'
                  }`}
                >
                  <select
                    value={selectedPaisId ?? ''}
                    onChange={(event) => handlePaisChange(event.target.value)}
                    className="w-full bg-transparent py-3 text-sm font-semibold text-neutral-700 outline-none"
                    disabled={loadingPaises}
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
                  <Icon name="chevron-down" className="h-4 w-4 text-neutral-400" />
                </div>
                {errors.pais && (
                  <p className="text-xs font-semibold text-danger-500">
                    * Selecciona un pais.
                  </p>
                )}
              </div>

              {selectedPaisId !== null && (
                <>
                  <SelectorComunidad
                    paisId={selectedPaisId}
                    valueId={selectedComunidad?.id}
                    onChange={(comunidad) => {
                      setSelectedComunidad(comunidad)
                      setErrors((prev) => ({ ...prev, division: false }))
                    }}
                    disabled={loadingComunidad}
                    error={errors.division}
                    placeholder="Selecciona una comunidad o localidad..."
                  />

                  {loadingComunidad && (
                    <p className="text-xs font-semibold text-brand-500">
                      Cargando comunidad seleccionada...
                    </p>
                  )}
                </>
              )}

              {errors.division && (
                <p className="text-xs font-semibold text-danger-500">
                  * Selecciona una comunidad existente para continuar.
                </p>
              )}

              {selectedComunidadRuta.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-brand-200 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-700">
                    Ruta seleccionada
                  </p>
                  <p className="text-xs font-semibold text-brand-600">
                    {selectedComunidadRuta.join(' / ')}
                  </p>
                </div>
              )}

              {catalogoError && (
                <p className="text-xs font-semibold text-danger-500">{catalogoError}</p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">
                  Almacenamiento <span className="text-danger-500">*</span>
                </p>
                {viveroLoading ? (
                  <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600 shadow-soft">
                    Cargando viveros...
                  </div>
                ) : (
                  <>
                    <div
                      className={`flex items-center rounded-2xl border px-4 shadow-soft focus-within:ring-2 ${
                        errors.vivero
                          ? 'border-danger-400 bg-danger-50 focus-within:border-danger-400 focus-within:ring-danger-200'
                          : 'border-neutral-200 bg-white focus-within:border-brand-400 focus-within:ring-brand-200'
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
                        className="w-full bg-transparent py-3 text-sm font-semibold text-neutral-700 outline-none"
                      >
                        <option value="">Selecciona un vivero</option>
                        {viveros.map((vivero) => (
                          <option key={vivero.id} value={vivero.id}>
                            {vivero.nombre} ({vivero.codigo})
                          </option>
                        ))}
                      </select>
                      <Icon name="chevron-down" className="h-4 w-4 text-neutral-400" />
                    </div>
                    {viveroError && <p className="text-xs font-semibold text-danger-500">{viveroError}</p>}
                    {errors.vivero && (
                      <p className="text-xs font-semibold text-danger-500">
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
            disabled={submitting}
            onClick={() => {
              void handleContinue()
            }}
            className="mb-8 w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Guardando ubicacion...' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecoleccionFormUbicacionScreen
