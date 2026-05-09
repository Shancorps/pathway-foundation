"use client"

import { useCallback, useMemo } from "react"
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
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { CheckSquare, Clock, Link as LinkIcon, MapPin, Plus, X, Zap } from "lucide-react"
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
  isPublished: boolean
  onEdit: (node: RailNode) => void
  onDelete: (node: RailNode) => void
}

interface CanvasEdgeData extends Record<string, unknown> {
  isPublished: boolean
  /** Position number for the new task that would be inserted after this edge's source node. */
  insertAfterPosition: number
  onAddAfter: (afterPosition: number) => void
}

const NODE_WIDTH = 320
const NODE_HEIGHT = 92
const NODE_VERTICAL_GAP = 56
const NODE_X = 0

/**
 * n8n-style canvas for the rail builder. Vertical flow (Trigger top → Tasks
 * down), small chip nodes, dashed orange edges. Click to edit, drag to
 * reorder, "+" between nodes to add, "×" on a node to delete. All mutations
 * route through the existing rails actions in the parent.
 */
export function RailCanvas(props: {
  nodes: RailNode[]
  posts: PostOption[]
  isPublished: boolean
  onEdit: (node: RailNode) => void
  onDelete: (node: RailNode) => void
  onAddAfter: (afterPosition: number) => void
  onReorder: (newIdsInOrder: string[]) => void
}) {
  return (
    <ReactFlowProvider>
      <RailCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

function RailCanvasInner({
  nodes: railNodes,
  posts,
  isPublished,
  onEdit,
  onDelete,
  onAddAfter,
  onReorder,
}: {
  nodes: RailNode[]
  posts: PostOption[]
  isPublished: boolean
  onEdit: (node: RailNode) => void
  onDelete: (node: RailNode) => void
  onAddAfter: (afterPosition: number) => void
  onReorder: (newIdsInOrder: string[]) => void
}) {
  const postById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts])

  const initialNodes = useMemo<Node<CanvasNodeData>[]>(() => {
    return railNodes.map((n, idx) => {
      const post = n.postId ? postById.get(n.postId) : undefined
      return {
        id: n.id,
        type: "railNode",
        // Explicit width/height so xyflow can lay out + fitView before DOM
        // measurement completes — without these the canvas reads as blank
        // until the first interaction.
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        position: {
          x: NODE_X,
          y: idx * (NODE_HEIGHT + NODE_VERTICAL_GAP),
        },
        data: {
          node: n,
          postTitle: post?.title ?? null,
          postVacant: post?.vacant ?? false,
          isPublished,
          onEdit,
          onDelete,
        },
        // Trigger never moves; tasks can be reordered via drag while not
        // published. xyflow's drag handle is the whole node; we constrain to
        // the y-axis below in onNodeDrag.
        draggable: !isPublished && n.type !== "trigger",
        selectable: true,
      }
    })
  }, [railNodes, postById, isPublished, onEdit, onDelete])

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
        data: {
          isPublished,
          insertAfterPosition: a.position,
          onAddAfter,
        },
      })
    }
    return edges
  }, [railNodes, isPublished, onAddAfter])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CanvasNodeData>>(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState<Edge<CanvasEdgeData>>(initialEdges)

  // Sync xyflow state when the underlying rail data changes (e.g. after an
  // action mutation triggers `router.refresh()` upstream).
  useMemo(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  const { getNodes } = useReactFlow<Node<CanvasNodeData>>()

  const handleNodeDragStop = useCallback(() => {
    if (isPublished) return
    // Snap to the nearest column (x=0) and figure out the new vertical order.
    const current = getNodes()
    const sorted = [...current]
      .map((n) => ({ id: n.id, y: n.position.y, type: n.data.node.type }))
      .sort((a, b) => a.y - b.y)
    // Trigger is always position 0, regardless of where it ended up vertically.
    const trigger = sorted.find((n) => n.type === "trigger")
    const tasks = sorted.filter((n) => n.type !== "trigger")
    const newOrder = trigger ? [trigger.id, ...tasks.map((t) => t.id)] : tasks.map((t) => t.id)
    const previousOrder = railNodes.map((n) => n.id)
    if (newOrder.length !== previousOrder.length) return
    const same = newOrder.every((id, i) => id === previousOrder[i])
    if (same) {
      // Snap back into the canonical lattice without a server round-trip.
      setNodes(initialNodes)
      return
    }
    onReorder(newOrder)
    // Optimistically reposition while the parent revalidates.
    setNodes((curr) =>
      curr.map((n) => {
        const idx = newOrder.indexOf(n.id)
        return {
          ...n,
          position: {
            x: NODE_X,
            y: (idx === -1 ? 0 : idx) * (NODE_HEIGHT + NODE_VERTICAL_GAP),
          },
        }
      }),
    )
  }, [getNodes, isPublished, railNodes, initialNodes, onReorder, setNodes])

  return (
    <div
      className="h-[640px] w-full"
      style={{
        border: "1px solid #0F0F0F",
        backgroundColor: "#fff",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.25, minZoom: 0.4, maxZoom: 1.2 }}
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
const EDGE_TYPES = { addEdge: AddEdge }

function RailNodeView({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  const { node, postTitle, postVacant, isPublished, onEdit, onDelete } = data
  const isTrigger = node.type === "trigger"
  const accentColor = isTrigger ? "#E8711A" : "#2A3D52"
  const checklistCount = Array.isArray(node.checklistItems) ? node.checklistItems.length : 0
  const toolsCount = Array.isArray(node.toolsLinks) ? node.toolsLinks.length : 0
  const hasIdeal = node.idealMinutes != null && node.idealMinutes > 0
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
      {/* Left accent bar — orange for trigger, steel for task */}
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
          ) : (
            <span
              aria-hidden
              className="inline-block shrink-0"
              style={{
                width: 10,
                height: 10,
                backgroundColor: "#2A3D52",
              }}
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
          {!isTrigger ? (
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
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              Manual start
            </p>
          )}

          {!isTrigger && (checklistCount > 0 || toolsCount > 0 || hasIdeal) && (
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

      {/* Delete button (top-right, only when editable + not trigger) */}
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

      {/* Edge handles — vertical flow, top = target, bottom = source */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 1, height: 1, top: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "transparent", border: "none", width: 1, height: 1, bottom: 0 }}
      />
    </div>
  )
}

/**
 * Custom edge with a "+" button in the middle to insert a task between two
 * nodes. Disabled when the rail is published (must unpublish to edit).
 */
function AddEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}: EdgeProps<Edge<CanvasEdgeData>>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Bottom,
    targetX,
    targetY,
    targetPosition: Position.Top,
  })
  const isPublished = data?.isPublished ?? false
  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: "#E8711A",
          strokeWidth: 1.5,
          strokeDasharray: "4 3",
        }}
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
