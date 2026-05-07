"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Settings, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createParticleType, deleteParticleType } from "../actions"
import type { ParticleType } from "../schema"

interface ParticleTypeRow {
  id: string
  name: string
  description: string | null
  fieldCount: number
  instanceCount: number
}

export function TypesIndex({ types }: { types: ParticleTypeRow[] }) {
  const [showCreate, setShowCreate] = useState(false)
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setShowCreate(true)
          }}
        >
          <Plus className="size-4" />
          New Particle Type
        </Button>
      </div>

      {types.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No particle types yet. Create one to start tracking entities (Clients, Leads,
            Properties, etc.).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => (
            <TypeTile key={t.id} type={t} />
          ))}
        </div>
      )}

      <CreateTypeDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}

function TypeTile({ type }: { type: ParticleTypeRow }) {
  const router = useRouter()
  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (
      !confirm(
        `Delete "${type.name}"? Its ${String(type.instanceCount)} instance(s) will also be soft-deleted.`,
      )
    )
      return
    const result = await deleteParticleType({ id: type.id })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  return (
    <Link
      href={`/particles/${type.id}`}
      className="group block rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{type.name}</p>
          {type.description && (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
              {type.description}
            </p>
          )}
          <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
            {type.fieldCount} field{type.fieldCount === 1 ? "" : "s"} · {type.instanceCount}{" "}
            instance{type.instanceCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Link
            href={`/particles/${type.id}/edit`}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <Button size="sm" variant="ghost">
              <Settings className="size-3" />
            </Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={handleDelete}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </Link>
  )
}

function CreateTypeDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await createParticleType({
      name,
      description: description || undefined,
    })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    setName("")
    setDescription("")
    onOpenChange(false)
    if (result.data) router.push(`/particles/${result.data.id}/edit`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Particle Type</DialogTitle>
          <DialogDescription>
            A schema for the entities your business tracks. You&rsquo;ll add fields next.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="type-name">Name</Label>
            <Input
              id="type-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              placeholder="e.g. Client, Lead, Property"
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="type-description">Description (optional)</Label>
            <Textarea
              id="type-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Helper for callers (server component) — preserve type alias via re-export
export type { ParticleType }
