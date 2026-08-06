import Fill from './Fill'
import { GlobeIcon, TicketIcon, LockIcon } from '../icons'
import type { AccessType, FillName } from '../../data/seed'
import type { ComponentType } from 'react'

const CONFIG: Record<AccessType, { label: string; fill: FillName; Icon: ComponentType<{ size?: number }> }> = {
  open: { label: 'Open', fill: 'green', Icon: GlobeIcon },
  rsvp: { label: 'RSVP', fill: 'blue', Icon: TicketIcon },
  guestlist: { label: 'Guestlist', fill: 'orange', Icon: LockIcon },
}

/** Open (green) / RSVP (blue) / Guestlist (orange), each with an icon. */
export default function AccessTypePill({ type }: { type: AccessType }) {
  const { label, fill, Icon } = CONFIG[type]
  return (
    <Fill fill={fill} icon={<Icon size={12} />}>
      {label}
    </Fill>
  )
}
