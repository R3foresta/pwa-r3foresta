import { Outlet } from 'react-router-dom'

function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
        <header className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-500">
            R3foresta
          </p>
          <h1 className="text-2xl font-extrabold text-brand-700">Acceso</h1>
        </header>
        <Outlet />
      </div>
    </div>
  )
}

export default AuthLayout
