import { NavLink } from 'react-router-dom'
import Wordmark from './Wordmark'
import { PlusIcon } from './icons'
import { NAV_ITEMS } from './nav'

/**
 * White top nav with a bottom border. Left: wordmark. Right: primary links and a
 * Create action (md+ only - on mobile the links live in the BottomTabBar and the
 * floating + button handles Create).
 */
export default function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-1.5" aria-label="hoagiefunctions home">
          <Wordmark />
        </NavLink>

        <div className="flex-1" />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-pink-50 text-pink-600'
                    : 'text-muted hover:bg-surface hover:text-text'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Create is top-right on every page and every screen size */}
        <NavLink
          to="/create"
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-pink-500 px-3 py-1.5 text-[13px] font-semibold text-white shadow-hoagie transition-colors hover:bg-pink-600"
        >
          <PlusIcon size={16} />
          Create
        </NavLink>
      </div>
    </header>
  )
}
