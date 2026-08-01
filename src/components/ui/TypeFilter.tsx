import { useEffect, useRef, useState } from 'react'
import { tags } from '../../store'
import TagChip from './TagChip'
import { FilterIcon, ChevronDownIcon } from '../icons'

/** Compact "Type" dropdown that collapses the event-type tags into one control. */
export default function TypeFilter({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors ${
          selected.length > 0
            ? 'border-pink-300 bg-pink-50 text-pink-700'
            : 'border-border bg-white text-text hover:border-pink-300'
        }`}
      >
        <FilterIcon size={15} />
        Type
        {selected.length > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">
            {selected.length}
          </span>
        )}
        <ChevronDownIcon size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-md border border-border bg-white p-3 shadow-hoagie">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
              Event type
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[12px] font-medium text-pink-600 hover:text-pink-700"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <TagChip
                key={t.id}
                tagId={t.id}
                active={selected.includes(t.id)}
                onClick={() => toggle(t.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
