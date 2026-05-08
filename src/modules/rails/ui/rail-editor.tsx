"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, CircleDot, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
    <div className="space-y-6">
      <section className="flex items-end justify-between rounded-lg border border-[var(--color-border)] p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
            Rail
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold">{rail.name}</h1>
          {particleTypeName && (
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Operates on <span className="font-medium">{particleTypeName}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isPublished ? "default" : "secondary"} className="capitalize">
            {rail.status}
          </Badge>
          {isPublished ? (
            <Button variant="outline" onClick={handleUnpublish}>
              Unpublish
            </Button>
          ) : (
            <Button onClick={handlePublish}>Publish</Button>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
          Settings
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
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
        <div>
          <Button size="sm" onClick={handleSaveMeta} disabled={isPublished || savingMeta || !name}>
            {savingMeta ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
            Steps ({nodes.length})
          </h2>
          <Button
            size="sm"
            onClick={() => {
              setShowAddTask(true)
            }}
            disabled={isPublished}
          >
            <Plus className="size-4" />
            Add Task
          </Button>
        </div>

        <ol className="space-y-2">
          {nodes.map((node, idx) => {
            const post = posts.find((p) => p.id === node.postId)
            return (
              <li
                key={node.id}
                className="flex items-center gap-3 rounded-md border border-[var(--color-border)] p-3"
              >
                <div className="flex flex-col">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void moveNode(idx, -1)}
                    disabled={isPublished || idx <= 1 || node.type === "trigger"}
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void moveNode(idx, 1)}
                    disabled={isPublished || idx === nodes.length - 1 || node.type === "trigger"}
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-3" />
                  </Button>
                </div>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]">
                  <CircleDot className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {node.type}
                    </Badge>
                    <p className="truncate font-medium">{node.name}</p>
                  </div>
                  {node.type === "task" && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Terminal:{" "}
                      {post ? (
                        <span className="font-medium">
                          {post.title}
                          {post.containerLabel ? ` · ${post.containerLabel}` : ""}
                          {post.vacant ? " (vacant)" : ""}
                        </span>
                      ) : (
                        <span className="text-red-500">no post assigned</span>
                      )}
                    </p>
                  )}
                  {node.description && (
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      {node.description}
                    </p>
                  )}
                </div>
                {node.type !== "trigger" && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingNode(node)
                      }}
                      disabled={isPublished}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDeleteNode(node)}
                      disabled={isPublished}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </>
                )}
              </li>
            )
          })}
        </ol>

        {nodes.filter((n) => n.type === "task").length === 0 && (
          <p className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
            Add at least one Task to publish this rail.
          </p>
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
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!postId) {
      alert("Pick a Post — every Task needs a Terminal.")
      return
    }
    setSubmitting(true)
    const result =
      mode === "add"
        ? await addTaskNode({
            railId,
            name,
            description: description || undefined,
            postId,
          })
        : await updateNode({
            id: initial?.id ?? "",
            name,
            description: description || null,
            postId,
          })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Task" : "Edit Task"}</DialogTitle>
          <DialogDescription>
            A step where the Particle stops at a Terminal. The employee holding that Post performs
            the work and advances the Particle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="task-name">Step name</Label>
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
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name || !postId}>
              {submitting ? "Saving..." : mode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
