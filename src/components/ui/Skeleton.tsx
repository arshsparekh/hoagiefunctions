/** Pulsing placeholder block. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-border-muted ${className}`} />
}

/** Skeleton stand-in for an EventCard, shown on first paint. */
export function SkeletonEventCard() {
  return (
    <div className="rounded-md border border-border bg-white p-4 shadow-hoagie">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="mt-3 h-3 w-28" />
      <Skeleton className="mt-2.5 h-3 w-56 max-w-full" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="mt-3 border-t border-border-muted pt-3">
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  )
}
