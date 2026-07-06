export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return 'Sin fecha'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 'Sin fecha'
  const diffSec = Math.floor((Date.now() - then) / 1000)
  if (diffSec < 60) return 'hace instantes'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return `hace ${diffWeeks} sem`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `hace ${diffMonths} m`
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(then))
}
