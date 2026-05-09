/**
 * Horizontal rule that breaks for a mono-caps label, like a figure-caption
 * separator in an engineering doc. Use between top-level sections of a page.
 *
 *   ────  FIG · 02 / ACTIVE QUEUE  ──────────────────────────  [count]
 */
export function SectionDivider({
  label,
  count,
  variant = "default",
}: {
  label: string
  count?: string | number
  variant?: "default" | "accent"
}) {
  const labelColor = variant === "accent" ? "var(--bp-accent-orange)" : "var(--bp-text-primary)"
  const ruleColor = variant === "accent" ? "var(--bp-accent-orange)" : "var(--bp-border-default)"
  return (
    <div className="flex items-center gap-3">
      <span
        className="shrink-0"
        style={{ width: 28, height: 1, backgroundColor: ruleColor }}
        aria-hidden
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.2em",
          color: labelColor,
        }}
      >
        {label.toUpperCase()}
      </span>
      <span
        className="flex-1"
        style={{ height: 1, backgroundColor: "var(--bp-border-default)" }}
        aria-hidden
      />
      {count !== undefined && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.16em",
            color: "var(--bp-text-muted)",
          }}
        >
          [{String(count)}]
        </span>
      )}
    </div>
  )
}
