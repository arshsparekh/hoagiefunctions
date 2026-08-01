import { useToasts } from '../../lib/toast'
import { CheckIcon } from '../icons'

/** Renders the app-wide toast queue. Mounted once in AppShell. */
export default function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+var(--safe-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-center gap-2 rounded-md bg-pink-900 px-3.5 py-2 text-[13px] font-medium text-white shadow-hoagie"
        >
          {t.variant === 'success' && <CheckIcon size={16} className="text-success" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
