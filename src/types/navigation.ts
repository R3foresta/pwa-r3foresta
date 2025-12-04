export type Screen =
  | 'home'
  | 'collections'
  | 'collectionDetail'
  | 'collectionForm'
  | 'collectionFormStep2'
  | 'collectionFormStep3'
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
