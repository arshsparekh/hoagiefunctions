import { NavLink } from 'react-router-dom'
import Wordmark from './Wordmark'
import { PlusIcon, SearchIcon, BellIcon } from './icons'
import { NAV_ITEMS } from './nav'
import { useStore } from '../store'

const iconBtn = ({ isActive }: { isActive: boolean }) =>
  `relative flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
    isActive ? 'bg-pink-50 text-pink-600' : 'text-muted hover:bg-surface hover:text-text'
  }`

/**
 * White top nav with a bottom border. Left: wordmark. Right: primary links
 * (desktop), search + notifications, and a Create action. Search and the bell
 * are visible on every screen size; the bell shows an unread count.
 */
export default function TopNav() {
  const unread = useStore((s) => s.unreadCount())

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
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

        <NavLink to="/search" aria-label="Search" className={iconBtn}>
          <SearchIcon size={20} />
        </NavLink>

        <NavLink
          to="/notifications"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          className={iconBtn}
        >
          <BellIcon size={20} />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 font-mono text-[10px] font-bold leading-none text-white"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </NavLink>

        {/* Create is top-right on every page and every screen size */}
        <NavLink
          to="/create"
          className="ml-1 flex shrink-0 items-center gap-1.5 rounded-md bg-pink-500 px-3 py-1.5 text-[13px] font-semibold text-white shadow-hoagie transition-colors hover:bg-pink-600"
        >
          <PlusIcon size={16} />
          <span className="hidden sm:inline">Create</span>
        </NavLink>
      </div>
    </header>
  )
}
