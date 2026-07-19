export function getInitials(
  value?: string | null,
  opts?: { fallback?: string },
): string {
  const fallback = opts?.fallback ?? ''
  if (!value) return fallback

  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('')
  return initials || fallback
}
