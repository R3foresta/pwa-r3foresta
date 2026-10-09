import type { PlanEspecieMetaInput } from '../types/contracts'

// Reparte el residuo del `floor` para que SUM(cantidad_objetivo) === meta cuando SUM(pct) === 100.
export function buildPlanMetasPayload(
  meta: number,
  especies: { planta_id: number; pct: number }[],
): PlanEspecieMetaInput[] {
  const withPct = especies.filter((especie) => especie.pct > 0)
  if (withPct.length === 0) return []

  const draft = withPct.map((especie) => ({
    planta_id: especie.planta_id,
    porcentaje_objetivo: especie.pct,
    cantidad_objetivo: Math.max(1, Math.floor((meta * especie.pct) / 100)),
  }))

  const totalPct = draft.reduce((acc, item) => acc + item.porcentaje_objetivo, 0)
  if (Math.abs(totalPct - 100) > 1e-6) return draft

  const suma = draft.reduce((acc, item) => acc + item.cantidad_objetivo, 0)
  let residuo = meta - suma

  const indices = draft
    .map((_, index) => index)
    .sort((a, b) => draft[b].porcentaje_objetivo - draft[a].porcentaje_objetivo)

  let cursor = 0
  while (residuo > 0 && indices.length > 0) {
    draft[indices[cursor % indices.length]].cantidad_objetivo += 1
    residuo -= 1
    cursor += 1
  }

  const reversed = [...indices].reverse()
  cursor = 0
  while (residuo < 0 && reversed.length > 0) {
    const idx = reversed[cursor % reversed.length]
    if (draft[idx].cantidad_objetivo > 1) {
      draft[idx].cantidad_objetivo -= 1
      residuo += 1
    }
    cursor += 1
    if (cursor > reversed.length * 200) break
  }

  return draft
}
