import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { PlantacionService } from '../../../services/plantacion.service'
import {
  TIPO_CAMPANIA_LABEL,
  type Campania,
} from '../types/contracts'

type LocationState = {
  campania?: Campania
}

function CrearSubcampanaPlaceholderScreen() {
  const navigate = useNavigate()
  const { campaniaId } = useParams()
  const location = useLocation()
  const state = location.state as LocationState | null
  const numericCampaniaId = Number(campaniaId)
  const hasValidCampaniaId = Number.isFinite(numericCampaniaId) && numericCampaniaId > 0
  const [campania, setCampania] = useState<Campania | null>(state?.campania ?? null)
  const [loading, setLoading] = useState(!state?.campania && hasValidCampaniaId)
  const [error, setError] = useState<string | null>(null)
  const visibleError = error ?? (!hasValidCampaniaId ? 'ID de campaña inválido.' : null)

  useEffect(() => {
    if (state?.campania) return
    if (!hasValidCampaniaId) return

    PlantacionService.getCampania(numericCampaniaId)
      .then((data) => {
        setCampania(data)
        setError(null)
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la campaña.')
      })
      .finally(() => setLoading(false))
  }, [hasValidCampaniaId, numericCampaniaId, state?.campania])

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-700 via-brand-700 to-brand-600" />
          <div className="relative px-5 pb-6 pt-6">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/app/planting')}
                aria-label="Volver"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              >
                <Icon name="arrow-left" className="h-5 w-5" />
              </button>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] ring-1 ring-white/25">
                Siguiente flujo
              </span>
            </div>
            <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
              Sub-campaña
            </p>
            <h1 className="mt-1 text-[28px] font-extrabold leading-tight">
              Configuración operativa
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/80">
              Aquí continuará la creación de zona, meta, coordinador, equipo y asignaciones.
            </p>
          </div>
        </header>

        <main className="space-y-4 px-5 pt-4">
          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
              Cargando campaña...
            </div>
          )}

          {visibleError && !loading && (
            <div className="rounded-3xl bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200">
              {visibleError}
            </div>
          )}

          {campania && !loading && (
            <>
              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <Icon name="planting" className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-700 ring-1 ring-brand-100">
                      {TIPO_CAMPANIA_LABEL[campania.tipo]}
                    </span>
                    <h2 className="mt-2 text-xl font-extrabold leading-tight text-brand-800">
                      {campania.nombre}
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {campania.codigo_trazabilidad}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <p className="text-sm font-extrabold text-brand-800">
                  Pendiente de implementar
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  La campaña ya existe. El siguiente paso será implementar el wizard de
                  sub-campaña con los contratos de zona, coordinador, meta, equipo y lotes.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-[#f8fbf7] px-3 py-2.5 ring-1 ring-brand-100">
                    <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
                      Estado
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-brand-800">
                      Campaña creada
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f8fbf7] px-3 py-2.5 ring-1 ring-brand-100">
                    <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
                      Próximo módulo
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-brand-800">
                      Sub-campañas
                    </p>
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={() => navigate('/app/planting')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-700"
              >
                Volver al dashboard
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default CrearSubcampanaPlaceholderScreen
