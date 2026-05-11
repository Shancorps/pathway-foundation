"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { RequiredFieldsConfig } from "@/modules/manifests/ui/required-fields-config"
import { addStructuralNode, updateInitializeConfig } from "../actions"
import type { RailNode, RailNodeRequiredManifestField } from "../schema"

/**
 * One Post on the parent rail with its current holders. The Initialize dialog
 * only renders multi-holder Posts (the ones where the operator will have to
 * pick a holder at run-start); single-holder / vacant Posts are filtered out
 * by the caller.
 */
export interface RailPostHolders {
  postId: string
  postTitle: string
  holders: { userId: string; userName: string }[]
}

export function InitializeNodeDialog({
  open,
  onOpenChange,
  mode,
  railId,
  node,
  attachedManifests,
  allRailPosts,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  railId: string
  /** Required in edit mode. */
  node?: RailNode
  /**
   * Manifests currently attached to the parent rail. Drives the
   * "Required at start" config section.
   */
  attachedManifests: Manifest[]
  /**
   * Every Post referenced by this rail, with its current holders. The dialog
   * filters for the multi-holder subset and renders a read-only preview so
   * the rail designer can see which Posts the operator will be asked to
   * narrow at run-start.
   */
  allRailPosts: RailPostHolders[]
  /**
   * Fires after the action succeeds and the dialog closes. The parent uses
   * this to decide whether to surface the "push to in-progress runs"
   * confirmation. If omitted, the dialog calls router.refresh() itself.
   */
  onSaved?: () => void
}) {
  const router = useRouter()
  const initialConfig = node?.config.kind === "initialize" ? node.config : null
  const [name, setName] = useState(node?.name ?? "Initialize")
  const [description, setDescription] = useState(node?.description ?? "")
  const [requiredFields, setRequiredFields] = useState<RailNodeRequiredManifestField[]>(
    initialConfig?.requiredManifestFieldSlugs ?? [],
  )
  const [submitting, setSubmitting] = useState(false)

  // Posts the operator will be prompted to narrow at run-start. Single-holder
  // and vacant Posts auto-route (or refuse to issue) without operator input,
  // so they don't belong in this preview.
  const multiHolderPosts = allRailPosts.filter((p) => p.holders.length > 1)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName.length === 0) {
      alert("Give the Initialize step a name.")
      return
    }
    setSubmitting(true)

    if (mode === "add") {
      // Create the node first — addStructuralNode auto-snaps it to position 1
      // and shifts existing non-trigger nodes down. Then patch the config /
      // description / name via updateInitializeConfig in the same flow.
      const created = await addStructuralNode({
        railId,
        type: "initialize",
        name: trimmedName,
      })
      if (created.serverError || !created.data) {
        setSubmitting(false)
        alert(created.serverError ?? "Failed to add Initialize node.")
        return
      }
      const update = await updateInitializeConfig({
        id: created.data.id,
        name: trimmedName,
        description: description.trim() === "" ? null : description.trim(),
        requiredManifestFieldSlugs: requiredFields,
      })
      if (update.serverError) {
        setSubmitting(false)
        alert(update.serverError)
        return
      }
    } else {
      if (!node) {
        setSubmitting(false)
        return
      }
      const result = await updateInitializeConfig({
        id: node.id,
        name: trimmedName,
        description: description.trim() === "" ? null : description.trim(),
        requiredManifestFieldSlugs: requiredFields,
      })
      if (result.serverError) {
        setSubmitting(false)
        alert(result.serverError)
        return
      }
    }

    setSubmitting(false)
    onOpenChange(false)
    if (onSaved) onSaved()
    else router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Initialize" : "Edit Initialize"}</DialogTitle>
          <DialogDescription>
            A gatekeeper before the first Task. At run-start the operator fills in the required
            fields and picks a holder for each multi-holder Post — the rail can&rsquo;t move until
            it&rsquo;s done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="initialize-name">Name</Label>
            <Input
              id="initialize-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              placeholder="Initialize"
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="initialize-description">Description (optional)</Label>
            <Textarea
              id="initialize-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
              rows={2}
              placeholder="What does the operator need to gather before the rail can start?"
            />
          </div>

          <RequiredFieldsConfig
            label="Required at start"
            helperText="The rail can't start until these fields are filled."
            attachedManifests={attachedManifests}
            value={requiredFields}
            onChange={setRequiredFields}
          />

          <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
            <Label className="text-sm">Post-holder picks</Label>
            <p className="text-xs" style={{ color: "var(--bp-text-muted)", lineHeight: 1.5 }}>
              At run-start, the operator picks one of these for each multi-holder Post.
            </p>
            {multiHolderPosts.length === 0 ? (
              <p
                className="rounded-md border border-dashed border-[var(--color-border)] p-3 text-center text-xs"
                style={{ color: "var(--bp-text-muted)" }}
              >
                No multi-holder Posts on this rail. Initialize will only gate on the required fields
                above.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {multiHolderPosts.map((p) => (
                  <li
                    key={p.postId}
                    className="px-2 py-1.5"
                    style={{
                      border: "1px solid var(--bp-border-default)",
                      backgroundColor: "var(--bp-surface-card)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--bp-text-primary)",
                      }}
                    >
                      {p.postTitle}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--bp-text-muted)",
                      }}
                    >
                      {" "}
                      — {p.holders.map((h) => h.userName).join(", ")}
                    </span>
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
              disabled={submitting || name.trim().length === 0}
            >
              {submitting ? "Saving..." : mode === "add" ? "Add" : "Save"}
            </BlueprintButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
