import { useState } from 'react'
import BottomNav from './components/BottomNav'
import { SCREEN_TITLE } from './data/navigation'
import CollectionsScreen from './modules/collections/CollectionsScreen'
import NewCollectionForm from './modules/collections/NewCollectionForm'
import HomeScreen from './modules/home/HomeScreen'
import PlaceholderScreen from './modules/PlaceholderScreen'
import type { Screen } from './types/navigation'

function App() {
  const [screen, setScreen] = useState<Screen>('home')

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
            onCreate={() => setScreen('collectionForm')}
          />
        )
      case 'collectionForm':
        return <NewCollectionForm onBack={() => setScreen('collections')} />
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
