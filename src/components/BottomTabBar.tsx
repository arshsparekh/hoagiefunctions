import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav'

/**
 * Mobile-only bottom tab bar. Fixed to the bottom with an icon + label per
 * primary route; hidden on md+ where the top nav shows inline links.
 */
export default function BottomTabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-pink-600' : 'text-muted'
              }`
            }
          >
            <Icon size={23} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
