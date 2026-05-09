"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckSquare, Clock, ListChecks } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CycleChecklistItem } from "../schema"
import { useNow } from "./use-now"

interface CycleRow {
  id: string
  postId: string
  title: string
  particleName: string
  railName: string
  postTitle: string
  position: number
  issuedAt: string
  idealMinutes: number | null
  timeSpentMinutes: number
  timerStartedAt: string | null
  checklistItems: CycleChecklistItem[]
}

interface PostHeld {
  id: string
  title: string
}

const ALL_POSTS_FILTER = "__all__"

export function MyActionsList({
  cycles,
  postsHeld,
}: {
  cycles: CycleRow[]
  postsHeld: PostHeld[]
}) {
  const [filter, setFilter] = useState<string>(ALL_POSTS_FILTER)

  const visible = filter === ALL_POSTS_FILTER ? cycles : cycles.filter((c) => c.postId === filter)

  // Cycle counts per post for badge labeling.
  const countByPost = new Map<string, number>()
  for (const c of cycles) {
    countByPost.set(c.postId, (countByPost.get(c.postId) ?? 0) + 1)
  }

  if (postsHeld.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center">
        <CheckSquare className="mx-auto size-8 text-[var(--color-muted-foreground)]" />
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
          You don&rsquo;t hold any Posts yet — so nothing routes to your inbox.
        </p>
        <Link href="/organization/structure" className="mt-3 inline-block">
          <Button variant="outline" size="sm">
            Go to Org Structure
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Posts you hold + filter chips */}
      <div className="rounded-lg border border-[var(--color-border)] p-3">
        <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
          Posts you hold
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <FilterChip
            label="All"
            count={cycles.length}
            active={filter === ALL_POSTS_FILTER}
            onClick={() => {
              setFilter(ALL_POSTS_FILTER)
            }}
          />
          {postsHeld.map((p) => (
            <FilterChip
              key={p.id}
              label={p.title}
              count={countByPost.get(p.id) ?? 0}
              active={filter === p.id}
              onClick={() => {
                setFilter(p.id)
              }}
            />
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center">
          <CheckSquare className="mx-auto size-8 text-[var(--color-muted-foreground)]" />
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
            {cycles.length === 0
              ? "You're clear. Nothing in your inbox right now."
              : "No cycles for this Post. Try the All filter."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((c) => (
            <li key={c.id}>
              <Link
                href={`/my-actions/${c.id}`}
                className="block rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
              >
                <CycleSummary cycle={c} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-medium text-[var(--color-primary-foreground)]"
          : "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs hover:bg-[var(--color-muted)]/40"
      }
    >
      {label}
      <Badge variant={active ? "secondary" : "outline"} className="px-1.5 py-0">
        {String(count)}
      </Badge>
    </button>
  )
}

function CycleSummary({ cycle }: { cycle: CycleRow }) {
  const totalItems = cycle.checklistItems.length
  const checkedItems = cycle.checklistItems.filter((i) => i.checked).length
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-semibold">{cycle.title}</p>
          {totalItems > 0 && (
            <Badge variant="secondary" className="gap-1">
              <ListChecks className="size-3" />
              {String(checkedItems)} / {String(totalItems)}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          <span className="font-medium">{cycle.particleName}</span> &middot; {cycle.railName}{" "}
          &middot; {cycle.postTitle}
        </p>
      </div>
      <CycleTiming cycle={cycle} />
    </div>
  )
}

function CycleTiming({ cycle }: { cycle: CycleRow }) {
  const now = useNow(60_000)
  // Wall clock since issued
  const issuedMs = now - new Date(cycle.issuedAt).getTime()
  const issuedMinutes = Math.max(0, Math.round(issuedMs / 60000))
  const liveTimerMinutes = cycle.timerStartedAt
    ? Math.max(0, Math.round((now - new Date(cycle.timerStartedAt).getTime()) / 60000))
    : 0
  const totalActiveMinutes = cycle.timeSpentMinutes + liveTimerMinutes

  return (
    <div className="flex flex-col items-end gap-1 text-xs whitespace-nowrap">
      <span className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
        <Clock className="size-3" />
        in inbox: {formatMinutes(issuedMinutes)}
      </span>
      {cycle.idealMinutes != null && (
        <Badge variant={totalActiveMinutes > cycle.idealMinutes ? "destructive" : "outline"}>
          {formatMinutes(totalActiveMinutes)} / {formatMinutes(cycle.idealMinutes)}
        </Badge>
      )}
      {cycle.timerStartedAt && <Badge variant="default">timer running</Badge>}
    </div>
  )
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${String(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`
}
