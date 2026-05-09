import Link from "next/link"
import { ArrowLeft, Check, CornerUpLeft } from "lucide-react"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import type { RunTimeline, RunTimelineCycle } from "../queries"

/**
 * Per-rail-run timeline (a.k.a. "Rail Activity" audit, the canonical audit
 * surface in Pathway). Shows each cycle in position order with its handler,
 * timestamps, time spent, and loop-back tags. Server-rendered, read-only.
 */
export function RunTimeline({ timeline }: { timeline: RunTimeline }) {
  const { run, cycles, totalActiveMinutes, totalElapsedMinutes } = timeline
  return (
    <div className="space-y-10">
      <RegCard state={runStateForCard(run.status)} className="!px-6 !py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
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
              {run.railName} · {run.particleName}
            </p>
            <h2
              className="mt-1.5"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 22,
                fontWeight: 600,
                color: "#0F0F0F",
                letterSpacing: "-0.01em",
              }}
            >
              Run · {run.id.slice(0, 8)}
            </h2>
            <p
              className="mt-1.5"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "#444",
              }}
            >
              Started {formatStamp(run.startedAt)}
              {run.starterName ? ` by ${run.starterName}` : ""}
            </p>
            {run.completedAt && run.finisherName && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "#444",
                }}
              >
                Completed {formatStamp(run.completedAt)} by {run.finisherName}
              </p>
            )}
            {run.cancelledAt && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "#444",
                }}
              >
                Cancelled {formatStamp(run.cancelledAt)}
                {run.cancellerName ? ` by ${run.cancellerName}` : ""}
                {run.cancellationReason ? ` — "${run.cancellationReason}"` : ""}
              </p>
            )}
          </div>
          <RunStatusPill status={run.status} />
        </div>

        <div
          className="mt-5 grid grid-cols-1 gap-px overflow-hidden md:grid-cols-3"
          style={{ backgroundColor: "#E4E4E4" }}
        >
          <RunStat label="Cycles" value={String(cycles.length)} />
          <RunStat label="Active work" value={formatMinutes(totalActiveMinutes)} />
          <RunStat label="Elapsed" value={formatMinutes(totalElapsedMinutes)} />
        </div>
      </RegCard>

      <section className="space-y-4">
        <SectionDivider label="Fig · 01 / Cycle Timeline" count={cycles.length} />
        {cycles.length === 0 ? (
          <RegCard state="new" className="px-12 py-10 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              No cycles in this run
            </p>
          </RegCard>
        ) : (
          <ol className="space-y-3">
            {cycles.map((c) => (
              <li key={c.id}>
                <CycleRow cycle={c} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function CycleRow({ cycle }: { cycle: RunTimelineCycle }) {
  const isLoopBack = cycle.loopBackOfCycleId !== null
  const isComplete = cycle.completedAt !== null
  const isCancelled = cycle.cancelledAt !== null
  const isOpen = !isComplete && !isCancelled
  const overIdeal = cycle.idealMinutes !== null && cycle.timeSpentMinutes > cycle.idealMinutes

  return (
    <Link href={`/my-actions/${cycle.id}`} className="block">
      <RegCard
        state={isOpen ? "active" : "queued"}
        className="!px-5 !py-4 transition-colors hover:bg-white"
      >
        <div className="flex items-start gap-4">
          <PositionBadge n={cycle.position} state={isOpen ? "active" : "queued"} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#0F0F0F",
                  letterSpacing: "-0.005em",
                }}
              >
                {cycle.title}
              </h3>
              {isLoopBack && <LoopBackTag />}
              {cycle.hadLoopBackFromThis && <ActiveLoopBackTag />}
            </div>
            <p
              className="mt-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.16em",
                color: "#5A7A92",
                textTransform: "uppercase",
              }}
            >
              Terminal · {cycle.postTitle}
            </p>

            {/* Timestamps + actor */}
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-3">
              <Field label="Issued" value={formatStamp(cycle.issuedAt)} />
              <Field
                label={cycle.completedAt ? "Completed" : cycle.cancelledAt ? "Cancelled" : "Status"}
                value={
                  cycle.completedAt
                    ? `${formatStamp(cycle.completedAt)}${cycle.completerName ? ` · ${cycle.completerName}` : ""}`
                    : cycle.cancelledAt
                      ? formatStamp(cycle.cancelledAt)
                      : cycle.timerStartedAt
                        ? "In progress (timer running)"
                        : "Open"
                }
              />
              <Field
                label="Active work"
                value={
                  cycle.idealMinutes !== null
                    ? `${formatMinutes(cycle.timeSpentMinutes)} / ${formatMinutes(cycle.idealMinutes)}`
                    : formatMinutes(cycle.timeSpentMinutes)
                }
                accent={overIdeal ? "warning" : "muted"}
              />
            </dl>

            {/* Loop-back receiver banner */}
            {isLoopBack && (
              <div className="mt-3" style={{ borderLeft: "3px solid #E8711A", paddingLeft: 12 }}>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    color: "#E8711A",
                    textTransform: "uppercase",
                  }}
                >
                  Re-do · Requested by {cycle.loopBackInitiatorName ?? "Unknown"}
                </p>
                {cycle.loopBackReason && (
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "#444",
                      lineHeight: 1.5,
                    }}
                  >
                    {cycle.loopBackReason}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </RegCard>
    </Link>
  )
}

function PositionBadge({ n, state }: { n: number; state: "active" | "queued" }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: 32,
        height: 32,
        backgroundColor: state === "active" ? "#0F0F0F" : "#fff",
        color: state === "active" ? "#fff" : "#0F0F0F",
        border: "1px solid #0F0F0F",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.05em",
      }}
    >
      {String(n)}
    </span>
  )
}

function RunStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.2em",
          color: "#888",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p
        className="mt-2"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 22,
          fontWeight: 600,
          color: "#0F0F0F",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </p>
    </div>
  )
}

function Field({
  label,
  value,
  accent = "muted",
}: {
  label: string
  value: string
  accent?: "muted" | "warning"
}) {
  const valueColor = accent === "warning" ? "#E8711A" : "#0F0F0F"
  return (
    <div>
      <dt
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "#888",
          textTransform: "uppercase",
        }}
      >
        {label}
      </dt>
      <dd
        className="mt-0.5"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: valueColor,
          fontWeight: accent === "warning" ? 600 : 400,
        }}
      >
        {value}
      </dd>
    </div>
  )
}

function RunStatusPill({ status }: { status: "running" | "completed" | "cancelled" }) {
  const config = {
    running: { color: "#E8711A", label: "Running", filled: true, icon: null as React.ReactNode },
    completed: {
      color: "#1F4E36",
      label: "Completed",
      filled: false,
      icon: (<Check className="size-3" strokeWidth={2.5} aria-hidden />) as React.ReactNode,
    },
    cancelled: { color: "#888", label: "Cancelled", filled: false, icon: null as React.ReactNode },
  }[status]
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: config.filled ? "#fff" : config.color,
        backgroundColor: config.filled ? config.color : "transparent",
        border: `1px solid ${config.color}`,
      }}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

function LoopBackTag() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.18em",
        color: "#fff",
        backgroundColor: "#E8711A",
        textTransform: "uppercase",
      }}
    >
      <CornerUpLeft className="size-3" strokeWidth={2.25} aria-hidden />
      Loop Back
    </span>
  )
}

function ActiveLoopBackTag() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.18em",
        color: "#2A3D52",
        border: "1px solid #2A3D52",
        textTransform: "uppercase",
      }}
    >
      Looped from
    </span>
  )
}

function runStateForCard(
  status: "running" | "completed" | "cancelled",
): "active" | "queued" | "new" {
  if (status === "running") return "active"
  return "queued"
}

function formatStamp(d: Date): string {
  return new Date(d)
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .toUpperCase()
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0m"
  if (minutes < 60) return `${String(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours === 0 ? `${String(days)}d` : `${String(days)}d ${String(restHours)}h`
}

export function BackToRailsLink() {
  return (
    <Link
      href="/rails"
      className="inline-flex items-center gap-2 text-[#888] transition-colors hover:text-[#0F0F0F]"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      <ArrowLeft className="size-3" strokeWidth={2} />
      Back to Rails
    </Link>
  )
}
