"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CornerUpLeft, ExternalLink, Pause, Play } from "lucide-react"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Checkbox } from "@/components/ui/checkbox"
import { ParticleCube } from "@/components/ui/particle-cube"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import {
  cancelRailRun,
  completeCycle,
  loopBackCycle,
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
  loopBackInitiatorName: string | null
}

export function CycleDetail({
  cycle,
  particleName,
  railName,
  railRunId,
  postTitle,
  loopBackInitiatorName,
}: CycleDetailProps) {
  const router = useRouter()
  const [submittingComplete, setSubmittingComplete] = useState(false)
  const [submittingTimer, setSubmittingTimer] = useState(false)
  const [submittingLoopBack, setSubmittingLoopBack] = useState(false)
  const isLoopBack = Boolean(cycle.loopBackOfCycleId)

  const totalItems = cycle.checklistItems.length
  const checkedItems = cycle.checklistItems.filter((i) => i.checked).length
  const requiredUnchecked = cycle.checklistItems.filter((i) => i.required && !i.checked)
  const canComplete = requiredUnchecked.length === 0
  const isClosed = Boolean(cycle.completedAt) || Boolean(cycle.cancelledAt)
  const isActive = Boolean(cycle.timerStartedAt) || checkedItems > 0
  const cardState = isActive && !isClosed ? "active" : "queued"

  async function handleToggleItem(item: CycleChecklistItem, checked: boolean) {
    const result = await updateChecklistItem({ cycleId: cycle.id, itemId: item.id, checked })
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
    if (!confirm(`Complete "${cycle.title}"? The Particle advances to the next Terminal.`)) return
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

  async function handleLoopBack() {
    const reason = prompt(
      "Why are you sending this back to the previous step? The reason is logged and shown to the upstream Terminal.",
    )
    if (reason === null) return
    const trimmed = reason.trim()
    if (!trimmed) {
      alert("A reason is required to loop back.")
      return
    }
    setSubmittingLoopBack(true)
    const result = await loopBackCycle({ cycleId: cycle.id, reason: trimmed })
    setSubmittingLoopBack(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-10">
      {isLoopBack && (
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{
            backgroundColor: "#FFF8F1",
            border: "1px solid #E8711A",
            borderLeft: "4px solid #E8711A",
          }}
          role="status"
        >
          <CornerUpLeft
            className="mt-0.5 size-4 shrink-0"
            style={{ color: "#E8711A" }}
            strokeWidth={2}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.2em",
                color: "#E8711A",
                textTransform: "uppercase",
              }}
            >
              Re-do · Loop Back
              {loopBackInitiatorName ? ` · Requested by ${loopBackInitiatorName}` : ""}
            </p>
            {cycle.loopBackReason && (
              <p
                className="mt-1.5"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "#0F0F0F",
                  lineHeight: 1.5,
                }}
              >
                {cycle.loopBackReason}
              </p>
            )}
          </div>
        </div>
      )}
      {/* Cycle header card */}
      <RegCard state={cardState} className="space-y-4">
        <div className="flex items-start gap-4">
          <ParticleCube state={cardState} size={44} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.2em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              {particleName} · {railName}
            </p>
            <h1
              className="mt-1.5"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 24,
                fontWeight: 600,
                color: "#0F0F0F",
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
              }}
            >
              {cycle.title}
            </h1>
            <p
              className="mt-2"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "#5A7A92",
                textTransform: "uppercase",
              }}
            >
              Terminal · {postTitle}
            </p>
            {cycle.description && (
              <p
                className="mt-3 max-w-[60ch]"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "#444",
                  lineHeight: 1.55,
                }}
              >
                {cycle.description}
              </p>
            )}
            {isClosed && (
              <div className="mt-3">
                <StatusPill closed={cycle.completedAt ? "completed" : "cancelled"} />
              </div>
            )}
          </div>
        </div>
      </RegCard>

      {/* Timing */}
      <section className="space-y-4">
        <SectionDivider label="Fig · 02 / Timing" />
        <TimerPanel
          cycle={cycle}
          onStart={handleStartTimer}
          onStop={handleStopTimer}
          submitting={submittingTimer}
          disabled={isClosed}
        />
      </section>

      {/* Checklist */}
      <section className="space-y-4">
        <SectionDivider
          label="Fig · 03 / Checklist"
          count={totalItems > 0 ? `${String(checkedItems)} / ${String(totalItems)}` : "—"}
          variant={requiredUnchecked.length === 0 && totalItems > 0 ? "accent" : "default"}
        />
        {totalItems === 0 ? (
          <RegCard state="new" className="px-8 py-10 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "#AAA",
                textTransform: "uppercase",
              }}
            >
              No checklist for this cycle
            </p>
          </RegCard>
        ) : (
          <RegCard state={cardState}>
            <ul className="space-y-3">
              {cycle.checklistItems
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
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
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 14,
                          color: item.checked ? "#888" : "#0F0F0F",
                          textDecoration: item.checked ? "line-through" : "none",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.label}
                        {item.required && (
                          <span
                            className="ml-1.5"
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 9,
                              fontWeight: 600,
                              color: "#E8711A",
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                            }}
                          >
                            Req
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          </RegCard>
        )}
      </section>

      {/* SOP & Tools */}
      {cycle.toolsLinks.length > 0 && (
        <section className="space-y-4">
          <SectionDivider label="Fig · 04 / SOP & Tools" count={cycle.toolsLinks.length} />
          <RegCard state="queued">
            <ul className="divide-y divide-[#E4E4E4]">
              {cycle.toolsLinks
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#0F0F0F",
                          }}
                        >
                          {link.label}
                        </p>
                        <p
                          className="mt-0.5 truncate"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.06em",
                            color: "#888",
                          }}
                        >
                          {link.url}
                        </p>
                      </div>
                      <ExternalLinkIcon />
                    </a>
                  </li>
                ))}
            </ul>
          </RegCard>
        </section>
      )}

      {/* Actions */}
      {!isClosed && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E4E4] pt-6">
          <BlueprintButton variant="ghost" size="sm" onClick={handleCancelRun}>
            Cancel Run
          </BlueprintButton>
          <div className="flex flex-wrap items-center gap-3">
            {!isLoopBack && (
              <BlueprintButton
                variant="outline"
                onClick={handleLoopBack}
                disabled={submittingLoopBack}
                title="Send this Particle back to the previous Terminal for re-do, with a written reason."
              >
                <CornerUpLeft className="size-3.5" />
                {submittingLoopBack ? "Sending..." : "Loop Back"}
              </BlueprintButton>
            )}
            <BlueprintButton
              variant="primary"
              onClick={handleComplete}
              disabled={!canComplete || submittingComplete}
              title={
                canComplete ? undefined : "Check all required items before completing the cycle"
              }
              particle
            >
              {submittingComplete ? "Completing..." : "Complete Task"}
            </BlueprintButton>
          </div>
        </div>
      )}
    </div>
  )
}

function ExternalLinkIcon() {
  return <ExternalLink className="size-3.5 shrink-0 text-[#888]" strokeWidth={1.5} aria-hidden />
}

function StatusPill({ closed }: { closed: "completed" | "cancelled" }) {
  const color = closed === "completed" ? "#2A3D52" : "#888"
  const label = closed === "completed" ? "Completed" : "Cancelled"
  return (
    <span
      className="px-2.5 py-1"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
      }}
    >
      {label}
    </span>
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
  const now = useNow(30_000)
  const liveSegmentMinutes = cycle.timerStartedAt
    ? Math.max(0, Math.round((now - new Date(cycle.timerStartedAt).getTime()) / 60000))
    : 0
  const totalMinutes = cycle.timeSpentMinutes + liveSegmentMinutes
  const issuedMs = now - new Date(cycle.issuedAt).getTime()
  const issuedMinutes = Math.max(0, Math.round(issuedMs / 60000))
  const overIdeal = cycle.idealMinutes != null && totalMinutes > cycle.idealMinutes

  return (
    <RegCard state={cycle.timerStartedAt ? "active" : "queued"} className="space-y-4">
      <div className="grid grid-cols-1 gap-px overflow-hidden bg-[#E4E4E4] md:grid-cols-3">
        <Stat label="In your inbox" value={formatMinutes(issuedMinutes)} variant="muted" />
        <Stat
          label="Active work"
          value={formatMinutes(totalMinutes)}
          variant="primary"
          live={Boolean(cycle.timerStartedAt)}
        />
        <Stat
          label="Ideal time"
          value={cycle.idealMinutes != null ? formatMinutes(cycle.idealMinutes) : "—"}
          variant={overIdeal ? "warning" : "muted"}
        />
      </div>
      <div className="flex justify-end">
        {cycle.timerStartedAt ? (
          <BlueprintButton variant="outline" onClick={onStop} disabled={disabled || submitting}>
            <Pause className="size-3.5" />
            {submitting ? "..." : "Pause Timer"}
          </BlueprintButton>
        ) : (
          <BlueprintButton variant="primary" onClick={onStart} disabled={disabled || submitting}>
            <Play className="size-3.5" />
            {submitting ? "..." : "Start Timer"}
          </BlueprintButton>
        )}
      </div>
    </RegCard>
  )
}

function Stat({
  label,
  value,
  variant = "muted",
  live = false,
}: {
  label: string
  value: string
  variant?: "muted" | "primary" | "warning"
  live?: boolean
}) {
  const valueColor =
    variant === "primary" ? "#0F0F0F" : variant === "warning" ? "#E8711A" : "#0F0F0F"
  return (
    <div className="bg-white px-5 py-4">
      <p
        className="flex items-center gap-2"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.2em",
          color: "#888",
          textTransform: "uppercase",
        }}
      >
        <span>{label}</span>
        {live && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-1.5"
              style={{ backgroundColor: "#E8711A" }}
              aria-hidden
            />
            <span style={{ color: "#E8711A", fontSize: 8, letterSpacing: "0.16em" }}>Live</span>
          </span>
        )}
      </p>
      <p
        className="mt-2"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 24,
          fontWeight: 600,
          color: valueColor,
          letterSpacing: "-0.01em",
        }}
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
