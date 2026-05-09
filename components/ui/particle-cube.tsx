/**
 * Axonometric particle cube — the visual heart of the design system. Three
 * faces, drawn as an isometric SVG with the spec's three orange tones (active)
 * or steel-blue tones (queued/new). Sized at 28×28 by default; deliver an
 * SVG-painted illustration here when the illustrator hands one over.
 *
 * Geometry mirrors the reference HTML — top face brighter, side darker, front
 * is the "main" tone.
 */

interface ParticleCubeProps {
  state?: "active" | "queued" | "new"
  size?: number
  className?: string
}

const PALETTES = {
  active: { top: "#F4945A", front: "#E8711A", side: "#C05A10", stroke: "#B85510" },
  queued: { top: "#3A5068", front: "#2A3D52", side: "#1A2D3E", stroke: "#1A2D3E" },
  new: { top: "#3A5068", front: "#2A3D52", side: "#1A2D3E", stroke: "#1A2D3E" },
} as const

export function ParticleCube({ state = "active", size = 28, className }: ParticleCubeProps) {
  const palette = PALETTES[state]
  // Queued + new states still need to register as physical objects, not ghosts.
  // Previously these were 0.45 / 0.2 which faded the cube to near-invisible.
  const wrapperOpacity = state === "active" ? 1 : state === "queued" ? 0.85 : 0.4
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0, opacity: wrapperOpacity }}
      aria-hidden
    >
      {/* Front face (the "main" tone) */}
      <polygon
        points="4,16 14,16 14,24 4,24"
        fill={palette.front}
        stroke={palette.stroke}
        strokeWidth={0.8}
      />
      {/* Side face (darker) */}
      <polygon
        points="14,16 20,12 20,20 14,24"
        fill={palette.side}
        stroke={palette.stroke}
        strokeWidth={0.8}
      />
      {/* Top face (brighter) */}
      <polygon
        points="4,16 14,16 20,12 10,12"
        fill={palette.top}
        stroke={palette.stroke}
        strokeWidth={0.8}
      />
    </svg>
  )
}
