import type { CreateRecoleccionDto } from '../../../services/recolecciones.service'
import { validateCantidad } from '../../../utils/validations/cantidad'
import { validateDateInRange, type DateRange } from '../../../utils/validations/date'
import type { RecoleccionFormData } from '../recoleccionFormTypes'

export const MIN_FOTOS = 2
export const MAX_FOTOS = 5

export type RecoleccionFormStage = 'datos' | 'ubicacion' | 'resumen'

export type ValidationErrors = {
  date?: string
  dateRange?: string
  quantity?: string
  fotos?: string
  method?: string
  tipoMaterial?: string
  ubicacion?: string
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

  const totalFotos = (form.placePhotos?.length || 0) + (form.totalPhotos?.length || 0)
  if (totalFotos < MIN_FOTOS || totalFotos > MAX_FOTOS) {
    errors.fotos = `Adjunta entre ${MIN_FOTOS} y ${MAX_FOTOS} fotos` 
  }

  if (!form.metodo_id) {
    errors.method = 'Selecciona un método de recolección'
  }

  if (options.stage !== 'datos') {
    // Ubicación mínima: lat/long y país/división opcionales ya capturados en form
    if (!form.latitud?.trim() || !form.longitud?.trim()) {
      errors.ubicacion = 'Completa latitud y longitud'
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors }
}

export function mapFormToCreateDto(form: RecoleccionFormData): CreateRecoleccionDto {
  const tipo_material = form.type === 'cutting' ? 'ESQUEJE' : 'SEMILLA'
  const cantidad = Number(form.quantity)
  const unidad = form.unit === 'units' ? 'unidad' : form.unit
  return {
    fecha: form.date,
    cantidad,
    unidad,
    tipo_material,
    planta_id: form.planta_id ? Number(form.planta_id) : 1,
    metodo_id: form.metodo_id ? Number(form.metodo_id) : 1,
    vivero_id: form.vivero_id ? Number(form.vivero_id) : 1,
    observaciones: form.notes || undefined,
    ubicacion: {
      nombre: form.ubicacionNombre || undefined,
      referencia: form.referencia || undefined,
      latitud: Number(form.latitud),
      longitud: Number(form.longitud),
      pais_id: form.paisId ? Number(form.paisId) : 1,
      division_id: form.divisionId ? Number(form.divisionId) : 1,
      precision_m: form.precisionM ? Number(form.precisionM) : undefined,
      fuente: form.fuenteUbicacion,
    },
    fotos: [...(form.placePhotos || []), ...(form.totalPhotos || [])].map((base64, index) => {
      const mime = base64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
      return base64ToFile(base64, `foto_${index + 1}.${mime === 'image/png' ? 'png' : 'jpg'}`)
    }),
  }
}

function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}
