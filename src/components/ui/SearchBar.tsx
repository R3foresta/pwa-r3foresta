import Icon from '../Icon'
import { cn } from './cn'

type Props = {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
}

/**
 * Barra de búsqueda promovida desde `crud/SearchBar` a la capa `ui/`.
 * Ver FRONTEND_UI_STANDARD.md §4.6.
 */
function SearchBar({ value, onChange, placeholder = 'Buscar...', ariaLabel, className }: Props) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-brand-400',
        className,
      )}
    >
      <Icon name="search" className="h-5 w-5 shrink-0 text-neutral-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="w-full border-none bg-transparent text-sm font-semibold text-neutral-700 outline-none placeholder:font-medium placeholder:text-neutral-400"
      />
    </label>
  )
}

export default SearchBar
