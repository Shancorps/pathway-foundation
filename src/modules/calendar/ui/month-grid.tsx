import Link from "next/link"
import { type CalendarEvent, type MonthWindow, bucketEventsByDay, dayKey } from "../queries"
import { DayOverflow } from "./day-overflow"
import { EventTileBody, EventTileWrapper, eventTileColor } from "./event-tile-shared"

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const MAX_INLINE = 3

/**
 * Month grid — 7 columns × 6 rows of day cells. Each cell shows up to
 * MAX_INLINE events, then a "+N more" overflow trigger.
 */
export function MonthGrid({ window, events }: { window: MonthWindow; events: CalendarEvent[] }) {
  const eventsByDay = bucketEventsByDay(events)
  const todayKey = dayKey(new Date())

  // Build the 42 cells.
  const cells: { date: Date; isCurrentMonth: boolean; events: CalendarEvent[] }[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(window.gridStart.getTime() + i * 24 * 60 * 60 * 1000)
    const isCurrentMonth = date.getMonth() === window.month - 1
    const dayEvents = eventsByDay.get(dayKey(date)) ?? []
    cells.push({ date, isCurrentMonth, events: dayEvents })
  }

  return (
    <div style={{ border: "1px solid #0F0F0F" }}>
      {/* Weekday header */}
      <div className="grid grid-cols-7" style={{ borderBottom: "1px solid #0F0F0F" }}>
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-3 py-2 text-center"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "var(--bp-text-muted)",
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 6 rows × 7 cols */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const inline = cell.events.slice(0, MAX_INLINE)
          const overflow = cell.events.slice(MAX_INLINE)
          const cellKey = dayKey(cell.date)
          const isToday = cellKey === todayKey
          return (
            <div
              key={idx}
              className="min-h-[112px] px-2 py-2"
              style={{
                borderRight: idx % 7 === 6 ? "none" : "1px solid #E4E4E4",
                borderBottom: idx >= 35 ? "none" : "1px solid #E4E4E4",
                backgroundColor: cell.isCurrentMonth
                  ? "var(--bp-surface-card)"
                  : "var(--bp-surface-card-queued)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    fontFamily: isToday ? "var(--font-sans)" : "var(--font-mono)",
                    fontSize: isToday ? 13 : 11,
                    fontWeight: isToday ? 600 : 500,
                    letterSpacing: isToday ? "0" : "0.06em",
                    color: cell.isCurrentMonth
                      ? isToday
                        ? "var(--bp-surface-card)"
                        : "var(--bp-text-primary)"
                      : "var(--bp-text-disabled)",
                    backgroundColor: isToday ? "var(--bp-accent-orange)" : "transparent",
                    width: isToday ? 22 : "auto",
                    height: isToday ? 22 : "auto",
                    paddingLeft: isToday ? 0 : 2,
                  }}
                >
                  {String(cell.date.getDate())}
                </span>
              </div>
              {inline.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {inline.map((e) => (
                    <li key={e.id}>
                      <Link href={`/my-actions/${e.id}`} className="block">
                        <EventTileWrapper color={eventTileColor(e)} faded={e.isCompleted}>
                          <EventTileBody event={e} />
                        </EventTileWrapper>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {overflow.length > 0 && (
                <div className="mt-1">
                  <DayOverflow events={overflow} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
