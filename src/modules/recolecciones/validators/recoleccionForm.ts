import type { CreateRecoleccionDto } from '../../../services/recolecciones.service'
import { validateCantidad } from '../../../utils/validations/cantidad'
import { validateDateInRange, type DateRange } from '../../../utils/validations/date'
import { mapToCantidadYUnidadCanonica } from '../../../utils/recoleccionUnidad'
import type { RecoleccionFormData } from '../recoleccionFormTypes'

export const MIN_FOTOS_POR_TIPO = 1
export const MAX_FOTOS_POR_TIPO = 5

export type RecoleccionFormStage = 'datos' | 'ubicacion' | 'resumen'

export type ValidationErrors = {
  date?: string
  dateRange?: string
  quantity?: string
  fotos?: string
  method?: string
  tipoMaterial?: string
  ubicacion?: string
  planta?: string
  vivero?: string
  pais?: string
  division?: string
}

export function validateRecoleccionForm(
  form: RecoleccionFormData,
  options: { dateRange: DateRange; stage: RecoleccionFormStage },
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {}

  const dateCheck = validateDateInRange(form.date, options.dateRange)
  if (dateCheck.errorKey === 'empty') errors.date = 'La fecha es obligatoria'
  if (dateCheck.errorKey === 'future' || dateCheck.errorKey === 'too_old') {
    errors.dateRange = `La fecha debe estar entre ${options.dateRange.min} y ${options.dateRange.max}`
  }

  const tipoMaterialCanonico = form.type === 'cutting' ? 'ESQUEJE' : 'SEMILLA'
  const cantidadCheck = validateCantidad(form.quantity, tipoMaterialCanonico)
  if (!cantidadCheck.isValid) {
    if (cantidadCheck.errorKey === 'non_positive' || cantidadCheck.errorKey === 'empty') {
      errors.quantity = 'La cantidad debe ser mayor a 0'
    }
    if (cantidadCheck.errorKey === 'decimal_not_allowed') {
      errors.quantity = 'Para ESQUEJE la cantidad debe ser entera'
    }
  }

  if (form.type === 'cutting' && form.unit !== 'units') {
    errors.quantity = 'Para ESQUEJE la unidad debe ser Unidades'
  }

  if (form.unit === 'units' && Number.isFinite(cantidadCheck.parsed) && !Number.isInteger(cantidadCheck.parsed)) {
    errors.quantity = 'Para UNIDADES la cantidad debe ser entera'
  }

  const placeCount = form.placePhotos?.length || 0
  const totalCount = form.totalPhotos?.length || 0
  if (
    placeCount < MIN_FOTOS_POR_TIPO ||
    totalCount < MIN_FOTOS_POR_TIPO ||
    placeCount > MAX_FOTOS_POR_TIPO ||
    totalCount > MAX_FOTOS_POR_TIPO
  ) {
    errors.fotos = `Debes agregar al menos ${MIN_FOTOS_POR_TIPO} foto de Lugar y ${MIN_FOTOS_POR_TIPO} de Total recolectado`
  }

  if (!form.metodo_id) {
    errors.method = 'Selecciona un método de recolección'
  }

  // NUEVA VALIDACIÓN FASE 3:
  if (!form.planta_id) {
    errors.planta = 'Debes seleccionar una planta del catálogo para continuar'
  }

  if (options.stage !== 'datos') {
    if (!form.latitud?.trim() || !form.longitud?.trim()) {
      errors.ubicacion = 'Completa latitud y longitud'
    }

    if (!form.paisId?.trim()) {
      errors.pais = 'Selecciona un país'
    }

    if (!form.divisionId?.trim()) {
      errors.division = 'Selecciona una comunidad o localidad'
    }

    if (!form.vivero_id) {
      errors.vivero = 'Selecciona un vivero'
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors }
}

export function mapFormToCreateDto(form: RecoleccionFormData): CreateRecoleccionDto {
  const tipo_material = form.type === 'cutting' ? 'ESQUEJE' : 'SEMILLA'
  const { cantidad_inicial_canonica, unidad_canonica } = mapToCantidadYUnidadCanonica(
    Number(form.quantity),
    form.unit,
  )
  return {
    fecha: form.date,
    cantidad_inicial_canonica,
    unidad_canonica,
    tipo_material,
    planta_id: Number(form.planta_id), 
    metodo_id: Number(form.metodo_id),
    vivero_id: Number(form.vivero_id),
    observaciones: form.notes || undefined,
    ubicacion: {
      nombre: form.ubicacionNombre || undefined,
      referencia: form.referencia || undefined,
      latitud: Number(form.latitud),
      longitud: Number(form.longitud),
      pais_id: form.paisId ? Number(form.paisId) : undefined,
      division_id: form.divisionId ? Number(form.divisionId) : undefined,
      precision_m: form.precisionM ? Number(form.precisionM) : undefined,
      fuente: form.fuenteUbicacion,
    },
    fotos: [...(form.placePhotos || []), ...(form.totalPhotos || [])].flatMap((photo) =>
      photo.file ? [photo.file] : [],
    ),
  }
}
