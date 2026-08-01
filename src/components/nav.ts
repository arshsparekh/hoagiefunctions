import type { ComponentType } from 'react'
import { HomeIcon, CalendarIcon, MapIcon, ProfileIcon } from './icons'

type IconProps = { size?: number; className?: string }

export type NavItem = {
  to: string
  label: string
  Icon: ComponentType<IconProps>
}

/** Primary navigation - inline in the top nav on desktop, tab bar on mobile. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { to: '/map', label: 'Map', Icon: MapIcon },
  { to: '/profile', label: 'Profile', Icon: ProfileIcon },
]
