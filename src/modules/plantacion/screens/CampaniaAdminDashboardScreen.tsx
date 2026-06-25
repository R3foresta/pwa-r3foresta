import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import plantacionHero from '../../../assets/home/plantacion.jpg'
import Icon from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import {
  TIPO_CAMPANIA_LABEL,
  type Campania,
  type Organizacion,
} from '../types/contracts'
import {
  createSubcampaniaDraftId,
  loadSubcampaniaBaseDrafts,
  type SubcampaniaBaseDraft,
} from '../utils/subcampaniaDraft'

type LocationState = {
  campania?: Campania
}

type DashboardTab = 'resumen' | 'equipo' | 'lotes' | 'mapa'

const DASHBOARD_TABS: Array<{ key: DashboardTab; label: string }> = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'equipo', label: 'Equipo' },
  { key: 'lotes', label: 'Lotes' },
  { key: 'mapa', label: 'Mapa' },
]

function formatDate(value?: string | null): string {
  if (!value) return 'Sin fecha'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatNumber(value?: number | null): string {
  if (!Number.isFinite(value)) return 'Pendiente'
  return Number(value).toLocaleString('es-BO')
}

function getOrganizationInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getSubcampaniaCount(campania: Campania): number {
  return Math.max(0, campania.count_subcampanias ?? 0)
}

function getActiveSubcampaniaCount(campania: Campania): number {
  const activeCount = campania.subcampanias_activas_count ?? campania.activas_count ?? 0
  return Math.max(0, Number.isFinite(activeCount) ? Number(activeCount) : 0)
}

function getVisibleStatus(campania: Campania): string {
  const subcampaniaCount = getSubcampaniaCount(campania)
  if (subcampaniaCount === 0) return 'Creada'
  return campania.estado_derivado?.replace(/_/g, ' ') || 'Creada'
}

function getZoneLabel(campania: Campania): string {
  if (campania.zonas?.length) return campania.zonas.join(' · ')
  if (Number.isFinite(campania.zonas_count) && Number(campania.zonas_count) > 0) {
    const zonas = Number(campania.zonas_count)
    return `${zonas} zona${zonas === 1 ? '' : 's'}`
  }
  return 'Por definir en subcampañas'
}

function OrganizationInlineList({ organizations }: { organizations: Organizacion[] }) {
  if (organizations.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold text-white ring-1 ring-white/20">
        <Icon name="shield" className="h-3 w-3" />
        Sin organizaciones visibles
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {organizations.map((organization) => (
        <span
          key={organization.id}
          className="inline-flex max-w-full items-center gap-2 rounded-2xl bg-white/10 px-2.5 py-2 text-[11px] font-extrabold text-white ring-1 ring-white/15"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-[8.5px] font-extrabold text-white ring-1 ring-white/25">
            {organization.logo_url ? (
              <img src={organization.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              getOrganizationInitials(organization.nombre)
            )}
          </span>
          <span className="truncate">{organization.nombre}</span>
        </span>
      ))}
    </div>
  )
}

function StateBadge({ label, light = false }: { label: string; light?: boolean }) {
  const normalized = label.toUpperCase()
  const tone =
    normalized === 'CREADA'
      ? light
        ? 'bg-white text-brand-700 ring-white'
        : 'bg-brand-50 text-brand-700 ring-brand-100'
      : normalized.includes('ACTIVA')
        ? light
          ? 'bg-emerald-300/20 text-emerald-100 ring-emerald-200/40'
          : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
        : light
          ? 'bg-white/15 text-white ring-white/20'
          : 'bg-slate-50 text-slate-600 ring-slate-200'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ring-1 ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${normalized === 'CREADA' ? 'bg-brand-500' : 'bg-current'}`} />
      {label}
    </span>
  )
}

function Progress({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
      <div
        className="h-full rounded-full bg-emerald-300"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

function TipoSubBadge({ tipo }: { tipo: Campania['tipo'] }) {
  return (
    <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-700 ring-1 ring-brand-100">
      {TIPO_CAMPANIA_LABEL[tipo]}
    </span>
  )
}

function SubcampanaBadge({ estado }: { estado: 'BORRADOR' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-800 ring-1 ring-amber-100">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {estado}
    </span>
  )
}

function AddSubcampaniaButton({
  canCreate,
  onCreate,
  compact = false,
}: {
  canCreate: boolean
  onCreate: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onCreate}
      disabled={!canCreate}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl text-sm font-extrabold shadow-soft transition ${
        compact ? 'px-4 py-3' : 'px-4 py-3.5'
      } ${
        canCreate
          ? 'bg-brand-600 text-white hover:bg-brand-700'
          : 'cursor-not-allowed bg-slate-100 text-slate-500 ring-1 ring-slate-200'
      }`}
    >
      <Icon name="plus" className="h-5 w-5" />
      {canCreate ? 'Agregar nueva subcampaña' : 'Solo ADMIN puede agregar subcampañas'}
    </button>
  )
}

function DCTabs({
  active,
  onChange,
}: {
  active: DashboardTab
  onChange: (tab: DashboardTab) => void
}) {
  return (
    <div className="sticky top-0 z-20 -mx-5 bg-[#eef2ed]/95 px-5 pb-2 pt-3 backdrop-blur-sm">
      <div className="flex rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
        {DASHBOARD_TABS.map((tab) => {
          const selected = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex-1 rounded-full px-3 py-2 text-[12px] font-extrabold tracking-wide transition ${
                selected ? 'bg-brand-600 text-white shadow-soft' : 'text-brand-700 hover:bg-brand-50'
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

function getDraftMunicipio(draft: SubcampaniaBaseDraft): string {
  const comunidad = draft.comunidad
  if (!comunidad) return ''
  return (
    comunidad.nivel3?.nombre ||
    comunidad.nivel2?.nombre ||
    comunidad.nivel1?.nombre ||
    comunidad.nombre
  )
}

function getDraftActivationGuard(draft: SubcampaniaBaseDraft): {
  ok: boolean
  faltantes: string[]
} {
  const faltantes: string[] = []

  if (!draft.nombre.trim()) faltantes.push('Nombre')
  if (!draft.comunidad) faltantes.push('Zona')
  if (!draft.coordinador) faltantes.push('Coordinador')
  faltantes.push('Meta')
  if (!draft.poligono_geojson) faltantes.push('Polígono')
  faltantes.push('Reservas')

  return {
    ok: faltantes.length === 0,
    faltantes,
  }
}

function SubcampaniaDraftRow({
  draft,
  onTap,
}: {
  draft: SubcampaniaBaseDraft
  onTap: () => void
}) {
  const guard = getDraftActivationGuard(draft)
  const municipio = getDraftMunicipio(draft)
  const coordinador = draft.coordinador?.nombre ?? ''
  const coordinadorIniciales = coordinador ? getOrganizationInitials(coordinador) : ''
  const areaHectareas = draft.area_hectareas ?? draft.area_hectareas_estimada ?? null

  return (
    <button
      type="button"
      onClick={onTap}
      className="block w-full rounded-2xl bg-white p-3.5 text-left shadow-soft ring-1 ring-black/5 transition hover:ring-brand-300 active:scale-[0.995]"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <TipoSubBadge tipo={draft.tipo} />
            <SubcampanaBadge estado="BORRADOR" />
          </div>
          <p className="mt-1 truncate text-[14px] font-extrabold leading-tight text-brand-800">
            {draft.nombre}
          </p>
          {municipio && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-500">
              <Icon name="pin" className="h-3 w-3 text-slate-400" />
              {municipio}
            </p>
          )}
          {draft.poligono_geojson && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-emerald-700">
              <Icon name="map" className="h-3 w-3 text-emerald-600" />
              Polígono definido
              {Number.isFinite(areaHectareas)
                ? ` · ${Number(areaHectareas).toLocaleString('es-BO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} ha`
                : ''}
            </p>
          )}
        </div>
        <Icon name="chevron-right" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      </div>

      {guard.ok ? (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
          <Icon name="check" className="h-4 w-4 shrink-0 text-emerald-700" />
          <p className="flex-1 text-[11.5px] font-bold leading-snug text-emerald-900">
            Configuración completa · lista para activar.
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
            <Icon name="chevron-right" className="h-3 w-3" />
            Abrir
          </span>
        </div>
      ) : (
        <div className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-800">
            <Icon name="info" className="h-3.5 w-3.5" />
            Falta para activar
          </p>
          <p className="mt-0.5 text-[11.5px] font-bold leading-snug text-amber-900">
            {guard.faltantes.join(' · ')}
          </p>
        </div>
      )}

      {coordinador && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-extrabold text-brand-700">
            {coordinadorIniciales}
          </span>
          <p className="flex-1 truncate text-[11px] font-semibold text-slate-600">
            {coordinador}
          </p>
          <p className="whitespace-nowrap text-[10.5px] font-bold text-slate-400">
            {formatDate(draft.fecha_estimada_inicio)} - {formatDate(draft.fecha_estimada_fin)}
          </p>
        </div>
      )}
    </button>
  )
}

function PendingSetupNotice({
  canCreate,
  onCreate,
}: {
  canCreate: boolean
  onCreate: () => void
}) {
  return (
    <section className="rounded-3xl bg-amber-50 p-4 shadow-soft ring-1 ring-amber-100">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
          <Icon name="info" className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold leading-tight text-amber-950">
            Esta campaña necesita subcampañas
          </p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-amber-900">
            La zona, el avance, los borradores, equipo, lotes y estado operativo se
            calculan desde las subcampañas. Crea la primera para iniciar la configuración.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <AddSubcampaniaButton canCreate={canCreate} onCreate={onCreate} />
      </div>
    </section>
  )
}

function CampaniaHeader({
  campania,
  onBack,
}: {
  campania: Campania
  onBack: () => void
}) {
  const status = getVisibleStatus(campania)
  const progress = 0
  const activeCount = getActiveSubcampaniaCount(campania)
  const planted = campania.arboles_plantados
  const target = campania.meta_arboles

  return (
    <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
      <img src={plantacionHero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-brand-700/95" />
      <div className="relative px-5 pb-5 pt-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
            aria-label="Volver"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <StateBadge label={status} light />
        </div>

        <p className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/85">
          Campaña paraguas · {campania.codigo_trazabilidad}
        </p>
        <h1 className="mt-0.5 text-[26px] font-extrabold leading-[1.1] tracking-tight">
          {campania.nombre}
        </h1>

        <div className="mt-3">
          <OrganizationInlineList organizations={campania.organizaciones ?? []} />
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-bold text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="date" className="h-3.5 w-3.5" />
            {formatDate(campania.fecha_estimada_inicio)} - {formatDate(campania.fecha_estimada_fin)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="pin" className="h-3.5 w-3.5" />
            {getZoneLabel(campania)}
          </span>
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">
              Plantados agregados
            </p>
            <p className="mt-0.5 text-[38px] font-extrabold leading-none tracking-tight tabular-nums">
              {formatNumber(planted)}
              <span className="ml-1 text-base font-extrabold text-white/65">
                / {formatNumber(target)}
              </span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-bold text-white/70">Avance</p>
            <p className="text-2xl font-extrabold tabular-nums">
              {progress}%
            </p>
          </div>
        </div>
        <div className="mt-2">
          <Progress pct={progress} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide ring-1 ring-white/20">
            <Icon name="planting" className="h-3 w-3" />
            {getSubcampaniaCount(campania)} subcampañas
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide ring-1 ring-white/20">
            <Icon name="shield" className="h-3 w-3" />
            {activeCount} activas
          </span>
        </div>
      </div>
    </header>
  )
}

function SubcampaniasSection({
  campania,
  localDrafts,
  onDraftTap,
}: {
  campania: Campania
  localDrafts: SubcampaniaBaseDraft[]
  onDraftTap: (draft: SubcampaniaBaseDraft) => void
}) {
  const count = getSubcampaniaCount(campania)
  const visibleCount = count + localDrafts.length

  return (
    <section className="pt-1">
      <div className="flex items-baseline justify-between">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Subcampañas
        </p>
        <p className="text-[10.5px] font-bold text-slate-400">
          {visibleCount} visibles
        </p>
      </div>

      {localDrafts.length > 0 ? (
        <div className="mt-2 space-y-2">
          {localDrafts.map((draft) => (
            <SubcampaniaDraftRow
              key={draft.draft_id}
              draft={draft}
              onTap={() => onDraftTap(draft)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-2 rounded-3xl bg-white p-5 text-center shadow-soft ring-1 ring-black/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Icon name="planting" className="h-7 w-7" />
          </div>
          <p className="mt-3 text-base font-extrabold text-brand-800">
            {count === 0 ? 'Sin subcampañas todavía' : 'Subcampañas registradas'}
          </p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
            {count === 0
              ? 'Crea la primera subcampaña para definir zona, meta, coordinador, equipo y lotes.'
              : 'El listado operativo se conectará al endpoint de subcampañas de la campaña.'}
          </p>
        </div>
      )}
    </section>
  )
}

function PendingTabPanel({ tab }: { tab: DashboardTab }) {
  const titleByTab: Record<DashboardTab, string> = {
    resumen: 'Resumen',
    equipo: 'Equipo agregado',
    lotes: 'Lotes comprometidos',
    mapa: 'Cobertura geográfica',
  }

  const copyByTab: Record<DashboardTab, string> = {
    resumen: 'El resumen aparece en esta vista cuando existan subcampañas.',
    equipo: 'La asignación de responsables vive en cada subcampaña.',
    lotes: 'Los lotes se asignan a subcampañas individuales.',
    mapa: 'La zona se define por subcampaña y luego se agrega aquí.',
  }

  return (
    <section className="rounded-3xl bg-white p-5 text-center shadow-soft ring-1 ring-black/5">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-500">
        <Icon name={tab === 'mapa' ? 'map' : tab === 'lotes' ? 'package' : 'info'} className="h-6 w-6" />
      </div>
      <p className="mt-3 text-base font-extrabold text-brand-800">{titleByTab[tab]}</p>
      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
        {copyByTab[tab]}
      </p>
    </section>
  )
}

function LoadingHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
      <img src={plantacionHero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
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
          Dashboard de campaña
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight">
          Cargando campaña
        </h1>
      </div>
    </header>
  )
}

function CampaniaAdminDashboardScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { campaniaId } = useParams()
  const state = location.state as LocationState | null
  const numericCampaniaId = Number(campaniaId)
  const hasValidCampaniaId = Number.isFinite(numericCampaniaId) && numericCampaniaId > 0
  const [campania, setCampania] = useState<Campania | null>(state?.campania ?? null)
  const [loading, setLoading] = useState(!state?.campania && hasValidCampaniaId)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DashboardTab>('resumen')
  const [localDrafts] = useState<SubcampaniaBaseDraft[]>(() =>
    hasValidCampaniaId ? loadSubcampaniaBaseDrafts(numericCampaniaId) : [],
  )
  const canCreateSubcampania = (user?.rol ?? '').toUpperCase() === 'ADMIN'
  const visibleError = error ?? (!hasValidCampaniaId ? 'ID de campaña inválido.' : null)

  const loadCampania = () => {
    if (!hasValidCampaniaId) return

    setLoading(true)
    setError(null)
    PlantacionService.getCampania(numericCampaniaId)
      .then((data) => {
        setCampania(data)
        setError(null)
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la campaña.')
      })
      .finally(() => setLoading(false))
  }

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

  const goBack = () => navigate('/app/planting')

  const goToNewSubcampania = () => {
    if (!campania) return
    const draftId = createSubcampaniaDraftId()
    navigate(`/app/planting/campanias/${campania.id}/subcampanias/new?draftId=${encodeURIComponent(draftId)}&step=1`, {
      state: { campania, draftId },
    })
  }

  const goToDraftSubcampania = (draft: SubcampaniaBaseDraft) => {
    if (!campania) return
    navigate(`/app/planting/campanias/${campania.id}/subcampanias/new?draftId=${encodeURIComponent(draft.draft_id)}&step=1`, {
      state: { campania, draftId: draft.draft_id },
    })
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        {campania && !loading ? (
          <CampaniaHeader campania={campania} onBack={goBack} />
        ) : (
          <LoadingHeader onBack={goBack} />
        )}

        <main className="space-y-4 px-5 pt-2">
          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
              Cargando campaña...
            </div>
          )}

          {visibleError && !loading && (
            <div className="rounded-3xl bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200">
              <p>{visibleError}</p>
              {hasValidCampaniaId && (
                <button
                  type="button"
                  onClick={loadCampania}
                  className="mt-3 rounded-xl bg-red-100 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}

          {campania && !loading && !visibleError && (
            <>
              <DCTabs active={activeTab} onChange={setActiveTab} />

              {localDrafts.length === 0 && (
                <PendingSetupNotice
                  canCreate={canCreateSubcampania}
                  onCreate={goToNewSubcampania}
                />
              )}
              {localDrafts.length > 0 && (
                <AddSubcampaniaButton
                  canCreate={canCreateSubcampania}
                  onCreate={goToNewSubcampania}
                  compact
                />
              )}

              {activeTab === 'resumen' ? (
                <>
                  <SubcampaniasSection
                    campania={campania}
                    localDrafts={localDrafts}
                    onDraftTap={goToDraftSubcampania}
                  />
                </>
              ) : (
                <PendingTabPanel tab={activeTab} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default CampaniaAdminDashboardScreen
