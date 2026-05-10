"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { createManifest } from "../actions"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateManifestModal({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tagsRaw, setTagsRaw] = useState("")

  const { execute, status, result } = useAction(createManifest, {
    onSuccess: ({ data }) => {
      if (data.id) {
        onOpenChange(false)
        router.push(`/admin/manifest-management/${data.id}`)
      }
    },
  })

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Manifest</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Create a new manifest template for your organization.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manifest-name">Manifest Name</Label>
            <Input
              id="manifest-name"
              placeholder="e.g., Closing Documents, Permitting"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manifest-desc">Description (Optional)</Label>
            <Textarea
              id="manifest-desc"
              placeholder="What is this manifest for?"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manifest-tags">Tags (Optional)</Label>
            <Input
              id="manifest-tags"
              placeholder="comma, separated, tags"
              value={tagsRaw}
              onChange={(e) => {
                setTagsRaw(e.target.value)
              }}
            />
          </div>
        </div>
        {result.serverError && <p className="text-destructive text-sm">{result.serverError}</p>}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <BlueprintButton
            variant="primary"
            particle
            disabled={!name.trim() || status === "executing"}
            onClick={() => {
              execute({
                name: name.trim(),
                description: description.trim() || undefined,
                tags,
              })
            }}
          >
            Create Manifest
          </BlueprintButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
