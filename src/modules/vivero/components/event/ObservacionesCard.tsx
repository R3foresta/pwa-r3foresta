import Icon from '../../../../components/Icon'

type Props = {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

function ObservacionesCard({
  value,
  onChange,
  maxLength = 500,
  placeholder = 'Notas adicionales del evento…',
  required = false,
  disabled = false,
}: Props) {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value.slice(0, maxLength))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon name="report" className="h-4 w-4 text-brand-500" />
        <p className="text-sm font-extrabold text-brand-700">Observaciones</p>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-brand-400">
          {required ? 'Obligatorio' : 'Opcional'}
        </span>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="w-full resize-none rounded-2xl border border-brand-100 bg-white px-3 py-2 text-sm font-semibold text-brand-700 outline-none transition focus:border-brand-300 disabled:opacity-50"
      />
      <p className="text-right text-[10px] font-semibold text-brand-400">
        {value.length}/{maxLength}
      </p>
    </div>
  )
}

export default ObservacionesCard
