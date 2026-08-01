import type { ReactNode } from 'react'
import type { FillName } from '../../data/seed'
import { FILL_STYLES } from '../../lib/fills'

export interface FillProps {
  fill: FillName
  /** Solid variant: the fill's color becomes the background, text goes white. */
  solid?: boolean
  icon?: ReactNode
  className?: string
  children: ReactNode
}

/** Base pill: 4px radius, 12px, semibold. All other badges build on this. */
export default function Fill({ fill, solid = false, icon, className = '', children }: FillProps) {
  const c = FILL_STYLES[fill]
  const style = solid
    ? { backgroundColor: c.text, color: '#ffffff' }
    : { backgroundColor: c.bg, color: c.text }
  return (
    <span
      style={style}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-[12px] font-semibold leading-5 ${className}`}
    >
      {icon}
      {children}
    </span>
  )
}
