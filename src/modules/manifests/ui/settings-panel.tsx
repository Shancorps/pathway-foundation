"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  description: string
  setDescription: (v: string) => void
  tags: string[]
  setTags: (t: string[]) => void
}

export function SettingsPanel({ description, setDescription, tags, setTags }: Props) {
  const tagsRaw = tags.join(", ")
  return (
    <div className="space-y-4 overflow-y-auto border-l p-4">
      <h3 className="font-medium">Manifest Settings</h3>
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
          }}
          placeholder="Describe the purpose of this manifest."
        />
      </div>
      <div>
        <Label>Tags</Label>
        <Input
          value={tagsRaw}
          onChange={(e) => {
            setTags(
              e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            )
          }}
          placeholder="comma, separated"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Tags help organize and filter manifests.
        </p>
      </div>
    </div>
  )
}
