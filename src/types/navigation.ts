export type Screen =
  | 'home'
  | 'collections'
  | 'collectionDetail'
  | 'collectionForm'
  | 'collectionFormStep2'
  | 'collectionFormStep3'
  | 'vivero'
  | 'scan'
  | 'report'
  | 'profile'
  | 'planting'
  | 'co2'
  | 'impacto'
  | 'misRegistros'

export type NavItem<IconKey = string> = {
  label: string
  icon: IconKey
  screen: Screen
  path: string
}
