import type { OrigenLoteVivero } from '../types/contracts'

const MODALIDADES: Record<string, string> = { RECEPCION: 'Recepción', SALDO_INICIAL: 'Saldo inicial' }
const PROCEDENCIAS: Record<string, string> = {
  COMPRA: 'Compra', DONACION: 'Donación', PRODUCCION_PROPIA: 'Producción propia', DESCONOCIDA: 'Desconocida',
}
export function origenLabel(origen: OrigenLoteVivero | null): string {
  if (origen?.tipo === 'RECOLECCION') return 'Desde Recolección'
  if (origen?.tipo === 'INCORPORACION') return incorporacionLabel(origen.modalidad, origen.procedencia)
  return 'Origen no disponible'
}
export function incorporacionLabel(modalidad: string | null, procedencia: string | null): string {
  return `${MODALIDADES[modalidad ?? ''] ?? 'Modalidad no disponible'} · ${PROCEDENCIAS[procedencia ?? ''] ?? 'Procedencia no disponible'}`
}
// DATE es un día operativo, nunca medianoche en la zona del dispositivo.
export function formatViveroDate(value?: string | null): string {
  if (!value) return 'No disponible'
  const day = value.split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 'No disponible'
  const date = new Date(`${day}T00:00:00Z`)
  if (!Number.isFinite(date.getTime())) return 'No disponible'
  return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
export function formatViveroPhotoDate(value?: string | null): string {
  if (!value) return 'Fecha de foto no disponible'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatViveroDate(value)
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('es-BO', { timeZone: 'America/La_Paz' })
    : 'Fecha de foto no disponible'
}
export function formatViveroNumber(value?: number | null): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('es-BO') : 'No disponible'
}
export function daysSinceViveroDate(start: string, now = new Date()): number {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const diff = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${start.split('T')[0]}T00:00:00Z`)) / 86400000
  return Number.isFinite(diff) ? Math.max(0, Math.floor(diff)) : 0
}
