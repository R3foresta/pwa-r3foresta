type AppInitializationScreenProps = {
  message: string
}

function AppInitializationScreen({ message }: AppInitializationScreenProps) {
  return (
    <main className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-hidden bg-brand-900 px-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(95,154,120,0.28),transparent_42%)]" />
      <div className="absolute -left-24 top-1/4 h-64 w-64 rounded-full bg-success-400/10 blur-[100px]" />
      <div className="absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-brand-300/10 blur-[100px]" />

      <section
        aria-busy="true"
        aria-live="polite"
        className="relative w-full max-w-xs text-center"
      >
        <img
          src="/icon-192.png"
          alt=""
          className="mx-auto h-20 w-20 rounded-[1.35rem] shadow-2xl shadow-black/25 ring-1 ring-white/15"
        />

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
          R3foresta
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Preparando tu espacio</h1>

        <div
          role="progressbar"
          aria-label={message}
          className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/15"
        >
          <div className="app-initialization-progress h-full rounded-full bg-success-400" />
        </div>

        <p className="mt-4 text-sm font-semibold text-white">{message}</p>
        <p className="mt-1 text-xs font-medium text-brand-200">
          Esto puede tomar unos segundos.
        </p>
      </section>
    </main>
  )
}

export default AppInitializationScreen
