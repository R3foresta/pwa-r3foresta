import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import type { LatLngTuple } from 'leaflet'
import { MapContainer, Polygon, TileLayer, useMap } from 'react-leaflet'
import { useNavigate, useParams } from 'react-router-dom'
import plantacionHero from '../../../assets/home/plantacion.jpg'
import Icon from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import {
  TIPO_CAMPANIA_LABEL,
  type EquipoMember,
  type EstadoSubcampania,
  type GeoJsonPolygon,
  type Subcampania,
} from '../types/contracts'
import { formatDate, toLatLngTuple } from '../utils/subcampaniaFormatters'
import { UserAvatar } from '../components/UserAvatar'

type DetailTab = 'resumen' | 'equipo' | 'mapa'

function getPolygonPositions(poligono: GeoJsonPolygon | null | undefined): LatLngTuple[] {
  return (poligono?.coordinates[0] ?? []).map(toLatLngTuple)
}

// ─────────────────────────────────────────────────────────────────────────────
// Small visual pieces
// ─────────────────────────────────────────────────────────────────────────────

function StateBadgeLight({ estado }: { estado: EstadoSubcampania }) {
  const map: Record<EstadoSubcampania, string> = {
    BORRADOR: 'bg-amber-400/20 text-amber-100 ring-amber-300/40',
    ACTIVA: 'bg-emerald-400/20 text-emerald-100 ring-emerald-300/40',
    COMPLETADA: 'bg-white/15 text-white ring-white/20',
    FINALIZADA_PARCIAL: 'bg-white/15 text-white ring-white/20',
    PAUSADA: 'bg-orange-400/20 text-orange-100 ring-orange-300/40',
    CANCELADA: 'bg-red-400/20 text-red-100 ring-red-300/40',
  }

  const tone = map[estado] ?? map.COMPLETADA

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ring-1 ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {estado.replace(/_/g, ' ')}
    </span>
  )
}

function RolBadge({ rol }: { rol: EquipoMember['rol'] }) {
  if (rol === 'COORDINADOR') {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-100">
        Coordinador
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-600 ring-1 ring-brand-100">
      Operario
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

function SubcampanaHeader({
  sub,
  onBack,
}: {
  sub: Subcampania
  onBack: () => void
}) {
  const tipoLabel = sub.tipo ? TIPO_CAMPANIA_LABEL[sub.tipo] : null

  return (
    <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
      <img
        src={plantacionHero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-brand-700/95" />
      <div className="relative px-5 pb-6 pt-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
            aria-label="Volver"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <StateBadgeLight estado={sub.estado} />
        </div>

        {sub.codigo_trazabilidad && (
          <p className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/85">
            {sub.codigo_trazabilidad}
          </p>
        )}
        <h1 className="mt-0.5 text-[26px] font-extrabold leading-[1.1] tracking-tight">
          {sub.nombre}
        </h1>

        {tipoLabel && (
          <span className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-white ring-1 ring-white/20">
            {tipoLabel}
          </span>
        )}

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-bold text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="date" className="h-3.5 w-3.5" />
            {formatDate(sub.fecha_estimada_inicio)} &rarr; {formatDate(sub.fecha_estimada_fin)}
          </span>
        </p>

        <div className="mt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">
            Meta total
          </p>
          <p className="mt-0.5 text-[40px] font-extrabold leading-none tracking-tight tabular-nums">
            {sub.meta_total_arboles.toLocaleString('es-BO')}
            <span className="ml-1.5 text-base font-extrabold text-white/65">árboles</span>
          </p>
        </div>
      </div>
    </header>
  )
}

function LoadingHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
      <img
        src={plantacionHero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-700/85 via-brand-700/85 to-brand-700" />
      <div className="relative px-5 pb-6 pt-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
          Subcampaña
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight">Cargando...</h1>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────────────────────────

const DETAIL_TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'equipo', label: 'Equipo' },
  { key: 'mapa', label: 'Mapa' },
  // TODO(asignaciones): agregar tab "Asignaciones" cuando exista endpoint de
  // asignaciones de lotes desde esta pantalla. La key sería 'asignaciones'.
]

function DetailTabs({
  active,
  onChange,
}: {
  active: DetailTab
  onChange: (tab: DetailTab) => void
}) {
  return (
    <div className="sticky top-0 z-20 -mx-5 bg-[#eef2ed]/95 px-5 pb-2 pt-3 backdrop-blur-sm">
      <div className="flex rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
        {DETAIL_TABS.map((tab) => {
          const selected = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex-1 rounded-full px-3 py-2 text-[12px] font-extrabold tracking-wide transition ${
                selected
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'text-brand-700 hover:bg-brand-50'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Resumen
// ─────────────────────────────────────────────────────────────────────────────

function BorradorActivationBanner({
  sub,
  equipo,
  campania_id,
}: {
  sub: Subcampania
  equipo: EquipoMember[]
  campania_id: number
}) {
  const navigate = useNavigate()

  const hasCoordinador = equipo.some((m) => m.rol === 'COORDINADOR')
  const hasPoligono = !!sub.poligono
  const hasMeta = sub.meta_total_arboles >= 1

  const precondiciones = [
    { label: 'Polígono definido', ok: hasPoligono },
    { label: 'Coordinador asignado', ok: hasCoordinador },
    { label: `Meta de árboles ≥ 1 (${sub.meta_total_arboles.toLocaleString('es-BO')})`, ok: hasMeta },
    { label: 'Reservas de vivero suficientes', ok: null }, // no verificable desde aquí
  ]

  const goToContinueWizard = () => {
    navigate(
      `/app/planting/campanias/${campania_id}/subcampanias/new?subcampaniaId=${sub.id}&step=5`,
    )
  }

  return (
    <section className="space-y-3">
      <div className="rounded-3xl bg-amber-50 p-4 shadow-soft ring-1 ring-amber-100">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <Icon name="info" className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700">
              Estado
            </p>
            <p className="mt-0.5 text-[15px] font-extrabold leading-tight text-amber-950">
              Esta subcampaña está en BORRADOR
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-amber-900">
              Completa los requisitos antes de activarla.
            </p>
          </div>
        </div>

        <ul className="mt-3 space-y-1.5">
          {precondiciones.map((p) => (
            <li key={p.label} className="flex items-center gap-2">
              {p.ok === true && (
                <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              )}
              {p.ok === false && (
                <Icon name="x" className="h-3.5 w-3.5 shrink-0 text-red-500" />
              )}
              {p.ok === null && (
                <span className="h-3.5 w-3.5 shrink-0 text-center text-[11px] font-extrabold leading-none text-slate-400">
                  —
                </span>
              )}
              <span
                className={`text-[11.5px] font-bold leading-snug ${
                  p.ok === true
                    ? 'text-emerald-800'
                    : p.ok === false
                      ? 'text-red-800'
                      : 'text-slate-500'
                }`}
              >
                {p.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={goToContinueWizard}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99]"
      >
        <Icon name="chevron-right" className="h-4 w-4" />
        Continuar configurando
      </button>
    </section>
  )
}

function ResumenTab({
  sub,
  equipo,
  onTabMapa,
}: {
  sub: Subcampania
  equipo: EquipoMember[]
  onTabMapa: () => void
}) {
  const coordinador = equipo.find((m) => m.rol === 'COORDINADOR')
  const isBorrador = sub.estado === 'BORRADOR'

  return (
    <div className="space-y-3">
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1 rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            Meta total
          </p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-brand-800">
            {sub.meta_total_arboles.toLocaleString('es-BO')}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-500">árboles</p>
        </div>

        <div className="col-span-1 rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            Saldo vivo
          </p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-brand-800">
            {sub.saldo_vivo_actual != null
              ? sub.saldo_vivo_actual.toLocaleString('es-BO')
              : '—'}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-500">plantas</p>
        </div>

        <div className="col-span-1 rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            Equipo
          </p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-brand-800">
            {equipo.length}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-500">
            {equipo.length === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>
      </div>

      {/* Card información */}
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Información
        </p>
        <div className="mt-2 space-y-2">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Nombre
            </p>
            <p className="mt-0.5 text-sm font-extrabold text-brand-800">{sub.nombre}</p>
          </div>

          {sub.codigo_trazabilidad && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Código de trazabilidad
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold text-brand-700">
                {sub.codigo_trazabilidad}
              </p>
            </div>
          )}

          {sub.tipo && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Tipo
              </p>
              <p className="mt-0.5 text-sm font-bold text-brand-700">
                {TIPO_CAMPANIA_LABEL[sub.tipo]}
              </p>
            </div>
          )}

          {sub.descripcion && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Descripción
              </p>
              <p className="mt-0.5 text-[12.5px] font-semibold leading-relaxed text-slate-700">
                {sub.descripcion}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Card calendario */}
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <div className="flex items-center gap-2">
          <Icon name="date" className="h-4 w-4 text-brand-500" />
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Calendario
          </p>
        </div>
        <p className="mt-2 text-sm font-bold text-brand-800">
          {formatDate(sub.fecha_estimada_inicio)}
          <span className="mx-2 text-slate-400">&rarr;</span>
          {formatDate(sub.fecha_estimada_fin)}
        </p>
      </section>

      {/* Card coordinador */}
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Coordinador
        </p>
        {coordinador ? (
          <div className="mt-2 flex items-center gap-3">
            <UserAvatar
              nombre={coordinador.nombre_usuario ?? 'C'}
              fotoUrl={coordinador.foto_perfil_url}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-700"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-brand-800">
                {coordinador.nombre_usuario ?? `Usuario #${coordinador.usuario_id}`}
              </p>
              <p className="text-[10.5px] font-bold text-slate-500">
                {coordinador.agregado_at
                  ? `Desde ${formatDate(coordinador.agregado_at.slice(0, 10))}`
                  : 'Coordinador'}
              </p>
            </div>
          </div>
        ) : (
          isBorrador && (
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-100">
              <Icon name="info" className="h-4 w-4 shrink-0 text-amber-700" />
              <p className="text-[11.5px] font-bold leading-snug text-amber-900">
                Sin coordinador asignado
              </p>
            </div>
          )
        )}
        {!coordinador && !isBorrador && (
          <p className="mt-2 text-[12.5px] font-semibold text-slate-500">
            Sin coordinador registrado.
          </p>
        )}
      </section>

      {/* Mapa mini: botón que lleva al tab mapa */}
      {sub.poligono && (
        <button
          type="button"
          onClick={onTabMapa}
          className="block w-full rounded-3xl bg-white p-4 text-left shadow-soft ring-1 ring-black/5 transition hover:ring-brand-300"
        >
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Zona delimitada
          </p>
          <div className="mt-2 flex items-center gap-2 text-[12px] font-bold text-brand-700">
            <Icon name="map" className="h-4 w-4 text-emerald-600" />
            Polígono definido · ver en mapa
            <Icon name="chevron-right" className="ml-auto h-4 w-4 text-slate-400" />
          </div>
        </button>
      )}

      {/* Banner BORRADOR con precondiciones de activación */}
      {isBorrador && (
        <BorradorActivationBanner
          sub={sub}
          equipo={equipo}
          campania_id={sub.campania_id}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Equipo
// ─────────────────────────────────────────────────────────────────────────────

function EquipoTab({
  sub,
  equipo,
}: {
  sub: Subcampania
  equipo: EquipoMember[]
}) {
  const navigate = useNavigate()
  const isBorrador = sub.estado === 'BORRADOR'

  const goToEditEquipo = () => {
    navigate(
      `/app/planting/campanias/${sub.campania_id}/subcampanias/new?subcampaniaId=${sub.id}&step=4`,
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          {equipo.length} {equipo.length === 1 ? 'miembro' : 'miembros'}
        </p>
      </div>

      {equipo.length === 0 ? (
        <section className="rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
            <Icon name="user" className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-extrabold text-brand-800">Sin miembros asignados</p>
          <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-slate-500">
            Asigna al menos un coordinador para poder activar la subcampaña.
          </p>
        </section>
      ) : (
        <ul className="space-y-2">
          {equipo.map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5"
            >
              <UserAvatar
                nombre={member.nombre_usuario ?? 'U'}
                fotoUrl={member.foto_perfil_url}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-700"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-extrabold leading-tight text-brand-800">
                    {member.nombre_usuario ?? `Usuario #${member.usuario_id}`}
                  </p>
                  <RolBadge rol={member.rol} />
                </div>
                {member.agregado_at && (
                  <p className="mt-0.5 text-[10.5px] font-bold text-slate-500">
                    Desde {formatDate(member.agregado_at.slice(0, 10))}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isBorrador && (
        <button
          type="button"
          onClick={goToEditEquipo}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 active:scale-[0.99]"
        >
          <Icon name="user" className="h-4 w-4" />
          Editar equipo
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Mapa
// ─────────────────────────────────────────────────────────────────────────────

function MapFitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (positions.length > 0 && !fitted.current) {
      fitted.current = true
      map.fitBounds(L.latLngBounds(positions), { maxZoom: 17, padding: [24, 24] })
    }
  }, [map, positions])

  return null
}

function MapaTab({
  sub,
  campania_id,
}: {
  sub: Subcampania
  campania_id: number
}) {
  const navigate = useNavigate()

  const polygonPositions = useMemo(
    () => getPolygonPositions(sub.poligono),
    [sub.poligono],
  )

  const isBorrador = sub.estado === 'BORRADOR'

  if (!sub.poligono || polygonPositions.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
          <Icon name="map" className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-extrabold text-brand-800">Sin zona delimitada</p>
        <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-slate-500">
          El polígono de la subcampaña no ha sido definido todavía.
        </p>
        {isBorrador && (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/app/planting/campanias/${campania_id}/subcampanias/new?subcampaniaId=${sub.id}&step=3`,
              )
            }
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-brand-700"
          >
            <Icon name="map" className="h-4 w-4" />
            Definir zona
          </button>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-3">
      <div
        className="overflow-hidden rounded-3xl bg-slate-100 shadow-soft ring-1 ring-black/5"
        style={{ height: '60vh', minHeight: 320 }}
      >
        <MapContainer
          center={polygonPositions[0] ?? [-16.5, -68.15]}
          zoom={14}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapFitBounds positions={polygonPositions} />
          <Polygon
            positions={polygonPositions}
            pathOptions={{
              color: '#166534',
              fillColor: '#22c55e',
              fillOpacity: 0.25,
              weight: 3,
            }}
          />
        </MapContainer>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white p-3 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            Vértices
          </p>
          <p className="mt-1 text-sm font-extrabold text-brand-800 tabular-nums">
            {sub.poligono.coordinates[0].length - 1}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            Meta
          </p>
          <p className="mt-1 text-sm font-extrabold text-brand-800 tabular-nums">
            {sub.meta_total_arboles.toLocaleString('es-BO')}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

function DetalleSubcampanaScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subcampaniaId } = useParams<{ subcampaniaId: string }>()

  const numericId = Number(subcampaniaId)
  const hasValidId = Number.isFinite(numericId) && numericId > 0

  const [sub, setSub] = useState<Subcampania | null>(null)
  const [equipo, setEquipo] = useState<EquipoMember[]>([])
  const [loading, setLoading] = useState(hasValidId)
  const [error, setError] = useState<string | null>(
    hasValidId ? null : 'ID de subcampaña inválido.',
  )
  const [activeTab, setActiveTab] = useState<DetailTab>('resumen')

  const authId = user?.auth_id
  const requestRef = useRef(0)

  const fetchSubcampaniaData = useCallback(async (requestId: number) => {
    try {
      const [subData, equipoData] = await Promise.all([
        PlantacionService.getSubcampania(numericId, authId),
        PlantacionService.getSubcampaniaEquipo(numericId, authId),
      ])

      if (requestId !== requestRef.current) return

      setSub(subData)
      setEquipo(equipoData)
      setError(null)
    } catch (fetchError) {
      if (requestId !== requestRef.current) return

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar la subcampaña.',
      )
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [numericId, authId])

  useEffect(() => {
    if (!hasValidId) return

    const requestId = ++requestRef.current

    setLoading(true)
    setError(null)
    void fetchSubcampaniaData(requestId)
  }, [hasValidId, numericId, authId, fetchSubcampaniaData])

  const goBack = () => {
    if (sub) {
      navigate(`/app/planting/campanias/${sub.campania_id}`)
    } else {
      navigate('/app/planting')
    }
  }

  const handleRetry = () => {
    if (!hasValidId) return
    const requestId = ++requestRef.current

    setLoading(true)
    setError(null)
    void fetchSubcampaniaData(requestId)
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        {sub && !loading ? (
          <SubcampanaHeader sub={sub} onBack={goBack} />
        ) : (
          <LoadingHeader onBack={goBack} />
        )}

        <main className="space-y-4 px-5 pt-2">
          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
              Cargando subcampaña...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl bg-red-50 px-4 py-6 text-center shadow-soft ring-1 ring-red-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Icon name="info" className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-extrabold text-red-700">
                No se pudo cargar la subcampaña
              </p>
              <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-red-600">
                {error}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  Volver
                </button>
                {hasValidId && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="rounded-xl bg-red-100 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && !error && sub && (
            <>
              <DetailTabs active={activeTab} onChange={setActiveTab} />

              {activeTab === 'resumen' && (
                <ResumenTab
                  sub={sub}
                  equipo={equipo}
                  onTabMapa={() => setActiveTab('mapa')}
                />
              )}

              {activeTab === 'equipo' && (
                <EquipoTab sub={sub} equipo={equipo} />
              )}

              {activeTab === 'mapa' && (
                <MapaTab sub={sub} campania_id={sub.campania_id} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default DetalleSubcampanaScreen
