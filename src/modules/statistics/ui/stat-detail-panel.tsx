import Link from "next/link"
import { X } from "lucide-react"
import { RegCard } from "@/components/ui/reg-card"
import type { DataPoint, Statistic } from "../schema"
import { STAT_COLORS } from "./colors"
import { AddDataPointButton, DataPointRowActions, StatisticEditButtons } from "./dialogs"
import { FullGraph } from "./full-graph"

export function StatDetailPanel({
  stat,
  points,
  closeHref,
}: {
  stat: Statistic
  points: DataPoint[]
  closeHref: string
}) {
  const color = STAT_COLORS[stat.color]
  // Order oldest → newest for the graph; the points list below stays newest-first.
  const graphPoints = [...points]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((p) => ({ date: new Date(p.date), value: p.value }))

  return (
    <RegCard state="active" className="!px-6 !py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            style={{
              width: 12,
              height: 12,
              backgroundColor: color,
              border: "1px solid #0F0F0F",
              marginTop: 6,
            }}
          />
          <div>
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
              Statistic · Detail
            </p>
            <h2
              className="mt-1.5"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 24,
                fontWeight: 600,
                color: "#0F0F0F",
                letterSpacing: "-0.01em",
              }}
            >
              {stat.name}
            </h2>
            <p
              className="mt-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              Org-wide · {stat.frequency}
              {stat.unit ? ` · ${stat.unit}` : ""}
              {stat.lowerIsBetter ? " · Lower is better" : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatisticEditButtons stat={stat} />
          <Link
            href={closeHref}
            className="text-[#888] transition-colors hover:text-[#0F0F0F]"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2} />
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto" style={{ border: "1px solid #E4E4E4" }}>
        <FullGraph
          points={graphPoints}
          color={color}
          unit={stat.unit}
          lowerIsBetter={stat.lowerIsBetter}
        />
      </div>

      <div className="mt-7 flex items-center justify-between gap-3">
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
          Data Points [{points.length}]
        </p>
        <AddDataPointButton statisticId={stat.id} unit={stat.unit} />
      </div>

      {points.length === 0 ? (
        <p
          className="mt-6 text-center"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "#888",
            textTransform: "uppercase",
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          No entries yet · Add the first one above
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[#E4E4E4]" style={{ border: "1px solid #E4E4E4" }}>
          {points.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#0F0F0F",
                  }}
                >
                  {formatValue(p.value, stat.unit)}
                </p>
                <p
                  className="mt-0.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "#888",
                    textTransform: "uppercase",
                  }}
                >
                  {formatDate(p.date)}
                  {p.source !== "manual" ? ` · ${p.source}` : ""}
                </p>
                {p.note && (
                  <p
                    className="mt-1.5 max-w-[60ch]"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "#444",
                      lineHeight: 1.5,
                    }}
                  >
                    {p.note}
                  </p>
                )}
              </div>
              <DataPointRowActions point={p} unit={stat.unit} />
            </li>
          ))}
        </ul>
      )}
    </RegCard>
  )
}

function formatValue(value: number, unit: string | null): string {
  const body = Number.isInteger(value) ? String(value) : value.toFixed(2)
  return unit ? `${body} ${unit}` : body
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}
