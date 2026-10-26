/** Retornos locales explícitos: nunca aceptar otro host ni parámetros privados. */
export function safeParticipacionReturn(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const legacy = /^\/participar(?:\?campania_id=[1-9][0-9]*(?:&subcampania_id=[1-9][0-9]*)?(?:&pestana=(?:resumen|equipo|mapa))?(?:&registro=[1-9][0-9]*)?)?$/
  const detail = /^\/app\/planting\/subcampanias\/[1-9][0-9]*(?:\?pestana=(?:resumen|equipo|mapa)(?:&registro=[1-9][0-9]*)?)?$/
  return legacy.test(value) || detail.test(value) ? value : null
}

export function subcampaniaDetailPath(id: string, params = new URLSearchParams()): string {
  const next = new URLSearchParams()
  const tab = params.get('pestana')
  if (tab === 'equipo' || tab === 'mapa' || tab === 'resumen') next.set('pestana', tab)
  const record = params.get('registro')
  if (tab === 'mapa' && record && /^[1-9][0-9]*$/.test(record)) next.set('registro', record)
  return `/app/planting/subcampanias/${id}${next.size ? `?${next}` : ''}`
}

export function inicioReturnForActor(state: unknown, actorId: string, scopeId: string): string | null {
  if (!state || typeof state !== 'object' || !('participacionInicio' in state)) return null
  const home = state.participacionInicio
  if (!home || typeof home !== 'object' || !('actorId' in home) || home.actorId !== actorId) return null
  const query = new URLSearchParams()
  if ('map' in home && home.map === true) query.set('vista', 'mapa')
  query.set('seleccion', scopeId)
  return `/participar?${query}`
}
