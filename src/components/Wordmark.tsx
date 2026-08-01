/**
 * The hoagiefunctions wordmark - "hoagie" (Nunito extrabold) + "functions"
 * (lighter weight), matching hoagiemail / hoagieplan. Keep this construction
 * for any Hoagie sub-brand.
 */
export default function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-brand text-[24px] leading-none tracking-tight text-pink-900 sm:text-[28px] ${className}`}
    >
      <span className="font-extrabold">hoagie</span>
      <span className="font-normal text-pink-500">functions</span>
    </span>
  )
}
