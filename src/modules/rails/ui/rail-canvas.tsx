"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type XYPosition,
} from "@xyflow/react"
import {
  ArrowDownToLine,
  ArrowRightToLine,
  CheckSquare,
  Clock,
  Link as LinkIcon,
  MapPin,
  Plus,
  StopCircle,
  X,
  Zap,
} from "lucide-react"
import "@xyflow/react/dist/style.css"
import type { RailNode } from "../schema"
import { PALETTE_DRAG_TYPE } from "./rail-palette"

interface PostOption {
  id: string
  title: string
  containerLabel?: string | null
  vacant: boolean
}

type Layout = "horizontal" | "vertical"

interface CanvasNodeData extends Record<string, unknown> {
  node: RailNode
  postTitle: string | null
  postVacant: boolean
  isPublished: boolean
  layout: Layout
  onEdit: (node: RailNode) => void
  onDelete: (node: RailNode) => void
}

interface CanvasEdgeData extends Record<string, unknown> {
  isPublished: boolean
  layout: Layout
  insertAfterPosition: number
  onAddAfter: (afterPosition: number) => void
}

interface TrailingAddData extends Record<string, unknown> {
  layout: Layout
  isPublished: boolean
  onAdd: () => void
}

const TRAILING_NODE_ID = "__trailing-add__"
const NODE_WIDTH = 320
const NODE_HEIGHT = 92
const HORIZONTAL_GAP = 64
const VERTICAL_GAP = 56
const TRAILING_HORIZONTAL_GAP = 56
const TRAILING_VERTICAL_GAP = 48

const LAYOUT_STORAGE_KEY = "pathway.rail-canvas.layout"
const POSITIONS_STORAGE_PREFIX = "pathway.rail-canvas.positions"

type StoredPositions = Record<string, { x: number; y: number }>

function readStoredLayout(): Layout {
  if (typeof window === "undefined") return "horizontal"
  const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
  return raw === "vertical" ? "vertical" : "horizontal"
}

function positionsKey(railId: string, layout: Layout) {
  return `${POSITIONS_STORAGE_PREFIX}.${layout}.${railId}`
}

function readStoredPositions(railId: string, layout: Layout): StoredPositions {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(positionsKey(railId, layout))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as StoredPositions
    return {}
  } catch {
    return {}
  }
}

function writeStoredPositions(railId: string, layout: Layout, positions: StoredPositions) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(positionsKey(railId, layout), JSON.stringify(positions))
}

function defaultPositionFor(idx: number, layout: Layout): XYPosition {
  return layout === "horizontal"
    ? { x: idx * (NODE_WIDTH + HORIZONTAL_GAP), y: 0 }
    : { x: 0, y: idx * (NODE_HEIGHT + VERTICAL_GAP) }
}

function trailingPositionFromLast(
  last: XYPosition | null,
  fallbackIdx: number,
  layout: Layout,
): XYPosition {
  const base = last ?? defaultPositionFor(fallbackIdx - 1, layout)
  return layout === "horizontal"
    ? { x: base.x + NODE_WIDTH + TRAILING_HORIZONTAL_GAP, y: base.y + NODE_HEIGHT / 2 - 22 }
    : { x: base.x + NODE_WIDTH / 2 - 22, y: base.y + NODE_HEIGHT + TRAILING_VERTICAL_GAP }
}

/**
 * n8n-style canvas for the rail builder. Free-form positions: drag a node and
 * it stays where you dropped it (positions persisted in localStorage per
 * rail). Logical conveyor order is kept in sync with primary-axis order on
 * each drop and only fires reorderNodes when the order actually changes.
 *
 * Other affordances:
 * - Click any task → opens edit dialog (via parent)
 * - "×" on a task → deletes (via parent)
 * - "+" on each edge → opens add dialog (via parent)
 * - Trailing "+" after last node → opens add dialog
 * - Drop a Task card from the palette anywhere on the canvas → opens add dialog
 * - Layout toggle (top-right): horizontal default, vertical alternate;
 *   preference stored per browser
 */
export function RailCanvas(props: {
  railId: string
  nodes: RailNode[]
  posts: PostOption[]
  isPublished: boolean
  onEdit: (node: RailNode) => void
  onDelete: (node: RailNode) => void
  onAddAfter: (afterPosition: number) => void
  onReorder: (newIdsInOrder: string[]) => void
  onPaletteDrop: (paletteId: string) => void
}) {
  return (
    <ReactFlowProvider>
      <RailCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

function RailCanvasInner({
  railId,
  nodes: railNodes,
  posts,
  isPublished,
  onEdit,
  onDelete,
  onAddAfter,
  onReorder,
  onPaletteDrop,
}: {
  railId: string
  nodes: RailNode[]
  posts: PostOption[]
  isPublished: boolean
  onEdit: (node: RailNode) => void
  onDelete: (node: RailNode) => void
  onAddAfter: (afterPosition: number) => void
  onReorder: (newIdsInOrder: string[]) => void
  onPaletteDrop: (paletteId: string) => void
}) {
  const [layout, setLayoutState] = useState<Layout>("horizontal")
  const [positions, setPositions] = useState<StoredPositions>({})
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional SSR→CSR sync
    setLayoutState(readStoredLayout())
  }, [])
  // Load saved positions whenever the layout flips (positions are stored
  // per-layout so horizontal and vertical placements are independent).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydrate
    setPositions(readStoredPositions(railId, layout))
  }, [railId, layout])

  const setLayout = useCallback((next: Layout) => {
    setLayoutState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, next)
    }
  }, [])

  const persistPositions = useCallback(
    (next: StoredPositions) => {
      setPositions(next)
      writeStoredPositions(railId, layout, next)
    },
    [railId, layout],
  )

  const postById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts])

  const { lastPos, computedNodes } = useMemo(() => {
    const out: Node<CanvasNodeData>[] = []
    let last: XYPosition | null = null
    railNodes.forEach((n, idx) => {
      const post = n.postId ? postById.get(n.postId) : undefined
      const pos = positions[n.id] ?? defaultPositionFor(idx, layout)
      last = pos
      out.push({
        id: n.id,
        type: "railNode",
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        position: pos,
        data: {
          node: n,
          postTitle: post?.title ?? null,
          postVacant: post?.vacant ?? false,
          isPublished,
          layout,
          onEdit,
          onDelete,
        },
        draggable: !isPublished && n.type !== "trigger",
        selectable: true,
      })
    })
    return { lastPos: last, computedNodes: out }
  }, [railNodes, postById, isPublished, layout, onEdit, onDelete, positions])

  const initialNodes = useMemo<Node<CanvasNodeData | TrailingAddData>[]>(() => {
    const list: Node<CanvasNodeData | TrailingAddData>[] = [...computedNodes]
    if (!isPublished && railNodes.length > 0) {
      list.push({
        id: TRAILING_NODE_ID,
        type: "trailingAdd",
        width: 44,
        height: 44,
        position: trailingPositionFromLast(lastPos, railNodes.length, layout),
        data: {
          layout,
          isPublished,
          onAdd: () => {
            onAddAfter(railNodes.length - 1)
          },
        },
        draggable: false,
        selectable: false,
      })
    }
    return list
  }, [computedNodes, lastPos, isPublished, layout, onAddAfter, railNodes.length])

  const initialEdges = useMemo<Edge<CanvasEdgeData>[]>(() => {
    const edges: Edge<CanvasEdgeData>[] = []
    for (let i = 0; i < railNodes.length - 1; i++) {
      const a = railNodes[i]
      const b = railNodes[i + 1]
      if (!a || !b) continue
      edges.push({
        id: `${a.id}->${b.id}`,
        source: a.id,
        target: b.id,
        type: "addEdge",
        sourceHandle: layout === "horizontal" ? "out-h" : "out-v",
        targetHandle: layout === "horizontal" ? "in-h" : "in-v",
        data: {
          isPublished,
          layout,
          insertAfterPosition: a.position,
          onAddAfter,
        },
      })
    }
    return edges
  }, [railNodes, isPublished, layout, onAddAfter])

  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<CanvasNodeData | TrailingAddData>>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<CanvasEdgeData>>(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])
  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  const { getNodes, fitView, screenToFlowPosition } =
    useReactFlow<Node<CanvasNodeData | TrailingAddData>>()
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Re-fit on layout flip — without this the user has to manually pan/zoom
  // to find the rail in its new orientation.
  useEffect(() => {
    const id = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 300 })
    }, 60)
    return () => {
      window.clearTimeout(id)
    }
  }, [layout, fitView])

  const handleNodeDragStop = useCallback(() => {
    if (isPublished) return
    const current = getNodes()
    // Only consider real rail nodes — skip the trailing add affordance.
    const real = current.filter((n) => n.type === "railNode")
    // Persist every node's new visual position (free-form).
    const nextPositions: StoredPositions = {}
    for (const n of real) {
      nextPositions[n.id] = { x: n.position.x, y: n.position.y }
    }
    persistPositions(nextPositions)
    // Determine new logical order from primary axis.
    const sorted = [...real]
      .map((n) => ({
        id: n.id,
        axis: layout === "horizontal" ? n.position.x : n.position.y,
        type: (n.data as CanvasNodeData).node.type,
      }))
      .sort((a, b) => a.axis - b.axis)
    const trigger = sorted.find((n) => n.type === "trigger")
    const tasks = sorted.filter((n) => n.type !== "trigger")
    const newOrder = trigger ? [trigger.id, ...tasks.map((t) => t.id)] : tasks.map((t) => t.id)
    const previousOrder = railNodes.map((n) => n.id)
    if (newOrder.length !== previousOrder.length) return
    const same = newOrder.every((id, i) => id === previousOrder[i])
    if (!same) onReorder(newOrder)
  }, [getNodes, isPublished, layout, railNodes, onReorder, persistPositions])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (isPublished) return
      const payload = e.dataTransfer.getData(PALETTE_DRAG_TYPE)
      if (!payload) return
      // The drop coordinates aren't yet threaded onto the new node — for
      // task drops the dialog gates by name + post anyway, and structural
      // drops (End) just append. The user can drag the new node to the
      // drop spot afterward.
      void screenToFlowPosition({ x: e.clientX, y: e.clientY })
      onPaletteDrop(payload)
    },
    [isPublished, onPaletteDrop, screenToFlowPosition],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(PALETTE_DRAG_TYPE)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      style={{ backgroundColor: "#fff" }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <LayoutToggle layout={layout} onChange={setLayout} />
      {/*
        key={layout} forces ReactFlow to remount when the orientation flips.
        Without this, xyflow's internal node state holds the previous
        layout's positions and the toggle has no visible effect — the user
        sees the toggle highlight change but the nodes don't move. Remount
        is cheap (auto-fits) and pan/zoom resets are acceptable since the
        whole point of the toggle is "rearrange the canvas."
      */}
      <ReactFlow
        key={layout}
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.4, maxZoom: 1.2 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        panOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background gap={32} size={1} color="#F0F0F0" />
        <Controls
          showInteractive={false}
          position="bottom-left"
          style={{ border: "1px solid #0F0F0F", backgroundColor: "#fff" }}
        />
      </ReactFlow>
    </div>
  )
}

function LayoutToggle({ layout, onChange }: { layout: Layout; onChange: (l: Layout) => void }) {
  return (
    <div
      className="absolute top-3 right-3 z-10 inline-flex"
      role="tablist"
      aria-label="Canvas layout"
    >
      <LayoutBtn
        active={layout === "horizontal"}
        onClick={() => {
          onChange("horizontal")
        }}
        ariaLabel="Horizontal layout"
        first
      >
        <ArrowRightToLine className="size-3.5" strokeWidth={2} aria-hidden />
      </LayoutBtn>
      <LayoutBtn
        active={layout === "vertical"}
        onClick={() => {
          onChange("vertical")
        }}
        ariaLabel="Vertical layout"
      >
        <ArrowDownToLine className="size-3.5" strokeWidth={2} aria-hidden />
      </LayoutBtn>
    </div>
  )
}

function LayoutBtn({
  active,
  onClick,
  ariaLabel,
  children,
  first = false,
}: {
  active: boolean
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
  first?: boolean
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={
        active
          ? "border border-[#E8711A] bg-[#E8711A] text-white"
          : "border border-[#D4D4D4] bg-white text-[#0F0F0F] hover:border-[#0F0F0F]"
      }
      style={{
        padding: "6px 8px",
        marginLeft: first ? 0 : -1,
        transition: "background-color 120ms, border-color 120ms",
      }}
    >
      {children}
    </button>
  )
}

const NODE_TYPES = { railNode: RailNodeView, trailingAdd: TrailingAddNode }
const EDGE_TYPES = { addEdge: AddEdge }

function RailNodeView({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  const { node, postTitle, postVacant, isPublished, onEdit, onDelete } = data
  const isTrigger = node.type === "trigger"
  const isEnd = node.type === "end"
  const isTask = node.type === "task"
  // Color & icon by type. Future types (sub_flow, statistic, approval) get
  // their own accents when their runtime ships.
  const accentColor = isTrigger ? "#E8711A" : isEnd ? "#B83229" : "#2A3D52"
  const checklistCount = Array.isArray(node.checklistItems) ? node.checklistItems.length : 0
  const toolsCount = Array.isArray(node.toolsLinks) ? node.toolsLinks.length : 0
  const hasIdeal = node.idealMinutes != null && node.idealMinutes > 0
  // Trigger is structural and required; End is structural but removable.
  const canDelete = !isPublished && !isTrigger

  const handleClick = () => {
    onEdit(node)
  }

  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        backgroundColor: "#fff",
        border: `1.5px solid ${selected ? "#E8711A" : "#0F0F0F"}`,
        position: "relative",
        cursor: "pointer",
        display: "flex",
        alignItems: "stretch",
      }}
      onClick={handleClick}
    >
      <div style={{ width: 4, backgroundColor: accentColor }} aria-hidden />

      <div className="min-w-0 flex-1 px-3 py-2.5">
        <div className="flex items-center gap-2">
          {isTrigger ? (
            <Zap
              className="size-3.5 shrink-0"
              strokeWidth={2}
              style={{ color: "#E8711A" }}
              aria-hidden
            />
          ) : isEnd ? (
            <StopCircle
              className="size-3.5 shrink-0"
              strokeWidth={2}
              style={{ color: "#B83229" }}
              aria-hidden
            />
          ) : (
            <span
              aria-hidden
              className="inline-block shrink-0"
              style={{ width: 10, height: 10, backgroundColor: "#2A3D52" }}
            />
          )}
          <p
            className="min-w-0 flex-1 truncate"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "#0F0F0F",
              letterSpacing: "-0.005em",
            }}
          >
            {node.name}
          </p>
          <span
            className="shrink-0"
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

        <div className="mt-1.5 flex items-center justify-between gap-3">
          {isTask ? (
            <div className="flex min-w-0 items-center gap-1">
              <MapPin
                className="size-3 shrink-0"
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
                  letterSpacing: "0.1em",
                  color: postVacant ? "#B83229" : "#5A7A92",
                  textTransform: "uppercase",
                }}
              >
                {postTitle ?? "No terminal"}
                {postVacant && " · vacant"}
              </p>
            </div>
          ) : (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.16em",
                color: isEnd ? "#B83229" : "#888",
                textTransform: "uppercase",
              }}
            >
              {isEnd ? "Terminator · run completes here" : "Manual start"}
            </p>
          )}

          {isTask && (checklistCount > 0 || toolsCount > 0 || hasIdeal) && (
            <div className="flex shrink-0 items-center gap-2.5">
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
      </div>

      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(node)
          }}
          aria-label={`Delete ${node.name}`}
          className="nodrag absolute -top-2 -right-2 grid size-5 place-items-center bg-white transition-colors hover:bg-[#FFE6D5]"
          style={{ border: "1px solid #0F0F0F" }}
        >
          <X className="size-3" strokeWidth={2.25} aria-hidden />
        </button>
      )}

      <Handle
        type="target"
        id="in-h"
        position={Position.Left}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
      <Handle
        type="source"
        id="out-h"
        position={Position.Right}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
      <Handle
        type="target"
        id="in-v"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
      <Handle
        type="source"
        id="out-v"
        position={Position.Bottom}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
    </div>
  )
}

function TrailingAddNode({ data }: NodeProps<Node<TrailingAddData>>) {
  const { isPublished, onAdd } = data
  if (isPublished) return null
  return (
    <button
      type="button"
      // `nodrag nopan` tells xyflow to ignore drag/pan starts on this element.
      // Stopping pointerdown propagation prevents xyflow's selection handler
      // from swallowing the click before it reaches onClick.
      className="nodrag nopan grid size-11 place-items-center bg-white transition-colors hover:bg-[#FFF8F1]"
      onPointerDown={(e) => {
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
        onAdd()
      }}
      style={{
        border: "1.5px dashed #E8711A",
        cursor: "pointer",
        color: "#E8711A",
        pointerEvents: "all",
      }}
      aria-label="Add task at end"
      title="Add task at end"
    >
      <Plus className="size-5" strokeWidth={2.25} aria-hidden />
    </button>
  )
}

function AddEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}: EdgeProps<Edge<CanvasEdgeData>>) {
  const layout = data?.layout ?? "horizontal"
  const sourcePosition = layout === "horizontal" ? Position.Right : Position.Bottom
  const targetPosition = layout === "horizontal" ? Position.Left : Position.Top
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const isPublished = data?.isPublished ?? false
  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: "#E8711A", strokeWidth: 1.5, strokeDasharray: "4 3" }}
      />
      {!isPublished && data && (
        <EdgeLabelRenderer>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              data.onAddAfter(data.insertAfterPosition)
            }}
            className="nodrag nopan"
            aria-label="Add task here"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${String(labelX)}px, ${String(labelY)}px)`,
              pointerEvents: "all",
              width: 22,
              height: 22,
              display: "grid",
              placeItems: "center",
              backgroundColor: "#fff",
              border: "1.5px solid #E8711A",
              color: "#E8711A",
              cursor: "pointer",
              transition: "background-color 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#FFF8F1"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#fff"
            }}
          >
            <Plus className="size-3" strokeWidth={2.5} aria-hidden />
          </button>
        </EdgeLabelRenderer>
      )}
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
        letterSpacing: "0.1em",
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
