/**
 * Engineering grid paper — visible enough to feel like substrate, faint
 * enough not to compete with content. Square grid at 24px with 1px lines,
 * masked with a radial gradient so density falls off toward the edges.
 *
 * Render this absolutely-positioned inside a relatively-positioned container
 * with `pointer-events: none`. It self-fits the parent.
 */
export function GridBg() {
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="pw-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#2A3D52" strokeWidth="0.4" />
        </pattern>
        <pattern id="pw-grid-fine" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#2A3D52" strokeWidth="0.25" />
        </pattern>
        <radialGradient id="pw-grid-fade" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#fff" stopOpacity="1" />
        </radialGradient>
        <mask id="pw-grid-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect width="100%" height="100%" fill="url(#pw-grid-fade)" />
        </mask>
      </defs>
      {/* Fine grid — barely visible, 6px squares */}
      <rect
        width="100%"
        height="100%"
        fill="url(#pw-grid-fine)"
        opacity={0.06}
        mask="url(#pw-grid-mask)"
      />
      {/* Major grid — 24px squares */}
      <rect
        width="100%"
        height="100%"
        fill="url(#pw-grid)"
        opacity={0.1}
        mask="url(#pw-grid-mask)"
      />
    </svg>
  )
}
