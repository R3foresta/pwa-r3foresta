import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  actualizarComunidad,
  desactivarComunidad,
  obtenerComunidad,
} from '../../api/comunidades.api'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Field, PageHeader, inputClasses, selectWrapperClasses } from '../../components/ui'
import Icon from '../../components/Icon'
import {
  UbicacionesService,
  type DivisionCatalogo,
  type PaisCatalogo,
} from '../../services/ubicaciones.service'
import type { ComunidadCard } from '../../tipos/comunidades'

type DivisionLevel = {
  parentId: number | null
  label: string
  options: DivisionCatalogo[]
  selectedId: number | null
}

type ApiError = Error & { status?: number }

const MAX_LEVELS = 3

function buildRutaActual(comunidad: ComunidadCard | null): string {
  if (!comunidad) return ''
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
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

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
    !actionLoading &&
    Boolean(comunidad) &&
    selectedMunicipioId !== null &&
    nombreLimpio.length > 0

  const loadDivisionesByPath = async (paisId: number, pathIds: number[]) => {
    const requestId = ++divisionRequestRef.current
    try {
      setLoadingDivisiones(true)
      setCatalogoError(null)
      const rootOptions = await UbicacionesService.getDivisiones(paisId)
      if (requestId !== divisionRequestRef.current) return
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
        if (!currentLevel) break
        const match = currentLevel.options.find((item) => item.id === divisionId)
        if (!match) break
        currentLevel.selectedId = divisionId
        if (index >= MAX_LEVELS - 1) break
        const children = await UbicacionesService.getDivisiones(paisId, divisionId)
        if (children.length === 0) break
        nextLevels.push({
          parentId: divisionId,
          label: children[0]?.tipo_nombre || `Nivel ${nextLevels.length + 1}`,
          options: children,
          selectedId: null,
        })
      }
      if (requestId !== divisionRequestRef.current) return
      setDivisionLevels(nextLevels)
    } catch (error) {
      if (requestId !== divisionRequestRef.current) return
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
      setLoadError('ID de comunidad inválido.')
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
        const paisesResponse = await UbicacionesService.getPaises()
        setPaises(paisesResponse ?? [])
      } catch (error) {
        console.error('Error cargando países:', error)
        setCatalogoError('No se pudo cargar el catálogo de países.')
      }

      if (!paisId) {
        setLoadError('La comunidad no tiene país asociado.')
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

    if (!selectedPaisId || selectedId === null || levelIndex >= MAX_LEVELS - 1) return

    try {
      setLoadingDivisiones(true)
      setCatalogoError(null)
      const children = await UbicacionesService.getDivisiones(selectedPaisId, selectedId)
      if (requestId !== divisionRequestRef.current || children.length === 0) return
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
      if (requestId !== divisionRequestRef.current) return
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
    if (!id || submitting) return
    setShowErrors(true)
    setSubmitError(null)

    if (validation.nivel1 || validation.nivel2 || validation.nivel3 || validation.nombre) return
    if (selectedMunicipioId === null) return

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
        setSubmitError('Revisa los campos obligatorios.')
        return
      }
      if (apiError?.status === 500) {
        setSubmitError('Error interno, intenta más tarde.')
        return
      }
      setSubmitError(apiError?.message || 'No se pudo actualizar la comunidad.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDesactivar = async () => {
    if (!id || !comunidad || actionLoading) return
    try {
      setActionLoading(true)
      setSubmitError(null)
      await desactivarComunidad(id)
      navigate('/app/comunidades', {
        state: { successMessage: 'Comunidad desactivada correctamente.' },
      })
    } catch (error) {
      const apiError = error as ApiError
      if (apiError?.status === 500) {
        setSubmitError('Error interno, intenta más tarde.')
        return
      }
      setSubmitError(apiError?.message || 'No se pudo desactivar la comunidad.')
    } finally {
      setActionLoading(false)
      setConfirmOpen(false)
    }
  }

  const handleReactivar = async () => {
    if (!id || actionLoading) return
    try {
      setActionLoading(true)
      setSubmitError(null)
      await actualizarComunidad(id, { activo: true })
      navigate('/app/comunidades', {
        state: { successMessage: 'Comunidad reactivada correctamente.' },
      })
    } catch (error) {
      const apiError = error as ApiError
      setSubmitError(apiError?.message || 'No se pudo reactivar la comunidad.')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    void loadInitialData()
    // loadInitialData se ejecuta al montar y cuando cambia el id de ruta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
        <PageHeader title="Editar comunidad" backTo="/app/comunidades" />
        <section className="rounded-2xl bg-white px-4 py-6 text-center text-sm font-semibold text-brand-600 shadow-soft ring-1 ring-black/5">
          Cargando comunidad...
        </section>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6 text-brand-700">
        <PageHeader title="Editar comunidad" backTo="/app/comunidades" />
        <section className="rounded-2xl bg-white px-4 py-6 text-center shadow-soft ring-1 ring-black/5">
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
      <PageHeader
        title="Editar comunidad"
        subtitle={comunidad?.nombre}
        backTo="/app/comunidades"
      />

      {loadError && (
        <section className="mb-4 rounded-2xl bg-danger-50 px-4 py-4 text-center shadow-soft ring-1 ring-danger-200">
          <p className="text-sm font-semibold text-danger-700">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadInitialData()}
            className="mt-3 rounded-xl bg-danger-100 px-3 py-2 text-xs font-semibold text-danger-700 transition hover:bg-danger-200"
          >
            Reintentar
          </button>
        </section>
      )}

      {comunidad && !comunidad.activo && (
        <section className="mb-4 rounded-2xl bg-warning-50 px-4 py-3 shadow-soft ring-1 ring-warning-200">
          <p className="text-sm font-semibold text-warning-700">
            Esta comunidad está inactiva. No aparece en los selectores hasta que la reactives.
          </p>
        </section>
      )}

      {submitError && (
        <section className="mb-4 rounded-2xl bg-danger-50 px-4 py-3 shadow-soft ring-1 ring-danger-200">
          <p className="text-sm font-semibold text-danger-700">{submitError}</p>
        </section>
      )}

      <section className="mb-4 space-y-1 rounded-2xl bg-brand-50 px-4 py-3 shadow-soft ring-1 ring-brand-100">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
          Ruta actual
        </p>
        <p className="text-sm font-semibold text-brand-700">
          {rutaActual || 'Sin ruta administrativa disponible'}
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="space-y-4 rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
          <Field label="País" hint="El país de una comunidad no se puede modificar.">
            <div className="flex items-center rounded-2xl border border-neutral-200 bg-neutral-50 px-4 shadow-soft">
              <select
                value={selectedPaisId ?? ''}
                disabled
                className="w-full bg-transparent py-3 text-sm font-semibold text-neutral-700 outline-none"
              >
                <option value="">{comunidad?.pais?.nombre || 'País no disponible'}</option>
                {paises.map((pais) => (
                  <option key={pais.id} value={pais.id}>
                    {pais.nombre}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" className="h-4 w-4 text-neutral-400" />
            </div>
          </Field>

          {divisionLevels.slice(0, MAX_LEVELS).map((level, index) => {
            const validationKey = (['nivel1', 'nivel2', 'nivel3'] as const)[index]
            const hasError = showErrors && validation[validationKey]
            return (
              <Field
                key={`${level.parentId ?? 'root'}-${index}`}
                label={level.label || `Nivel ${index + 1}`}
                required
                error={hasError ? `Completa ${level.label || `el nivel ${index + 1}`}.` : null}
              >
                <div className={selectWrapperClasses(hasError)}>
                  <select
                    value={level.selectedId ?? ''}
                    onChange={(event) => {
                      void handleDivisionSelect(index, event.target.value)
                    }}
                    disabled={loadingDivisiones || submitting || actionLoading}
                    className="w-full bg-transparent py-3 text-sm font-semibold text-neutral-700 outline-none"
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
                  <Icon name="chevron-down" className="h-4 w-4 text-neutral-400" />
                </div>
              </Field>
            )
          })}

          {catalogoError && (
            <p className="text-xs font-semibold text-danger-500">{catalogoError}</p>
          )}

          <Field
            label="Nombre de la comunidad"
            required
            error={
              showErrors && validation.nombre
                ? 'El nombre de la comunidad es obligatorio.'
                : null
            }
          >
            <input
              type="text"
              value={comunidadNombre}
              onChange={(event) => {
                setComunidadNombre(event.target.value)
                setSubmitError(null)
              }}
              disabled={submitting || actionLoading}
              placeholder="Ingresa el nombre de la comunidad"
              className={inputClasses(showErrors && validation.nombre)}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm font-semibold text-brand-700">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) => setActivo(event.target.checked)}
              disabled={submitting || actionLoading}
              className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-400"
            />
            Comunidad activa
          </label>

          <div className="rounded-xl bg-neutral-50 px-3 py-2">
            <p className="text-xs font-semibold text-neutral-600">
              Ruta seleccionada: {rutaSeleccionada || 'Selección pendiente'}
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

        {comunidad?.activo ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={actionLoading || submitting}
            className="w-full rounded-2xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700 shadow-soft ring-1 ring-danger-200 transition hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading ? 'Desactivando...' : 'Desactivar comunidad'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleReactivar()}
            disabled={actionLoading || submitting}
            className="w-full rounded-2xl bg-success-50 px-4 py-3 text-sm font-semibold text-success-700 shadow-soft ring-1 ring-success-200 transition hover:bg-success-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading ? 'Reactivando...' : 'Reactivar comunidad'}
          </button>
        )}
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Desactivar esta comunidad?"
        description={`"${comunidad?.nombre || ''}" dejará de aparecer en los selectores. Podrás reactivarla más adelante.`}
        confirmLabel="Sí, desactivar"
        cancelLabel="Cancelar"
        variant="danger"
        iconName="trash"
        loading={actionLoading}
        onConfirm={() => void handleDesactivar()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default EditarComunidadScreen
