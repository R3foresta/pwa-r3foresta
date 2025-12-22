export type Screen =
  | 'home'
  | 'collections'
  | 'collectionDetail'
  | 'collectionForm'
  | 'collectionFormStep2'
  | 'collectionFormStep3'
  | 'germination'
  | 'scan'
  | 'report'
  | 'profile'
  | 'planting'
  | 'co2'

export type NavItem<IconKey = string> = {
  label: string
  icon: IconKey
  screen: Screen
  path: string
}
