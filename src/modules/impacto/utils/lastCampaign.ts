const PREFIX = 'r3foresta:impacto:last-campaign:v1:'
const DECIMAL_ID = /^[1-9]\d{0,18}$/

function validId(value: unknown): value is string {
  return typeof value === 'string' && DECIMAL_ID.test(value) && BigInt(value) <= 9223372036854775807n
}

// La preferencia sólo recuerda navegación. Nunca concede acceso ni almacena sesión.
export function saveLastCampaign(actorId: string, campaignId: string): void {
  if (!validId(actorId) || !validId(campaignId)) return
  try { localStorage.setItem(`${PREFIX}${actorId}`, campaignId) } catch { /* Es opcional. */ }
}

export function readLastCampaign(actorId: string): string | null {
  if (!validId(actorId)) return null
  try {
    const saved = localStorage.getItem(`${PREFIX}${actorId}`)
    if (validId(saved)) return saved
    // INT04 ya recuerda por cuenta la última selección explícita de registro.
    const previous: unknown = JSON.parse(localStorage.getItem(`r3foresta:registro-scope:v1:${actorId}`) ?? 'null')
    if (previous && typeof previous === 'object' && 'campania_id' in previous && validId(previous.campania_id)) return previous.campania_id
  } catch { /* Almacenamiento ausente o preferencia inválida: entrada global. */ }
  return null
}
