import { useState } from 'react'
import Icon, { type IconName } from '../../../../components/Icon'

type Props = {
  latitud: string
  longitud: string
  precisionM: number | null
  loading: boolean
  error: string | null
  precisionAdvertenciaM: number
  hasCoords: boolean
  coordsInRange: boolean
  dentroDePoligono: boolean | null
  showValidation: boolean
  onCapture: () => void
  onChangeLatitud: (value: string) => void
  onChangeLongitud: (value: string) => void
}

type GpsStatus = 'buscando' | 'capturado' | 'baja' | 'error' | 'pendiente'

type StatusMeta = {
  tone: string
  iconTone: string
  icon: IconName
  label: string
  detail: string
}

/**
 * Tarjeta de estado GPS del paso 1: buscando / capturado / baja precisión /
 * error / pendiente, con captura automática o reintento y edición manual
 * plegada. Presentacional pura: el estado vive en la pantalla.
 */
function GpsStatusCard({
  latitud,
  longitud,
  precisionM,
  loading,
  error,
  precisionAdvertenciaM,
  hasCoords,
  coordsInRange,
  dentroDePoligono,
  showValidation,
  onCapture,
  onChangeLatitud,
  onChangeLongitud,
}: Props) {
  const [manualOpen, setManualOpen] = useState(false)

  const precisionBaja = precisionM !== null && precisionM > precisionAdvertenciaM

  const status: GpsStatus = loading
    ? 'buscando'
    : error
      ? 'error'
      : hasCoords && coordsInRange && precisionBaja
        ? 'baja'
        : hasCoords && coordsInRange
          ? 'capturado'
          : 'pendiente'

  // Si la validación marca coordenadas inválidas, mantener abierta la edición
  // manual para que el error sea corregible sin buscar el control.
  const coordsInvalidas = showValidation && hasCoords && !coordsInRange
  const manualVisible = manualOpen || coordsInvalidas

  const meta: StatusMeta = ({
    buscando: {
      tone: 'bg-amber-50 ring-amber-200 text-amber-800',
      iconTone: 'bg-white/70 text-amber-600',
      icon: 'crosshair',
      label: 'Buscando señal GPS…',
      detail: 'Mantente en un punto con cielo abierto.',
    },
    capturado: {
      tone: 'bg-success-50 ring-success-200 text-success-800',
      iconTone: 'bg-white/70 text-success-600',
      icon: 'check-circle',
      label: 'GPS capturado',
      detail:
        precisionM !== null
          ? `Precisión aproximada ±${precisionM} m`
          : 'Coordenadas ingresadas manualmente.',
    },
    baja: {
      tone: 'bg-amber-50 ring-amber-200 text-amber-800',
      iconTone: 'bg-white/70 text-amber-600',
      icon: 'alert',
      label: `Precisión baja (±${precisionM} m)`,
      detail: `Supera los ${precisionAdvertenciaM} m recomendados. Reintenta a cielo abierto; puedes continuar igual.`,
    },
    error: {
      tone: 'bg-red-50 ring-red-200 text-red-700',
      iconTone: 'bg-white/70 text-red-500',
      icon: 'alert',
      label: 'Sin señal GPS',
      detail: error ?? 'No se pudo obtener tu ubicación.',
    },
    pendiente: {
      tone: 'bg-neutral-50 ring-neutral-200 text-neutral-600',
      iconTone: 'bg-white text-neutral-400',
      icon: 'pin',
      label: 'Sin ubicación todavía',
      detail: 'Captura tu posición para registrar el punto de plantación.',
    },
  } satisfies Record<GpsStatus, StatusMeta>)[status]

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Ubicación GPS
        </p>
        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
          Obligatorio
        </span>
      </div>

      <div
        className={`mt-3 flex items-center gap-3 rounded-2xl px-3 py-3 ring-1 ${meta.tone}`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.iconTone}`}
        >
          <Icon
            name={meta.icon}
            className={`h-5 w-5 ${status === 'buscando' ? 'animate-pulse' : ''}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold leading-tight">{meta.label}</p>
          <p className="text-[11px] font-semibold leading-snug opacity-80">
            {meta.detail}
          </p>
        </div>
        {status !== 'buscando' && (
          <button
            type="button"
            onClick={onCapture}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-extrabold shadow-sm transition hover:bg-white"
          >
            <Icon name="refresh" className="h-3.5 w-3.5" />
            {status === 'pendiente' ? 'Capturar' : 'Reintentar'}
          </button>
        )}
      </div>

      {hasCoords && coordsInRange && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-extrabold tabular-nums text-brand-700">
          <Icon name="crosshair" className="h-3.5 w-3.5" />
          {Number(latitud).toFixed(6)}, {Number(longitud).toFixed(6)}
        </div>
      )}

      {dentroDePoligono === false && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3">
          <Icon name="map" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs font-bold leading-snug text-amber-700">
            El punto parece estar fuera del polígono de la subcampaña. No se
            bloquea el registro: el servidor lo evaluará y guardará la
            advertencia.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setManualOpen((prev) => !prev)}
        className="mt-3 flex w-full items-center justify-between rounded-xl px-1 py-1 text-left text-xs font-extrabold text-brand-500 transition hover:text-brand-700"
      >
        Editar coordenadas manualmente
        <Icon
          name="chevron-down"
          className={`h-4 w-4 transition-transform ${manualVisible ? 'rotate-180' : ''}`}
        />
      </button>

      {manualVisible && (
        <div className="mt-2 flex gap-3">
          {(
            [
              { label: 'Latitud', value: latitud, onChange: onChangeLatitud, placeholder: '-16.500000' },
              { label: 'Longitud', value: longitud, onChange: onChangeLongitud, placeholder: '-68.150000' },
            ] as const
          ).map((field) => (
            <div key={field.label} className="flex-1 space-y-1">
              <p className="text-xs font-semibold text-brand-600">{field.label}</p>
              <input
                type="text"
                inputMode="decimal"
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                placeholder={field.placeholder}
                className={`w-full rounded-2xl border px-3 py-2.5 text-sm font-semibold tabular-nums text-neutral-700 shadow-soft outline-none transition focus:ring-2 ${
                  showValidation && !coordsInRange
                    ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                    : 'border-neutral-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                }`}
              />
            </div>
          ))}
        </div>
      )}

      {showValidation && !hasCoords && (
        <p className="mt-2 text-xs font-semibold text-red-500">
          * La ubicación GPS es obligatoria para continuar.
        </p>
      )}
      {showValidation && hasCoords && !coordsInRange && (
        <p className="mt-2 text-xs font-semibold text-red-500">
          * Coordenadas fuera de rango: latitud entre -90 y 90, longitud entre
          -180 y 180.
        </p>
      )}
    </section>
  )
}

export default GpsStatusCard
