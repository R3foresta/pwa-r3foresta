import Icon from '../../../../components/Icon'
import type { RegistroPlantacionData } from '../../types/contracts'

type Props = {
  phase: 'guardando' | 'exito'
  nombreUsuario?: string
  subcampaniaNombre: string
  comprobante: RegistroPlantacionData | null
  codigoLotePorId: Map<number, string>
  onFinish: () => void
}

/**
 * Overlay a pantalla completa para el guardado y el comprobante final.
 * En fase "guardando" bloquea la interacción; en "exito" muestra código de
 * trazabilidad, total, estado GPS y consumos (plegados: son trazabilidad
 * técnica, no la tarea principal del operario).
 */
function SuccessOverlay({
  phase,
  nombreUsuario,
  subcampaniaNombre,
  comprobante,
  codigoLotePorId,
  onFinish,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-brand-700 via-brand-800 to-brand-900 text-white">
      <Icon
        name="trees"
        className="pointer-events-none fixed -bottom-10 -right-8 h-64 w-64 text-white/5"
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        {phase === 'guardando' ? (
          <>
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-white/15" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-success-300 border-t-transparent" />
              <Icon name="planting" className="h-9 w-9 text-success-200" />
            </div>
            <p className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
              Registrando…
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">
              Guardando tu plantación
            </p>
            <p className="mt-2 text-sm font-semibold text-white/80">
              Se están subiendo las fotos y consumiendo el stock asignado.
              <br />
              No cierres la app.
            </p>
          </>
        ) : (
          comprobante && (
            <>
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success-400/20 ring-4 ring-success-300/40">
                <Icon name="check-circle" className="h-12 w-12 text-success-200" />
              </div>
              <p className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-success-200">
                Plantación registrada
              </p>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight">
                {nombreUsuario ? `¡Bien hecho, ${nombreUsuario}!` : '¡Bien hecho!'}
              </h2>
              <p className="mt-2 max-w-[300px] text-sm font-semibold leading-relaxed text-white/85">
                <span className="font-extrabold text-white">
                  {comprobante.cantidad_total_plantada}
                </span>{' '}
                {comprobante.cantidad_total_plantada === 1 ? 'árbol agregado' : 'árboles agregados'}{' '}
                al registro de{' '}
                <span className="font-extrabold text-white">{subcampaniaNombre}</span>.
              </p>

              <div className="mt-5 w-full rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Código de trazabilidad
                </p>
                <p className="mt-0.5 break-all text-base font-extrabold tracking-wide text-success-200">
                  {comprobante.codigo_trazabilidad}
                </p>
              </div>

              <div className="mt-2 grid w-full grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/10 px-3 py-2.5 text-left ring-1 ring-white/15">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                    Registro
                  </p>
                  <p className="text-lg font-extrabold tabular-nums">
                    #{comprobante.registro_plantacion_id}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-2.5 text-left ring-1 ring-white/15">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                    Evidencias
                  </p>
                  <p className="text-lg font-extrabold tabular-nums">
                    {comprobante.evidencia_ids_vinculadas?.length ?? 0}
                  </p>
                </div>
              </div>

              <div
                className={`mt-2 flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 ring-1 ${
                  comprobante.gps_dentro_poligono === false
                    ? 'bg-warning-400/15 ring-warning-300/40'
                    : 'bg-success-400/15 ring-success-300/40'
                }`}
              >
                <Icon
                  name={comprobante.gps_dentro_poligono === false ? 'alert' : 'pin'}
                  className={`h-4 w-4 shrink-0 ${
                    comprobante.gps_dentro_poligono === false
                      ? 'text-warning-200'
                      : 'text-success-200'
                  }`}
                />
                <p className="text-left text-xs font-extrabold">
                  {comprobante.gps_dentro_poligono === false
                    ? `GPS fuera del polígono${
                        typeof comprobante.gps_distancia_a_poligono_m === 'number'
                          ? ` (~${Math.round(comprobante.gps_distancia_a_poligono_m)} m)`
                          : ''
                      } · guardado con advertencia`
                    : 'GPS dentro del polígono de la subcampaña'}
                </p>
              </div>

              {(comprobante.consumos?.length ?? 0) > 0 && (
                <details className="mt-2 w-full rounded-2xl bg-white/10 ring-1 ring-white/15">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white/80 [&::-webkit-details-marker]:hidden">
                    Consumos por asignación
                    <Icon name="chevron-down" className="h-4 w-4" />
                  </summary>
                  <div className="space-y-1.5 px-3 pb-3">
                    {comprobante.consumos?.map((consumo) => (
                      <div
                        key={consumo.asignacion_id}
                        className="rounded-xl bg-white/10 px-3 py-2 text-left text-xs font-semibold text-white/90"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="min-w-0 truncate">
                            {codigoLotePorId.get(consumo.lote_vivero_id) ||
                              `Lote #${consumo.lote_vivero_id}`}
                            {' · '}Asig. #{consumo.asignacion_id}
                          </span>
                          <span className="shrink-0 font-extrabold text-success-200">
                            −{consumo.cantidad_consumida}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60">
                          Saldo: {consumo.saldo_asignado_antes} →{' '}
                          {consumo.saldo_asignado_despues}
                          {consumo.estado_final === 'AGOTADA' ? ' · Agotada' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <button
                type="button"
                onClick={onFinish}
                className="mt-6 w-full rounded-2xl bg-white px-4 py-4 text-base font-extrabold text-brand-700 shadow-soft transition hover:bg-brand-50 active:scale-[0.99]"
              >
                Volver a la subcampaña
              </button>
            </>
          )
        )}
      </div>
    </div>
  )
}

export default SuccessOverlay
