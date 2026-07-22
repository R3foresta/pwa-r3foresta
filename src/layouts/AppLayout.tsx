import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

function AppLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-brand-50 text-brand-700">
      <Outlet />
      <BottomNav />
    </div>
  )
}

export default AppLayout
