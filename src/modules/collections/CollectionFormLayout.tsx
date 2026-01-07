import { Outlet } from 'react-router-dom'
import { CollectionFormProvider } from './CollectionFormContext'

function CollectionFormLayout() {
  return (
    <CollectionFormProvider>
      <Outlet />
    </CollectionFormProvider>
  )
}

export default CollectionFormLayout
