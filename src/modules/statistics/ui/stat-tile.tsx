import Link from "next/link"
import { RegCard } from "@/components/ui/reg-card"
import type { StatTileData } from "../queries"
import { STAT_COLORS } from "./colors"
import { Sparkline } from "./sparkline"

export function StatTile({ data, href }: { data: StatTileData; href: string }) {
  const { stat, currentValue, changeFraction, spark } = data
  const color = STAT_COLORS[stat.color]
  return (
    <Link href={href} className="block">
      <RegCard state="queued" className="!px-5 !py-5 transition-colors hover:bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="truncate"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                fontWeight: 600,
                color: "#0F0F0F",
                letterSpacing: "-0.005em",
              }}
            >
              {stat.name}
            </p>
            <p
              className="mt-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              Org-wide · {stat.frequency}
              {stat.lowerIsBetter ? " · ↓ better" : ""}
            </p>
          </div>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              backgroundColor: color,
              border: "1px solid #0F0F0F",
            }}
          />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 28,
                fontWeight: 600,
                color: "#0F0F0F",
                letterSpacing: "-0.015em",
                lineHeight: 1,
              }}
            >
              {currentValue != null ? formatValue(currentValue, stat.unit) : "—"}
            </p>
          </div>
          <ChangePill change={changeFraction} lowerIsBetter={stat.lowerIsBetter} />
        </div>

        <div className="mt-4">
          <Sparkline points={spark} color={color} lowerIsBetter={stat.lowerIsBetter} />
        </div>
      </RegCard>
    </Link>
  )
}

export function AddTilePlaceholder({ href }: { href: string }) {
  return (
    <Link href={href} className="block">
      <RegCard
        state="new"
        className="grid h-full place-items-center px-5 py-10 transition-colors hover:bg-white"
      >
        <div className="text-center">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "#0F0F0F",
              textTransform: "uppercase",
            }}
          >
            + Add Graph
          </p>
          <p
            className="mt-2 max-w-[24ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "#888",
              lineHeight: 1.45,
            }}
          >
            Track a numerical KPI by hand or via rail completions.
          </p>
        </div>
      </RegCard>
    </Link>
  )
}

function ChangePill({ change, lowerIsBetter }: { change: number | null; lowerIsBetter: boolean }) {
  if (change === null) {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "#AAA",
          textTransform: "uppercase",
        }}
      >
        — vs prev
      </span>
    )
  }
  // For "lower is better" stats, a decrease is shown as ↑ (improvement reads
  // as a rise), per spec §4.6.
  const upArrow = change > 0
  const visualUp = lowerIsBetter ? !upArrow : upArrow
  const arrow = upArrow ? "↑" : change < 0 ? "↓" : "·"
  const color = visualUp ? "#1F4E36" : change < 0 ? "#6B1F2E" : "#888"
  const pct = (Math.abs(change) * 100).toFixed(0)
  return (
    <span
      className="px-2 py-1"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.18em",
        color,
        border: `1px solid ${color}`,
        textTransform: "uppercase",
      }}
    >
      {arrow} {pct}%
    </span>
  )
}

function formatValue(value: number, unit: string | null): string {
  const abs = Math.abs(value)
  let body: string
  if (abs >= 1_000_000) body = `${(value / 1_000_000).toFixed(1)}M`
  else if (abs >= 1000) body = `${(value / 1000).toFixed(1)}k`
  else if (Number.isInteger(value)) body = String(value)
  else body = value.toFixed(1)
  return unit ? `${body} ${unit}` : body
}
