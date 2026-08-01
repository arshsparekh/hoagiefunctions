import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import MapPage from './pages/MapPage'
import EventDetail from './pages/EventDetail'
import Profile from './pages/Profile'
import ClubDetail from './pages/ClubDetail'
import Create from './pages/Create'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="map" element={<MapPage />} />
          <Route path="event/:id" element={<EventDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="club/:id" element={<ClubDetail />} />
          <Route path="create" element={<Create />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
