import type { TipoCampania } from '../types/contracts'

export type CrearCampaniaFormValues = {
  nombre: string
  tipo: TipoCampania | ''
  descripcion: string
  fecha_estimada_inicio: string
  fecha_estimada_fin: string
  organizacion_ids: number[]
}

export function validateCrearCampaniaForm(values: CrearCampaniaFormValues): string | null {
  if (values.nombre.trim().length < 3) {
    return 'El nombre debe tener al menos 3 caracteres.'
  }
  if (!values.tipo) {
    return 'Selecciona un tipo de campaña.'
  }
  if (
    values.fecha_estimada_inicio &&
    values.fecha_estimada_fin &&
    values.fecha_estimada_inicio > values.fecha_estimada_fin
  ) {
    return 'La fecha de cierre no puede ser anterior al inicio.'
  }
  return null
}
