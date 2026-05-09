import type { ReactNode } from "react"

/**
 * Engineering-drawing title block. Sits at the top of every page.
 *
 * Layout mimics a real drawing's title cartouche:
 *   - Left: section coordinate (e.g. "01 / WORKSPACE") + page name
 *   - Right: technical metadata column (status, count, action button)
 *   - Bottom: 1px graphite rule that runs full width
 *   - Above the rule: thin coordinate ticks at intervals
 */
export function TitleBlock({
  coordinate,
  title,
  subtitle,
  meta,
  action,
}: {
  coordinate: string
  title: string
  subtitle?: string
  meta?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="relative">
      {/* Coordinate ticks above the bottom rule */}
      <CoordinateTicks />

      <div className="flex items-end justify-between gap-6 pb-4">
        <div>
          <p
            className="mb-3 flex items-center gap-3"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "var(--bp-text-muted)",
            }}
          >
            <span>{coordinate.toUpperCase()}</span>
            <span
              className="inline-block w-10"
              style={{ height: 1, backgroundColor: "var(--bp-border-strong)" }}
              aria-hidden
            />
          </p>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 34,
              color: "var(--bp-text-primary)",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mt-3 max-w-[42ch]"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--bp-text-secondary)",
                lineHeight: 1.55,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          {meta}
          {action}
        </div>
      </div>

      {/* Bottom rule — graphite line, flips to off-white in dark for the same hierarchy. */}
      <div className="h-px w-full" style={{ backgroundColor: "var(--bp-border-graphite)" }} />
    </header>
  )
}

function CoordinateTicks() {
  // Six evenly-spaced ticks above the bottom rule, like coordinate marks.
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-0 bottom-0 left-0 flex justify-between"
      style={{ height: 6 }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="block w-px"
          style={{ height: 4, backgroundColor: "var(--bp-border-strong)" }}
        />
      ))}
    </div>
  )
}
