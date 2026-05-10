"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowDown, ArrowUp, X } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
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
import { attachManifestToRail, detachManifestFromRail, reorderRailManifests } from "../actions"
import type { Manifest, RailManifest } from "../schema"

/**
 * Row shape returned by `getRailManifests` — { attachment, manifest }.
 * The component renders attachments in their stored order; the parent server
 * page is responsible for fetching them in `position` order.
 */
export interface RailManifestAttachment {
  attachment: RailManifest
  manifest: Manifest
}

interface Props {
  railId: string
  attached: RailManifestAttachment[]
  allManifests: Manifest[]
  /**
   * Mirrors the rail editor's lock state — when true, attach / reorder /
   * detach controls are hidden (read-only view).
   */
  disabled?: boolean
}

/**
 * Manifest panel for a Rail. Shows the attached manifests in order, with
 * arrows to reorder and an X to detach. "+ Add Manifest" opens a picker over
 * the org's full manifest library (filtered by attached set + name search).
 *
 * Detach pops a confirmation: in-flight runs keep their data, but new cycles
 * won't see this manifest.
 */
export function RailManifestTab({ railId, attached, allManifests, disabled = false }: Props) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState("")
  const [confirmDetach, setConfirmDetach] = useState<{ manifestId: string; name: string } | null>(
    null,
  )

  const attachAction = useAction(attachManifestToRail, {
    onSuccess: () => {
      router.refresh()
    },
  })
  const detachAction = useAction(detachManifestFromRail, {
    onSuccess: () => {
      router.refresh()
    },
  })
  const reorderAction = useAction(reorderRailManifests, {
    onSuccess: () => {
      router.refresh()
    },
  })

  const attachedIds = new Set(attached.map((a) => a.attachment.manifestId))
  const candidates = allManifests.filter(
    (m) =>
      !attachedIds.has(m.id) &&
      (pickerQuery.trim() === "" || m.name.toLowerCase().includes(pickerQuery.toLowerCase())),
  )

  function handleReorder(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= attached.length) return
    const ids = attached.map((a) => a.attachment.manifestId)
    const [moved] = ids.splice(fromIdx, 1)
    if (moved === undefined) return
    ids.splice(toIdx, 0, moved)
    reorderAction.execute({ railId, manifestIds: ids })
  }

  return (
    <div className="space-y-3">
      <div>
        <h3
          className="mb-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.16em",
            color: "var(--bp-text-secondary)",
            textTransform: "uppercase",
          }}
        >
          Manifests on this rail
        </h3>
        <p className="text-xs" style={{ color: "var(--bp-text-muted)", lineHeight: 1.5 }}>
          Manifests are the data the rail collects. Attach one or more here, then mark fields as
          required-to-advance inside individual Task or Approval steps.
        </p>
      </div>

      {attached.length === 0 ? (
        <p
          className="border border-dashed p-3 text-center text-xs"
          style={{
            borderColor: "var(--bp-border-default)",
            color: "var(--bp-text-muted)",
          }}
        >
          No manifests attached.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {attached.map((row, idx) => (
            <li
              key={row.attachment.manifestId}
              className="flex items-center gap-2 px-2 py-1.5 text-sm"
              style={{
                border: "1px solid var(--bp-border-default)",
                backgroundColor: "var(--bp-surface-card)",
              }}
            >
              {!disabled && (
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleReorder(idx, idx - 1)
                    }}
                    disabled={idx === 0}
                    aria-label="Move up"
                    className="grid place-items-center border border-transparent p-0.5 hover:border-[var(--bp-border-default)] hover:bg-[var(--bp-surface-card-active)] disabled:opacity-30"
                  >
                    <ArrowUp className="size-3" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleReorder(idx, idx + 1)
                    }}
                    disabled={idx === attached.length - 1}
                    aria-label="Move down"
                    className="grid place-items-center border border-transparent p-0.5 hover:border-[var(--bp-border-default)] hover:bg-[var(--bp-surface-card-active)] disabled:opacity-30"
                  >
                    <ArrowDown className="size-3" strokeWidth={1.5} />
                  </button>
                </div>
              )}
              <span
                className="flex-1 truncate"
                style={{ color: "var(--bp-text-primary)", fontWeight: 500 }}
              >
                {row.manifest.name}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  color: "var(--bp-text-muted)",
                }}
              >
                {String(row.manifest.fields.length)} field
                {row.manifest.fields.length === 1 ? "" : "s"}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDetach({
                      manifestId: row.attachment.manifestId,
                      name: row.manifest.name,
                    })
                  }}
                  aria-label={`Detach ${row.manifest.name}`}
                  className="grid place-items-center border border-transparent p-1 hover:border-[var(--bp-border-default)] hover:bg-[var(--bp-surface-card-active)]"
                >
                  <X className="size-3.5" strokeWidth={1.5} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <BlueprintButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setPickerOpen(true)
          }}
        >
          + Add Manifest
        </BlueprintButton>
      )}

      {/* Picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attach a manifest</DialogTitle>
            <DialogDescription>
              Pick from your org&rsquo;s manifest library. Build new manifests in Manifest
              Management.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search manifests..."
            value={pickerQuery}
            onChange={(e) => {
              setPickerQuery(e.target.value)
            }}
            autoFocus
          />
          <div className="max-h-72 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: "var(--bp-text-muted)" }}>
                {allManifests.length === 0
                  ? "No manifests in your org yet. Build one in Manifest Management first."
                  : "No matches."}
              </p>
            ) : (
              <ul>
                {candidates.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="w-full px-2 py-1.5 text-left text-sm hover:bg-[var(--bp-surface-card-active)]"
                      onClick={() => {
                        attachAction.execute({ railId, manifestId: m.id })
                        setPickerOpen(false)
                        setPickerQuery("")
                      }}
                    >
                      <div className="font-medium" style={{ color: "var(--bp-text-primary)" }}>
                        {m.name}
                      </div>
                      {m.description && (
                        <div
                          className="line-clamp-1 text-xs"
                          style={{ color: "var(--bp-text-muted)" }}
                        >
                          {m.description}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detach confirmation */}
      <Dialog
        open={!!confirmDetach}
        onOpenChange={(open) => {
          if (!open) setConfirmDetach(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detach {confirmDetach?.name}?</DialogTitle>
            <DialogDescription>
              In-flight runs keep the data they&rsquo;ve already collected for this manifest. New
              cycles won&rsquo;t see it. You can re-attach later — past data will reappear.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <BlueprintButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirmDetach(null)
              }}
            >
              Cancel
            </BlueprintButton>
            <BlueprintButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                if (confirmDetach) {
                  detachAction.execute({ railId, manifestId: confirmDetach.manifestId })
                  setConfirmDetach(null)
                }
              }}
            >
              Detach
            </BlueprintButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
