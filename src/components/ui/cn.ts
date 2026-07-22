export type ClassValue = string | false | null | undefined

/**
 * Une clases de forma segura: descarta valores falsy y colapsa espacios.
 * Minimal a propósito — sin dependencias nuevas (clsx/classnames).
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}
