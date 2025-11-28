export type Screen =
  | 'home'
  | 'collections'
  | 'collectionForm'
  | 'map'
  | 'scan'
  | 'report'
  | 'profile'
  | 'nursery'
  | 'planting'
  | 'co2'

export type NavItem<IconKey = string> = {
  label: string
  icon: IconKey
  screen: Screen
}
