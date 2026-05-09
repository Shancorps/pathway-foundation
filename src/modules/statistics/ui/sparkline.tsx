/**
 * Pure-SVG sparkline. Server-renderable, no chart library. Follows the
 * engineering aesthetic: a single colored line with thin axis ticks; no
 * fill, no gradient, no shadow. Inverts visually when `lowerIsBetter` so
 * a decreasing value reads as a rise.
 */
export function Sparkline({
  points,
  color,
  lowerIsBetter = false,
  width = 220,
  height = 60,
  padding = 6,
  strokeWidth = 1.5,
}: {
  points: { date: Date; value: number }[]
  color: string
  lowerIsBetter?: boolean
  width?: number
  height?: number
  padding?: number
  strokeWidth?: number
}) {
  if (points.length < 2) {
    return (
      <svg width={width} height={height} role="img" aria-label="Sparkline (insufficient data)">
        <line
          x1={padding}
          x2={width - padding}
          y1={height / 2}
          y2={height / 2}
          stroke="var(--bp-border-default)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    )
  }
  const xs = points.map((p) => p.date.getTime())
  const ys = points.map((p) => p.value)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const xSpan = xMax - xMin || 1
  const ySpan = yMax - yMin || Math.max(Math.abs(yMax), 1)

  const sx = (x: number) => padding + ((x - xMin) / xSpan) * (width - padding * 2)
  const sy = (y: number) => {
    const norm = (y - yMin) / ySpan
    const flipped = lowerIsBetter ? norm : 1 - norm
    return padding + flipped * (height - padding * 2)
  }

  const path = points
    .map((p, i) => {
      const x = sx(p.date.getTime()).toFixed(1)
      const y = sy(p.value).toFixed(1)
      return `${i === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")

  const last = points[points.length - 1]
  if (!last) {
    // Already handled by the points.length < 2 guard above; this satisfies the
    // type-narrower without an assertion.
    return null
  }
  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="Statistic sparkline"
      style={{ display: "block" }}
    >
      {/* faint baseline tick */}
      <line
        x1={padding}
        x2={width - padding}
        y1={height - padding}
        y2={height - padding}
        stroke="var(--bp-border-default)"
        strokeWidth={1}
      />
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="miter" />
      {/* leading dot at the most recent point */}
      <circle cx={sx(last.date.getTime())} cy={sy(last.value)} r={2.5} fill={color} />
    </svg>
  )
}
