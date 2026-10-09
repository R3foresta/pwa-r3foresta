import { Link } from 'react-router-dom'

function RecoverScreen() {
  return (
    <div className="flex flex-1 flex-col gap-6 rounded-2xl bg-white p-6 text-brand-700 shadow-soft">
      <h2 className="text-xl font-semibold">Acceso con passkey</h2>
      <p className="text-sm">Esta cuenta usa una passkey. Para entrar, usa el dispositivo donde la registraste.</p>
      <p className="text-sm">La recuperación de una passkey no está disponible en esta aplicación todavía.</p>
      <Link to="/auth/login" className="text-sm font-semibold underline">Volver a iniciar sesión</Link>
    </div>
  )
}

export default RecoverScreen
