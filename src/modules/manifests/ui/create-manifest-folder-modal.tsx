"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createManifestFolder } from "../actions"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateManifestFolderModal({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const { execute, status, result } = useAction(createManifestFolder, {
    onSuccess: () => {
      onOpenChange(false)
      setName("")
      setDescription("")
      router.refresh()
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create folder</DialogTitle>
          <DialogDescription>
            Group manifests by purpose (e.g., Sales, HR, Onboarding).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              placeholder="e.g., Sales"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder-desc">Description (Optional)</Label>
            <Textarea
              id="folder-desc"
              placeholder="What this folder is for"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
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
              })
            }}
          >
            Create folder
          </BlueprintButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
