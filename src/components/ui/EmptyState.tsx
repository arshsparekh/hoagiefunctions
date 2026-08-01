import type { ReactNode } from 'react'

/** Centered placeholder for empty feeds/lists. */
export default function EmptyState({
  title,
  message,
  icon,
  action,
}: {
  title: string
  message?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="font-semibold text-pink-900">{title}</p>
      {message && <p className="mt-1 max-w-sm text-[13px] text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
