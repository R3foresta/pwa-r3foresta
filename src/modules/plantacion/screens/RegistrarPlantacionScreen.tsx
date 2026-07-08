import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import FotosUploader, { type Photo } from '../../vivero/components/event/FotosUploader'
import { usePlantacionContext } from '../hooks/usePlantacionContext'
import { isPointInPolygon } from '../utils/geo'
import {
  resolverDetallesAsignacion,
  type CantidadPorEspecie,
} from '../utils/resolverDetallesAsignacion'
import type { RegistroPlantacionData } from '../types/contracts'

// PLT-FE-002/003/004/006/007: pantalla de registro de plantación inicial.
// Un solo route con pasos internos:
//   1. Evidencia fotográfica y GPS.
//   2. Cantidades por especie, fecha, observaciones y coresponsables.
//   3. Resumen, guardado transaccional y comprobante.

type Step = 1 | 2 | 3

const STEP_LABEL: Record<Step, string> = {
  1: 'Evidencia y GPS',
  2: 'Cantidades y equipo',
  3: 'Resumen',
}

function toLocalISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function RegistrarPlantacionScreen() {
  const navigate = useNavigate()
  const { subcampaniaId } = useParams()
  const { user } = useAuth()

  const numericId = subcampaniaId ? Number(subcampaniaId) : null
  const { context, loading, error, refetch } = usePlantacionContext(numericId)

  const [step, setStep] = useState<Step>(1)

  // Paso 1: evidencia + GPS
  const [photos, setPhotos] = useState<Photo[]>([])
  const [latitud, setLatitud] = useState('')
  const [longitud, setLongitud] = useState('')
  const [precisionM, setPrecisionM] = useState<number | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [step1Touched, setStep1Touched] = useState(false)
  const autoGpsRequestedRef = useRef(false)

  // Paso 2: cantidades + datos
  const [cantidades, setCantidades] = useState<Record<number, string>>({})
  const [fecha, setFecha] = useState(() => toLocalISODate(new Date()))
  const [observaciones, setObservaciones] = useState('')
  const [coresponsableIds, setCoresponsableIds] = useState<number[]>([])
  const [step2Touched, setStep2Touched] = useState(false)

  // Guardado + comprobante
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [cleanupWarning, setCleanupWarning] = useState<string | null>(null)
  const [comprobante, setComprobante] = useState<RegistroPlantacionData | null>(null)

  const authIdRef = useRef(user?.auth_id)
  authIdRef.current = user?.auth_id

  // Evidencias subidas cuyo cleanup falló: se reintenta una vez en el próximo
  // guardado y al salir de la pantalla (best-effort, sin loops infinitos).
  const staleEvidenceIdsRef = useRef<number[]>([])

  const detailPath = `/app/planting/subcampanias/${numericId ?? ''}`

  // --------------------------------------------------------------------
  // Reglas y derivados del context
  // --------------------------------------------------------------------
  const reglas = context?.reglas
  const minFotos = reglas?.min_fotos ?? 1
  const maxFotos = reglas?.max_fotos ?? 10
  const precisionAdvertenciaM = reglas?.precision_gps_advertencia_m ?? 50
  const maxDiasRetroactivos = reglas?.max_dias_retroactivos ?? 10
  const permiteExcederMeta = reglas?.permite_exceder_meta_especie ?? false

  const hoyISO = toLocalISODate(new Date())
  const fechaMinima = useMemo(() => {
    const min = new Date()
    min.setDate(min.getDate() - maxDiasRetroactivos)
    return toLocalISODate(min)
  }, [maxDiasRetroactivos])

  const stockPorPlanta = useMemo(() => {
    const map = new Map<number, number>()
    context?.stock_por_especie.forEach((stock) => {
      map.set(stock.planta_id, Math.max(0, stock.stock_asignado_disponible))
    })
    return map
  }, [context])

  const codigoLotePorId = useMemo(() => {
    const map = new Map<number, string>()
    context?.stock_por_especie.forEach((stock) => {
      stock.asignaciones.forEach((asignacion) => {
        if (asignacion.codigo_lote) {
          map.set(asignacion.lote_vivero_id, asignacion.codigo_lote)
        }
      })
    })
    return map
  }, [context])

  const motivoBloqueo = useMemo(() => {
    if (!context) return null
    if (!context.usuario.puede_registrar) {
      return (
        context.usuario.motivo_bloqueo ||
        'No puedes registrar plantaciones en esta subcampaña.'
      )
    }
    if (context.subcampania.estado !== 'ACTIVA') {
      return 'La subcampaña no está activa.'
    }
    if (context.plan_por_especie.length === 0) {
      return 'La subcampaña no tiene plan de especies definido.'
    }
    const stockTotal = context.stock_por_especie.reduce(
      (sum, stock) => sum + Math.max(0, stock.stock_asignado_disponible),
      0,
    )
    if (stockTotal <= 0) {
      return 'No hay stock asignado disponible para plantación inicial.'
    }
    if (!context.subcampania.poligono?.coordinates?.length) {
      return 'La subcampaña no tiene un polígono evaluable.'
    }
    return null
  }, [context])

  // --------------------------------------------------------------------
  // Paso 1: GPS
  // --------------------------------------------------------------------
  const parsedLat = Number(latitud)
  const parsedLng = Number(longitud)
  const hasCoords = latitud.trim() !== '' && longitud.trim() !== ''
  const coordsInRange =
    hasCoords &&
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180

  const dentroDePoligono = useMemo(() => {
    if (!coordsInRange || !context?.subcampania.poligono) return null
    return isPointInPolygon(parsedLat, parsedLng, context.subcampania.poligono)
  }, [coordsInRange, parsedLat, parsedLng, context])

  const precisionBaja = precisionM !== null && precisionM > precisionAdvertenciaM

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('La geolocalización no está disponible en este dispositivo.')
      return
    }
    setGpsLoading(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitud(position.coords.latitude.toFixed(6))
        setLongitud(position.coords.longitude.toFixed(6))
        const accuracy = Math.round(position.coords.accuracy || 0)
        setPrecisionM(accuracy > 0 ? accuracy : null)
        setGpsLoading(false)
      },
      () => {
        setGpsError(
          'No se pudo obtener tu ubicación. Verifica los permisos de GPS e intenta de nuevo.',
        )
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }, [])

  // Captura automática al entrar al formulario (una sola vez).
  useEffect(() => {
    if (
      context &&
      !motivoBloqueo &&
      !autoGpsRequestedRef.current &&
      !latitud &&
      !longitud
    ) {
      autoGpsRequestedRef.current = true
      getLocation()
    }
  }, [context, motivoBloqueo, latitud, longitud, getLocation])

  // --------------------------------------------------------------------
  // Paso 1: fotos
  // --------------------------------------------------------------------
  const handleAddPhotos = (files: File[]) => {
    setPhotos((prev) => [
      ...prev,
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ])
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const photosRef = useRef<Photo[]>([])
  photosRef.current = photos

  useEffect(
    () => () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
      const stale = staleEvidenceIdsRef.current
      if (stale.length > 0) {
        staleEvidenceIdsRef.current = []
        void PlantacionService.descartarEvidenciasPendientesPlantacion(
          stale,
          authIdRef.current,
        ).catch(() => {})
      }
    },
    [],
  )

  const step1Valid = photos.length >= minFotos && coordsInRange

  // --------------------------------------------------------------------
  // Paso 2: cantidades
  // --------------------------------------------------------------------
  type EspecieRow = {
    planta_id: number
    nombre: string
    nombre_cientifico?: string | null
    objetivo: number
    plantado: number
    pendiente: number
    stock: number
    maxRegistrable: number
    cantidad: number
    inputError: string | null
  }

  const especieRows: EspecieRow[] = useMemo(() => {
    if (!context) return []
    return context.plan_por_especie.map((plan) => {
      const stock = stockPorPlanta.get(plan.planta_id) ?? 0
      const pendiente = Math.max(0, plan.pendiente_meta)
      const maxRegistrable = permiteExcederMeta ? stock : Math.min(stock, pendiente)

      const raw = (cantidades[plan.planta_id] ?? '').trim()
      const parsed = raw === '' ? 0 : Number(raw)

      let inputError: string | null = null
      if (raw !== '' && (!Number.isInteger(parsed) || parsed < 0)) {
        inputError = 'Ingresa una cantidad entera (sin decimales).'
      } else if (parsed > stock) {
        inputError = `Supera el stock asignado disponible (${stock}).`
      } else if (!permiteExcederMeta && parsed > pendiente) {
        inputError = `Supera lo pendiente de la meta (${pendiente}).`
      }

      return {
        planta_id: plan.planta_id,
        nombre: plan.nombre_comun_principal || `Especie ${plan.planta_id}`,
        nombre_cientifico: plan.nombre_cientifico,
        objetivo: plan.cantidad_objetivo,
        plantado: plan.plantado_inicial,
        pendiente,
        stock,
        maxRegistrable,
        cantidad: inputError ? 0 : parsed,
        inputError,
      }
    })
  }, [context, cantidades, stockPorPlanta, permiteExcederMeta])

  const totalDeclarado = especieRows.reduce((sum, row) => sum + row.cantidad, 0)
  const hasCantidadErrors = especieRows.some((row) => row.inputError)
  const fechaValida = fecha >= fechaMinima && fecha <= hoyISO
  const observacionesValidas = observaciones.trim().length <= 2000

  const step2Valid =
    totalDeclarado > 0 && !hasCantidadErrors && fechaValida && observacionesValidas

  const equipoSeleccionable = useMemo(
    () =>
      (context?.equipo ?? []).filter(
        (member) => member.usuario_id !== context?.usuario.id,
      ),
    [context],
  )

  const toggleCoresponsable = (usuarioId: number) => {
    setCoresponsableIds((prev) =>
      prev.includes(usuarioId)
        ? prev.filter((id) => id !== usuarioId)
        : [...prev, usuarioId],
    )
  }

  const coresponsablesSeleccionados = equipoSeleccionable.filter((member) =>
    coresponsableIds.includes(member.usuario_id),
  )

  // --------------------------------------------------------------------
  // Guardado (PLT-FE-006) + cleanup (PLT-FE-007)
  // --------------------------------------------------------------------
  const handleGuardar = async () => {
    if (saving || !context || !numericId) return
    setSaving(true)
    setSubmitError(null)
    setCleanupWarning(null)

    // Reintento único (best-effort) del cleanup pendiente de intentos previos.
    if (staleEvidenceIdsRef.current.length > 0) {
      const stale = staleEvidenceIdsRef.current
      staleEvidenceIdsRef.current = []
      void PlantacionService.descartarEvidenciasPendientesPlantacion(
        stale,
        authIdRef.current,
      ).catch(() => {})
    }

    let evidenciaIds: number[] = []
    try {
      const cantidadesPorEspecie: CantidadPorEspecie[] = especieRows
        .filter((row) => row.cantidad > 0)
        .map((row) => ({ planta_id: row.planta_id, cantidad: row.cantidad }))

      // PLT-FE-005: distribución automática por asignación
      // (fecha_asignacion ASC, asignacion_id ASC). Lanza error si no alcanza.
      const detalles = resolverDetallesAsignacion(
        cantidadesPorEspecie,
        context.stock_por_especie,
      )

      const upload = await PlantacionService.uploadEvidenciasPendientesPlantacion(
        {
          fotos: photos.map((photo) => photo.file),
          titulo: `Plantación inicial ${
            context.subcampania.codigo_trazabilidad || context.subcampania.nombre
          }`,
          tomado_en: fecha,
        },
        { minFotos, maxFotos },
        authIdRef.current,
      )
      evidenciaIds = upload.evidencia_ids

      const data = await PlantacionService.registrarPlantacion(
        {
          subcampania_id: numericId,
          es_reposicion: false,
          fecha_plantacion: fecha,
          latitud: parsedLat,
          longitud: parsedLng,
          observaciones: observaciones.trim() || undefined,
          coresponsable_ids:
            coresponsableIds.length > 0 ? coresponsableIds : undefined,
          detalles,
          evidencia_ids: evidenciaIds,
        },
        authIdRef.current,
      )

      setComprobante(data)
    } catch (saveError) {
      setSubmitError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo registrar la plantación.',
      )
      // El POST final falló después de subir evidencias: descartarlas para no
      // dejar huérfanas. Un solo intento; si falla, queda para el próximo.
      if (evidenciaIds.length > 0) {
        try {
          await PlantacionService.descartarEvidenciasPendientesPlantacion(
            evidenciaIds,
            authIdRef.current,
          )
        } catch {
          staleEvidenceIdsRef.current = evidenciaIds
          setCleanupWarning(
            'Además, no se pudieron descartar las fotos ya subidas; se reintentará automáticamente.',
          )
        }
      }
    } finally {
      setSaving(false)
    }
  }

  // --------------------------------------------------------------------
  // Navegación entre pasos
  // --------------------------------------------------------------------
  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step)
      return
    }
    navigate(detailPath)
  }

  const handleContinueStep1 = () => {
    setStep1Touched(true)
    if (!step1Valid) return
    setStep(2)
  }

  const handleContinueStep2 = () => {
    setStep2Touched(true)
    if (!step2Valid) return
    setSubmitError(null)
    setStep(3)
  }

  // --------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------
  const renderHeader = () => (
    <header className="sticky top-0 z-40 flex items-center justify-center border-b border-slate-200/50 bg-white/10 pb-4 pt-6 shadow-sm backdrop-blur-md">
      <button
        type="button"
        aria-label="Volver"
        onClick={handleBack}
        className="absolute left-5 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
      >
        <Icon name="arrow-left" className="h-5 w-5" />
      </button>
      <div className="px-14 text-center">
        <h1 className="text-xl font-extrabold tracking-tight text-brand-700">
          Registrar plantación
        </h1>
        <p className="text-sm font-semibold text-brand-500">
          Paso {step} de 3 · <span className="text-slate-500">{STEP_LABEL[step]}</span>
        </p>
      </div>
    </header>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 px-8 text-center">
          <svg className="h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm font-semibold text-brand-600">
            Cargando contexto de plantación...
          </p>
        </div>
      </div>
    )
  }

  if (error || !context) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-500">
            <Icon name="info" className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-red-600">
            {error || 'No se pudo cargar el contexto de plantación.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(detailPath)}
              className="rounded-2xl border border-brand-200 bg-white px-5 py-3 text-sm font-extrabold text-brand-600 shadow-soft transition hover:bg-brand-50"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-brand-600"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (motivoBloqueo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Icon name="shield" className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-extrabold text-brand-700">
            No puedes registrar aquí
          </h2>
          <p className="text-sm font-semibold text-brand-600">{motivoBloqueo}</p>
          <p className="text-xs font-semibold text-slate-500">
            {context.subcampania.nombre}
            {context.subcampania.codigo_trazabilidad
              ? ` · ${context.subcampania.codigo_trazabilidad}`
              : ''}
          </p>
          <button
            type="button"
            onClick={() => navigate(detailPath)}
            className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-brand-600"
          >
            Volver a la subcampaña
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        {renderHeader()}

        <div className="flex-1 space-y-5 px-5 pb-7 pt-4">
          {/* Contexto de la subcampaña */}
          <div className="rounded-2xl border border-brand-100 bg-white/80 px-4 py-3 shadow-soft">
            <p className="text-sm font-extrabold text-brand-800">
              {context.subcampania.nombre}
            </p>
            <p className="text-[11px] font-semibold text-brand-500">
              {[
                context.subcampania.codigo_trazabilidad,
                context.subcampania.campania_nombre,
                context.subcampania.zona_nombre,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          {/* ------------------------- PASO 1 ------------------------- */}
          {step === 1 && (
            <>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <FotosUploader
                  photos={photos}
                  onAdd={handleAddPhotos}
                  onRemove={handleRemovePhoto}
                  max={maxFotos}
                  required
                  showError={step1Touched && photos.length < minFotos}
                  errorMessage={`Debes adjuntar al menos ${minFotos} foto${
                    minFotos === 1 ? '' : 's'
                  } de la plantación.`}
                />
              </div>

              <div className="space-y-3 rounded-2xl bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-brand-700">
                    Ubicación GPS
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-red-500">
                      Obligatorio
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={gpsLoading}
                    className="flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-3 py-2 text-xs font-extrabold text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="pin" className="h-4 w-4" />
                    {gpsLoading ? 'Capturando...' : latitud ? 'Reintentar' : 'Capturar'}
                  </button>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-semibold text-brand-600">Latitud</p>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={latitud}
                      onChange={(event) => {
                        setLatitud(event.target.value)
                        setPrecisionM(null)
                      }}
                      placeholder="-16.500000"
                      className={`w-full rounded-2xl border px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                        step1Touched && !coordsInRange
                          ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                          : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                      }`}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-semibold text-brand-600">Longitud</p>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={longitud}
                      onChange={(event) => {
                        setLongitud(event.target.value)
                        setPrecisionM(null)
                      }}
                      placeholder="-68.150000"
                      className={`w-full rounded-2xl border px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                        step1Touched && !coordsInRange
                          ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                          : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                      }`}
                    />
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-500">
                  {precisionM !== null
                    ? `Precisión aproximada: ${precisionM} m`
                    : hasCoords
                      ? 'Precisión no disponible (coordenadas manuales).'
                      : 'Captura tu posición para registrar el punto de plantación.'}
                </p>

                {gpsError && (
                  <p className="text-xs font-semibold text-red-500">{gpsError}</p>
                )}
                {step1Touched && !hasCoords && (
                  <p className="text-xs font-semibold text-red-500">
                    * La ubicación GPS es obligatoria para continuar.
                  </p>
                )}
                {step1Touched && hasCoords && !coordsInRange && (
                  <p className="text-xs font-semibold text-red-500">
                    * Coordenadas fuera de rango: latitud entre -90 y 90, longitud
                    entre -180 y 180.
                  </p>
                )}

                {precisionBaja && (
                  <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3">
                    <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs font-bold text-amber-700">
                      Precisión baja ({precisionM} m, más de {precisionAdvertenciaM} m).
                      Muévete a cielo abierto y reintenta para mejorar la señal. Puedes
                      continuar de todas formas.
                    </p>
                  </div>
                )}

                {dentroDePoligono === false && (
                  <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3">
                    <Icon name="map" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs font-bold text-amber-700">
                      El punto parece estar fuera del polígono de la subcampaña. El
                      registro no se bloquea: se guardará con una advertencia que
                      evalúa el servidor.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleContinueStep1}
                className="w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
              >
                Continuar
              </button>
            </>
          )}

          {/* ------------------------- PASO 2 ------------------------- */}
          {step === 2 && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold text-brand-700">
                    Cantidades por especie
                  </h2>
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-extrabold text-brand-700">
                    Total: {totalDeclarado}
                  </span>
                </div>

                {especieRows.map((row) => (
                  <div key={row.planta_id} className="rounded-2xl bg-white p-4 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-brand-800">{row.nombre}</p>
                        {row.nombre_cientifico && (
                          <p className="truncate text-[11px] font-semibold italic text-slate-400">
                            {row.nombre_cientifico}
                          </p>
                        )}
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={row.maxRegistrable}
                        step={1}
                        value={cantidades[row.planta_id] ?? ''}
                        onChange={(event) =>
                          setCantidades((prev) => ({
                            ...prev,
                            [row.planta_id]: event.target.value,
                          }))
                        }
                        disabled={row.maxRegistrable === 0}
                        placeholder="0"
                        className={`w-24 shrink-0 rounded-2xl border px-3 py-2.5 text-center text-base font-extrabold text-brand-800 shadow-soft outline-none transition focus:ring-2 disabled:bg-slate-50 disabled:text-slate-300 ${
                          row.inputError
                            ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                            : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                        }`}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                        Objetivo {row.objetivo}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                        Plantado {row.plantado}
                      </span>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-600">
                        Pendiente {row.pendiente}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          row.stock > 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-500'
                        }`}
                      >
                        Stock {row.stock}
                      </span>
                    </div>

                    {row.inputError && (
                      <p className="mt-2 text-xs font-semibold text-red-500">
                        {row.inputError}
                      </p>
                    )}
                    {row.maxRegistrable === 0 && !row.inputError && (
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        {row.stock === 0
                          ? 'Sin stock asignado disponible para esta especie.'
                          : 'La meta de esta especie ya está cubierta.'}
                      </p>
                    )}
                  </div>
                ))}

                {step2Touched && totalDeclarado === 0 && !hasCantidadErrors && (
                  <p className="text-xs font-semibold text-red-500">
                    * Declara al menos una planta para continuar.
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-2xl bg-white p-4 shadow-soft">
                <p className="text-sm font-extrabold text-brand-700">
                  Fecha de plantación
                </p>
                <input
                  type="date"
                  value={fecha}
                  min={fechaMinima}
                  max={hoyISO}
                  onChange={(event) => setFecha(event.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                    step2Touched && !fechaValida
                      ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                      : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                  }`}
                />
                <p className="text-xs font-semibold text-slate-500">
                  Se admite hasta {maxDiasRetroactivos} días hacia atrás.
                </p>
                {step2Touched && !fechaValida && (
                  <p className="text-xs font-semibold text-red-500">
                    * La fecha debe estar entre {fechaMinima} y {hoyISO}.
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-2xl bg-white p-4 shadow-soft">
                <p className="text-sm font-extrabold text-brand-700">
                  Coresponsables
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Opcional
                  </span>
                </p>
                {equipoSeleccionable.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400">
                    No hay otros miembros en el equipo de esta subcampaña.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {equipoSeleccionable.map((member) => {
                      const checked = coresponsableIds.includes(member.usuario_id)
                      return (
                        <label
                          key={member.usuario_id}
                          className={`flex cursor-pointer items-center justify-between rounded-2xl border px-3 py-2.5 transition ${
                            checked
                              ? 'border-brand-300 bg-brand-50'
                              : 'border-slate-100 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                checked
                                  ? 'border-brand-500 bg-brand-500 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {checked && <Icon name="check" className="h-3.5 w-3.5" />}
                            </span>
                            <span className="truncate text-sm font-bold text-brand-800">
                              {member.nombre_usuario || `Usuario ${member.usuario_id}`}
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-brand-500">
                            {member.rol === 'COORDINADOR' ? 'Coordinador' : 'Operario'}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCoresponsable(member.usuario_id)}
                            className="hidden"
                          />
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-2xl bg-white p-4 shadow-soft">
                <p className="text-sm font-extrabold text-brand-700">
                  Observaciones
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Opcional
                  </span>
                </p>
                <textarea
                  value={observaciones}
                  onChange={(event) => setObservaciones(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Plantación inicial sector A..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                />
                <p className="text-right text-[11px] font-semibold text-slate-400">
                  {observaciones.trim().length}/2000
                </p>
              </div>

              <button
                type="button"
                onClick={handleContinueStep2}
                className="w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
              >
                Revisar resumen
              </button>
            </>
          )}

          {/* ------------------------- PASO 3 ------------------------- */}
          {step === 3 && (
            <>
              <div className="space-y-3 rounded-2xl bg-white p-4 shadow-soft">
                <h2 className="text-base font-extrabold text-brand-700">
                  Resumen del registro
                </h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">Subcampaña</span>
                    <span className="text-right font-extrabold text-brand-800">
                      {context.subcampania.nombre}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">Fecha</span>
                    <span className="font-extrabold text-brand-800">{fecha}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">GPS</span>
                    <span className="text-right font-extrabold text-brand-800">
                      {parsedLat.toFixed(6)}, {parsedLng.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">Precisión</span>
                    <span
                      className={`font-extrabold ${
                        precisionBaja ? 'text-amber-600' : 'text-brand-800'
                      }`}
                    >
                      {precisionM !== null ? `${precisionM} m` : 'No disponible'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">Fotos</span>
                    <span className="font-extrabold text-brand-800">{photos.length}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">Coresponsables</span>
                    <span className="text-right font-extrabold text-brand-800">
                      {coresponsablesSeleccionados.length > 0
                        ? coresponsablesSeleccionados
                            .map((m) => m.nombre_usuario || `Usuario ${m.usuario_id}`)
                            .join(', ')
                        : '—'}
                    </span>
                  </div>
                  {observaciones.trim() && (
                    <div>
                      <p className="font-semibold text-slate-500">Observaciones</p>
                      <p className="mt-1 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                        {observaciones.trim()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                  {photos.map((photo) => (
                    <img
                      key={photo.previewUrl}
                      src={photo.previewUrl}
                      alt={photo.file.name}
                      className="h-16 w-16 shrink-0 snap-start rounded-xl object-cover ring-1 ring-black/5"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-2xl bg-white p-4 shadow-soft">
                <p className="text-sm font-extrabold text-brand-700">Especies a registrar</p>
                {especieRows
                  .filter((row) => row.cantidad > 0)
                  .map((row) => (
                    <div
                      key={row.planta_id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                    >
                      <span className="text-sm font-bold text-brand-800">{row.nombre}</span>
                      <span className="text-sm font-extrabold text-brand-600">
                        {row.cantidad}
                      </span>
                    </div>
                  ))}
                <div className="flex items-center justify-between border-t border-slate-100 px-3 pt-2">
                  <span className="text-sm font-extrabold text-brand-700">Total</span>
                  <span className="text-base font-extrabold text-brand-700">
                    {totalDeclarado}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-400">
                  El stock se consumirá automáticamente de las asignaciones más antiguas
                  de cada especie.
                </p>
              </div>

              {(precisionBaja || dentroDePoligono === false) && (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3">
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="space-y-1 text-xs font-bold text-amber-700">
                    {precisionBaja && (
                      <p>La precisión del GPS es baja ({precisionM} m).</p>
                    )}
                    {dentroDePoligono === false && (
                      <p>
                        El punto parece fuera del polígono; se guardará con advertencia
                        del servidor, sin bloquear.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {submitError && (
                <div className="space-y-1 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="whitespace-pre-line text-sm font-bold text-red-600">
                    {submitError}
                  </p>
                  <p className="text-xs font-semibold text-red-500">
                    El registro no se guardó. Revisa los datos e intenta de nuevo.
                  </p>
                  {cleanupWarning && (
                    <p className="text-xs font-semibold text-amber-600">{cleanupWarning}</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleGuardar()}
                disabled={saving}
                className="w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? 'Guardando registro...' : 'Confirmar y guardar'}
              </button>
              <p className="text-center text-[11px] font-semibold text-slate-400">
                Al confirmar se suben las fotos y se consume el stock asignado.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ---------------------- COMPROBANTE ---------------------- */}
      {comprobante && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Icon name="check" className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-center text-lg font-extrabold text-brand-700">
              Plantación registrada
            </h3>
            <p className="mt-1 text-center text-sm font-extrabold tracking-wide text-brand-500">
              {comprobante.codigo_trazabilidad}
            </p>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Registro</span>
                <span className="font-extrabold text-brand-800">
                  #{comprobante.registro_plantacion_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Total plantado</span>
                <span className="font-extrabold text-brand-800">
                  {comprobante.cantidad_total_plantada} árboles
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">GPS</span>
                <span
                  className={`text-right font-extrabold ${
                    comprobante.gps_dentro_poligono === false
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {comprobante.gps_dentro_poligono === false
                    ? `Fuera del polígono${
                        typeof comprobante.gps_distancia_a_poligono_m === 'number'
                          ? ` (~${Math.round(comprobante.gps_distancia_a_poligono_m)} m)`
                          : ''
                      }`
                    : 'Dentro del polígono'}
                </span>
              </div>
              {(comprobante.evidencia_ids_vinculadas?.length ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Evidencias</span>
                  <span className="font-extrabold text-brand-800">
                    {comprobante.evidencia_ids_vinculadas?.length}
                  </span>
                </div>
              )}
            </div>

            {(comprobante.consumos?.length ?? 0) > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Consumos por asignación
                </p>
                {comprobante.consumos?.map((consumo) => (
                  <div
                    key={consumo.asignacion_id}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    <div className="flex justify-between">
                      <span>
                        {codigoLotePorId.get(consumo.lote_vivero_id) ||
                          `Lote #${consumo.lote_vivero_id}`}
                        {' · '}Asig. #{consumo.asignacion_id}
                      </span>
                      <span className="font-extrabold text-brand-700">
                        −{consumo.cantidad_consumida}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Saldo: {consumo.saldo_asignado_antes} →{' '}
                      {consumo.saldo_asignado_despues}
                      {consumo.estado_final === 'AGOTADA' ? ' · Agotada' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate(detailPath, { replace: true })}
              className="mt-5 w-full rounded-2xl bg-brand-600 px-4 py-3.5 text-sm font-extrabold text-white transition hover:bg-brand-700"
            >
              Volver a la subcampaña
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegistrarPlantacionScreen
