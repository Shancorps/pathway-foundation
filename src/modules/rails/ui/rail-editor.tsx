"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, CircleDot, GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  addTaskNode,
  deleteNode,
  publishRail,
  reorderNodes,
  unpublishRail,
  updateNode,
  updateRail,
} from "../actions"
import type { Rail, RailNode } from "../schema"

interface PostOption {
  id: string
  title: string
  containerLabel?: string | null
  vacant: boolean
}

function RailStatusPill({ published }: { published: boolean }) {
  return (
    <span
      className="px-2 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: published ? "#fff" : "#888",
        backgroundColor: published ? "#E8711A" : "transparent",
        border: `1px solid ${published ? "#E8711A" : "#888"}`,
      }}
    >
      {published ? "Published" : "Draft"}
    </span>
  )
}

function NodeTypePill({ type }: { type: string }) {
  const isTrigger = type === "trigger"
  const color = isTrigger ? "#E8711A" : "#5A7A92"
  return (
    <span
      className="px-1.5 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: "0.2em",
        color,
        border: `1px solid ${color}`,
        textTransform: "uppercase",
      }}
    >
      {type}
    </span>
  )
}

function SmallPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="px-1.5 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 8,
        fontWeight: 500,
        letterSpacing: "0.16em",
        color: "#666",
        border: "1px solid #D4D4D4",
      }}
    >
      {children}
    </span>
  )
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${String(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`
}

export function RailEditor({
  rail,
  nodes,
  posts,
  particleTypeName,
}: {
  rail: Rail
  nodes: RailNode[]
  posts: PostOption[]
  particleTypeName: string | null
}) {
  const router = useRouter()
  const isPublished = rail.status === "published"
  const [name, setName] = useState(rail.name)
  const [description, setDescription] = useState(rail.description ?? "")
  const [savingMeta, setSavingMeta] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingNode, setEditingNode] = useState<RailNode | null>(null)

  async function handleSaveMeta() {
    setSavingMeta(true)
    const result = await updateRail({
      id: rail.id,
      name,
      description: description || null,
    })
    setSavingMeta(false)
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  async function handlePublish() {
    const result = await publishRail({ id: rail.id })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  async function handleUnpublish() {
    const result = await unpublishRail({ id: rail.id })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  async function handleDeleteNode(node: RailNode) {
    if (!confirm(`Delete step "${node.name}"?`)) return
    const result = await deleteNode({ id: node.id })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  async function moveNode(idx: number, direction: -1 | 1) {
    const target = idx + direction
    if (target < 0 || target >= nodes.length) return
    if (idx === 0 || target === 0) return // Trigger stays at position 0
    const ids = nodes.map((n) => n.id)
    const fromId = ids[idx]
    const toId = ids[target]
    if (!fromId || !toId) return
    ids[idx] = toId
    ids[target] = fromId
    const result = await reorderNodes({ railId: rail.id, nodeIdsInOrder: ids })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <RegCard state={isPublished ? "active" : "queued"}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.2em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              Rail
              {particleTypeName && (
                <>
                  <span className="px-1.5 text-[#CCC]">·</span>
                  <span style={{ color: "#5A7A92" }}>Operates on {particleTypeName}</span>
                </>
              )}
            </p>
            <h1
              className="mt-2 truncate"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 26,
                fontWeight: 600,
                color: "#0F0F0F",
                letterSpacing: "-0.01em",
              }}
            >
              {rail.name}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RailStatusPill published={isPublished} />
            {isPublished ? (
              <BlueprintButton variant="outline" size="sm" onClick={handleUnpublish}>
                Unpublish
              </BlueprintButton>
            ) : (
              <BlueprintButton variant="primary" size="sm" onClick={handlePublish} particle>
                Publish
              </BlueprintButton>
            )}
          </div>
        </div>
      </RegCard>

      {/* Settings */}
      <section className="space-y-4">
        <SectionDivider label="Fig · 01 / Settings" />
        <RegCard state="queued" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="rail-name">Name</Label>
              <Input
                id="rail-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                }}
                disabled={isPublished}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="rail-description">Description</Label>
              <Textarea
                id="rail-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                }}
                disabled={isPublished}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <BlueprintButton
              variant="primary"
              size="sm"
              onClick={handleSaveMeta}
              disabled={isPublished || savingMeta || !name}
              particle
            >
              {savingMeta ? "Saving..." : "Save Settings"}
            </BlueprintButton>
          </div>
        </RegCard>
      </section>

      {/* Steps */}
      <section className="space-y-4">
        <SectionDivider label="Fig · 02 / Steps" count={nodes.length} />

        <div className="flex justify-end">
          <BlueprintButton
            variant="primary"
            size="sm"
            onClick={() => {
              setShowAddTask(true)
            }}
            disabled={isPublished}
            particle
          >
            Add Task
          </BlueprintButton>
        </div>

        <ol className="space-y-2">
          {nodes.map((node, idx) => {
            const post = posts.find((p) => p.id === node.postId)
            const nodeIsTrigger = node.type === "trigger"
            return (
              <li key={node.id}>
                <RegCard state={nodeIsTrigger ? "active" : "queued"} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {!nodeIsTrigger && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => void moveNode(idx, -1)}
                          disabled={isPublished || idx <= 1}
                          aria-label="Move up"
                          className="grid place-items-center border border-transparent p-1 hover:border-[#E4E4E4] hover:bg-white disabled:opacity-30"
                        >
                          <ArrowUp className="size-3" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveNode(idx, 1)}
                          disabled={isPublished || idx === nodes.length - 1}
                          aria-label="Move down"
                          className="grid place-items-center border border-transparent p-1 hover:border-[#E4E4E4] hover:bg-white disabled:opacity-30"
                        >
                          <ArrowDown className="size-3" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                    <div
                      className="grid place-items-center"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: nodeIsTrigger ? "#E8711A" : "#2A3D52",
                        flexShrink: 0,
                      }}
                    >
                      <CircleDot className="size-4 text-white" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <NodeTypePill type={node.type} />
                        <p
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0F0F0F",
                          }}
                        >
                          {node.name}
                        </p>
                        {node.type === "task" && node.checklistItems.length > 0 && (
                          <SmallPill>
                            {String(node.checklistItems.length)}{" "}
                            {node.checklistItems.length === 1 ? "item" : "items"}
                          </SmallPill>
                        )}
                        {node.type === "task" && node.idealMinutes != null && (
                          <SmallPill>{formatMinutes(node.idealMinutes)}</SmallPill>
                        )}
                      </div>
                      {node.type === "task" && (
                        <p
                          className="mt-1.5"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            fontWeight: 500,
                            color: "#5A7A92",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}
                        >
                          Terminal ·{" "}
                          {post ? (
                            <span style={{ color: "#0F0F0F" }}>
                              {post.title}
                              {post.containerLabel ? ` / ${post.containerLabel}` : ""}
                              {post.vacant ? " (Vacant)" : ""}
                            </span>
                          ) : (
                            <span style={{ color: "#E8711A" }}>No Post assigned</span>
                          )}
                        </p>
                      )}
                      {node.description && (
                        <p
                          className="mt-2"
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 13,
                            color: "#666",
                            lineHeight: 1.4,
                          }}
                        >
                          {node.description}
                        </p>
                      )}
                    </div>
                    {!nodeIsTrigger && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNode(node)
                          }}
                          disabled={isPublished}
                          className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] hover:bg-white disabled:opacity-30"
                          aria-label="Edit"
                        >
                          <Pencil className="size-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteNode(node)}
                          disabled={isPublished}
                          className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] hover:bg-white disabled:opacity-30"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </div>
                </RegCard>
              </li>
            )
          })}
        </ol>

        {nodes.filter((n) => n.type === "task").length === 0 && (
          <RegCard state="new" className="px-10 py-10 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              Add at least one Task to publish this rail
            </p>
          </RegCard>
        )}
      </section>

      <TaskNodeDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        mode="add"
        railId={rail.id}
        posts={posts}
      />
      {editingNode && (
        <TaskNodeDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingNode(null)
          }}
          mode="edit"
          railId={rail.id}
          posts={posts}
          initial={editingNode}
        />
      )}
    </div>
  )
}

interface ChecklistDraftItem {
  // Existing items keep their server id; new items use a temp prefix that the
  // action layer normalizes into a real CUID.
  id: string
  label: string
  required: boolean
}

function newDraftItem(): ChecklistDraftItem {
  return { id: `new_${Math.random().toString(36).slice(2, 10)}`, label: "", required: false }
}

function TaskNodeDialog({
  open,
  onOpenChange,
  mode,
  railId,
  posts,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  railId: string
  posts: PostOption[]
  initial?: RailNode
}) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [postId, setPostId] = useState(initial?.postId ?? "")
  const [checklist, setChecklist] = useState<ChecklistDraftItem[]>(
    initial?.checklistItems
      ? initial.checklistItems
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((c) => ({ id: c.id, label: c.label, required: c.required }))
      : [],
  )
  const [idealMinutesText, setIdealMinutesText] = useState(
    initial?.idealMinutes != null ? String(initial.idealMinutes) : "",
  )
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setName("")
    setDescription("")
    setPostId("")
    setChecklist([])
    setIdealMinutesText("")
  }

  function updateItem(idx: number, patch: Partial<ChecklistDraftItem>) {
    setChecklist((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }
  function deleteItem(idx: number) {
    setChecklist((prev) => prev.filter((_, i) => i !== idx))
  }
  function moveItem(idx: number, direction: -1 | 1) {
    const target = idx + direction
    if (target < 0 || target >= checklist.length) return
    setChecklist((prev) => {
      const next = prev.slice()
      const a = next[idx]
      const b = next[target]
      if (!a || !b) return prev
      next[idx] = b
      next[target] = a
      return next
    })
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!postId) {
      alert("Pick a Post — every Task needs a Terminal.")
      return
    }
    // Strip empty rows; reject if any non-empty rows remain blank.
    const cleanedChecklist = checklist
      .map((c) => ({ ...c, label: c.label.trim() }))
      .filter((c) => c.label.length > 0)
      .map((c) => ({
        id: c.id.startsWith("new_") ? undefined : c.id,
        label: c.label,
        required: c.required,
      }))

    const idealTrimmed = idealMinutesText.trim()
    let parsedIdeal: number | null = null
    let hasIdealInput = false
    if (idealTrimmed !== "") {
      const parsed = Number(idealTrimmed)
      if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        alert("Ideal time must be a whole number of minutes greater than 0.")
        return
      }
      parsedIdeal = parsed
      hasIdealInput = true
    }

    setSubmitting(true)
    const result =
      mode === "add"
        ? await addTaskNode({
            railId,
            name,
            description: description || undefined,
            postId,
            checklistItems: cleanedChecklist,
            ...(hasIdealInput && parsedIdeal !== null ? { idealMinutes: parsedIdeal } : {}),
          })
        : await updateNode({
            id: initial?.id ?? "",
            name,
            description: description || null,
            postId,
            checklistItems: cleanedChecklist,
            // edit mode: empty input clears the value (null), filled input sets it
            idealMinutes: hasIdealInput ? parsedIdeal : null,
          })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    if (mode === "add") resetForm()
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Task" : "Edit Task"}</DialogTitle>
          <DialogDescription>
            A step where the Particle stops at a Terminal. At runtime this becomes a Cycle ticket in
            the assigned employee&rsquo;s My Actions inbox; the checklist is what they tick off to
            complete it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="task-name">Cycle title</Label>
            <Input
              id="task-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              placeholder="e.g. Wash Car, Discovery Call, Send Proposal"
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="task-post">Terminal (Post)</Label>
            <Select value={postId} onValueChange={setPostId}>
              <SelectTrigger id="task-post">
                <SelectValue placeholder="Pick a Post" />
              </SelectTrigger>
              <SelectContent>
                {posts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                    {p.containerLabel ? ` · ${p.containerLabel}` : ""}
                    {p.vacant ? " (vacant)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {posts.length === 0 && (
              <p className="mt-1 text-xs text-red-500">
                No posts in your org yet. Create some in /organization/structure first.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="task-description">Description (optional)</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="task-ideal">Ideal time (minutes, optional)</Label>
            <Input
              id="task-ideal"
              type="number"
              min="1"
              step="1"
              value={idealMinutesText}
              onChange={(e) => {
                setIdealMinutesText(e.target.value)
              }}
              placeholder="e.g. 120 for a 2-hour cycle"
            />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              How long this Cycle should take. Used to compare against actual time at runtime.
            </p>
          </div>

          <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Checklist</Label>
              <BlueprintButton
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setChecklist((prev) => [...prev, newDraftItem()])
                }}
              >
                <Plus className="size-3" />
                Add Item
              </BlueprintButton>
            </div>
            {checklist.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--color-border)] p-3 text-center text-xs text-[var(--color-muted-foreground)]">
                No checklist items. Add the sub-steps the worker must complete.
              </p>
            ) : (
              <ul className="space-y-2">
                {checklist.map((item, idx) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          moveItem(idx, -1)
                        }}
                        disabled={idx === 0}
                        aria-label="Move up"
                        className="grid place-items-center border border-transparent p-1 hover:border-[#E4E4E4] hover:bg-white disabled:opacity-30"
                      >
                        <ArrowUp className="size-3" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          moveItem(idx, 1)
                        }}
                        disabled={idx === checklist.length - 1}
                        aria-label="Move down"
                        className="grid place-items-center border border-transparent p-1 hover:border-[#E4E4E4] hover:bg-white disabled:opacity-30"
                      >
                        <ArrowDown className="size-3" strokeWidth={1.5} />
                      </button>
                    </div>
                    <GripVertical className="mt-2 size-4 shrink-0 text-[#AAA]" />
                    <div className="flex-1 space-y-1">
                      <Input
                        value={item.label}
                        onChange={(e) => {
                          updateItem(idx, { label: e.target.value })
                        }}
                        placeholder="What does the worker need to do?"
                      />
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <Checkbox
                          checked={item.required}
                          onCheckedChange={(v) => {
                            updateItem(idx, { required: Boolean(v) })
                          }}
                        />
                        Required to complete the cycle
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        deleteItem(idx)
                      }}
                      aria-label="Remove item"
                      className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] hover:bg-white"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <BlueprintButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </BlueprintButton>
            <BlueprintButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !name || !postId}
            >
              {submitting ? "Saving..." : mode === "add" ? "Add" : "Save"}
            </BlueprintButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
