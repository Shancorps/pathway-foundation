"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, CircleAlert, Clock, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  cancelRailRun,
  completeCycle,
  startCycleTimer,
  stopCycleTimer,
  updateChecklistItem,
} from "../actions"
import type { Cycle, CycleChecklistItem } from "../schema"
import { useNow } from "./use-now"

interface CycleDetailProps {
  cycle: Cycle
  particleName: string
  railName: string
  railRunId: string
  postTitle: string
}

export function CycleDetail({
  cycle,
  particleName,
  railName,
  railRunId,
  postTitle,
}: CycleDetailProps) {
  const router = useRouter()
  const [submittingComplete, setSubmittingComplete] = useState(false)
  const [submittingTimer, setSubmittingTimer] = useState(false)

  const totalItems = cycle.checklistItems.length
  const checkedItems = cycle.checklistItems.filter((i) => i.checked).length
  const requiredUnchecked = cycle.checklistItems.filter((i) => i.required && !i.checked)
  const canComplete = requiredUnchecked.length === 0
  const isClosed = Boolean(cycle.completedAt) || Boolean(cycle.cancelledAt)

  async function handleToggleItem(item: CycleChecklistItem, checked: boolean) {
    const result = await updateChecklistItem({
      cycleId: cycle.id,
      itemId: item.id,
      checked,
    })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  async function handleStartTimer() {
    setSubmittingTimer(true)
    const result = await startCycleTimer({ cycleId: cycle.id })
    setSubmittingTimer(false)
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  async function handleStopTimer() {
    setSubmittingTimer(true)
    const result = await stopCycleTimer({ cycleId: cycle.id })
    setSubmittingTimer(false)
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  async function handleComplete() {
    if (!confirm(`Complete "${cycle.title}"? The Particle advances to the next Terminal.`)) {
      return
    }
    setSubmittingComplete(true)
    const result = await completeCycle({ cycleId: cycle.id })
    setSubmittingComplete(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    if (result.data?.runFinished) {
      alert("Rail run complete — the Particle has reached the end of the line.")
    }
    router.push("/my-actions")
    router.refresh()
  }

  async function handleCancelRun() {
    const reason = prompt("Why are you cancelling this rail run?")
    if (reason === null) return
    const result = await cancelRailRun({ runId: railRunId, reason: reason || undefined })
    if (result.serverError) alert(result.serverError)
    else {
      router.push("/my-actions")
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[var(--color-border)] p-4">
        <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
          Cycle
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{cycle.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          <span className="font-medium">{particleName}</span> &middot; {railName} &middot;{" "}
          {postTitle}
        </p>
        {cycle.description && (
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{cycle.description}</p>
        )}
        {isClosed && (
          <div className="mt-3">
            {cycle.completedAt ? (
              <Badge variant="default">Completed</Badge>
            ) : (
              <Badge variant="destructive">Cancelled</Badge>
            )}
          </div>
        )}
      </section>

      <TimerPanel
        cycle={cycle}
        onStart={handleStartTimer}
        onStop={handleStopTimer}
        submitting={submittingTimer}
        disabled={isClosed}
      />

      <section className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
            Checklist ({String(checkedItems)} / {String(totalItems)})
          </h2>
          {requiredUnchecked.length > 0 && !isClosed && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <CircleAlert className="size-3" />
              {String(requiredUnchecked.length)} required item
              {requiredUnchecked.length === 1 ? "" : "s"} left
            </span>
          )}
        </div>
        {totalItems === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border)] p-3 text-center text-xs text-[var(--color-muted-foreground)]">
            No checklist for this cycle.
          </p>
        ) : (
          <ul className="space-y-2">
            {cycle.checklistItems
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((item) => (
                <li key={item.id} className="flex items-start gap-2 rounded-md p-2">
                  <Checkbox
                    checked={item.checked}
                    disabled={isClosed}
                    onCheckedChange={(v) => {
                      void handleToggleItem(item, Boolean(v))
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p
                      className={
                        item.checked
                          ? "text-sm text-[var(--color-muted-foreground)] line-through"
                          : "text-sm"
                      }
                    >
                      {item.label}
                      {item.required && <span className="ml-1 text-xs text-red-500">*</span>}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      {!isClosed && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" onClick={handleCancelRun}>
            Cancel Run
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!canComplete || submittingComplete}
            title={canComplete ? undefined : "Check all required items before completing the cycle"}
          >
            <Check className="size-4" />
            {submittingComplete ? "Completing..." : "Complete Task"}
          </Button>
        </div>
      )}
    </div>
  )
}

function TimerPanel({
  cycle,
  onStart,
  onStop,
  submitting,
  disabled,
}: {
  cycle: Cycle
  onStart: () => void
  onStop: () => void
  submitting: boolean
  disabled: boolean
}) {
  // Live tick — re-render every 30s while the timer is running so the
  // displayed elapsed time updates without a server round-trip.
  const now = useNow(30_000)

  const liveSegmentMinutes = cycle.timerStartedAt
    ? Math.max(0, Math.round((now - new Date(cycle.timerStartedAt).getTime()) / 60000))
    : 0
  const totalMinutes = cycle.timeSpentMinutes + liveSegmentMinutes
  const issuedMs = now - new Date(cycle.issuedAt).getTime()
  const issuedMinutes = Math.max(0, Math.round(issuedMs / 60000))

  const overIdeal = cycle.idealMinutes != null && totalMinutes > cycle.idealMinutes

  return (
    <section className="rounded-lg border border-[var(--color-border)] p-4">
      <h2 className="text-sm font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
        Timing
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat label="In your inbox" value={formatMinutes(issuedMinutes)} icon={Clock} />
        <Stat
          label="Active work"
          value={formatMinutes(totalMinutes)}
          icon={Play}
          live={Boolean(cycle.timerStartedAt)}
        />
        <Stat
          label="Ideal time"
          value={cycle.idealMinutes != null ? formatMinutes(cycle.idealMinutes) : "—"}
          icon={Clock}
          warning={overIdeal}
        />
      </div>
      <div className="mt-3">
        {cycle.timerStartedAt ? (
          <Button variant="outline" onClick={onStop} disabled={disabled || submitting}>
            <Pause className="size-4" />
            {submitting ? "..." : "Pause work timer"}
          </Button>
        ) : (
          <Button onClick={onStart} disabled={disabled || submitting}>
            <Play className="size-4" />
            {submitting ? "..." : "Start work timer"}
          </Button>
        )}
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  live = false,
  warning = false,
}: {
  label: string
  value: string
  icon: typeof Clock
  live?: boolean
  warning?: boolean
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] p-3">
      <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
        <Icon className="size-3" />
        {label}
        {live && <span className="ml-1 text-green-500">&#9679; live</span>}
      </div>
      <p
        className={
          warning ? "mt-1 text-xl font-semibold text-red-500" : "mt-1 text-xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  )
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${String(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`
}
