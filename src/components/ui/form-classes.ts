export function inputClasses(hasError: boolean): string {
  return [
    'w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-neutral-700 shadow-soft outline-none transition focus:ring-2',
    hasError
      ? 'border-danger-400 bg-danger-50 focus:border-danger-400 focus:ring-danger-200'
      : 'border-neutral-200 bg-white focus:border-brand-400 focus:ring-brand-200',
  ].join(' ')
}

export function selectWrapperClasses(hasError: boolean): string {
  return [
    'flex items-center rounded-2xl border px-4 shadow-soft focus-within:ring-2',
    hasError
      ? 'border-danger-400 bg-danger-50 focus-within:border-danger-400 focus-within:ring-danger-200'
      : 'border-neutral-200 bg-white focus-within:border-brand-400 focus-within:ring-brand-200',
  ].join(' ')
}
