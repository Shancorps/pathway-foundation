import { Check } from "lucide-react"
import type { CalendarEvent } from "../queries"

/**
 * Color picker for an event tile. Spec uses orange for cycles; we additionally
 * tint overdue cycles to red and completed ones to steel.
 */
export function eventTileColor(e: CalendarEvent): string {
  if (e.isCompleted) return "#2A3D52"
  if (e.isOverdue) return "#B83229"
  return "#E8711A"
}

/**
 * The little vertical band + body wrapper. Used both inline in a day cell and
 * inside the +N more overflow popover.
 */
export function EventTileWrapper({
  color,
  faded,
  children,
}: {
  color: string
  faded: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className="flex items-stretch"
      style={{
        backgroundColor: faded ? "#FAFAFA" : "#fff",
        border: `1px solid ${faded ? "#E4E4E4" : color}`,
        opacity: faded ? 0.85 : 1,
      }}
    >
      <div style={{ width: 3, backgroundColor: color }} aria-hidden />
      <div className="min-w-0 flex-1 px-2 py-1.5">{children}</div>
    </div>
  )
}

export function EventTileBody({ event }: { event: CalendarEvent }) {
  return (
    <>
      <p
        className="flex items-center gap-1 truncate"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 500,
          color: event.isCompleted ? "#666" : "#0F0F0F",
          textDecoration: event.isCompleted ? "line-through" : "none",
        }}
      >
        {event.isCompleted ? (
          <Check className="size-3 shrink-0 text-[#2A3D52]" strokeWidth={2.5} aria-hidden />
        ) : (
          <span
            aria-hidden
            className="inline-block"
            style={{
              width: 6,
              height: 6,
              border: `1px solid ${event.isOverdue ? "#B83229" : "#E8711A"}`,
              backgroundColor: "transparent",
            }}
          />
        )}
        <span className="truncate">{event.cycleTitle}</span>
      </p>
      <p
        className="mt-0.5 truncate"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.1em",
          color: "#888",
          textTransform: "uppercase",
        }}
      >
        {event.particleName}
      </p>
    </>
  )
}
