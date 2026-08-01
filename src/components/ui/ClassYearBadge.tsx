import Fill from './Fill'
import type { ClassYear } from '../../data/seed'

/** Renders a class year as a neutral pill, e.g. 2028 → "'28". */
export default function ClassYearBadge({ classYear }: { classYear: ClassYear }) {
  return (
    <Fill fill="neutral" className="font-mono">
      &rsquo;{String(classYear).slice(-2)}
    </Fill>
  )
}
