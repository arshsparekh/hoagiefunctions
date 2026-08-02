import { useState } from 'react'
import { useStore } from '../store'
import type { ViewAs } from '../store'
import { useToasts } from '../lib/toast'
import { XIcon } from './icons'

const REPO_URL = 'https://github.com/arshsparekh/hoagiefunctions'

const OPTIONS: { v: ViewAs; label: string }[] = [
  { v: 'me', label: "Arsh Parekh '28" },
  { v: 'clubAdmin', label: 'Club Admin' },
  { v: 'newStudent', label: 'New Student' },
]

/**
 * Floating demo control (bottom-right). Switches the effective viewer, resets the
 * seed, and links the repo. Collapses to a small pill so it stays out of frame.
 */
export default function DemoControls() {
  const viewAs = useStore((s) => s.viewAs)
  const setViewAs = useStore((s) => s.setViewAs)
  const resetDemo = useStore((s) => s.resetDemo)
  const push = useToasts((s) => s.push)
  const [open, setOpen] = useState(false)

  const wrap = 'fixed bottom-[calc(5.5rem+var(--safe-bottom))] right-3 z-40 md:bottom-4'

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

      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex w-full items-center justify-center rounded-sm border border-border py-1.5 text-[12px] font-medium text-text transition-colors hover:bg-surface"
      >
        View GitHub Repo
      </a>

      <button
        type="button"
        onClick={() => {
          resetDemo()
          push('Demo reset', 'neutral')
        }}
        className="mt-1.5 w-full rounded-sm border border-border py-1.5 text-[12px] font-medium text-text transition-colors hover:bg-surface active:bg-border-muted"
      >
        Reset demo
      </button>
    </div>
  )
}
