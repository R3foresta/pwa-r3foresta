export type CommandOperation = { signal: AbortSignal; current: () => boolean; finish: () => void }

// Compartido por acceso y registro: una instancia por identidad, una operación
// local a la vez y ninguna respuesta tardía tras desmontar/cambiar de cuenta.
export class CommandLifecycle<T> {
  protected snapshot: T
  protected active = false
  protected running = false
  private version = 0
  private abort: AbortController | null = null
  private readonly listeners = new Set<() => void>()

  constructor(initial: T) { this.snapshot = initial }
  getSnapshot = (): T => this.snapshot
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  protected update(next: T): void {
    this.snapshot = next
    this.listeners.forEach((listener) => listener())
  }
  protected activate(): void { this.active = true }
  protected deactivate(): void {
    this.active = false
    this.version += 1
    this.abort?.abort()
    this.running = false
  }
  protected begin(): CommandOperation | null {
    if (this.running || !this.active) return null
    this.running = true
    const version = ++this.version
    const controller = new AbortController()
    this.abort = controller
    const current = () => this.active && version === this.version
    return { signal: controller.signal, current, finish: () => {
      if (current()) { this.running = false; this.abort = null }
    } }
  }
}

export async function withPrivateCommandLock<T>(key: string, callback: () => Promise<T> | T): Promise<T> {
  if (!navigator.locks?.request) throw new Error('Este navegador no permite coordinar los envíos entre pestañas. Usa un navegador compatible para confirmar acciones.')
  return navigator.locks.request(key, { mode: 'exclusive' }, callback)
}
