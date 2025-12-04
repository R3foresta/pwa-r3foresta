import { useState } from 'react'
import BottomNav from './components/BottomNav'
import { SCREEN_TITLE } from './data/navigation'
import CollectionsScreen from './modules/collections/CollectionsScreen'
import CollectionDetailScreen from './modules/collections/CollectionDetailScreen'
import NewCollectionForm from './modules/collections/NewCollectionForm'
import LocationForm from './modules/collections/LocationForm'
import SummaryForm from './modules/collections/SummaryForm'
import HomeScreen from './modules/home/HomeScreen'
import PlaceholderScreen from './modules/PlaceholderScreen'
import { collectionRecords } from './modules/collections/data'
import type { Screen } from './types/navigation'

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)

  const content = (() => {
    switch (screen) {
      case 'home':
        return (
          <HomeScreen
            onOpenCollections={() => setScreen('collections')}
            onOpenPlaceholder={(target) => setScreen(target)}
          />
        )
      case 'collections':
        return (
          <CollectionsScreen
            onBack={() => setScreen('home')}
            onSelect={(id: string) => {
              setSelectedCollectionId(id)
              setScreen('collectionDetail')
            }}
            onCreate={() => setScreen('collectionForm')}
          />
        )
      case 'collectionDetail': {
        const record = collectionRecords.find((item) => item.id === selectedCollectionId)
        if (!record) return <PlaceholderScreen title="Recolección no encontrada" />
        return (
          <CollectionDetailScreen
            record={record}
            onBack={() => setScreen('collections')}
          />
        )
      }
      case 'collectionForm':
        return (
          <NewCollectionForm
            onBack={() => setScreen('collections')}
            onContinue={() => setScreen('collectionFormStep2')}
          />
        )
      case 'collectionFormStep2':
        return (
          <LocationForm
            onBack={() => setScreen('collectionForm')}
            onContinue={() => setScreen('collectionFormStep3')}
          />
        )
      case 'collectionFormStep3':
        return (
          <SummaryForm
            onBack={() => setScreen('collectionFormStep2')}
            onConfirm={() => {
              // Aquí iría la lógica para guardar en blockchain
              alert('Registro guardado exitosamente!')
              setScreen('collections')
            }}
          />
        )
      default:
        return <PlaceholderScreen title={SCREEN_TITLE[screen] ?? 'Próximamente'} />
    }
  })()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      {content}
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  )
}

export default App
