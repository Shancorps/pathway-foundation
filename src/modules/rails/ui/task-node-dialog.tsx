"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { addTaskNode, updateNode } from "../actions"
import type { RailNode } from "../schema"

export interface PostOption {
  id: string
  title: string
  containerLabel?: string | null
  vacant: boolean
}

interface ChecklistDraftItem {
  id: string
  label: string
  required: boolean
}

interface ToolsLinkDraftItem {
  id: string
  label: string
  url: string
}

function newDraftItem(): ChecklistDraftItem {
  return { id: `new_${Math.random().toString(36).slice(2, 10)}`, label: "", required: false }
}

function newToolsLinkDraft(): ToolsLinkDraftItem {
  return { id: `new_${Math.random().toString(36).slice(2, 10)}`, label: "", url: "" }
}

export function TaskNodeDialog({
  open,
  onOpenChange,
  mode,
  railId,
  posts,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  railId: string
  posts: PostOption[]
  initial?: RailNode
  /**
   * Fires after the action succeeds and the dialog closes. The parent uses
   * this to decide whether to surface the "push to in-progress runs"
   * confirmation. If omitted, the dialog calls router.refresh() itself.
   */
  onSaved?: () => void
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
  const [tools, setTools] = useState<ToolsLinkDraftItem[]>(
    initial?.toolsLinks
      ? initial.toolsLinks
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((t) => ({ id: t.id, label: t.label, url: t.url }))
      : [],
  )
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setName("")
    setDescription("")
    setPostId("")
    setChecklist([])
    setIdealMinutesText("")
    setTools([])
  }

  function updateTool(idx: number, patch: Partial<ToolsLinkDraftItem>) {
    setTools((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }
  function deleteTool(idx: number) {
    setTools((prev) => prev.filter((_, i) => i !== idx))
  }
  function moveTool(idx: number, direction: -1 | 1) {
    const target = idx + direction
    if (target < 0 || target >= tools.length) return
    setTools((prev) => {
      const next = prev.slice()
      const a = next[idx]
      const b = next[target]
      if (!a || !b) return prev
      next[idx] = b
      next[target] = a
      return next
    })
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
    const cleanedChecklist = checklist
      .map((c) => ({ ...c, label: c.label.trim() }))
      .filter((c) => c.label.length > 0)
      .map((c) => ({
        id: c.id.startsWith("new_") ? undefined : c.id,
        label: c.label,
        required: c.required,
      }))

    const cleanedTools: { id?: string; label: string; url: string }[] = []
    for (const t of tools) {
      const label = t.label.trim()
      const url = t.url.trim()
      if (label === "" && url === "") continue
      if (label === "" || url === "") {
        alert("Each SOP/Tool link needs both a label and a URL.")
        return
      }
      try {
        new URL(url)
      } catch {
        alert(`"${url}" isn't a valid URL.`)
        return
      }
      cleanedTools.push({
        id: t.id.startsWith("new_") ? undefined : t.id,
        label,
        url,
      })
    }

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
            toolsLinks: cleanedTools,
            ...(hasIdealInput && parsedIdeal !== null ? { idealMinutes: parsedIdeal } : {}),
          })
        : await updateNode({
            id: initial?.id ?? "",
            name,
            description: description || null,
            postId,
            checklistItems: cleanedChecklist,
            toolsLinks: cleanedTools,
            idealMinutes: hasIdealInput ? parsedIdeal : null,
          })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    if (mode === "add") resetForm()
    onOpenChange(false)
    if (onSaved) onSaved()
    else router.refresh()
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
                        className="grid place-items-center border border-transparent p-1 hover:border-[var(--bp-border-default)] hover:bg-white disabled:opacity-30"
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
                        className="grid place-items-center border border-transparent p-1 hover:border-[var(--bp-border-default)] hover:bg-white disabled:opacity-30"
                      >
                        <ArrowDown className="size-3" strokeWidth={1.5} />
                      </button>
                    </div>
                    <GripVertical className="mt-2 size-4 shrink-0 text-[var(--bp-text-disabled)]" />
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
                      className="grid place-items-center border border-transparent p-1.5 hover:border-[var(--bp-border-default)] hover:bg-white"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">SOP & Tools</Label>
              <BlueprintButton
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setTools((prev) => [...prev, newToolsLinkDraft()])
                }}
              >
                <Plus className="size-3" />
                Add Link
              </BlueprintButton>
            </div>
            {tools.length === 0 ? (
              <p
                className="border border-dashed border-[var(--color-border)] p-3 text-center"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  color: "#888",
                  textTransform: "uppercase",
                }}
              >
                Pathway is the workflow layer · Hand off to where work happens
              </p>
            ) : (
              <ul className="space-y-2">
                {tools.map((item, idx) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          moveTool(idx, -1)
                        }}
                        disabled={idx === 0}
                        aria-label="Move up"
                        className="grid place-items-center border border-transparent p-1 hover:border-[var(--bp-border-default)] hover:bg-white disabled:opacity-30"
                      >
                        <ArrowUp className="size-3" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          moveTool(idx, 1)
                        }}
                        disabled={idx === tools.length - 1}
                        aria-label="Move down"
                        className="grid place-items-center border border-transparent p-1 hover:border-[var(--bp-border-default)] hover:bg-white disabled:opacity-30"
                      >
                        <ArrowDown className="size-3" strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={item.label}
                        onChange={(e) => {
                          updateTool(idx, { label: e.target.value })
                        }}
                        placeholder="Label · e.g. Brand SOP, Canva template"
                      />
                      <Input
                        value={item.url}
                        onChange={(e) => {
                          updateTool(idx, { url: e.target.value })
                        }}
                        placeholder="https://..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        deleteTool(idx)
                      }}
                      aria-label="Remove link"
                      className="grid place-items-center border border-transparent p-1.5 hover:border-[var(--bp-border-default)] hover:bg-white"
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
