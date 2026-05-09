"use client"

import {
  CheckSquare,
  CircleDot,
  GitBranch,
  GitMerge,
  Pencil,
  Settings2,
  StopCircle,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react"

/** MIME-ish payload key xyflow's drop handler reads to know what was dropped. */
export const PALETTE_DRAG_TYPE = "application/x-pathway-rail-node"

type PaletteNodeId =
  | "trigger"
  | "task"
  | "initialize"
  | "condition"
  | "parallel"
  | "end"
  | "approval"
  | "statistic"
  | "manifest"
  | "sub_flow"

interface PaletteNode {
  id: PaletteNodeId
  label: string
  hint: string
  icon: LucideIcon
  iconColor: string
  /** When false, the card renders as "soon" — no drag, dimmed. */
  enabled: boolean
}

const RAIL_GROUP: PaletteNode[] = [
  {
    id: "trigger",
    label: "Trigger",
    hint: "Start the flow",
    icon: Zap,
    iconColor: "#E8711A",
    // Triggers are added at rail creation; only one allowed today. Disable the
    // drag for now — we render it for visual completeness but it can't be
    // dropped.
    enabled: false,
  },
  {
    id: "task",
    label: "Task",
    hint: "Assign a step to a Terminal",
    icon: CheckSquare,
    iconColor: "#2A3D52",
    enabled: true,
  },
  {
    id: "initialize",
    label: "Initialize",
    hint: "Set required fields",
    icon: Settings2,
    iconColor: "#5B527A",
    enabled: false,
  },
  {
    id: "condition",
    label: "Condition",
    hint: "Branch the flow",
    icon: GitBranch,
    iconColor: "#7A5C1F",
    enabled: false,
  },
  {
    id: "parallel",
    label: "Parallel",
    hint: "Run branches simultaneously",
    icon: GitMerge,
    iconColor: "#1F4E36",
    enabled: false,
  },
  {
    id: "end",
    label: "End",
    hint: "Terminate the rail",
    icon: StopCircle,
    iconColor: "#B83229",
    enabled: true,
  },
]

const ACTION_GROUP: PaletteNode[] = [
  {
    id: "approval",
    label: "Approval",
    hint: "Request approve / reject",
    icon: CircleDot,
    iconColor: "#1F4E36",
    enabled: true,
  },
  {
    id: "statistic",
    label: "Statistic",
    hint: "Update statistic",
    icon: Workflow,
    iconColor: "#5A7A92",
    enabled: false,
  },
  {
    id: "manifest",
    label: "Manifest",
    hint: "Update manifest",
    icon: Pencil,
    iconColor: "#5A7A92",
    enabled: false,
  },
  {
    id: "sub_flow",
    label: "Sub-Flow",
    hint: "Run another rail",
    icon: Workflow,
    iconColor: "#5B527A",
    enabled: true,
  },
]

/**
 * Left palette of rail-builder node types. Drag a card onto the canvas to add
 * the node. Only Trigger and Task are wired in v1 — the rest are placeholder
 * cards marked "soon" so the spec's full vocabulary is visible from day one.
 */
export function RailPalette({ disabled = false }: { disabled?: boolean }) {
  return (
    <aside
      className="flex h-full flex-col"
      style={{
        width: 200,
        borderRight: "1px solid #0F0F0F",
        backgroundColor: "#fff",
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid #E4E4E4" }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.2em",
            color: "#0F0F0F",
            textTransform: "uppercase",
          }}
        >
          Steps
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <PaletteGroup label="Rail" nodes={RAIL_GROUP} disabled={disabled} />
        <div className="h-3" />
        <PaletteGroup label="Action" nodes={ACTION_GROUP} disabled={disabled} />
      </div>

      {disabled && (
        <div
          className="px-4 py-3"
          style={{
            borderTop: "1px solid #E4E4E4",
            backgroundColor: "#FAFAFA",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.16em",
            color: "#888",
            textTransform: "uppercase",
          }}
        >
          Unpublish to add
        </div>
      )}
    </aside>
  )
}

function PaletteGroup({
  label,
  nodes,
  disabled,
}: {
  label: string
  nodes: PaletteNode[]
  disabled: boolean
}) {
  return (
    <div>
      <p
        className="px-1 pb-2"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.22em",
          color: "#888",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <ul className="space-y-1.5">
        {nodes.map((n) => (
          <li key={n.id}>
            <PaletteCard node={n} disabled={disabled} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function PaletteCard({ node, disabled }: { node: PaletteNode; disabled: boolean }) {
  const draggable = node.enabled && !disabled
  const Icon = node.icon
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData(PALETTE_DRAG_TYPE, node.id)
        e.dataTransfer.effectAllowed = "move"
      }}
      className="flex items-center gap-2 px-2.5 py-2 transition-colors"
      style={{
        border: "1px solid #D4D4D4",
        backgroundColor: draggable ? "#fff" : "#FAFAFA",
        cursor: draggable ? "grab" : "not-allowed",
        opacity: draggable ? 1 : 0.55,
      }}
      title={draggable ? `Drag onto canvas — ${node.hint}` : "Coming soon"}
    >
      <span
        aria-hidden
        className="grid shrink-0 place-items-center"
        style={{
          width: 22,
          height: 22,
          backgroundColor: draggable ? "#FAFAFA" : "transparent",
          border: `1px solid ${node.iconColor}`,
        }}
      >
        <Icon className="size-3" strokeWidth={2} style={{ color: node.iconColor }} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 600,
            color: "#0F0F0F",
            lineHeight: 1.2,
          }}
        >
          {node.label}
        </p>
        <p
          className="truncate"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: "#888",
          }}
        >
          {node.enabled ? node.hint : "Soon"}
        </p>
      </div>
    </div>
  )
}
