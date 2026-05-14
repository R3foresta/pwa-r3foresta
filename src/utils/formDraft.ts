/**
 * Borrador genérico de formularios en localStorage con TTL.
 *
 * Diseñado para recuperar trabajo cuando el usuario abandona un form (cierra
 * la app, se queda sin batería, navega fuera) y vuelve antes del vencimiento.
 *
 * No soporta archivos binarios (fotos, audios): el cuota de localStorage típica
 * de 5–10 MB se llena rápido y bloquea el resto del dominio. Para guardar
 * archivos hay que migrar a IndexedDB.
 *
 * Convención de claves: `r3foresta:<form-id>:<entidad-id>`.
 *
 * TODO(sprint-fotos-offline): persistir fotos via IndexedDB para que un
 * borrador sobreviva incluso cuando el usuario ya tomó las evidencias.
 */

type Envelope<T> = {
  v: 1
  savedAt: number
  data: T
}

type Options = {
  /**
   * Tiempo de vida del borrador en milisegundos. Tras este lapso desde
   * `savedAt`, `load` lo trata como inexistente y lo borra.
   * Por defecto: 24 h.
   */
  ttlMs?: number
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

export function saveDraft<T>(key: string, data: T): void {
  if (!isLocalStorageAvailable()) return
  try {
    const payload: Envelope<T> = { v: 1, savedAt: Date.now(), data }
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // Silencio: si localStorage está lleno o bloqueado, el form sigue
    // funcionando sin persistencia.
  }
}

export function loadDraft<T>(key: string, options: Options = {}): T | null {
  if (!isLocalStorageAvailable()) return null
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Envelope<T>
    if (!parsed || parsed.v !== 1 || typeof parsed.savedAt !== 'number') {
      window.localStorage.removeItem(key)
      return null
    }
    if (Date.now() - parsed.savedAt > ttlMs) {
      window.localStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
    return null
  }
}

export function clearDraft(key: string): void {
  if (!isLocalStorageAvailable()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
