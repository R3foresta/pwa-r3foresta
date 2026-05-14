export function inputClasses(hasError: boolean): string {
  return [
    'w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2',
    hasError
      ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
      : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200',
  ].join(' ')
}

export function selectWrapperClasses(hasError: boolean): string {
  return [
    'flex items-center rounded-2xl border px-4 shadow-soft focus-within:ring-2',
    hasError
      ? 'border-red-400 bg-red-50 focus-within:border-red-400 focus-within:ring-red-200'
      : 'border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-brand-200',
  ].join(' ')
}
