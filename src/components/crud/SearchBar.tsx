import Icon from '../Icon'

type Props = {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  ariaLabel?: string
}

function SearchBar({ value, onChange, placeholder = 'Buscar...', ariaLabel }: Props) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-brand-400">
      <Icon name="search" className="h-5 w-5 shrink-0 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="w-full border-none bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
      />
    </label>
  )
}

export default SearchBar
