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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { updateApprovalConfig } from "../actions"
import type { RailNode } from "../schema"
import type { PostOption } from "./task-node-dialog"

export function ApprovalDialog({
  open,
  onOpenChange,
  node,
  posts,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: RailNode
  posts: PostOption[]
  onSaved?: () => void
}) {
  const router = useRouter()
  const initialConfig = node.config.kind === "approval" ? node.config : null
  const [name, setName] = useState(node.name)
  const [description, setDescription] = useState(node.description ?? "")
  const [approverPostId, setApproverPostId] = useState(node.postId ?? "")
  const [mode, setMode] = useState<"approve_reject" | "with_reason">(
    initialConfig?.mode ?? "approve_reject",
  )
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await updateApprovalConfig({
      id: node.id,
      name,
      description: description || null,
      approverPostId: approverPostId || null,
      mode,
      onRejection: "end",
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
          <DialogTitle>Approval</DialogTitle>
          <DialogDescription>
            Pause the rail until a specific person signs off. The approver gets a cycle in My
            Actions with Approve / Reject. Approve advances the rail; Reject ends it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="approval-name">Name</Label>
            <Input
              id="approval-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="approval-approver">Approver (Post)</Label>
            <Select value={approverPostId} onValueChange={setApproverPostId}>
              <SelectTrigger id="approval-approver">
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
              <p
                className="mt-1.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  color: "#888",
                }}
              >
                No posts in your org yet.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="approval-description">Description (optional)</Label>
            <Textarea
              id="approval-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
              rows={2}
              placeholder="What is the approver checking?"
            />
          </div>
          <div>
            <Label htmlFor="approval-mode">Approval mode</Label>
            <Select
              value={mode}
              onValueChange={(v) => {
                setMode(v as "approve_reject" | "with_reason")
              }}
            >
              <SelectTrigger id="approval-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve_reject">Approve / Reject</SelectItem>
                <SelectItem value="with_reason">Approve / Reject with reason</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>On rejection</Label>
            <p
              className="mt-1.5 px-3 py-2"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "#444",
                border: "1px solid #E4E4E4",
                backgroundColor: "#FAFAFA",
              }}
            >
              End the rail · the run terminates when rejected
            </p>
            <p
              className="mt-1.5"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.06em",
                color: "#888",
              }}
            >
              Loop-back and branch-on-rejection options ship in a follow-up.
            </p>
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
