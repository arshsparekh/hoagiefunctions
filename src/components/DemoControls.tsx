import { useState } from 'react'
import { useStore } from '../store'
import type { ViewAs } from '../store'
import { useToasts } from '../lib/toast'
import { XIcon } from './icons'

const OPTIONS: { v: ViewAs; label: string }[] = [
  { v: 'me', label: 'Me' },
  { v: 'clubAdmin', label: 'Club admin' },
  { v: 'newStudent', label: 'New student' },
]

/**
 * Floating demo control (bottom-left, opposite the FAB). Switches the effective
 * viewer and resets the seed so the whole story records in one take. Collapses to
 * a small pill so it stays out of frame when not needed.
 */
export default function DemoControls() {
  const viewAs = useStore((s) => s.viewAs)
  const setViewAs = useStore((s) => s.setViewAs)
  const resetDemo = useStore((s) => s.resetDemo)
  const push = useToasts((s) => s.push)
  const [open, setOpen] = useState(false)

  const wrap = 'fixed bottom-[calc(5.5rem+var(--safe-bottom))] left-3 z-40 md:bottom-4'

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${wrap} flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted shadow-hoagie transition-colors hover:text-text`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
        Demo
      </button>
    )
  }

  return (
    <div className={`${wrap} w-52 rounded-md border border-border bg-white p-2 shadow-hoagie`}>
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Demo mode</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide demo controls"
          className="flex h-5 w-5 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface hover:text-text"
        >
          <XIcon size={14} />
        </button>
      </div>

      <p className="mb-1 px-1 text-[11px] font-medium text-muted">View as</p>
      <div className="flex flex-col gap-1">
        {OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setViewAs(o.v)}
            className={`rounded-sm px-2 py-1.5 text-left text-[13px] transition-colors ${
              viewAs === o.v
                ? 'bg-pink-50 font-semibold text-pink-600'
                : 'text-text hover:bg-surface'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          resetDemo()
          push('Demo reset', 'neutral')
        }}
        className="mt-2 w-full rounded-sm border border-border py-1.5 text-[12px] font-medium text-text transition-colors hover:bg-surface active:bg-border-muted"
      >
        Reset demo
      </button>
    </div>
  )
}
