/**
 * Empty-state hero illustration: an idle conveyor rail with two terminal
 * blocks. No particle on the rail — the machine is ready and waiting.
 * Drawn axonometrically (30° isometric per spec) with three face tones for
 * each volume. Leader-line callouts in mono caps, technical-spec style.
 *
 * This is what the employee sees when their queue is clear. It should feel
 * intentional, not like an empty page.
 */
export function IdleRailIllustration({ width = 480 }: { width?: number }) {
  // Drawing canvas. Aspect ratio chosen so the rail sits center-low with
  // breathing room above for callouts.
  const W = 480
  const H = 300
  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      width={width}
      height={Math.round((width * H) / W)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* Faint coordinate grid local to the illustration — adds blueprint feel */}
      <defs>
        <pattern id="iri-grid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path
            d="M 12 0 L 0 0 0 12"
            fill="none"
            stroke="var(--bp-accent-steel)"
            strokeWidth="0.3"
          />
        </pattern>
        <radialGradient id="iri-fade" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="var(--bp-surface-card)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--bp-surface-card)" stopOpacity="1" />
        </radialGradient>
        <mask id="iri-fade-mask">
          <rect width={W} height={H} fill="white" />
          <rect width={W} height={H} fill="url(#iri-fade)" />
        </mask>
      </defs>
      <rect width={W} height={H} fill="url(#iri-grid)" opacity={0.15} mask="url(#iri-fade-mask)" />

      {/* === LEFT TERMINAL BLOCK === */}
      {/* Front face */}
      <polygon
        points="100,200 160,200 160,240 100,240"
        fill="var(--bp-accent-steel)"
        stroke="#1A1A1A"
        strokeWidth={0.8}
        strokeOpacity={0.8}
      />
      {/* Side face (right of front) */}
      <polygon
        points="160,200 184,180 184,220 160,240"
        fill="#1A2D3E"
        stroke="#1A1A1A"
        strokeWidth={0.8}
        strokeOpacity={0.8}
      />
      {/* Top face */}
      <polygon
        points="100,200 160,200 184,180 124,180"
        fill="#3A5068"
        stroke="#1A1A1A"
        strokeWidth={0.8}
        strokeOpacity={0.8}
      />

      {/* === RIGHT TERMINAL BLOCK === */}
      <polygon
        points="296,200 356,200 356,240 296,240"
        fill="var(--bp-accent-steel)"
        stroke="#1A1A1A"
        strokeWidth={0.8}
        strokeOpacity={0.8}
      />
      <polygon
        points="356,200 380,180 380,220 356,240"
        fill="#1A2D3E"
        stroke="#1A1A1A"
        strokeWidth={0.8}
        strokeOpacity={0.8}
      />
      <polygon
        points="296,200 356,200 380,180 320,180"
        fill="#3A5068"
        stroke="#1A1A1A"
        strokeWidth={0.8}
        strokeOpacity={0.8}
      />

      {/* === RAIL TRACK BETWEEN TERMINALS === */}
      {/* Two parallel rails — top and front of an axonometric strip */}
      {/* Top of rail strip */}
      <polygon
        points="160,210 296,210 320,190 184,190"
        fill="#3A5068"
        fillOpacity={0.45}
        stroke="#1A1A1A"
        strokeWidth={0.6}
        strokeOpacity={0.6}
      />
      {/* Front edge of rail strip */}
      <polygon
        points="160,210 296,210 296,214 160,214"
        fill="var(--bp-accent-steel)"
        fillOpacity={0.5}
        stroke="#1A1A1A"
        strokeWidth={0.6}
        strokeOpacity={0.6}
      />
      {/* Tick marks along the rail */}
      {[180, 204, 228, 252, 276].map((x) => (
        <line
          key={x}
          x1={x}
          y1={210}
          x2={x + 24}
          y2={190}
          stroke="var(--bp-accent-steel)"
          strokeWidth={0.4}
          strokeOpacity={0.4}
        />
      ))}

      {/* === LEADER LINES + CALLOUTS === */}
      {/* "TERMINAL 1" — leader from left block top */}
      <line
        x1={154}
        y1={180}
        x2={154}
        y2={120}
        stroke="var(--bp-text-disabled)"
        strokeWidth={0.5}
      />
      <circle cx={154} cy={120} r={1.5} fill="var(--bp-text-disabled)" />
      <text
        x={154}
        y={108}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--bp-text-muted)"
        letterSpacing="1.2"
      >
        TERMINAL 1
      </text>

      {/* "TERMINAL 2" — leader from right block top */}
      <line
        x1={350}
        y1={180}
        x2={350}
        y2={120}
        stroke="var(--bp-text-disabled)"
        strokeWidth={0.5}
      />
      <circle cx={350} cy={120} r={1.5} fill="var(--bp-text-disabled)" />
      <text
        x={350}
        y={108}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--bp-text-muted)"
        letterSpacing="1.2"
      >
        TERMINAL 2
      </text>

      {/* "RAIL — IDLE" — leader from middle of rail */}
      <line
        x1={240}
        y1={205}
        x2={240}
        y2={260}
        stroke="var(--bp-text-disabled)"
        strokeWidth={0.5}
      />
      <circle cx={240} cy={205} r={1.5} fill="var(--bp-text-disabled)" />
      <text
        x={240}
        y={273}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="10"
        fontWeight="600"
        fill="var(--bp-text-primary)"
        letterSpacing="2"
      >
        NO ACTIVE CYCLES
      </text>
      <text
        x={240}
        y={286}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="8"
        fill="var(--bp-text-disabled)"
        letterSpacing="1.5"
      >
        RAIL IDLE — READY FOR ASSIGNMENT
      </text>

      {/* === Top-right coordinate marker (drawing-style) === */}
      <text
        x={W - 12}
        y={20}
        textAnchor="end"
        fontFamily="var(--font-mono)"
        fontSize="7"
        fill="var(--bp-text-disabled)"
        letterSpacing="2"
      >
        FIG · 01 / IDLE STATE
      </text>
      <line x1={W - 100} y1={26} x2={W - 12} y2={26} stroke="#EEE" strokeWidth={0.5} />
    </svg>
  )
}
