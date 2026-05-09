import { type HTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

export type RegCardState = "active" | "queued" | "new"

interface RegCardProps extends HTMLAttributes<HTMLDivElement> {
  state?: RegCardState
  /** Off-white tint so cards read as distinct objects against the page. Default true. */
  filled?: boolean
}

/**
 * Open-corner registration card. The four corners are 10×10 boxes painted on
 * two adjacent edges (top+left, top+right, bottom+left, bottom+right) so they
 * read as proper L-shaped corner marks — a technical-drawing convention. No
 * full border. The active state additionally paints a 2px Particle Orange line
 * down the left between the two left corner marks.
 *
 * The border-color logic mirrors the design spec:
 *   - active: graphite black corners + orange left-line
 *   - queued: steel blue at 50% opacity (the work is paused)
 *   - new:    pale grey (the work hasn't been engaged yet)
 */
export const RegCard = forwardRef<HTMLDivElement, RegCardProps>(function RegCard(
  { state = "active", filled = true, className, children, ...props },
  ref,
) {
  const cornerColor =
    state === "active"
      ? "var(--bp-border-graphite)"
      : state === "queued"
        ? "var(--bp-accent-steel)"
        : "var(--bp-border-strong)"
  const cornerOpacity = state === "queued" ? 0.6 : 1
  // Slightly larger corner marks (12px stubs at 2px) so cards read clearly.
  const stub = 12
  const stubWeight = 2

  const cornerStyle = (sides: { t?: boolean; r?: boolean; b?: boolean; l?: boolean }) => ({
    position: "absolute" as const,
    width: `${String(stub)}px`,
    height: `${String(stub)}px`,
    pointerEvents: "none" as const,
    borderTopWidth: sides.t ? `${String(stubWeight)}px` : 0,
    borderRightWidth: sides.r ? `${String(stubWeight)}px` : 0,
    borderBottomWidth: sides.b ? `${String(stubWeight)}px` : 0,
    borderLeftWidth: sides.l ? `${String(stubWeight)}px` : 0,
    borderStyle: "solid" as const,
    borderColor: cornerColor,
    opacity: cornerOpacity,
  })

  // Off-white fill so cards visually separate from the page. Active gets a
  // warm tint to telegraph "live work"; queued / new get the neutral card
  // surface. In dark mode these tokens flip to layered dark variants.
  const fillBg = filled
    ? state === "active"
      ? "var(--bp-surface-card-active)"
      : "var(--bp-surface-card-queued)"
    : "var(--bp-surface-card)"

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      style={{ padding: "18px 20px", backgroundColor: fillBg }}
      {...props}
    >
      {/* TL */}
      <span aria-hidden style={{ ...cornerStyle({ t: true, l: true }), top: 0, left: 0 }} />
      {/* TR */}
      <span aria-hidden style={{ ...cornerStyle({ t: true, r: true }), top: 0, right: 0 }} />
      {/* BL */}
      <span aria-hidden style={{ ...cornerStyle({ b: true, l: true }), bottom: 0, left: 0 }} />
      {/* BR */}
      <span aria-hidden style={{ ...cornerStyle({ b: true, r: true }), bottom: 0, right: 0 }} />

      {/* Active-state left accent — runs between the two left L's, 3px so it
          reads as a deliberate signal rather than a hairline. */}
      {state === "active" && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: "12px",
            bottom: "12px",
            width: "3px",
            backgroundColor: "var(--bp-accent-orange)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Queued state: orange L on the top-left + bottom-left to hint at "next up". */}
      {/* (Kept off by default; uncomment if we want the visual signal.) */}

      <div className="relative">{children}</div>
    </div>
  )
})
