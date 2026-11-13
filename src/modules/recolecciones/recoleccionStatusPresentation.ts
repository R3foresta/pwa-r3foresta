// Etiquetas de presentación: los códigos de dominio y sus colores no cambian.
const ESTADO_REGISTRO_LABELS: Readonly<Record<string, string>> = {
  BORRADOR: 'Guardada sin enviar',
  PENDIENTE_VALIDACION: 'Pendiente de recepción',
  RECHAZADO: 'Requiere corrección',
  VALIDADO: 'Recibida en vivero',
}

const ESTADO_REGISTRO_DESCRIPTIONS: Readonly<Record<string, string>> = {
  BORRADOR: 'La recolección está guardada y todavía no se ha enviado al vivero.',
  PENDIENTE_VALIDACION: 'El vivero debe revisar la ficha y confirmar el material recibido.',
  RECHAZADO: 'Es necesario corregir la ficha antes de volver a enviarla al vivero.',
  VALIDADO: 'El vivero confirmó la recepción física del material.',
}

export function getEstadoRegistroLabel(estado: string, recepcionAcreditada = true): string {
  // Un registro legado VALIDADO no prueba por sí solo la recepción física.
  if (estado === 'VALIDADO' && !recepcionAcreditada) return 'Recepción no acreditada'
  return ESTADO_REGISTRO_LABELS[estado] ?? estado
}

export function getEstadoRegistroDescription(estado: string): string {
  return ESTADO_REGISTRO_DESCRIPTIONS[estado] ?? ''
}

export function getEstadoOperativoLabel(estado: string): string {
  return estado === 'CERRADO' ? 'Sin saldo en origen' : estado
}
