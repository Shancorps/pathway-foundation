"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  Lock,
  Settings as SettingsIcon,
  Unlock,
  X,
} from "lucide-react"
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
import type { Manifest } from "@/modules/manifests/schema"
import {
  RailManifestTab,
  type RailManifestAttachment,
} from "@/modules/manifests/ui/rail-manifest-tab"
import {
  addStructuralNode,
  deleteNode,
  publishRail,
  pushRailUpdateToCycles,
  reorderNodes,
  unpublishRail,
  updateRail,
} from "../actions"
import type { Rail, RailNode } from "../schema"
import { ApprovalDialog } from "./approval-dialog"
import { RailCanvas, type RailRef } from "./rail-canvas"
import { RailPalette } from "./rail-palette"
import { SubFlowDialog } from "./sub-flow-dialog"
import { TaskNodeDialog, type PostOption } from "./task-node-dialog"

/**
 * Rail builder shell. Full-width n8n-style surface: thin top bar, left node
 * palette, canvas filling the rest. Settings (description, etc) live in a
 * modal accessed via the gear icon. All editing — add / edit / reorder /
 * delete a Task — happens on the canvas; clicking a node opens
 * TaskNodeDialog.
 */
const LOCK_STORAGE_PREFIX = "pathway.rail-canvas.locked"
function lockKey(railId: string) {
  return `${LOCK_STORAGE_PREFIX}.${railId}`
}

export function RailEditor({
  rail,
  nodes,
  posts,
  particleTypeName,
  runningRunCount,
  otherRails,
  attachedManifests,
  allManifests,
}: {
  rail: Rail
  nodes: RailNode[]
  posts: PostOption[]
  particleTypeName: string | null
  runningRunCount: number
  otherRails: RailRef[]
  attachedManifests: RailManifestAttachment[]
  allManifests: Manifest[]
}) {
  const router = useRouter()
  const isPublished = rail.status === "published"
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingNode, setEditingNode] = useState<RailNode | null>(null)
  const [editingSubFlow, setEditingSubFlow] = useState<RailNode | null>(null)
  const [editingApproval, setEditingApproval] = useState<RailNode | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showManifests, setShowManifests] = useState(false)

  // Client-side UI lock — DEFAULT LOCKED so a freshly opened rail is safe
  // from accidental edits regardless of publish state. Click the lock icon
  // in the top bar to unlock + edit. Per browser per rail.
  const [locked, setLockedState] = useState(true)
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(lockKey(rail.id))
    if (stored !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydrate
      setLockedState(stored === "1")
    }
  }, [rail.id])
  const setLocked = (next: boolean) => {
    setLockedState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(lockKey(rail.id), next ? "1" : "0")
    }
  }

  // The canvas treats a locked rail like a published one for editing
  // purposes — no drag, no add, no delete. Edits flow through actions which
  // are still permissive at the server, so unlocking + editing is enough.
  const editsDisabled = locked

  // After any successful edit on a published rail with running runs, ask
  // whether to push the update to in-progress cycles. Closed by Default-No
  // (preserves snapshot semantics) or Confirm-Yes (pushes update).
  const [showPushConfirm, setShowPushConfirm] = useState(false)
  const [pushing, setPushing] = useState(false)

  function notifyEditSaved() {
    router.refresh()
    if (isPublished && runningRunCount > 0) {
      setShowPushConfirm(true)
    }
  }

  async function handlePushUpdate() {
    setPushing(true)
    const result = await pushRailUpdateToCycles({ railId: rail.id })
    setPushing(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    setShowPushConfirm(false)
    router.refresh()
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
    else notifyEditSaved()
  }

  return (
    <div
      // Negative margins cancel the app shell's px-8 py-6 wrapper so the
      // builder fills the viewport edge-to-edge — this is the n8n-style
      // canvas surface, not a card under a title.
      className="-mx-8 -my-6 flex w-[calc(100%+4rem)] flex-col"
      style={{
        height: "100vh",
        backgroundColor: "var(--bp-surface-card)",
      }}
    >
      <TopBar
        rail={rail}
        particleTypeName={particleTypeName}
        isPublished={isPublished}
        locked={locked}
        manifestCount={attachedManifests.length}
        onToggleLock={() => {
          setLocked(!locked)
        }}
        onOpenSettings={() => {
          setShowSettings(true)
        }}
        onOpenManifests={() => {
          setShowManifests(true)
        }}
        onPublish={() => {
          void handlePublish()
        }}
        onUnpublish={() => {
          void handleUnpublish()
        }}
      />

      {isPublished && runningRunCount > 0 && <PublishedEditingBanner runCount={runningRunCount} />}

      <div className="flex min-h-0 flex-1">
        <RailPalette disabled={editsDisabled} />
        <main className="min-w-0 flex-1">
          <RailCanvas
            railId={rail.id}
            nodes={nodes}
            posts={posts}
            otherRails={otherRails}
            isPublished={editsDisabled}
            onEdit={(node) => {
              if (editsDisabled) return
              if (node.type === "trigger" || node.type === "end") return
              if (node.type === "sub_flow") {
                setEditingSubFlow(node)
                return
              }
              if (node.type === "approval") {
                setEditingApproval(node)
                return
              }
              if (node.type === "task") {
                setEditingNode(node)
                return
              }
            }}
            onDelete={(node) => {
              void handleDeleteNode(node)
            }}
            onAddAfter={() => {
              setShowAddTask(true)
            }}
            onPaletteDrop={(paletteId) => {
              if (paletteId === "task") {
                setShowAddTask(true)
                return
              }
              if (paletteId === "end" || paletteId === "sub_flow" || paletteId === "approval") {
                void addStructuralNode({ railId: rail.id, type: paletteId }).then((result) => {
                  if (result.serverError) alert(result.serverError)
                  else notifyEditSaved()
                })
                return
              }
              // Other palette types aren't wired yet — palette renders them
              // as "Soon" so this branch shouldn't fire.
            }}
            onReorder={(newIdsInOrder) => {
              void reorderNodes({ railId: rail.id, nodeIdsInOrder: newIdsInOrder }).then(
                (result) => {
                  if (result.serverError) alert(result.serverError)
                  else notifyEditSaved()
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

      <RailManifestsDialog
        open={showManifests}
        onClose={() => {
          setShowManifests(false)
        }}
        railId={rail.id}
        attached={attachedManifests}
        allManifests={allManifests}
        disabled={editsDisabled}
      />

      <TaskNodeDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        mode="add"
        railId={rail.id}
        posts={posts}
        onSaved={notifyEditSaved}
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
          onSaved={notifyEditSaved}
        />
      )}
      {editingSubFlow && (
        <SubFlowDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingSubFlow(null)
          }}
          node={editingSubFlow}
          otherRails={otherRails}
          onSaved={notifyEditSaved}
        />
      )}
      {editingApproval && (
        <ApprovalDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingApproval(null)
          }}
          node={editingApproval}
          posts={posts}
          onSaved={notifyEditSaved}
        />
      )}

      {showPushConfirm && (
        <PushUpdateConfirm
          runCount={runningRunCount}
          submitting={pushing}
          onCancel={() => {
            setShowPushConfirm(false)
          }}
          onConfirm={() => {
            void handlePushUpdate()
          }}
        />
      )}
    </div>
  )
}

function TopBar({
  rail,
  particleTypeName,
  isPublished,
  locked,
  manifestCount,
  onToggleLock,
  onOpenSettings,
  onOpenManifests,
  onPublish,
  onUnpublish,
}: {
  rail: Rail
  particleTypeName: string | null
  isPublished: boolean
  locked: boolean
  manifestCount: number
  onToggleLock: () => void
  onOpenSettings: () => void
  onOpenManifests: () => void
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
        backgroundColor: "var(--bp-surface-card)",
      }}
    >
      <Link
        href="/rails"
        aria-label="Back to Rails"
        className="grid size-7 place-items-center transition-colors hover:bg-[var(--bp-surface-card-queued)]"
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
            color: "var(--bp-text-primary)",
            letterSpacing: "-0.005em",
            padding: "4px 6px",
            border: "1px solid transparent",
          }}
          onFocus={(e) => {
            if (!isPublished) e.currentTarget.style.borderColor = "var(--bp-text-primary)"
          }}
          onMouseEnter={(e) => {
            if (!isPublished && document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = "var(--bp-border-default)"
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
              color: "var(--bp-accent-steel-soft)",
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
        onClick={onToggleLock}
        aria-label={locked ? "Unlock canvas" : "Lock canvas"}
        title={
          locked ? "Locked — click to unlock" : "Click to lock canvas (prevents accidental edits)"
        }
        className="grid size-7 place-items-center transition-colors"
        style={{
          border: `1px solid ${locked ? "var(--bp-accent-orange)" : "var(--bp-border-strong)"}`,
          backgroundColor: locked ? "var(--bp-surface-card-active)" : "var(--bp-surface-card)",
          color: locked ? "var(--bp-accent-orange)" : "var(--bp-text-primary)",
        }}
      >
        {locked ? (
          <Lock className="size-3.5" strokeWidth={2} aria-hidden />
        ) : (
          <Unlock className="size-3.5" strokeWidth={2} aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={onOpenManifests}
        aria-label={`Manifests (${String(manifestCount)} attached)`}
        title={`Manifests · ${String(manifestCount)} attached`}
        className="relative grid h-7 place-items-center px-2 text-xs transition-colors hover:bg-[var(--bp-surface-card-queued)]"
        style={{
          border: "1px solid #D4D4D4",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.16em",
          color: "var(--bp-text-primary)",
          textTransform: "uppercase",
        }}
      >
        <FileText className="mr-1 size-3.5" strokeWidth={2} aria-hidden />
        Manifests
        {manifestCount > 0 && (
          <span
            className="ml-1.5 grid size-4 place-items-center"
            style={{
              backgroundColor: "var(--bp-accent-particle, #1A6FE3)",
              color: "var(--bp-surface-card)",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0,
              borderRadius: 2,
            }}
          >
            {String(manifestCount)}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Rail settings"
        className="grid size-7 place-items-center transition-colors hover:bg-[var(--bp-surface-card-queued)]"
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
  const color = isPublished ? "var(--bp-accent-success)" : "var(--bp-text-muted)"
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
        color: isPublished ? "var(--bp-surface-card)" : color,
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
                  color: "var(--bp-text-muted)",
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

function PublishedEditingBanner({ runCount }: { runCount: number }) {
  return (
    <div
      className="flex shrink-0 items-start gap-3 px-5 py-3"
      style={{
        backgroundColor: "var(--bp-surface-card-active)",
        borderBottom: "1px solid #E8711A",
      }}
    >
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0"
        style={{ color: "var(--bp-accent-orange)" }}
        strokeWidth={2}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.2em",
            color: "var(--bp-accent-orange)",
            textTransform: "uppercase",
          }}
        >
          Published · {String(runCount)} run{runCount === 1 ? "" : "s"} in progress
        </p>
        <p
          className="mt-1"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--bp-text-primary)",
            lineHeight: 1.5,
          }}
        >
          Edits apply to <strong>new cycles only</strong>. In-progress cycles keep the snapshot they
          were issued with — your changes won&rsquo;t interrupt running work.
        </p>
      </div>
    </div>
  )
}

function PushUpdateConfirm({
  runCount,
  submitting,
  onCancel,
  onConfirm,
}: {
  runCount: number
  submitting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onCancel()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update ongoing rail instances?</DialogTitle>
          <DialogDescription>
            This rail has {String(runCount)} run{runCount === 1 ? "" : "s"} in progress.
            <br />
            <br />
            <strong>Yes</strong> — push your edits onto every still-open cycle in those runs. Useful
            when the change is a policy update everyone needs to follow now (e.g. a new required
            checklist item).
            <br />
            <br />
            <strong>No</strong> — only new cycles issued from now on will see the change. Currently
            in-progress cycles keep the snapshot they were issued with.
          </DialogDescription>
        </DialogHeader>
        <p
          className="rounded-md bg-[var(--bp-surface-card-queued)] px-3 py-2"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "var(--bp-text-secondary)",
            lineHeight: 1.55,
          }}
        >
          Checked-off checklist items keep their progress for items whose id survived the edit.
          Cycles whose node was deleted are left as-is (the worker can still complete them under the
          original terms).
        </p>
        <DialogFooter>
          <BlueprintButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            No, only new cycles
          </BlueprintButton>
          <BlueprintButton
            type="button"
            variant="primary"
            size="sm"
            particle
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Pushing..." : "Yes, push to in-progress"}
          </BlueprintButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RailManifestsDialog({
  open,
  onClose,
  railId,
  attached,
  allManifests,
  disabled,
}: {
  open: boolean
  onClose: () => void
  railId: string
  attached: RailManifestAttachment[]
  allManifests: Manifest[]
  disabled: boolean
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manifests</DialogTitle>
          <DialogDescription>
            The data this rail collects. Manifests attached here become available on every cycle of
            every run; mark fields as required-to-advance inside individual Task or Approval steps.
          </DialogDescription>
        </DialogHeader>
        <RailManifestTab
          railId={railId}
          attached={attached}
          allManifests={allManifests}
          disabled={disabled}
        />
      </DialogContent>
    </Dialog>
  )
}
