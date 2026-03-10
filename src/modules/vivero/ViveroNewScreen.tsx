import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { useAuth } from '../../contexts/AuthContext'
import { useViveros } from '../../hooks/useViveros'
import { GerminacionService } from '../../services/germinacion.service'
import { RecoleccionService } from '../../services/recoleccion.service'
import type { Recoleccion } from '../../services/recoleccion.service'
import { getUbicacionDisplay } from '../../utils/ubicacion'
import { buildPastRange, clampDateToRange, validateDateInRange } from '../../utils/validations/date'
import { MAX_DIAS_GERMINACION } from '../../config/germinacion'

const createLotId = () => {
  const year = new Date().getFullYear()
  const sequence = String(Math.floor(Math.random() * 100000)).padStart(5, '0')
  return `LFV-${year}-${sequence}`
}

const formatDate = (value?: string) => {
  if (!value) return '--'
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getRecoleccionLabel = (item: Recoleccion) => {
  return (
    item.planta?.especie ||
    item.nombre_comercial ||
    item.nombre_cientifico ||
    `Recoleccion #${item.id}`
  )
}

function ViveroNewScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [lotId, setLotId] = useState(createLotId)

  const { viveros, loading: viveroLoading, error: viveroError } = useViveros()
  const [selectedViveroId, setSelectedViveroId] = useState<number | null>(null)

  const [recolecciones, setRecolecciones] = useState<Recoleccion[]>([])
  const [recoleccionLoading, setRecoleccionLoading] = useState(false)
  const [recoleccionError, setRecoleccionError] = useState<string | null>(null)
  const [selectedRecolecciones, setSelectedRecolecciones] = useState<number[]>([])

  const [cantidadInicio, setCantidadInicio] = useState('')
  const fechaRange = useMemo(() => buildPastRange(MAX_DIAS_GERMINACION), [])
  const [fechaInicio, setFechaInicio] = useState(() =>
    clampDateToRange(new Date().toISOString().slice(0, 10), fechaRange),
  )
  const [observaciones, setObservaciones] = useState('')
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedViveroId) {
      setRecolecciones([])
      setSelectedRecolecciones([])
      return
    }

    let isMounted = true
    const loadRecolecciones = async () => {
      try {
        setRecoleccionLoading(true)
        setRecoleccionError(null)
        const response = await RecoleccionService.list({
          vivero_id: selectedViveroId,
          tipo_material: 'SEMILLA',
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

  const viveroSeleccionado = useMemo(
    () => viveros.find((vivero) => vivero.id === selectedViveroId),
    [selectedViveroId, viveros],
  )

  const recoleccionesDisponibles = useMemo(
    () => recolecciones.filter((item) => item.tipo_material === 'SEMILLA'),
    [recolecciones],
  )

  const toggleRecoleccion = (id: number) => {
    setSelectedRecolecciones((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    const nextPhotos = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...nextPhotos])
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
  }

  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    }
  }, [])

  const cantidadValue = Number(cantidadInicio)
  const responsable = user?.username ?? ''
  const fechaInicioCheck = validateDateInRange(fechaInicio, fechaRange)

  const validation = {
    vivero: !selectedViveroId,
    recolecciones: selectedRecolecciones.length === 0,
    cantidadInicio: !cantidadValue || cantidadValue <= 0,
    fechaInicio: !fechaInicioCheck.isValid,
    responsable: !responsable.trim(),
  }
  const canSubmit =
    Boolean(selectedViveroId) &&
    selectedRecolecciones.length > 0 &&
    cantidadValue > 0 &&
    fechaInicioCheck.isValid &&
    Boolean(responsable.trim()) &&
    !submitting

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (submitting) return
    if (!canSubmit) {
      setShowErrors(true)
      return
    }

    const selectedPlantaIds = selectedRecolecciones
      .map((recoleccionId) => recolecciones.find((item) => item.id === recoleccionId)?.planta?.id)
      .filter((plantaId): plantaId is number => typeof plantaId === 'number')
    const uniquePlantaIds = Array.from(new Set(selectedPlantaIds))
    if (uniquePlantaIds.length === 0) {
      setSubmitError('Las recolecciones seleccionadas no tienen planta asignada.')
      return
    }
    if (uniquePlantaIds.length > 1) {
      setSubmitError('Las recolecciones seleccionadas deben ser de la misma planta.')
      return
    }

    const responsableId = user?.id ? Number(user.id) : undefined
    const payload = {
      codigo_trazabilidad: lotId,
      vivero_id: selectedViveroId as number,
      planta_id: uniquePlantaIds[0],
      responsable_id: Number.isFinite(responsableId) ? responsableId : undefined,
      fecha_inicio: fechaInicioCheck.normalized,
      cantidad_inicio: cantidadValue,
      estado: 'INICIO' as const,
      tipo_material: 'SEMILLA' as const,
      recolecciones: selectedRecolecciones,
      observaciones: observaciones.trim() || undefined,
      fotos: photos.map((photo) => photo.file),
    }

    try {
      setSubmitting(true)
      setSubmitError(null)
      await GerminacionService.create(payload)
      navigate('/app/vivero')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al registrar el lote')
    } finally {
      setSubmitting(false)
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
              Registrar germinacion
            </h1>
            <p className="text-sm font-semibold text-brand-500">
              Lote fase vivero (LFV)
            </p>
          </div>
        </header>

        <div className="mt-6 space-y-5 px-5">
          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-700">ID del lote</p>
              <button
                type="button"
                onClick={() => setLotId(createLotId())}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-brand-100 transition hover:bg-brand-100"
              >
                Regenerar
              </button>
            </div>
            <input
              value={lotId}
              readOnly
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700 shadow-soft"
            />
            <p className="text-xs font-semibold text-brand-500">
              Formato: LFV-YYYY-XXXXX
            </p>
          </div>

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
                    setSelectedRecolecciones([])
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
                {viveroError && (
                  <p className="text-xs font-semibold text-red-500">{viveroError}</p>
                )}
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
                <span>Ubicacion del vivero</span>
              </div>
              <p className="text-sm font-semibold text-brand-600">
                {getUbicacionDisplay(viveroSeleccionado.ubicacion)}
              </p>
            </div>
          )}

          <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-700">
                Lotes de semillas disponibles
              </p>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                {selectedRecolecciones.length} seleccionadas
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
                  No hay recolecciones de semillas en este vivero.
                </div>
            )}

            {selectedViveroId &&
              recoleccionesDisponibles.map((item) => {
                const isSelected = selectedRecolecciones.includes(item.id)
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
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRecoleccion(item.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-extrabold">{getRecoleccionLabel(item)}</p>
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand-600 ring-1 ring-brand-100">
                          #{item.codigo_trazabilidad}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-brand-500">
                        {formatDate(item.fecha)} · {item.cantidad} {item.unidad}
                      </p>
                      <p className="text-xs font-semibold text-brand-500">
                        Responsable: {item.usuario?.nombre ?? 'Sin registro'}
                      </p>
                    </div>
                  </label>
                )
              })}
            {showErrors && validation.recolecciones && (
              <p className="text-xs font-semibold text-red-500">
                Selecciona al menos un lote de semillas.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
              <p className="text-xs uppercase tracking-wide text-brand-500">
                Cantidad inicial
              </p>
              <input
                type="number"
                min={0}
                value={cantidadInicio}
                onChange={(event) => setCantidadInicio(event.target.value)}
                placeholder="0"
                className="mt-2 w-full border-none bg-transparent text-2xl font-extrabold text-brand-700 outline-none"
              />
              {showErrors && validation.cantidadInicio && (
                <p className="mt-1 text-xs font-semibold text-red-500">
                  Ingresa una cantidad mayor a 0.
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
              <p className="text-xs uppercase tracking-wide text-brand-500">Fecha de inicio</p>
              <input
                type="date"
                value={fechaInicio}
                min={fechaRange.min}
                max={fechaRange.max}
                onChange={(event) => setFechaInicio(event.target.value)}
                className="mt-2 w-full border-none bg-transparent text-lg font-semibold text-brand-700 outline-none"
              />
              {showErrors && validation.fechaInicio && (
                <p className="mt-1 text-xs font-semibold text-red-500">
                  Selecciona una fecha entre {fechaRange.min} y {fechaRange.max}.
                </p>
              )}
            </div>
            <div className="col-span-2 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
              <p className="text-xs uppercase tracking-wide text-brand-500">Encargado</p>
              <input
                value={responsable}
                readOnly
                placeholder="Usuario no disponible"
                className="mt-2 w-full border-none bg-transparent text-lg font-semibold text-brand-700 outline-none"
              />
              {showErrors && validation.responsable && (
                <p className="mt-1 text-xs font-semibold text-red-500">
                  Inicia sesión para asignar el responsable.
                </p>
              )}
            </div>
          </div>

          {viveroSeleccionado && (
            <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-brand-700">Observaciones</p>
                <textarea
                  value={observaciones}
                  onChange={(event) => setObservaciones(event.target.value)}
                  placeholder="Notas adicionales del lote"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 shadow-soft outline-none"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">Fotos del lote</p>
                <label className="flex cursor-pointer items-center justify-center gap-3 rounded-3xl border border-dashed border-brand-200 bg-brand-50 px-4 py-4 text-base font-semibold text-brand-700 shadow-soft transition hover:border-brand-300">
                  <Icon name="photo" className="h-5 w-5" />
                  Subir fotos del lote
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((photo, index) => (
                      <div key={photo.previewUrl} className="relative overflow-hidden rounded-2xl">
                        <img
                          src={photo.previewUrl}
                          alt={photo.file.name}
                          className="h-24 w-full object-cover"
                        />
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
              </div>
            </div>
          )}
          <div className="bottom-24 left-0 right-0 z-50 mx-0 w-full max-w-md ">
            <button
              type="submit"
              aria-disabled={!canSubmit}
              disabled={!canSubmit}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-extrabold text-white shadow-soft transition ${
                canSubmit
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-300 text-slate-600 cursor-not-allowed'
              }`}
            >
            <Icon name="check" className="h-4 w-4" />
              {submitting ? 'Enviando...' : 'Registrar germinacion'}
            </button>
          </div>
          {submitError && (
            <p className="text-center text-xs font-semibold text-red-500">{submitError}</p>
          )}
        </div>
      </form>
    </div>
  )
}

export default ViveroNewScreen
