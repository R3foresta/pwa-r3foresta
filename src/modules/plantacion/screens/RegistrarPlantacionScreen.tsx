import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import PhotoUploader, { type Photo } from '../../../components/evidence/PhotoUploader'
import { usePlantacionContext } from '../hooks/usePlantacionContext'
import { isPointInPolygon } from '../utils/geo'
import {
  resolverDetallesAsignacion,
  type CantidadPorEspecie,
} from '../utils/resolverDetallesAsignacion'
import type { RegistroPlantacionData } from '../types/contracts'
import WizardHeader from '../components/registro/WizardHeader'
import StepFooter from '../components/registro/StepFooter'
import GpsStatusCard from '../components/registro/GpsStatusCard'
import SpeciesCounterRow from '../components/registro/SpeciesCounterRow'
import SummaryRow from '../components/registro/SummaryRow'
import SuccessOverlay from '../components/registro/SuccessOverlay'

// PLT-FE-002/003/004/006/007: pantalla de registro de plantación inicial.
// Un solo route con pasos internos:
//   1. Evidencia fotográfica y GPS.
//   2. Cantidades por especie, fecha, observaciones y coresponsables.
//   3. Resumen, guardado transaccional y comprobante.

type Step = 1 | 2 | 3

const STEP_TITLE: Record<Step, string> = {
  1: 'Evidencia y ubicación',
  2: '¿Cuánto plantaste?',
  3: 'Confirma y registra',
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

  // Al cambiar de paso, volver al inicio: el header es alto y cada paso
  // arranca con su contexto visible.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

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
  const stockTotalDisponible = especieRows.reduce((sum, row) => sum + row.stock, 0)
  const especiesConCantidad = especieRows.filter((row) => row.cantidad > 0)
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
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-brand-50 text-brand-700">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <Icon name="planting" className="h-6 w-6 text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-brand-700">
              Preparando el registro
            </p>
            <p className="mt-1 text-xs font-semibold text-brand-500">
              Cargando plan de especies, stock y equipo...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !context) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-brand-50 text-brand-700">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
          <div className="w-full rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-100 text-danger-500">
              <Icon name="alert" className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-brand-700">
              No se pudo cargar
            </h2>
            <p className="mt-1 text-sm font-semibold text-neutral-500">
              {error || 'No se pudo cargar el contexto de plantación.'}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="primary" fullWidth onClick={() => void refetch()}>
                Reintentar
              </Button>
              <Button variant="secondary" fullWidth onClick={() => navigate(detailPath)}>
                Volver
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (motivoBloqueo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-brand-50 text-brand-700">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
          <div className="w-full rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-100 text-warning-600">
              <Icon name="shield" className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-brand-700">
              No puedes registrar aquí
            </h2>
            <p className="mt-1 text-sm font-semibold text-brand-600">{motivoBloqueo}</p>
            <p className="mt-3 text-xs font-semibold text-neutral-400">
              {context.subcampania.nombre}
              {context.subcampania.codigo_trazabilidad
                ? ` · ${context.subcampania.codigo_trazabilidad}`
                : ''}
            </p>
            <Button variant="primary" fullWidth onClick={() => navigate(detailPath)} className="mt-5">
              Volver a la subcampaña
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        <WizardHeader
          paso={step}
          totalPasos={3}
          title={STEP_TITLE[step]}
          onBack={handleBack}
          subcampaniaNombre={context.subcampania.nombre}
          subcampaniaDetalle={[
            context.subcampania.codigo_trazabilidad,
            context.subcampania.campania_nombre,
            context.subcampania.zona_nombre,
          ]
            .filter(Boolean)
            .join(' · ')}
        />

        <div className="flex-1 space-y-4 px-5 pt-4">
          {/* ------------------------- PASO 1 ------------------------- */}
          {step === 1 && (
            <>
              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <PhotoUploader
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
              </section>

              <GpsStatusCard
                latitud={latitud}
                longitud={longitud}
                precisionM={precisionM}
                loading={gpsLoading}
                error={gpsError}
                precisionAdvertenciaM={precisionAdvertenciaM}
                hasCoords={hasCoords}
                coordsInRange={coordsInRange}
                dentroDePoligono={dentroDePoligono}
                showValidation={step1Touched}
                onCapture={getLocation}
                onChangeLatitud={(value) => {
                  setLatitud(value)
                  setPrecisionM(null)
                }}
                onChangeLongitud={(value) => {
                  setLongitud(value)
                  setPrecisionM(null)
                }}
              />

              <StepFooter
                label="Continuar"
                onClick={handleContinueStep1}
                hint={`Mínimo ${minFotos} foto${minFotos === 1 ? '' : 's'} · GPS obligatorio`}
              />
            </>
          )}

          {/* ------------------------- PASO 2 ------------------------- */}
          {step === 2 && (
            <>
              <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-4 text-white shadow-soft">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">
                      Total esta plantación
                    </p>
                    <p className="mt-1 text-5xl font-extrabold leading-none tracking-tight tabular-nums">
                      {totalDeclarado}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-white/80">
                      {especiesConCantidad.length === 0
                        ? 'plantas en este registro'
                        : `plantas en ${especiesConCantidad.length} ${
                            especiesConCantidad.length === 1 ? 'especie' : 'especies'
                          }`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                      Stock disponible
                    </p>
                    <p className="text-lg font-extrabold tabular-nums">
                      {stockTotalDisponible}
                    </p>
                  </div>
                </div>
              </div>

              {especieRows.map((row) => (
                <SpeciesCounterRow
                  key={row.planta_id}
                  nombre={row.nombre}
                  nombreCientifico={row.nombre_cientifico}
                  objetivo={row.objetivo}
                  plantado={row.plantado}
                  pendiente={row.pendiente}
                  stock={row.stock}
                  maxRegistrable={row.maxRegistrable}
                  value={cantidades[row.planta_id] ?? ''}
                  cantidad={row.cantidad}
                  inputError={row.inputError}
                  onChange={(value) =>
                    setCantidades((prev) => ({ ...prev, [row.planta_id]: value }))
                  }
                />
              ))}

              {step2Touched && totalDeclarado === 0 && !hasCantidadErrors && (
                <p className="text-xs font-semibold text-danger-500">
                  * Declara al menos una planta para continuar.
                </p>
              )}

              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <div className="flex items-center gap-2">
                  <Icon name="date" className="h-4 w-4 text-brand-500" />
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                    Fecha de plantación
                  </p>
                </div>
                <input
                  type="date"
                  value={fecha}
                  min={fechaMinima}
                  max={hoyISO}
                  onChange={(event) => setFecha(event.target.value)}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-neutral-700 shadow-soft outline-none transition focus:ring-2 ${
                    step2Touched && !fechaValida
                      ? 'border-danger-400 bg-danger-50 focus:border-danger-400 focus:ring-danger-200'
                      : 'border-neutral-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                  }`}
                />
                <p className="mt-1.5 text-xs font-semibold text-neutral-400">
                  Se admite hasta {maxDiasRetroactivos} días hacia atrás.
                </p>
                {step2Touched && !fechaValida && (
                  <p className="mt-1 text-xs font-semibold text-danger-500">
                    * La fecha debe estar entre {fechaMinima} y {hoyISO}.
                  </p>
                )}
              </section>

              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="users" className="h-4 w-4 text-brand-500" />
                    <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                      ¿Plantaste con alguien?
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Opcional
                  </span>
                </div>

                {equipoSeleccionable.length === 0 ? (
                  <p className="mt-2 text-xs font-semibold text-neutral-400">
                    No hay otros miembros en el equipo de esta subcampaña.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {equipoSeleccionable.map((member) => {
                      const checked = coresponsableIds.includes(member.usuario_id)
                      const nombre =
                        member.nombre_usuario || `Usuario ${member.usuario_id}`
                      const iniciales = nombre
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part.charAt(0).toUpperCase())
                        .join('')
                      return (
                        <li key={member.usuario_id}>
                          <button
                            type="button"
                            onClick={() => toggleCoresponsable(member.usuario_id)}
                            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left shadow-soft ring-1 transition ${
                              checked
                                ? 'bg-brand-600 text-white ring-brand-700'
                                : 'bg-white text-brand-800 ring-black/5 hover:ring-brand-300'
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tracking-wide ${
                                checked
                                  ? 'bg-white/20 text-white'
                                  : 'bg-brand-50 text-brand-700'
                              }`}
                            >
                              {iniciales}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-extrabold leading-tight">
                                {nombre}
                              </span>
                              <span
                                className={`block text-[10px] font-bold uppercase tracking-[0.14em] ${
                                  checked ? 'text-white/75' : 'text-brand-500'
                                }`}
                              >
                                {member.rol === 'COORDINADOR'
                                  ? 'Coordinador'
                                  : 'Operario'}
                              </span>
                            </span>
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                checked
                                  ? 'bg-white text-brand-700'
                                  : 'bg-neutral-100 text-neutral-400'
                              }`}
                            >
                              <Icon
                                name={checked ? 'check' : 'plus'}
                                className="h-4 w-4"
                              />
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="note" className="h-4 w-4 text-brand-500" />
                    <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                      Notas de campo
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Opcional
                  </span>
                </div>
                <textarea
                  value={observaciones}
                  onChange={(event) => setObservaciones(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Cómo encontraste el terreno, condiciones del suelo, clima..."
                  className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-soft outline-none transition placeholder:text-neutral-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                />
                <p className="text-right text-[11px] font-semibold text-neutral-400">
                  {observaciones.trim().length}/2000
                </p>
              </section>

              <StepFooter label="Revisar resumen" onClick={handleContinueStep2} />
            </>
          )}

          {/* ------------------------- PASO 3 ------------------------- */}
          {step === 3 && (
            <>
              <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-4 text-white shadow-soft">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-white/80">
                  Vas a registrar
                </p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[44px] font-extrabold leading-none tracking-tight tabular-nums">
                      {totalDeclarado}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-white/85">
                      {totalDeclarado === 1 ? 'planta' : 'plantas'} en{' '}
                      {especiesConCantidad.length}{' '}
                      {especiesConCantidad.length === 1 ? 'especie' : 'especies'}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                    <Icon name="planting" className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-neutral-100 rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
                <SummaryRow icon="date" label="Fecha de plantación" value={fecha} />
                <SummaryRow
                  icon="pin"
                  label="Ubicación GPS"
                  accent={precisionBaja ? 'amber' : 'brand'}
                  value={
                    <span className="tabular-nums">
                      {parsedLat.toFixed(6)}, {parsedLng.toFixed(6)}
                      <span
                        className={`ml-1.5 text-[11px] font-bold ${
                          precisionBaja ? 'text-warning-600' : 'text-neutral-400'
                        }`}
                      >
                        {precisionM !== null ? `±${precisionM} m` : 'manual'}
                      </span>
                    </span>
                  }
                />
                <SummaryRow
                  icon="users"
                  label="Co-responsables"
                  value={
                    coresponsablesSeleccionados.length > 0
                      ? coresponsablesSeleccionados
                          .map((m) => m.nombre_usuario || `Usuario ${m.usuario_id}`)
                          .join(', ')
                      : 'Solo tú'
                  }
                />
                {observaciones.trim() && (
                  <SummaryRow
                    icon="note"
                    label="Notas de campo"
                    value={
                      <span className="whitespace-pre-line text-xs font-semibold text-neutral-600">
                        {observaciones.trim()}
                      </span>
                    }
                  />
                )}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
                      Evidencia fotográfica
                    </p>
                    <span className="rounded-full bg-success-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success-700">
                      {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>
                  <div className="-mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
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
              </div>

              <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <div className="flex items-center gap-2">
                  <Icon name="leaf" className="h-4 w-4 text-brand-500" />
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                    Especies a registrar
                  </p>
                </div>
                <div className="mt-2 space-y-1.5">
                  {especiesConCantidad.map((row) => (
                    <div
                      key={row.planta_id}
                      className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2"
                    >
                      <span className="text-sm font-bold text-brand-800">
                        {row.nombre}
                      </span>
                      <span className="text-sm font-extrabold tabular-nums text-brand-600">
                        {row.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-neutral-100 px-3 pt-2">
                  <span className="text-sm font-extrabold text-brand-700">Total</span>
                  <span className="text-base font-extrabold tabular-nums text-brand-700">
                    {totalDeclarado}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-neutral-400">
                  El stock se consumirá automáticamente de las asignaciones más
                  antiguas de cada especie.
                </p>
              </div>

              {(precisionBaja || dentroDePoligono === false) && (
                <div className="flex items-start gap-2 rounded-2xl border border-warning-300 bg-warning-50 p-3">
                  <Icon
                    name="alert"
                    className="mt-0.5 h-4 w-4 shrink-0 text-warning-600"
                  />
                  <div className="space-y-1 text-xs font-bold text-warning-700">
                    {precisionBaja && (
                      <p>La precisión del GPS es baja (±{precisionM} m).</p>
                    )}
                    {dentroDePoligono === false && (
                      <p>
                        El punto parece fuera del polígono; se guardará con
                        advertencia del servidor, sin bloquear.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {submitError && (
                <div className="space-y-1 rounded-2xl border border-danger-200 bg-danger-50 p-4">
                  <p className="whitespace-pre-line text-sm font-bold text-danger-600">
                    {submitError}
                  </p>
                  <p className="text-xs font-semibold text-danger-500">
                    El registro no se guardó. Revisa los datos e intenta de nuevo.
                  </p>
                  {cleanupWarning && (
                    <p className="text-xs font-semibold text-warning-600">
                      {cleanupWarning}
                    </p>
                  )}
                </div>
              )}

              <StepFooter
                label={saving ? 'Guardando registro...' : 'Confirmar y guardar'}
                onClick={() => void handleGuardar()}
                disabled={saving}
                tone="success"
                hint="Al confirmar se suben las fotos y se consume el stock asignado."
              />
            </>
          )}
        </div>
      </div>

      {/* ------------------- GUARDADO + COMPROBANTE ------------------- */}
      {(saving || comprobante) && (
        <SuccessOverlay
          phase={comprobante ? 'exito' : 'guardando'}
          nombreUsuario={user?.nombre?.split(' ')[0] || user?.username}
          subcampaniaNombre={context.subcampania.nombre}
          comprobante={comprobante}
          codigoLotePorId={codigoLotePorId}
          onFinish={() => navigate(detailPath, { replace: true })}
        />
      )}
    </div>
  )
}

export default RegistrarPlantacionScreen
