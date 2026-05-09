import "server-only"
import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { posts, postAssignments } from "@/modules/org-structure/schema"
import { particles } from "@/modules/particles/schema"
import { rails } from "@/modules/rails/schema"
import { cycles, railRuns } from "@/modules/rail-runs/schema"

/**
 * Calendar events — the time-axis projection of a user's Pathway work.
 *
 * v1 scope: only Cycles. Orders, To Dos, and recurring rail-issued cycles
 * exist in the spec but not yet in the kernel; they layer in here once
 * those modules ship.
 */

export type CalendarEventType = "cycle"

export interface CalendarEvent {
  id: string
  type: CalendarEventType
  /** Effective calendar date (deadline for open cycles, completedAt for done ones). */
  date: Date
  particleName: string
  railName: string
  cycleTitle: string
  postTitle: string
  position: number
  /** Active cycle in user's inbox (still pending). */
  isOpen: boolean
  /** Closed cycles render with a checkmark + faded styling. */
  isCompleted: boolean
  /** True when the deadline has passed and the cycle is still open. */
  isOverdue: boolean
  idealMinutes: number | null
  issuedAt: Date
}

/**
 * Fetch every calendar event in the user's inbox (open or recently completed)
 * whose effective date falls within [start, end). Bounded by the user's
 * Post-assignment scope.
 *
 * "Effective date" is the deadline for an open cycle (issuedAt + idealMinutes),
 * the issuedAt timestamp if no ideal is set, or completedAt for closed cycles.
 */
export async function listCalendarEvents(
  orgId: string,
  userId: string,
  start: Date,
  end: Date,
): Promise<CalendarEvent[]> {
  // Open cycles + recently-completed cycles in the user's inbox. We pull a
  // generous window of issuedAt/completedAt and re-filter in JS by effective
  // date, since the deadline calc combines two columns.
  const looseStart = new Date(start.getTime() - 90 * 24 * 60 * 60 * 1000)
  const looseEnd = new Date(end.getTime() + 1 * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({
      id: cycles.id,
      title: cycles.title,
      position: cycles.position,
      idealMinutes: cycles.idealMinutes,
      issuedAt: cycles.issuedAt,
      completedAt: cycles.completedAt,
      cancelledAt: cycles.cancelledAt,
      particleName: particles.name,
      railName: rails.name,
      postTitle: posts.title,
    })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .innerJoin(posts, eq(posts.id, cycles.postId))
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .innerJoin(rails, eq(rails.id, railRuns.railId))
    .innerJoin(particles, eq(particles.id, railRuns.particleId))
    .where(
      and(
        eq(cycles.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(cycles.deletedAt),
        isNull(cycles.cancelledAt),
        // Either open (no completedAt) and recently-issued, or completed inside
        // the loose window.
        or(
          and(isNull(cycles.completedAt), gte(cycles.issuedAt, looseStart)),
          and(
            // Completed within the window
            // (drizzle has no isNotNull helper imported here so use range gate)
            gte(cycles.completedAt, looseStart),
            lte(cycles.completedAt, looseEnd),
          ),
        ),
      ),
    )
    .orderBy(asc(cycles.issuedAt))

  const now = Date.now()
  const events: CalendarEvent[] = []
  for (const r of rows) {
    const isCompleted = r.completedAt !== null
    const isOpen = !isCompleted
    let date: Date
    if (isCompleted && r.completedAt) {
      date = r.completedAt
    } else if (r.idealMinutes != null) {
      date = new Date(r.issuedAt.getTime() + r.idealMinutes * 60_000)
    } else {
      date = r.issuedAt
    }
    if (date < start || date >= end) continue
    const isOverdue = isOpen && date.getTime() < now
    events.push({
      id: r.id,
      type: "cycle",
      date,
      particleName: r.particleName,
      railName: r.railName,
      cycleTitle: r.title,
      postTitle: r.postTitle,
      position: r.position,
      isOpen,
      isCompleted,
      isOverdue,
      idealMinutes: r.idealMinutes,
      issuedAt: r.issuedAt,
    })
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * Resolve `?y=YYYY&m=1..12` from search params, with safe defaults.
 *
 * Returns the first-of-month + last-of-month inclusive bounds, plus the
 * 42-cell calendar grid window aligned to the week containing the 1st.
 */
export interface MonthWindow {
  year: number
  month: number // 1-12
  /** First of month (00:00 local). */
  monthStart: Date
  /** First of next month (exclusive end). */
  monthEnd: Date
  /** First grid cell (Sunday on or before the 1st). */
  gridStart: Date
  /** First cell beyond the 6×7 grid (exclusive). */
  gridEnd: Date
}

export function resolveMonthWindow(rawY: string | null, rawM: string | null): MonthWindow {
  const now = new Date()
  const year = parseIntSafe(rawY, now.getFullYear(), 1970, 2100)
  const month = parseIntSafe(rawM, now.getMonth() + 1, 1, 12)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 1)
  // Grid begins on the Sunday on or before the 1st.
  const dayOfWeek = monthStart.getDay() // 0=Sun..6=Sat
  const gridStart = new Date(year, month - 1, 1 - dayOfWeek)
  const gridEnd = new Date(gridStart.getTime() + 42 * 24 * 60 * 60 * 1000)
  return { year, month, monthStart, monthEnd, gridStart, gridEnd }
}

function parseIntSafe(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null) return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < min || n > max) return fallback
  return n
}

export function bucketEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const byDay = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const key = dayKey(e.date)
    const arr = byDay.get(key) ?? []
    arr.push(e)
    byDay.set(key, arr)
  }
  return byDay
}

export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
