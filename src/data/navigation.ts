import type { IconName } from '../components/Icon'
import type { NavItem, Screen } from '../types/navigation'

export const NAV_ITEMS: NavItem<IconName>[] = [
  { label: 'Inicio', icon: 'home', screen: 'home', path: '/app/home' },
  { label: 'Recolección', icon: 'leaf', screen: 'collections', path: '/app/collections' },
  {
    label: 'Germinación',
    icon: 'germination',
    screen: 'germination',
    path: '/app/germination',
  },
  { label: 'Escanear', icon: 'scan', screen: 'scan', path: '/app/scan' },
  { label: 'Reporte', icon: 'report', screen: 'report', path: '/app/report' },
  { label: 'Perfil', icon: 'user', screen: 'profile', path: '/app/profile' },
]

export const SCREEN_TITLE: Record<Screen, string> = {
  home: 'Inicio',
  collections: 'Recolecciones',
  collectionDetail: 'Recolección',
  collectionForm: 'Nueva recolección',
  collectionFormStep2: 'Nueva recolección - Ubicación',
  collectionFormStep3: 'Nueva recolección - Resumen',
  germination: 'Germinación',
  scan: 'Escanear',
  report: 'Reporte',
  profile: 'Perfil',
  planting: 'Plantación',
  co2: 'CO₂',
}
