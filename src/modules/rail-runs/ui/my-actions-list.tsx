"use client"

import { useState } from "react"
import Link from "next/link"
import { ParticleCube } from "@/components/ui/particle-cube"
import { RegCard, type RegCardState } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import { cn } from "@/lib/utils"
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
  IdleEmptyState,
}: {
  cycles: CycleRow[]
  postsHeld: PostHeld[]
  IdleEmptyState: React.ReactNode
}) {
  const [filter, setFilter] = useState<string>(ALL_POSTS_FILTER)

  const visible = filter === ALL_POSTS_FILTER ? cycles : cycles.filter((c) => c.postId === filter)

  const countByPost = new Map<string, number>()
  for (const c of cycles) {
    countByPost.set(c.postId, (countByPost.get(c.postId) ?? 0) + 1)
  }

  if (postsHeld.length === 0) {
    return (
      <div className="space-y-6">
        <SectionDivider label="Fig · 01 / Inbox" />
        <RegCard state="new" className="px-12 py-16 text-center">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "#888",
              textTransform: "uppercase",
            }}
          >
            No posts assigned
          </p>
          <p
            className="mx-auto mt-3 max-w-[42ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "#444",
              lineHeight: 1.55,
            }}
          >
            You don&rsquo;t hold any Posts yet — so nothing routes to your inbox. Assign yourself in
            the org structure to start receiving cycles.
          </p>
          <Link
            href="/organization/structure"
            className="mt-7 inline-flex items-center gap-2 border border-[#0F0F0F] bg-white px-5 py-2.5 transition-colors hover:bg-[#FAFAFA]"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "#0F0F0F",
              textTransform: "uppercase",
            }}
          >
            Go to Structure →
          </Link>
        </RegCard>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Filter strip */}
      <section className="space-y-4">
        <SectionDivider label="Fig · 01 / Filter by Post" count={postsHeld.length} />
        <div className="flex flex-wrap gap-2">
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
      </section>

      {/* Active queue */}
      <section className="space-y-4">
        <SectionDivider
          label="Fig · 02 / Active Queue"
          count={visible.length}
          variant={visible.length > 0 ? "accent" : "default"}
        />
        {visible.length === 0 ? (
          <div className="grid place-items-center px-4 py-12">{IdleEmptyState}</div>
        ) : (
          <ul className="space-y-3">
            {visible.map((c) => (
              <li key={c.id}>
                <CycleRowItem cycle={c} />
              </li>
            ))}
          </ul>
        )}
      </section>
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
  // Solid orange when active. Outlined cool grey when inactive but with
  // enough contrast to register as a separate object on the page.
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2.5 px-3.5 py-2 transition-colors",
        active
          ? "border border-[#E8711A] bg-[#E8711A] text-white"
          : "border border-[#D4D4D4] bg-white text-[#0F0F0F] hover:border-[#0F0F0F]",
      )}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      <span>{label}</span>
      <span
        style={{
          color: active ? "rgba(255,255,255,0.8)" : "#888",
          fontWeight: 400,
        }}
      >
        {String(count)}
      </span>
    </button>
  )
}

function CycleRowItem({ cycle }: { cycle: CycleRow }) {
  const totalItems = cycle.checklistItems.length
  const checkedItems = cycle.checklistItems.filter((i) => i.checked).length
  const isActive = Boolean(cycle.timerStartedAt) || checkedItems > 0
  const state: RegCardState = isActive ? "active" : "queued"

  return (
    <Link href={`/my-actions/${cycle.id}`} className="block">
      <RegCard state={state} className="transition-[background-color]">
        <div className="flex items-start gap-5">
          <ParticleCube state={state} size={36} className="mt-0.5" />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className="truncate"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    fontWeight: 600,
                    color: state === "active" ? "#0F0F0F" : "#444",
                    lineHeight: 1.25,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {cycle.particleName}
                </h3>
                <p
                  className="mt-1 truncate"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    color: state === "active" ? "#555" : "#777",
                    lineHeight: 1.35,
                  }}
                >
                  {cycle.title}
                </p>
              </div>
              <CycleStatusBadge cycle={cycle} state={state} />
            </div>

            <p
              className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 500,
                color: state === "active" ? "#5A7A92" : "#888",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <span>{cycle.postTitle}</span>
              <span style={{ color: "#CCC" }}>·</span>
              <span>{cycle.railName}</span>
              {totalItems > 0 && (
                <>
                  <span style={{ color: "#CCC" }}>·</span>
                  <span>
                    {String(checkedItems)} / {String(totalItems)} steps
                  </span>
                </>
              )}
            </p>

            {totalItems > 0 && (
              <div className="mt-3.5 flex gap-1" aria-hidden>
                {Array.from({ length: totalItems }).map((_, i) => (
                  <span
                    key={i}
                    className="block"
                    style={{
                      width: "22px",
                      height: "3px",
                      backgroundColor:
                        i < checkedItems
                          ? "#E8711A"
                          : state === "queued"
                            ? "rgba(42,61,82,0.25)"
                            : "#E4E4E4",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </RegCard>
    </Link>
  )
}

function CycleStatusBadge({ cycle, state }: { cycle: CycleRow; state: RegCardState }) {
  const now = useNow(60_000)
  const issuedMs = now - new Date(cycle.issuedAt).getTime()
  const issuedMinutes = Math.max(0, Math.round(issuedMs / 60000))
  const liveTimerMinutes = cycle.timerStartedAt
    ? Math.max(0, Math.round((now - new Date(cycle.timerStartedAt).getTime()) / 60000))
    : 0
  const totalActive = cycle.timeSpentMinutes + liveTimerMinutes
  const overIdeal = cycle.idealMinutes != null && totalActive > cycle.idealMinutes

  const badgeColor = state === "active" ? "#E8711A" : state === "queued" ? "#2A3D52" : "#888"
  const label = state === "active" ? "Active" : state === "queued" ? "Queued" : "New"

  return (
    <div className="flex shrink-0 flex-col items-end gap-2 whitespace-nowrap">
      <span
        className="px-2.5 py-1"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: state === "active" ? "#fff" : badgeColor,
          backgroundColor: state === "active" ? "#E8711A" : "transparent",
          border: `1px solid ${badgeColor}`,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "#888",
        }}
      >
        {formatMinutes(issuedMinutes)} in inbox
      </span>
      {cycle.idealMinutes != null && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: overIdeal ? 600 : 500,
            letterSpacing: "0.1em",
            color: overIdeal ? "#E8711A" : "#888",
          }}
        >
          {formatMinutes(totalActive)} / {formatMinutes(cycle.idealMinutes)}
        </span>
      )}
    </div>
  )
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${String(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${String(hours)}h` : `${String(hours)}h${String(rest)}m`
}
