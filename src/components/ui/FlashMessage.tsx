import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type FlashState = {
  successMessage?: string
  errorMessage?: string
}

const DISMISS_AFTER_MS = 4000

type Captured = { kind: 'success' | 'error'; text: string } | null

function captureFromState(state: FlashState | null | undefined): Captured {
  if (!state) return null
  if (state.successMessage) return { kind: 'success', text: state.successMessage }
  if (state.errorMessage) return { kind: 'error', text: state.errorMessage }
  return null
}

function FlashMessage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState<Captured>(() =>
    captureFromState(location.state as FlashState | null),
  )

  useEffect(() => {
    if (!message) return
    navigate(location.pathname, { replace: true, state: null })
    const timer = setTimeout(() => setMessage(null), DISMISS_AFTER_MS)
    return () => clearTimeout(timer)
    // El mensaje se captura una sola vez al montar; no hay que reaccionar a cambios de ruta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!message) return null

  const isError = message.kind === 'error'
  return (
    <section
      role="status"
      className={`mb-4 rounded-2xl px-4 py-3 shadow-soft ring-1 ${
        isError ? 'bg-danger-50 ring-danger-200' : 'bg-success-50 ring-success-200'
      }`}
    >
      <p className={`text-sm font-semibold ${isError ? 'text-danger-700' : 'text-success-700'}`}>
        {message.text}
      </p>
    </section>
  )
}

export default FlashMessage
