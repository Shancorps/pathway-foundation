import Link from "next/link"
import type { StatsRange } from "../queries"

const RANGES: { value: StatsRange; label: string }[] = [
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" },
  { value: "90d", label: "Last 90d" },
  { value: "all", label: "All time" },
]

/**
 * Time-range picker for Rail Stats. Server-component-friendly — each option is
 * a `<Link>` that swaps the `range` query param. Active range gets a solid
 * orange chip; inactive ranges are outlined steel.
 */
export function RangePicker({
  range,
  buildHref,
}: {
  range: StatsRange
  buildHref: (range: StatsRange) => string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Time range">
      {RANGES.map((r) => {
        const active = r.value === range
        return (
          <Link
            key={r.value}
            href={buildHref(r.value)}
            role="tab"
            aria-selected={active}
            className={
              active
                ? "border border-[var(--bp-accent-orange)] bg-[var(--bp-accent-orange)] text-white"
                : "border border-[var(--bp-border-strong)] bg-white text-[var(--bp-text-primary)] hover:border-[var(--bp-border-graphite)]"
            }
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "8px 14px",
              transition: "border-color 120ms, background-color 120ms",
            }}
          >
            {r.label}
          </Link>
        )
      })}
    </div>
  )
}
