import type { ReactNode } from 'react'

type Props = {
  label: string
  required?: boolean
  error?: string | null
  hint?: string
  children: ReactNode
}

function FormField({ label, required = false, error, hint, children }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-brand-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </p>
      {children}
      {error ? (
        <p className="text-xs font-semibold text-red-500">{error}</p>
      ) : hint ? (
        <p className="text-xs font-medium text-brand-500">{hint}</p>
      ) : null}
    </div>
  )
}

export default FormField
