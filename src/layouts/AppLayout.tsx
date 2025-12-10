import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

function AppLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <Outlet />
      <BottomNav />
    </div>
  )
}

export default AppLayout
