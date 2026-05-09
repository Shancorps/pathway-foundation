"use client"

import { useState } from "react"
import Link from "next/link"
import type { CalendarEvent } from "../queries"
import { EventTileBody, EventTileWrapper, eventTileColor } from "./event-tile-shared"

/**
 * Shows "+N more" inside a day cell. On click, expands to reveal every event
 * for that day in a small overlay anchored to the cell.
 */
export function DayOverflow({ events }: { events: CalendarEvent[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className="block w-full px-1 py-0.5 text-left transition-colors hover:bg-[var(--bp-surface-card-queued)]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "var(--bp-text-muted)",
          textTransform: "uppercase",
        }}
      >
        + {events.length} more
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close overflow"
            onClick={() => {
              setOpen(false)
            }}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div
            className="absolute left-0 z-50 mt-1 w-[260px] bg-white p-2 shadow-[0_2px_0_#0F0F0F]"
            style={{ border: "1px solid #0F0F0F" }}
          >
            <ul className="space-y-1">
              {events.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/my-actions/${e.id}`}
                    className="block"
                    onClick={() => {
                      setOpen(false)
                    }}
                  >
                    <EventTileWrapper color={eventTileColor(e)} faded={e.isCompleted}>
                      <EventTileBody event={e} />
                    </EventTileWrapper>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
