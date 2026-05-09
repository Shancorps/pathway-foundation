"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Settings as SettingsIcon, X } from "lucide-react"
import { BlueprintButton } from "@/components/ui/blueprint-button"
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
import { Textarea } from "@/components/ui/textarea"
import { deleteNode, publishRail, reorderNodes, unpublishRail, updateRail } from "../actions"
import type { Rail, RailNode } from "../schema"
import { RailCanvas } from "./rail-canvas"
import { RailPalette } from "./rail-palette"
import { TaskNodeDialog, type PostOption } from "./task-node-dialog"

/**
 * Rail builder shell. Full-width n8n-style surface: thin top bar, left node
 * palette, canvas filling the rest. Settings (description, etc) live in a
 * modal accessed via the gear icon. All editing — add / edit / reorder /
 * delete a Task — happens on the canvas; clicking a node opens
 * TaskNodeDialog.
 */
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
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingNode, setEditingNode] = useState<RailNode | null>(null)
  const [showSettings, setShowSettings] = useState(false)

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

  return (
    <div
      // Negative margins cancel the app shell's px-8 py-6 wrapper so the
      // builder fills the viewport edge-to-edge — this is the n8n-style
      // canvas surface, not a card under a title.
      className="-mx-8 -my-6 flex w-[calc(100%+4rem)] flex-col"
      style={{
        height: "100vh",
        backgroundColor: "#fff",
      }}
    >
      <TopBar
        rail={rail}
        particleTypeName={particleTypeName}
        isPublished={isPublished}
        onOpenSettings={() => {
          setShowSettings(true)
        }}
        onPublish={() => {
          void handlePublish()
        }}
        onUnpublish={() => {
          void handleUnpublish()
        }}
      />

      <div className="flex min-h-0 flex-1">
        <RailPalette disabled={isPublished} />
        <main className="min-w-0 flex-1">
          <RailCanvas
            railId={rail.id}
            nodes={nodes}
            posts={posts}
            isPublished={isPublished}
            onEdit={(node) => {
              if (node.type === "trigger") return
              setEditingNode(node)
            }}
            onDelete={(node) => {
              void handleDeleteNode(node)
            }}
            onAddAfter={() => {
              setShowAddTask(true)
            }}
            onPaletteDrop={() => {
              setShowAddTask(true)
            }}
            onReorder={(newIdsInOrder) => {
              void reorderNodes({ railId: rail.id, nodeIdsInOrder: newIdsInOrder }).then(
                (result) => {
                  if (result.serverError) alert(result.serverError)
                  else router.refresh()
                },
              )
            }}
          />
        </main>
      </div>

      {showSettings && (
        <RailSettingsDialog
          rail={rail}
          particleTypeName={particleTypeName}
          onClose={() => {
            setShowSettings(false)
          }}
        />
      )}

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

function TopBar({
  rail,
  particleTypeName,
  isPublished,
  onOpenSettings,
  onPublish,
  onUnpublish,
}: {
  rail: Rail
  particleTypeName: string | null
  isPublished: boolean
  onOpenSettings: () => void
  onPublish: () => void
  onUnpublish: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(rail.name)
  const [savingName, setSavingName] = useState(false)

  async function commitName() {
    if (name.trim() === rail.name) return
    if (name.trim().length === 0) {
      setName(rail.name)
      return
    }
    setSavingName(true)
    const result = await updateRail({ id: rail.id, name: name.trim() })
    setSavingName(false)
    if (result.serverError) {
      alert(result.serverError)
      setName(rail.name)
      return
    }
    router.refresh()
  }

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-3 px-4"
      style={{
        borderBottom: "1px solid #0F0F0F",
        backgroundColor: "#fff",
      }}
    >
      <Link
        href="/rails"
        aria-label="Back to Rails"
        className="grid size-7 place-items-center transition-colors hover:bg-[#FAFAFA]"
        style={{ border: "1px solid #D4D4D4" }}
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} />
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
          }}
          onBlur={() => {
            void commitName()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            } else if (e.key === "Escape") {
              setName(rail.name)
              e.currentTarget.blur()
            }
          }}
          disabled={isPublished || savingName}
          aria-label="Rail name"
          className="min-w-0 flex-1 bg-transparent outline-none disabled:opacity-90"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            fontWeight: 600,
            color: "#0F0F0F",
            letterSpacing: "-0.005em",
            padding: "4px 6px",
            border: "1px solid transparent",
          }}
          onFocus={(e) => {
            if (!isPublished) e.currentTarget.style.borderColor = "#0F0F0F"
          }}
          onMouseEnter={(e) => {
            if (!isPublished && document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = "#E4E4E4"
            }
          }}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = "transparent"
            }
          }}
        />
        {particleTypeName && (
          <span
            className="hidden md:inline-block"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: "#5A7A92",
              textTransform: "uppercase",
            }}
          >
            Particle · {particleTypeName}
          </span>
        )}
      </div>

      <StatusPill isPublished={isPublished} />

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Rail settings"
        className="grid size-7 place-items-center transition-colors hover:bg-[#FAFAFA]"
        style={{ border: "1px solid #D4D4D4" }}
      >
        <SettingsIcon className="size-3.5" strokeWidth={2} aria-hidden />
      </button>

      {isPublished ? (
        <BlueprintButton variant="outline" size="sm" onClick={onUnpublish}>
          Unpublish
        </BlueprintButton>
      ) : (
        <BlueprintButton variant="primary" size="sm" particle onClick={onPublish}>
          Publish
        </BlueprintButton>
      )}
    </header>
  )
}

function StatusPill({ isPublished }: { isPublished: boolean }) {
  const color = isPublished ? "#1F4E36" : "#888"
  const label = isPublished ? "Published" : "Draft"
  return (
    <span
      className="px-2 py-1"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: isPublished ? "#fff" : color,
        backgroundColor: isPublished ? color : "transparent",
        border: `1px solid ${color}`,
      }}
    >
      {label}
    </span>
  )
}

function RailSettingsDialog({
  rail,
  particleTypeName,
  onClose,
}: {
  rail: Rail
  particleTypeName: string | null
  onClose: () => void
}) {
  const router = useRouter()
  const [description, setDescription] = useState(rail.description ?? "")
  const [submitting, setSubmitting] = useState(false)
  const isPublished = rail.status === "published"

  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await updateRail({
      id: rail.id,
      name: rail.name,
      description: description || null,
    })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rail Settings</DialogTitle>
          <DialogDescription>
            Description and particle binding. Editable while in Draft.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="rail-description">Description</Label>
            <Textarea
              id="rail-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
              rows={3}
              disabled={isPublished}
              placeholder="What does this rail do? When does it run?"
            />
          </div>

          {particleTypeName && (
            <div>
              <Label>Particle binding</Label>
              <Input value={particleTypeName} disabled readOnly />
              <p
                className="mt-1.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  color: "#888",
                }}
              >
                Bound at creation; not editable.
              </p>
            </div>
          )}

          <DialogFooter>
            <BlueprintButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              <X className="size-3" />
              Close
            </BlueprintButton>
            <BlueprintButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || isPublished}
            >
              {submitting ? "Saving..." : "Save"}
            </BlueprintButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
