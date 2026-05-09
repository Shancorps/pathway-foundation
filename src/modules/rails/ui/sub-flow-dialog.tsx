"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { updateSubFlowConfig } from "../actions"
import type { RailNode } from "../schema"

interface RailRef {
  id: string
  name: string
}

export function SubFlowDialog({
  open,
  onOpenChange,
  node,
  otherRails,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: RailNode
  otherRails: RailRef[]
  onSaved?: () => void
}) {
  const router = useRouter()
  const initialConfig = node.config.kind === "sub_flow" ? node.config : null
  const [name, setName] = useState(node.name)
  const [targetRailId, setTargetRailId] = useState<string>(initialConfig?.targetRailId ?? "")
  const [waitForCompletion, setWaitForCompletion] = useState<boolean>(
    initialConfig?.waitForCompletion ?? true,
  )
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await updateSubFlowConfig({
      id: node.id,
      name,
      targetRailId: targetRailId || null,
      waitForCompletion,
    })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    onOpenChange(false)
    if (onSaved) onSaved()
    else router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sub-Flow</DialogTitle>
          <DialogDescription>
            Run another rail as a sub-process at this step. The sub-rail uses the same particle as
            the parent. When it reaches its End node, the parent advances.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sub-flow-name">Name</Label>
            <Input
              id="sub-flow-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="sub-flow-target">Target rail</Label>
            <Select value={targetRailId} onValueChange={setTargetRailId}>
              <SelectTrigger id="sub-flow-target">
                <SelectValue placeholder="Pick a rail to run" />
              </SelectTrigger>
              <SelectContent>
                {otherRails.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {otherRails.length === 0 && (
              <p
                className="mt-1.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  color: "var(--bp-text-muted)",
                }}
              >
                No other rails in this org. Build another rail first.
              </p>
            )}
          </div>
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              checked={waitForCompletion}
              onCheckedChange={(v) => {
                setWaitForCompletion(Boolean(v))
              }}
              className="mt-0.5"
            />
            <span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--bp-text-primary)",
                }}
              >
                Wait for completion
              </span>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  color: "var(--bp-text-muted)",
                }}
              >
                Parent rail pauses here until the sub-rail reaches its End node.
              </p>
            </span>
          </label>

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
              disabled={submitting || !name.trim()}
            >
              {submitting ? "Saving..." : "Save"}
            </BlueprintButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
