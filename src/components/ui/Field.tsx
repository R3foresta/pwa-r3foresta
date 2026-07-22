import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { inputClasses } from '../crud/form-classes'
import { cn } from './cn'

type FieldProps = {
  label: string
  required?: boolean
  error?: string | null
  hint?: string
  htmlFor?: string
  children: ReactNode
}

/**
 * Etiqueta + control + error/hint. Promueve `crud/FormField` a la capa `ui/`
 * y unifica el patrón de formulario para todos los módulos (no solo CRUD).
 * Ver FRONTEND_UI_STANDARD.md §4.4.
 */
export function Field({ label, required = false, error, hint, htmlFor, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-brand-700">
        {label}
        {required && <span className="ml-0.5 text-danger-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-semibold text-danger-500">{error}</p>
      ) : hint ? (
        <p className="text-xs font-medium text-brand-500">{hint}</p>
      ) : null}
    </div>
  )
}

type InputProps = { error?: boolean } & InputHTMLAttributes<HTMLInputElement>
export function Input({ error = false, className, ...rest }: InputProps) {
  return <input className={cn(inputClasses(error), className)} {...rest} />
}

type TextareaProps = { error?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>
export function Textarea({ error = false, className, ...rest }: TextareaProps) {
  return <textarea className={cn(inputClasses(error), 'min-h-[96px] resize-y', className)} {...rest} />
}

type SelectProps = { error?: boolean } & SelectHTMLAttributes<HTMLSelectElement>
export function Select({ error = false, className, children, ...rest }: SelectProps) {
  return (
    <select className={cn(inputClasses(error), 'appearance-none', className)} {...rest}>
      {children}
    </select>
  )
}

export default Field
