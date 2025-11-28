type Props = {
  title: string
}

function PlaceholderScreen({ title }: Props) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 pb-28 text-center text-brand-700">
      <div className="rounded-3xl bg-white px-6 py-6 shadow-soft ring-1 ring-black/5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Próximamente
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-brand-700">{title}</h1>
        <p className="mt-2 text-sm font-medium text-brand-600">
          Estamos preparando esta sección.
        </p>
      </div>
    </div>
  )
}

export default PlaceholderScreen
