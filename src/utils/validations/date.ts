export type DateRange = { min: string; max: string }

export function buildPastRange(maxDaysPast: number, today = new Date()): DateRange {
  const maxDate = today.toLocaleDateString('en-CA')
  const minDateObj = new Date(today)
  minDateObj.setDate(minDateObj.getDate() - maxDaysPast)
  const minDate = minDateObj.toLocaleDateString('en-CA')
  return { min: minDate, max: maxDate }
}

export type DateErrorKey = 'empty' | 'future' | 'too_old'

export function validateDateInRange(
  value: string | null | undefined,
  range: DateRange,
): { isValid: boolean; normalized: string; errorKey?: DateErrorKey } {
  const normalized = value?.trim() || range.max
  if (!value) {
    return { isValid: false, normalized, errorKey: 'empty' }
  }
  if (normalized > range.max) {
    return { isValid: false, normalized: range.max, errorKey: 'future' }
  }
  if (normalized < range.min) {
    return { isValid: false, normalized: range.min, errorKey: 'too_old' }
  }
  return { isValid: true, normalized }
}

export function clampDateToRange(value: string | null | undefined, range: DateRange): string {
  if (!value) return range.max
  if (value > range.max) return range.max
  if (value < range.min) return range.min
  return value
}
