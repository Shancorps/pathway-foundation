/**
 * Larger SVG graph for the stat detail side panel. Same pure-SVG approach as
 * Sparkline but with axis labels (start/end date, min/max value), gridlines,
 * and per-point markers.
 */
export function FullGraph({
  points,
  color,
  unit,
  lowerIsBetter = false,
  width = 580,
  height = 220,
}: {
  points: { date: Date; value: number }[]
  color: string
  unit?: string | null
  lowerIsBetter?: boolean
  width?: number
  height?: number
}) {
  const padLeft = 56
  const padRight = 12
  const padTop = 14
  const padBottom = 28

  if (points.length === 0) {
    return (
      <svg width={width} height={height} role="img" aria-label="No data points">
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            fill: "#888",
            textTransform: "uppercase",
          }}
        >
          No data points yet
        </text>
      </svg>
    )
  }

  const xs = points.map((p) => p.date.getTime())
  const ys = points.map((p) => p.value)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys, 0)
  const yMax = Math.max(...ys, 0)
  const xSpan = xMax - xMin || 1
  const ySpan = yMax - yMin || Math.max(Math.abs(yMax), 1)

  const sx = (x: number) => padLeft + ((x - xMin) / xSpan) * (width - padLeft - padRight)
  const sy = (y: number) => {
    const norm = (y - yMin) / ySpan
    const flipped = lowerIsBetter ? norm : 1 - norm
    return padTop + flipped * (height - padTop - padBottom)
  }

  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${sx(p.date.getTime()).toFixed(1)} ${sy(p.value).toFixed(1)}`,
    )
    .join(" ")

  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return null

  const yTicks = ticks(yMin, yMax, 4)
  const xLabels = points.length === 1 ? [first.date] : [first.date, last.date]

  return (
    <svg width={width} height={height} role="img" aria-label="Statistic graph">
      {/* y-axis grid + labels */}
      {yTicks.map((t, i) => {
        const yp = sy(t)
        return (
          <g key={i}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={yp}
              y2={yp}
              stroke="#EFEFEF"
              strokeWidth={1}
            />
            <text
              x={padLeft - 8}
              y={yp + 3}
              textAnchor="end"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
                fill: "#888",
              }}
            >
              {formatNumber(t)}
              {unit ? ` ${unit}` : ""}
            </text>
          </g>
        )
      })}

      {/* x-axis baseline */}
      <line
        x1={padLeft}
        x2={width - padRight}
        y1={height - padBottom}
        y2={height - padBottom}
        stroke="#0F0F0F"
        strokeWidth={1}
      />

      {/* x-axis labels */}
      {xLabels.map((d, i) => (
        <text
          key={i}
          x={i === 0 ? padLeft : width - padRight}
          y={height - padBottom + 18}
          textAnchor={i === 0 ? "start" : "end"}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            fill: "#888",
            textTransform: "uppercase",
          }}
        >
          {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </text>
      ))}

      {/* the line */}
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="miter" />

      {/* point markers */}
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.date.getTime())} cy={sy(p.value)} r={2.5} fill={color} />
      ))}
    </svg>
  )
}

function ticks(min: number, max: number, count: number): number[] {
  if (min === max) return [min]
  const step = (max - min) / count
  const out: number[] = []
  for (let i = 0; i <= count; i++) out.push(min + step * i)
  return out
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1)
}
