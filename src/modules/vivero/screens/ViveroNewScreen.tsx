import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { MAX_DIAS_VIVERO } from '../../../config/vivero'
import { useAuth } from '../../../contexts/AuthContext'
import { useViveros } from '../../../hooks/useViveros'
import type { Recoleccion } from '../../../services/recolecciones.service'
import { RecoleccionesService } from '../../../services/recolecciones.service'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { formatUnidadCanonicaDisplay } from '../../../utils/recoleccionUnidad'
import { getUbicacionDisplay } from '../../../utils/ubicacion'
import { buildPastRange, clampDateToRange, validateDateInRange } from '../../../utils/validations/date'
import type { TipoMaterialVivero, UnidadMedidaVivero } from '../types/contracts'
import { isValidYmdDate, validateCantidadInicial } from '../utils/validators'

type UploadPhase = 'idle' | 'uploading' | 'creating'

const VALID_UNITS: UnidadMedidaVivero[] = ['UNIDAD', 'G']

const formatDate = (value?: string) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getRecoleccionLabel = (item: Recoleccion) =>
  item.planta?.especie ||
  item.nombre_comercial ||
  item.nombre_cientifico ||
  `Recolección #${item.id}`

const isTipoMaterialVivero = (value: string | null | undefined): value is TipoMaterialVivero =>
  value === 'SEMILLA' || value === 'ESQUEJE'

const isUnidadMedidaVivero = (value: string | null | undefined): value is UnidadMedidaVivero =>
  value === 'UNIDAD' || value === 'G'

const isRecoleccionElegibleParaVivero = (item: Recoleccion) => {
  if (!isTipoMaterialVivero(item.tipo_material)) {
    return false
  }
  if (!item.codigo_trazabilidad?.trim()) {
    return false
  }

  const estadoRegistro = String(item.estado_registro ?? '').toUpperCase()
  const estadoOperativo = String(item.estado_operativo ?? '').toUpperCase()
  const saldoActual = Number(item.saldo_actual ?? 0)

  if (estadoRegistro !== 'VALIDADO') return false
  if (estadoOperativo !== 'ABIERTO') return false
  if (!(saldoActual > 0)) return false
  return isUnidadMedidaVivero(item.unidad_canonica)
}

function ViveroNewScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const authId = user?.auth_id?.trim() || ''

  const { viveros, loading: viveroLoading, error: viveroError } = useViveros()
  const [selectedViveroId, setSelectedViveroId] = useState<number | null>(null)

  const [recolecciones, setRecolecciones] = useState<Recoleccion[]>([])
  const [recoleccionLoading, setRecoleccionLoading] = useState(false)
  const [recoleccionError, setRecoleccionError] = useState<string | null>(null)
  const [selectedRecoleccionId, setSelectedRecoleccionId] = useState<number | null>(null)

  const [cantidadInicio, setCantidadInicio] = useState('')
  const [unidadMedida, setUnidadMedida] = useState<UnidadMedidaVivero>('UNIDAD')

  const fechaRange = useMemo(() => buildPastRange(MAX_DIAS_VIVERO), [])
  const [fechaInicio, setFechaInicio] = useState(() =>
    clampDateToRange(new Date().toISOString().slice(0, 10), fechaRange),
  )

  const [observaciones, setObservaciones] = useState('')
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>([])
  const [uploadedEvidenceIds, setUploadedEvidenceIds] = useState<number[] | null>(null)

  const [showErrors, setShowErrors] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<UploadPhase>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const selectedRecoleccion = useMemo(
    () => recolecciones.find((item) => item.id === selectedRecoleccionId) ?? null,
    [recolecciones, selectedRecoleccionId],
  )

  useEffect(() => {
    if (!selectedViveroId) {
      setRecolecciones([])
      setSelectedRecoleccionId(null)
      return
    }

    let isMounted = true
    const loadRecolecciones = async () => {
      try {
        setRecoleccionLoading(true)
        setRecoleccionError(null)
        const response = await RecoleccionesService.list({
          vivero_id: selectedViveroId,
          limit: 50,
        })
        if (isMounted) {
          setRecolecciones(response.data || [])
        }
      } catch (error) {
        if (isMounted) {
          setRecoleccionError(
            error instanceof Error ? error.message : 'Error al cargar recolecciones',
          )
        }
      } finally {
        if (isMounted) {
          setRecoleccionLoading(false)
        }
      }
    }

    loadRecolecciones()
    return () => {
      isMounted = false
    }
  }, [selectedViveroId])

  const recoleccionesDisponibles = useMemo(
    () => recolecciones.filter((item) => isRecoleccionElegibleParaVivero(item)),
    [recolecciones],
  )

  useEffect(() => {
    if (!selectedRecoleccion) return
    if (!isUnidadMedidaVivero(selectedRecoleccion.unidad_canonica)) return
    setUnidadMedida(selectedRecoleccion.unidad_canonica)
  }, [selectedRecoleccion])

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    const nextPhotos = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...nextPhotos].slice(0, 5))
    setUploadedEvidenceIds(null)
    event.target.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return next
    })
    setUploadedEvidenceIds(null)
  }

  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(
    () => () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    },
    [],
  )

  const viveroSeleccionado = useMemo(
    () => viveros.find((vivero) => vivero.id === selectedViveroId),
    [selectedViveroId, viveros],
  )

  const cantidadValue = Number(cantidadInicio)
  const fechaInicioCheck = validateDateInRange(fechaInicio, fechaRange)

  const cantidadValidation = selectedRecoleccion
    ? validateCantidadInicial({
        cantidad: cantidadValue,
        unidad: unidadMedida,
        recoleccionTipoMaterial: selectedRecoleccion.tipo_material as TipoMaterialVivero,
      })
    : { isValid: false, message: 'Selecciona una recolección válida.' }

  const unidadValidaConRecoleccion = selectedRecoleccion
    ? selectedRecoleccion.unidad_canonica === unidadMedida
    : false

  const validation = {
    auth: !authId,
    vivero: !selectedViveroId,
    recoleccion: !selectedRecoleccion,
    cantidad: !cantidadValidation.isValid,
    unidad: !unidadValidaConRecoleccion,
    fecha: !fechaInicioCheck.isValid || !isValidYmdDate(fechaInicioCheck.normalized),
    fotos: photos.length < 1 || photos.length > 5,
  }

  const isSubmitting = submitPhase !== 'idle'
  const canSubmit =
    !validation.auth &&
    !validation.vivero &&
    !validation.recoleccion &&
    !validation.cantidad &&
    !validation.unidad &&
    !validation.fecha &&
    !validation.fotos &&
    !isSubmitting

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (isSubmitting) return
    if (!canSubmit || !selectedRecoleccion || !selectedViveroId) {
      setShowErrors(true)
      return
    }

    try {
      setSubmitError(null)
      setShowErrors(false)

      let evidenceIds = uploadedEvidenceIds
      if (!evidenceIds || evidenceIds.length === 0) {
        setSubmitPhase('uploading')
        const uploadResponse = await LotesViveroService.uploadEvidenciasPendientes(
          {
            fotos: photos.map((photo) => photo.file),
            titulo: 'Inicio de lote vivero',
            descripcion: observaciones.trim() || 'Evidencia de inicio del lote',
            metadata: {
              fuente: 'pwa-r3foresta',
              modulo: 'vivero',
              etapa: 'INICIO',
            },
            tomado_en: new Date().toISOString(),
            es_principal: true,
          },
          authId,
        )

        if (!uploadResponse.evidencia_ids.length) {
          throw new Error('No se recibieron IDs de evidencia para crear el lote.')
        }

        evidenceIds = uploadResponse.evidencia_ids
        setUploadedEvidenceIds(uploadResponse.evidencia_ids)
      }

      setSubmitPhase('creating')
      const createResponse = await LotesViveroService.createLote(
        {
          recoleccion_id: selectedRecoleccion.id,
          vivero_id: selectedViveroId,
          fecha_inicio: fechaInicioCheck.normalized,
          fecha_evento: fechaInicioCheck.normalized,
          cantidad_inicial_en_proceso: cantidadValue,
          unidad_medida_inicial: unidadMedida,
          evidencia_ids: evidenceIds,
          observaciones: observaciones.trim() || undefined,
        },
        authId,
      )

      navigate(`/app/vivero/${createResponse.data.lote_vivero_id}`)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al registrar el lote.')
    } finally {
      setSubmitPhase('idle')
    }
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-[120px]"
      >
        <header className="flex items-start gap-3 px-5 pt-10">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/vivero')}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Nuevo lote
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-brand-700">
              Inicio de lote de vivero
            </h1>
            <p className="text-sm font-semibold text-brand-500">
              Flujo: evidencias pendientes + creación de lote
            </p>
          </div>
        </header>

        <div className="mt-6 space-y-5 px-5">
          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-3">
            <p className="text-sm font-semibold text-brand-700">Seleccionar vivero</p>
            {viveroLoading ? (
              <div className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
                Cargando viveros...
              </div>
            ) : (
              <>
                <select
                  value={selectedViveroId ?? ''}
                  onChange={(event) => {
                    const nextId = event.target.value ? Number(event.target.value) : null
                    setSelectedViveroId(nextId)
                    setSelectedRecoleccionId(null)
                    setUploadedEvidenceIds(null)
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold shadow-soft ${
                    showErrors && validation.vivero
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <option value="">Selecciona un vivero</option>
                  {viveros.map((vivero) => (
                    <option key={vivero.id} value={vivero.id}>
                      {vivero.nombre} ({vivero.codigo})
                    </option>
                  ))}
                </select>
                {viveroError && <p className="text-xs font-semibold text-red-500">{viveroError}</p>}
                {showErrors && validation.vivero && (
                  <p className="text-xs font-semibold text-red-500">
                    Selecciona un vivero para continuar.
                  </p>
                )}
              </>
            )}
          </div>

          {viveroSeleccionado && (
            <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <Icon name="pin" className="h-5 w-5 text-brand-600" />
                <span>Ubicación del vivero</span>
              </div>
              <p className="text-sm font-semibold text-brand-600">
                {getUbicacionDisplay(viveroSeleccionado.ubicacion)}
              </p>
            </div>
          )}

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-700">Recolección elegible</p>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                {selectedRecoleccion ? '1 seleccionada' : '0 seleccionadas'}
              </span>
            </div>

            {!selectedViveroId && (
              <div className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
                Selecciona un vivero para ver sus recolecciones.
              </div>
            )}

            {selectedViveroId && recoleccionLoading && (
              <div className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
                Cargando recolecciones...
              </div>
            )}

            {selectedViveroId && recoleccionError && (
              <p className="text-xs font-semibold text-red-500">{recoleccionError}</p>
            )}

            {selectedViveroId &&
              !recoleccionLoading &&
              !recoleccionError &&
              recoleccionesDisponibles.length === 0 && (
                <div className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-600">
                  No hay recolecciones VALIDADO + ABIERTO con saldo disponible.
                </div>
              )}

            {selectedViveroId &&
              recoleccionesDisponibles.map((item) => {
                const isSelected = selectedRecoleccionId === item.id
                const unidadDisplay = formatUnidadCanonicaDisplay(item.unidad_canonica)
                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold shadow-sm transition ${
                      isSelected
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-brand-700 hover:border-brand-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recoleccion_id"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedRecoleccionId(item.id)
                        setUploadedEvidenceIds(null)
                      }}
                      className="mt-1 h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-200"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-extrabold">{getRecoleccionLabel(item)}</p>
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand-600 ring-1 ring-brand-100">
                          #{item.codigo_trazabilidad}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-brand-500">
                        {formatDate(item.fecha)} · {item.saldo_actual ?? 0} {unidadDisplay}
                      </p>
                      <p className="text-xs font-semibold text-brand-500">
                        Tipo: {item.tipo_material} · Estado: {item.estado_registro ?? 'N/D'} /{' '}
                        {item.estado_operativo ?? 'N/D'}
                      </p>
                    </div>
                  </label>
                )
              })}
            {showErrors && validation.recoleccion && (
              <p className="text-xs font-semibold text-red-500">
                Selecciona una recolección para continuar.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
              <p className="text-xs uppercase tracking-wide text-brand-500">Cantidad inicial</p>
              <input
                type="number"
                min={0}
                step="0.000001"
                value={cantidadInicio}
                onChange={(event) => setCantidadInicio(event.target.value)}
                placeholder="0"
                className="mt-2 w-full border-none bg-transparent text-2xl font-extrabold text-brand-700 outline-none"
              />
              {showErrors && validation.cantidad && (
                <p className="mt-1 text-xs font-semibold text-red-500">
                  {cantidadValidation.message ?? 'Cantidad inválida.'}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
              <p className="text-xs uppercase tracking-wide text-brand-500">Unidad</p>
              <select
                value={unidadMedida}
                onChange={(event) => setUnidadMedida(event.target.value as UnidadMedidaVivero)}
                className="mt-2 w-full border-none bg-transparent text-lg font-semibold text-brand-700 outline-none"
              >
                {VALID_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {showErrors && validation.unidad && (
                <p className="mt-1 text-xs font-semibold text-red-500">
                  La unidad debe coincidir con la unidad canónica de la recolección.
                </p>
              )}
            </div>

            <div className="col-span-2 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
              <p className="text-xs uppercase tracking-wide text-brand-500">Fecha inicio</p>
              <input
                type="date"
                value={fechaInicio}
                min={fechaRange.min}
                max={fechaRange.max}
                onChange={(event) => setFechaInicio(event.target.value)}
                className="mt-2 w-full border-none bg-transparent text-lg font-semibold text-brand-700 outline-none"
              />
              {showErrors && validation.fecha && (
                <p className="mt-1 text-xs font-semibold text-red-500">
                  Usa una fecha válida entre {fechaRange.min} y {fechaRange.max} (YYYY-MM-DD).
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-brand-700">Observaciones</p>
              <textarea
                value={observaciones}
                onChange={(event) => setObservaciones(event.target.value)}
                placeholder="Notas adicionales del inicio del lote"
                rows={3}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 shadow-soft outline-none"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-brand-700">Fotos del evento INICIO</p>
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-3xl border border-dashed border-brand-200 bg-brand-50 px-4 py-4 text-base font-semibold text-brand-700 shadow-soft transition hover:border-brand-300">
                <Icon name="photo" className="h-5 w-5" />
                Subir fotos (1 a 5)
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {showErrors && validation.fotos && (
                <p className="text-xs font-semibold text-red-500">
                  Debes cargar entre 1 y 5 fotos para crear el lote.
                </p>
              )}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div key={photo.previewUrl} className="relative overflow-hidden rounded-2xl">
                      <img src={photo.previewUrl} alt={photo.file.name} className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-600"
                        aria-label="Quitar foto"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {uploadedEvidenceIds && uploadedEvidenceIds.length > 0 && (
                <p className="text-xs font-semibold text-emerald-700">
                  Evidencias subidas: {uploadedEvidenceIds.join(', ')}. Si falla la creación, se
                  reutilizan en el reintento.
                </p>
              )}
            </div>
          </div>

          {showErrors && validation.auth && (
            <p className="text-center text-xs font-semibold text-red-500">
              No hay `auth_id` activo. Inicia sesión de nuevo.
            </p>
          )}

          <div className="bottom-24 left-0 right-0 z-50 mx-0 w-full max-w-md">
            <button
              type="submit"
              aria-disabled={isSubmitting}
              disabled={isSubmitting}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-extrabold text-white shadow-soft transition ${
                canSubmit
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              <Icon name="check" className="h-4 w-4" />
              {submitPhase === 'uploading' && 'Subiendo evidencias...'}
              {submitPhase === 'creating' && 'Creando lote...'}
              {submitPhase === 'idle' && 'Registrar inicio de lote'}
            </button>
          </div>

          {submitError && <p className="text-center text-xs font-semibold text-red-500">{submitError}</p>}
        </div>
      </form>
    </div>
  )
}

export default ViveroNewScreen
