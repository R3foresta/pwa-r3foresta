import type { IconName } from '../components/Icon'
import type { NavItem, Screen } from '../types/navigation'

export const NAV_ITEMS: NavItem<IconName>[] = [
  { label: 'Inicio', icon: 'home', screen: 'home', path: '/app/home' },
  { label: 'Recolección', icon: 'leaf', screen: 'collections', path: '/app/collections' },
  {
    label: 'Germinación',
    icon: 'vivero',
    screen: 'vivero',
    path: '/app/vivero',
  },
  { label: 'Plantación', icon: 'planting', screen: 'planting', path: '/app/planting' },
  { label: 'Mapa', icon: 'map', screen: 'report', path: '/app/report' },
]

export const PARTICIPANT_NAV_ITEMS: NavItem<IconName>[] = [
  { label: 'Inicio', icon: 'home', screen: 'home', path: '/' },
  { label: 'Impacto', icon: 'map', screen: 'impacto', path: '/impacto' },
  { label: 'Mis registros', icon: 'leaf', screen: 'misRegistros', path: '/app/participacion/mis-registros' },
  { label: 'Mi perfil', icon: 'user', screen: 'profile', path: '/app/profile' },
]

export const SCREEN_TITLE: Record<Screen, string> = {
  home: 'Inicio',
  collections: 'Recolecciones',
  collectionDetail: 'Recolección',
  collectionForm: 'Nueva recolección',
  collectionFormStep2: 'Nueva recolección - Ubicación',
  collectionFormStep3: 'Nueva recolección - Resumen',
  vivero: 'Germinación',
  scan: 'Escanear',
  report: 'Reporte',
  profile: 'Perfil',
  planting: 'Plantación',
  co2: 'CO₂',
  impacto: 'Impacto público',
  misRegistros: 'Mis registros',
}
