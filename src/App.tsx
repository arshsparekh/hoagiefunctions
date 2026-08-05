import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import Home from './pages/Home'

// Home is eager (it's the landing screen). Everything else is code-split so the
// initial bundle stays small - the heavy Leaflet map in particular only loads
// when someone opens /map or an event detail.
const Calendar = lazy(() => import('./pages/Calendar'))
const MapPage = lazy(() => import('./pages/MapPage'))
const EventDetail = lazy(() => import('./pages/EventDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const ClubDetail = lazy(() => import('./pages/ClubDetail'))
const Create = lazy(() => import('./pages/Create'))
const Search = lazy(() => import('./pages/Search'))
const Notifications = lazy(() => import('./pages/Notifications'))
const NotFound = lazy(() => import('./pages/NotFound'))

/** Lightweight fallback while a route chunk loads. */
function RouteFallback() {
  return (
    <div className="flex justify-center pt-20" aria-live="polite" aria-busy="true">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-pink-200 border-t-pink-500" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route
            path="calendar"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Calendar />
              </Suspense>
            }
          />
          <Route
            path="map"
            element={
              <Suspense fallback={<RouteFallback />}>
                <MapPage />
              </Suspense>
            }
          />
          <Route
            path="event/:id"
            element={
              <Suspense fallback={<RouteFallback />}>
                <EventDetail />
              </Suspense>
            }
          />
          <Route
            path="profile"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Profile />
              </Suspense>
            }
          />
          <Route
            path="club/:id"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ClubDetail />
              </Suspense>
            }
          />
          <Route
            path="create"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Create />
              </Suspense>
            }
          />
          <Route
            path="search"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Search />
              </Suspense>
            }
          />
          <Route
            path="notifications"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Notifications />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <Suspense fallback={<RouteFallback />}>
                <NotFound />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
