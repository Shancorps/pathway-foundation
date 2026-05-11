"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { FieldRenderer } from "@/modules/manifests/ui/field-renderer"
import { startRail } from "../actions"
import type { PrepareStartRailResult } from "../queries"

/**
 * Operator-facing pre-flight for rails with an Initialize node. Collects every
 * post-holder pick (multi-holder Posts referenced by the rail) and every
 * required manifest field declared by the Initialize node, then submits them
 * alongside the start request. Rails without Initialize never see this — the
 * caller branches on `prepareStartRail` and skips the modal entirely.
 */
export type StartRailRequirements = Extract<
  PrepareStartRailResult,
  { requiresInitialize: true }
>["requirements"]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  railId: string
  particleId: string
  railName: string
  particleName: string
  requirements: StartRailRequirements
  /** Fires after a successful start — caller can use this to navigate to /runs/<id>. */
  onStarted?: (data: { runId: string }) => void
}

export function StartRailModal({
  open,
  onOpenChange,
  railId,
  particleId,
  railName,
  particleName,
  requirements,
  onStarted,
}: Props) {
  // Holder picks: { [postId]: userId }. Required for every multi-holder Post.
  const [postHolders, setPostHolders] = useState<Record<string, string>>({})
  // Manifest data: { [manifestId]: { [fieldKey]: value } }. Required for every
  // declared (manifest, slug) on the Initialize node.
  const [manifestData, setManifestData] = useState<Record<string, Record<string, unknown>>>({})

  const { execute, status, result } = useAction(startRail, {
    onSuccess: ({ data }) => {
      onOpenChange(false)
      if (data.runId) onStarted?.({ runId: data.runId })
    },
  })

  // A manifest field counts as empty when undefined / null / "" / empty array.
  // Matches the server-side `empty` check in actions.ts so the disabled-state
  // and the server's validation can't disagree.
  function isEmpty(v: unknown): boolean {
    return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
  }

  const missingHolder = requirements.multiHolderPosts.some((p) => !postHolders[p.postId])
  const missingField = requirements.manifestFields.some((f) =>
    isEmpty(manifestData[f.manifestId]?.[f.field.key]),
  )
  const disabled = status === "executing" || missingHolder || missingField

  function handleSubmit() {
    execute({
      railId,
      particleId,
      initializeData: {
        postHolderAssignments: postHolders,
        manifestData,
      },
    })
  }

  function setFieldValue(manifestId: string, key: string, value: unknown) {
    setManifestData((prev) => ({
      ...prev,
      [manifestId]: { ...(prev[manifestId] ?? {}), [key]: value },
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Start: {railName} — {particleName}
          </DialogTitle>
          <DialogDescription>
            Fill in the information below to send this Particle down the rail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {requirements.multiHolderPosts.length > 0 && (
            <section className="space-y-3">
              <h3
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  color: "var(--bp-text-secondary)",
                  textTransform: "uppercase",
                }}
              >
                Post Assignments
              </h3>
              <p className="text-muted-foreground text-xs">
                Several Posts on this rail have multiple holders. Pick which holder gets the cycle.
              </p>
              <div className="space-y-3">
                {requirements.multiHolderPosts.map((p) => (
                  <div key={p.postId} className="space-y-1">
                    <Label htmlFor={`post-${p.postId}`} className="flex items-center gap-1">
                      {p.postTitle}
                      <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id={`post-${p.postId}`}
                      className="bg-background w-full rounded-md border px-2 py-1.5 text-sm"
                      value={postHolders[p.postId] ?? ""}
                      onChange={(e) => {
                        setPostHolders((prev) => ({ ...prev, [p.postId]: e.target.value }))
                      }}
                    >
                      <option value="">— Pick a holder —</option>
                      {p.holders.map((h) => (
                        <option key={h.userId} value={h.userId}>
                          {h.userName}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          )}

          {requirements.manifestFields.length > 0 && (
            <section className="space-y-3">
              <h3
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  color: "var(--bp-text-secondary)",
                  textTransform: "uppercase",
                }}
              >
                Required Information
              </h3>
              <div className="space-y-3">
                {requirements.manifestFields.map((f) => (
                  <div key={`${f.manifestId}.${f.field.key}`} className="space-y-1">
                    <p className="text-muted-foreground text-xs">{f.manifestName}</p>
                    <FieldRenderer
                      field={f.field}
                      value={manifestData[f.manifestId]?.[f.field.key]}
                      onChange={(v) => {
                        setFieldValue(f.manifestId, f.field.key, v)
                      }}
                      isRequired
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {result.serverError && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
            {result.serverError}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <BlueprintButton variant="primary" particle disabled={disabled} onClick={handleSubmit}>
            {status === "executing" ? "Starting..." : "Start Rail"}
          </BlueprintButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
