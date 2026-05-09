"use client"

import { useMemo } from "react"
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { CheckSquare, Clock, Link as LinkIcon, MapPin, Zap } from "lucide-react"
import "@xyflow/react/dist/style.css"
import type { RailNode } from "../schema"

interface PostOption {
  id: string
  title: string
  containerLabel?: string | null
  vacant: boolean
}

interface CanvasNodeData extends Record<string, unknown> {
  node: RailNode
  postTitle: string | null
  postVacant: boolean
}

const NODE_WIDTH = 240
const NODE_HORIZONTAL_GAP = 80
const NODE_VERTICAL_OFFSET = 120

/**
 * n8n-style canvas for a rail. Read-only in v1: shows the conveyor belt as
 * a left-to-right node graph with edges between steps. Editing stays in the
 * Steps list — clicking a node here just opens its detail card inline.
 */
export function RailCanvas({
  nodes: railNodes,
  posts,
}: {
  nodes: RailNode[]
  posts: PostOption[]
}) {
  const postById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts])

  const flowNodes = useMemo<Node<CanvasNodeData>[]>(() => {
    return railNodes.map((n, idx) => {
      const post = n.postId ? postById.get(n.postId) : undefined
      return {
        id: n.id,
        type: "railNode",
        position: {
          x: idx * (NODE_WIDTH + NODE_HORIZONTAL_GAP),
          y: NODE_VERTICAL_OFFSET,
        },
        data: {
          node: n,
          postTitle: post?.title ?? null,
          postVacant: post?.vacant ?? false,
        },
        draggable: false,
        selectable: true,
      }
    })
  }, [railNodes, postById])

  const flowEdges = useMemo<Edge[]>(() => {
    const edges: Edge[] = []
    for (let i = 0; i < railNodes.length - 1; i++) {
      const a = railNodes[i]
      const b = railNodes[i + 1]
      if (!a || !b) continue
      edges.push({
        id: `${a.id}->${b.id}`,
        source: a.id,
        target: b.id,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#0F0F0F", strokeWidth: 1.5 },
      })
    }
    return edges
  }, [railNodes])

  return (
    <div
      className="h-[520px] w-full"
      style={{
        border: "1px solid #0F0F0F",
        backgroundColor: "#FAFAFA",
      }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1.4 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        panOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
      >
        <Background gap={24} size={1} color="#E4E4E4" />
        <Controls
          showInteractive={false}
          position="bottom-left"
          style={{
            border: "1px solid #0F0F0F",
            backgroundColor: "#fff",
          }}
        />
      </ReactFlow>
    </div>
  )
}

const NODE_TYPES = { railNode: RailNodeView }

function RailNodeView({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  const { node, postTitle, postVacant } = data
  const isTrigger = node.type === "trigger"
  const accent = isTrigger ? "#E8711A" : "#2A3D52"
  const checklistCount = Array.isArray(node.checklistItems) ? node.checklistItems.length : 0
  const toolsCount = Array.isArray(node.toolsLinks) ? node.toolsLinks.length : 0
  const hasIdeal = node.idealMinutes != null && node.idealMinutes > 0

  return (
    <div
      style={{
        width: NODE_WIDTH,
        backgroundColor: "#fff",
        border: `1px solid ${selected ? "#E8711A" : "#0F0F0F"}`,
        boxShadow: selected ? "0 0 0 2px #FFE6D5" : undefined,
        position: "relative",
        cursor: "pointer",
      }}
    >
      <CornerMarks color={selected ? "#E8711A" : "#0F0F0F"} />

      {/* Type strip */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{
          backgroundColor: isTrigger ? "#FFF8F1" : "#FAFAFA",
          borderBottom: "1px solid #E4E4E4",
        }}
      >
        <div className="flex items-center gap-1.5">
          {isTrigger ? (
            <Zap className="size-3" strokeWidth={2} style={{ color: "#E8711A" }} aria-hidden />
          ) : (
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                backgroundColor: "#2A3D52",
                display: "inline-block",
              }}
            />
          )}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: accent,
              textTransform: "uppercase",
            }}
          >
            {isTrigger ? "Trigger" : "Task"}
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.16em",
            color: "#888",
            textTransform: "uppercase",
          }}
        >
          {String(node.position).padStart(2, "0")}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-3">
        <p
          className="line-clamp-2"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            color: "#0F0F0F",
            lineHeight: 1.3,
            letterSpacing: "-0.005em",
            wordBreak: "break-word",
          }}
        >
          {node.name}
        </p>

        {/* Post (Terminal) */}
        {!isTrigger && (
          <div className="mt-2.5 flex items-start gap-1.5">
            <MapPin
              className="mt-px size-3 shrink-0"
              strokeWidth={1.75}
              style={{ color: postVacant ? "#B83229" : "#5A7A92" }}
              aria-hidden
            />
            <p
              className="truncate"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: postVacant ? "#B83229" : "#5A7A92",
                textTransform: "uppercase",
              }}
            >
              {postTitle ?? "No terminal"}
              {postVacant && " · vacant"}
            </p>
          </div>
        )}

        {/* Stats */}
        {!isTrigger && (checklistCount > 0 || toolsCount > 0 || hasIdeal) && (
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
            {checklistCount > 0 && (
              <Stat icon={<CheckSquare className="size-3" strokeWidth={1.75} aria-hidden />}>
                {checklistCount}
              </Stat>
            )}
            {toolsCount > 0 && (
              <Stat icon={<LinkIcon className="size-3" strokeWidth={1.75} aria-hidden />}>
                {toolsCount}
              </Stat>
            )}
            {hasIdeal && (
              <Stat icon={<Clock className="size-3" strokeWidth={1.75} aria-hidden />}>
                {formatMinutes(node.idealMinutes ?? 0)}
              </Stat>
            )}
          </div>
        )}
      </div>

      {/* Connection handles — invisible but functional for edge endpoints */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "transparent", border: "none", width: 6, height: 6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "transparent", border: "none", width: 6, height: 6 }}
      />
    </div>
  )
}

function CornerMarks({ color }: { color: string }) {
  const stub = 10
  const w = 1.5
  const corner = (sides: {
    t?: boolean
    r?: boolean
    b?: boolean
    l?: boolean
  }): React.CSSProperties => ({
    position: "absolute",
    width: stub,
    height: stub,
    pointerEvents: "none",
    borderTopWidth: sides.t ? w : 0,
    borderRightWidth: sides.r ? w : 0,
    borderBottomWidth: sides.b ? w : 0,
    borderLeftWidth: sides.l ? w : 0,
    borderStyle: "solid",
    borderColor: color,
  })
  return (
    <>
      <span aria-hidden style={{ ...corner({ t: true, l: true }), top: -1, left: -1 }} />
      <span aria-hidden style={{ ...corner({ t: true, r: true }), top: -1, right: -1 }} />
      <span aria-hidden style={{ ...corner({ b: true, l: true }), bottom: -1, left: -1 }} />
      <span aria-hidden style={{ ...corner({ b: true, r: true }), bottom: -1, right: -1 }} />
    </>
  )
}

function Stat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.12em",
        color: "#666",
      }}
    >
      <span className="text-[#888]">{icon}</span>
      {children}
    </span>
  )
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${String(minutes)}m`
  const h = Math.floor(minutes / 60)
  const r = minutes % 60
  return r === 0 ? `${String(h)}h` : `${String(h)}h${String(r)}m`
}
