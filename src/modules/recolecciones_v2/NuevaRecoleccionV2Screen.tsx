import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import {
  RecoleccionesV2Service,
  type DivisionCatalogoV2,
  type MetodoRecoleccionCatalogo,
  type PaisCatalogoV2,
  type PlantaCatalogo,
  type TipoMaterialCanonico,
  type ViveroCatalogo,
} from '../../services/recolecciones-v2.service'

type UnidadCanonicaInput = 'KG' | 'G' | 'UNIDAD'
type FuenteUbicacionInput = 'GPS_MOVIL' | 'MAPA' | 'MANUAL'

type FormState = {
  fecha: string
  tipoMaterial: TipoMaterialCanonico
  cantidad: string
  unidad: UnidadCanonicaInput
  plantaId: string
  metodoId: string
  viveroId: string
  observaciones: string
  paisId: string
  divisionId: string
  ubicacionNombre: string
  referencia: string
  latitud: string
  longitud: string
  precisionM: string
  fuenteUbicacion: FuenteUbicacionInput
}

const MAX_FOTOS = 5
const MIN_FOTOS = 2
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function NuevaRecoleccionV2Screen() {
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>({
    fecha: todayDate(),
    tipoMaterial: 'SEMILLA',
    cantidad: '',
    unidad: 'KG',
    plantaId: '',
    metodoId: '',
    viveroId: '',
    observaciones: '',
    paisId: '1',
    divisionId: '',
    ubicacionNombre: '',
    referencia: '',
    latitud: '',
    longitud: '',
    precisionM: '',
    fuenteUbicacion: 'GPS_MOVIL',
  })

  const [fotos, setFotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  const [plantas, setPlantas] = useState<PlantaCatalogo[]>([])
  const [metodos, setMetodos] = useState<MetodoRecoleccionCatalogo[]>([])
  const [viveros, setViveros] = useState<ViveroCatalogo[]>([])
  const [paises, setPaises] = useState<PaisCatalogoV2[]>([])
  const [divisiones, setDivisiones] = useState<DivisionCatalogoV2[]>([])

  const [loadingCatalogs, setLoadingCatalogs] = useState(false)
  const [loadingDivisiones, setLoadingDivisiones] = useState(false)
  const [loadingGps, setLoadingGps] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plantaSearch, setPlantaSearch] = useState('')

  const filteredPlantas = useMemo(() => {
    if (!plantaSearch.trim()) {
      return plantas
    }

    const term = plantaSearch.toLowerCase()
    return plantas.filter((planta) => {
      const especie = planta.especie.toLowerCase()
      const cientifico = planta.nombre_cientifico.toLowerCase()
      return especie.includes(term) || cientifico.includes(term)
    })
  }, [plantaSearch, plantas])

  useEffect(() => {
    const urls = fotos.map((foto) => URL.createObjectURL(foto))
    setPreviewUrls(urls)

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [fotos])

  useEffect(() => {
    let mounted = true

    const loadCatalogs = async () => {
      try {
        setLoadingCatalogs(true)
        setError(null)

        const [plantasData, metodosData, viverosData, paisesData] = await Promise.all([
          RecoleccionesV2Service.getPlantas(),
          RecoleccionesV2Service.getMetodos(),
          RecoleccionesV2Service.getViveros(),
          RecoleccionesV2Service.getPaises(),
        ])

        if (!mounted) {
          return
        }

        setPlantas(plantasData)
        setMetodos(metodosData)
        setViveros(viverosData)
        setPaises(paisesData)

        const defaultPaisId =
          paisesData.find((item) => item.id === 1)?.id?.toString() || paisesData[0]?.id?.toString() || ''

        setForm((prev) => ({
          ...prev,
          plantaId: prev.plantaId || plantasData[0]?.id?.toString() || '',
          metodoId: prev.metodoId || metodosData[0]?.id?.toString() || '',
          viveroId: prev.viveroId || viverosData[0]?.id?.toString() || '',
          paisId: prev.paisId || defaultPaisId,
        }))
      } catch (loadError) {
        if (!mounted) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar catálogos.')
      } finally {
        if (mounted) {
          setLoadingCatalogs(false)
        }
      }
    }

    void loadCatalogs()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const paisId = Number(form.paisId)
    if (!Number.isFinite(paisId) || paisId <= 0) {
      setDivisiones([])
      return
    }

    let mounted = true

    const loadDivisiones = async () => {
      try {
        setLoadingDivisiones(true)
        const result = await RecoleccionesV2Service.getDivisiones(paisId)

        if (!mounted) {
          return
        }

        setDivisiones(result)
        setForm((prev) => ({
          ...prev,
          divisionId:
            prev.divisionId && result.some((item) => item.id === Number(prev.divisionId))
              ? prev.divisionId
              : result[0]?.id?.toString() || '',
        }))
      } catch (loadError) {
        if (!mounted) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar divisiones.')
      } finally {
        if (mounted) {
          setLoadingDivisiones(false)
        }
      }
    }

    void loadDivisiones()

    return () => {
      mounted = false
    }
  }, [form.paisId])

  const handleTipoMaterial = (tipoMaterial: TipoMaterialCanonico) => {
    setForm((prev) => ({
      ...prev,
      tipoMaterial,
      unidad: tipoMaterial === 'ESQUEJE' ? 'UNIDAD' : prev.unidad === 'UNIDAD' ? 'KG' : prev.unidad,
    }))
  }

  const handleFotos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) {
      return
    }

    const acceptedFiles: File[] = []

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setError(`Formato inválido: ${file.name}. Solo JPG/PNG.`)
        continue
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError(`Imagen demasiado grande: ${file.name}. Máximo 5MB.`)
        continue
      }

      acceptedFiles.push(file)
    }

    setFotos((prev) => [...prev, ...acceptedFiles].slice(0, MAX_FOTOS))
    event.target.value = ''
  }

  const removeFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en este navegador.')
      return
    }

    setLoadingGps(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitud: position.coords.latitude.toFixed(6),
          longitud: position.coords.longitude.toFixed(6),
          precisionM:
            Number.isFinite(position.coords.accuracy) && position.coords.accuracy > 0
              ? Math.round(position.coords.accuracy).toString()
              : '',
          fuenteUbicacion: 'GPS_MOVIL',
        }))
        setLoadingGps(false)
      },
      () => {
        setError('No se pudo obtener la ubicación. Revisa los permisos de GPS.')
        setLoadingGps(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  const validateForm = (): string[] => {
    const messages: string[] = []

    if (!form.fecha) {
      messages.push('La fecha es obligatoria.')
    } else if (form.fecha > todayDate()) {
      messages.push('La fecha no puede ser futura.')
    }

    const cantidad = Number(form.cantidad)
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      messages.push('La cantidad debe ser mayor a 0.')
    }

    if (form.tipoMaterial === 'ESQUEJE' && !Number.isInteger(cantidad)) {
      messages.push('Para ESQUEJE la cantidad debe ser un entero.')
    }

    const lat = Number(form.latitud)
    const lon = Number(form.longitud)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      messages.push('Latitud inválida (rango permitido: -90 a 90).')
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      messages.push('Longitud inválida (rango permitido: -180 a 180).')
    }

    if (!form.plantaId) {
      messages.push('Debes seleccionar una planta.')
    }
    if (!form.metodoId) {
      messages.push('Debes seleccionar un método de recolección.')
    }
    if (!form.viveroId) {
      messages.push('Debes seleccionar un vivero.')
    }
    if (!form.paisId) {
      messages.push('Debes seleccionar un país.')
    }
    if (!form.divisionId) {
      messages.push('Debes seleccionar una división administrativa.')
    }

    if (fotos.length < MIN_FOTOS || fotos.length > MAX_FOTOS) {
      messages.push('Debes adjuntar entre 2 y 5 fotos.')
    }

    if (form.observaciones.length > 1000) {
      messages.push('Observaciones no puede exceder 1000 caracteres.')
    }

    return messages
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const messages = validateForm()
    if (messages.length > 0) {
      setError(messages.join(' '))
      return
    }

    try {
      setSubmitting(true)

      const cantidad = Number(form.cantidad)
      const latitud = Number(form.latitud)
      const longitud = Number(form.longitud)
      const precisionM = form.precisionM ? Number(form.precisionM) : undefined

      const response = await RecoleccionesV2Service.create({
        fecha: form.fecha,
        cantidad,
        unidad: form.unidad,
        tipo_material: form.tipoMaterial,
        planta_id: Number(form.plantaId),
        metodo_id: Number(form.metodoId),
        vivero_id: Number(form.viveroId),
        observaciones: form.observaciones,
        ubicacion: {
          pais_id: Number(form.paisId),
          division_id: Number(form.divisionId),
          nombre: form.ubicacionNombre,
          referencia: form.referencia,
          latitud,
          longitud,
          precision_m: precisionM,
          fuente: form.fuenteUbicacion,
        },
        fotos,
      })

      navigate(`/app/collections/${response.data.id}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear la recolección.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 px-5 pb-4 pt-6 backdrop-blur">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/collections')}
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-100"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-extrabold text-brand-700">Nueva Recolección</h1>
          <p className="text-sm font-semibold text-brand-500">Flujo canónico V2 (sin legacy)</p>
        </header>

        <form className="flex-1 space-y-5 px-5 pb-8 pt-5" onSubmit={(event) => void handleSubmit(event)}>
          <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            <h2 className="text-lg font-extrabold text-brand-700">Datos base</h2>

            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Fecha</span>
              <input
                type="date"
                value={form.fecha}
                max={todayDate()}
                onChange={(event) => setField('fecha', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTipoMaterial('SEMILLA')}
                className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                  form.tipoMaterial === 'SEMILLA'
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200'
                }`}
              >
                Semilla
              </button>
              <button
                type="button"
                onClick={() => handleTipoMaterial('ESQUEJE')}
                className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                  form.tipoMaterial === 'ESQUEJE'
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200'
                }`}
              >
                Esqueje
              </button>
            </div>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700">Cantidad</span>
                <input
                  type="number"
                  step={form.tipoMaterial === 'ESQUEJE' ? '1' : '0.01'}
                  min="0"
                  value={form.cantidad}
                  onChange={(event) => setField('cantidad', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700">Unidad</span>
                <select
                  value={form.unidad}
                  onChange={(event) => setField('unidad', event.target.value as UnidadCanonicaInput)}
                  disabled={form.tipoMaterial === 'ESQUEJE'}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
                >
                  {form.tipoMaterial === 'SEMILLA' ? (
                    <>
                      <option value="KG">KG</option>
                      <option value="G">G</option>
                    </>
                  ) : (
                    <option value="UNIDAD">UNIDAD</option>
                  )}
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Buscar planta</span>
              <input
                type="search"
                value={plantaSearch}
                onChange={(event) => setPlantaSearch(event.target.value)}
                placeholder="Ej: Queñua / Polylepis"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Planta</span>
              <select
                value={form.plantaId}
                onChange={(event) => setField('plantaId', event.target.value)}
                disabled={loadingCatalogs}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
              >
                <option value="">Selecciona una planta</option>
                {filteredPlantas.map((planta) => (
                  <option key={planta.id} value={planta.id}>
                    {planta.especie} - {planta.nombre_cientifico}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Método</span>
                <select
                  value={form.metodoId}
                  onChange={(event) => setField('metodoId', event.target.value)}
                  disabled={loadingCatalogs}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
                >
                  <option value="">Selecciona un método</option>
                  {metodos.map((metodo) => (
                    <option key={metodo.id} value={metodo.id}>
                      {metodo.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Vivero</span>
                <select
                  value={form.viveroId}
                  onChange={(event) => setField('viveroId', event.target.value)}
                  disabled={loadingCatalogs}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
                >
                  <option value="">Selecciona un vivero</option>
                  {viveros.map((vivero) => (
                    <option key={vivero.id} value={vivero.id}>
                      {vivero.nombre} ({vivero.codigo})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Observaciones</span>
              <textarea
                value={form.observaciones}
                onChange={(event) => setField('observaciones', event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Opcional"
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </section>

          <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            <h2 className="text-lg font-extrabold text-brand-700">Ubicación</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">País</span>
                <select
                  value={form.paisId}
                  onChange={(event) => setField('paisId', event.target.value)}
                  disabled={loadingCatalogs}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
                >
                  <option value="">Selecciona país</option>
                  {paises.map((pais) => (
                    <option key={pais.id} value={pais.id}>
                      {pais.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">División</span>
                <select
                  value={form.divisionId}
                  onChange={(event) => setField('divisionId', event.target.value)}
                  disabled={loadingDivisiones}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
                >
                  <option value="">Selecciona división</option>
                  {divisiones.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Nombre del punto</span>
              <input
                type="text"
                value={form.ubicacionNombre}
                onChange={(event) => setField('ubicacionNombre', event.target.value)}
                placeholder="Ej: Parcela QA"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Referencia</span>
              <input
                type="text"
                value={form.referencia}
                onChange={(event) => setField('referencia', event.target.value)}
                placeholder="Ej: Frente al vivero"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Latitud</span>
                <input
                  type="number"
                  step="0.000001"
                  value={form.latitud}
                  onChange={(event) => setField('latitud', event.target.value)}
                  placeholder="-16.500000"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Longitud</span>
                <input
                  type="number"
                  step="0.000001"
                  value={form.longitud}
                  onChange={(event) => setField('longitud', event.target.value)}
                  placeholder="-68.150000"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>
            </div>

            <div className="grid grid-cols-[1fr_110px] gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Fuente ubicación</span>
                <select
                  value={form.fuenteUbicacion}
                  onChange={(event) => setField('fuenteUbicacion', event.target.value as FuenteUbicacionInput)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="GPS_MOVIL">GPS_MOVIL</option>
                  <option value="MAPA">MAPA</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Precisión (m)</span>
                <input
                  type="number"
                  min="0"
                  value={form.precisionM}
                  onChange={(event) => setField('precisionM', event.target.value)}
                  placeholder="8"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={loadingGps}
              className="w-full rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingGps ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
            </button>
          </section>

          <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-brand-700">Evidencias</h2>
              <span className="text-xs font-semibold text-slate-500">
                {fotos.length}/{MAX_FOTOS}
              </span>
            </div>

            <label className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 px-4 py-5 text-center text-sm font-bold text-brand-700 transition hover:bg-brand-100">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={handleFotos}
                className="hidden"
              />
              <span>Agregar fotos (mínimo 2, máximo 5)</span>
            </label>

            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="space-y-1">
                    <div className="h-24 overflow-hidden rounded-2xl bg-slate-100">
                      <img src={url} alt={`Evidencia ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFoto(index)}
                      className="w-full rounded-lg bg-slate-100 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || loadingCatalogs}
            className="w-full rounded-2xl bg-brand-500 py-4 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Creando recolección...' : 'Crear recolección'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default NuevaRecoleccionV2Screen
