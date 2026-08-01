import type { ReactNode } from 'react'

/** Centered page container with consistent horizontal padding. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
}

/** Standard page header: a large Nunito title with an optional subtitle. */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-brand text-[22px] font-bold leading-tight text-pink-900">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </header>
  )
}
