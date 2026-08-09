import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopNav from './TopNav'
import BottomTabBar from './BottomTabBar'
import Toaster from './ui/Toaster'
import DemoControls from './DemoControls'
import ErrorBoundary from './ErrorBoundary'

/**
 * Layout route: top nav, the routed page, and the mobile bottom tab bar.
 * The main region keeps extra bottom padding on mobile so the fixed tab bar
 * never overlaps content. Each route fades in and starts scrolled to the top,
 * and focus moves to the main region so screen readers announce the new page.
 */
export default function AppShell() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    window.scrollTo(0, 0)
    // Skip the initial mount (don't yank focus on first load); move it on navigation.
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus()
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Keyboard users can jump past the nav */}
      <a
        href="#main"
        className="sr-only rounded-md bg-pink-500 px-3 py-2 text-[13px] font-semibold text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>

      {/* Hoagie signature: a pink bar across the very top, then the white navbar */}
      <div className="h-5 w-full bg-pink-500" />
      <TopNav />
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 pb-24 outline-none md:pb-10">
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
