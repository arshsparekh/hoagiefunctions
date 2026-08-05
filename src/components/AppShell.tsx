import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopNav from './TopNav'
import BottomTabBar from './BottomTabBar'
import Toaster from './ui/Toaster'
import DemoControls from './DemoControls'
import ErrorBoundary from './ErrorBoundary'

/**
 * Layout route: top nav, the routed page, and the mobile bottom tab bar.
 * The main region keeps extra bottom padding on mobile so the fixed tab bar
 * never overlaps content. Each route fades in and starts scrolled to the top.
 */
export default function AppShell() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Hoagie signature: a pink bar across the very top, then the white navbar */}
      <div className="h-5 w-full bg-pink-500" />
      <TopNav />
      <main className="flex-1 pb-24 md:pb-10">
        <div key={location.pathname} className="hf-page">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      <BottomTabBar />
      <Toaster />
      <DemoControls />
    </div>
  )
}
