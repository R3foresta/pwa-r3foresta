import type { IconName } from '../components/Icon'
import type { NavItem, Screen } from '../types/navigation'

export const NAV_ITEMS: NavItem<IconName>[] = [
  { label: 'Inicio', icon: 'home', screen: 'home' },
  { label: 'Recolección', icon: 'leaf', screen: 'collections' },
  { label: 'Mapa', icon: 'map', screen: 'map' },
  { label: 'Escanear', icon: 'scan', screen: 'scan' },
  { label: 'Reporte', icon: 'report', screen: 'report' },
  { label: 'Perfil', icon: 'user', screen: 'profile' },
]

export const SCREEN_TITLE: Record<Screen, string> = {
  home: 'Inicio',
  collections: 'Recolecciones',
  collectionDetail: 'Recolección',
  collectionForm: 'Nueva recolección',
  collectionFormStep2: 'Nueva recolección - Ubicación',
  collectionFormStep3: 'Nueva recolección - Resumen',
  map: 'Mapa',
  scan: 'Escanear',
  report: 'Reporte',
  profile: 'Perfil',
  nursery: 'Vivero',
  planting: 'Plantación',
  co2: 'CO₂',
}

export const NAV_ACTIVE_FOR: Record<Screen, Screen> = {
  home: 'home',
  collections: 'collections',
  collectionDetail: 'collections',
  collectionForm: 'collections',
  collectionFormStep2: 'collections',
  collectionFormStep3: 'collections',
  map: 'map',
  scan: 'scan',
  report: 'report',
  profile: 'profile',
  nursery: 'home',
  planting: 'home',
  co2: 'home',
}
