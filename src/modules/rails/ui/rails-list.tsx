"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createRail, deleteRail } from "../actions"

interface RailRow {
  id: string
  name: string
  description: string | null
  particleTypeName: string | null
  status: string
}

interface ParticleTypeOption {
  id: string
  name: string
}

export function RailsList({
  rails,
  particleTypes,
}: {
  rails: RailRow[]
  particleTypes: ParticleTypeOption[]
}) {
  const [showCreate, setShowCreate] = useState(false)
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setShowCreate(true)
          }}
          disabled={particleTypes.length === 0}
        >
          <Plus className="size-4" />
          New Rail
        </Button>
      </div>

      {particleTypes.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Rails route Particles &mdash; create at least one Particle Type first.
          </p>
          <Link href="/particles" className="mt-3 inline-block">
            <Button variant="outline" size="sm">
              Go to Particle Types
            </Button>
          </Link>
        </div>
      )}

      {rails.length === 0 ? (
        particleTypes.length > 0 && (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No rails yet. Create one to define a workflow.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rails.map((r) => (
            <RailTile key={r.id} rail={r} />
          ))}
        </div>
      )}

      <CreateRailDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        particleTypes={particleTypes}
      />
    </div>
  )
}

function RailTile({ rail }: { rail: RailRow }) {
  const router = useRouter()
  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete rail "${rail.name}"?`)) return
    const result = await deleteRail({ id: rail.id })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }
  return (
    <Link
      href={`/rails/${rail.id}`}
      className="group block rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{rail.name}</p>
          {rail.particleTypeName && (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Operates on <span className="font-medium">{rail.particleTypeName}</span>
            </p>
          )}
          {rail.description && (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
              {rail.description}
            </p>
          )}
          <div className="mt-3">
            <Badge
              variant={rail.status === "published" ? "default" : "secondary"}
              className="capitalize"
            >
              {rail.status}
            </Badge>
          </div>
        </div>
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="sm" variant="ghost" onClick={handleDelete}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </Link>
  )
}

function CreateRailDialog({
  open,
  onOpenChange,
  particleTypes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  particleTypes: ParticleTypeOption[]
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [particleTypeId, setParticleTypeId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!particleTypeId) return
    setSubmitting(true)
    const result = await createRail({
      name,
      description: description || undefined,
      particleTypeId,
    })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    setName("")
    setDescription("")
    setParticleTypeId("")
    onOpenChange(false)
    if (result.data) router.push(`/rails/${result.data.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Rail</DialogTitle>
          <DialogDescription>
            A workflow that routes a Particle through Terminals. Choose what type of Particle this
            Rail moves.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="rail-name">Name</Label>
            <Input
              id="rail-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              placeholder="e.g. Lead to Closed Deal, Car Wash"
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="rail-particle-type">Particle Type</Label>
            <Select value={particleTypeId} onValueChange={setParticleTypeId}>
              <SelectTrigger id="rail-particle-type">
                <SelectValue placeholder="What does this rail operate on?" />
              </SelectTrigger>
              <SelectContent>
                {particleTypes.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rail-description">Description (optional)</Label>
            <Textarea
              id="rail-description"
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
            <Button type="submit" disabled={submitting || !name || !particleTypeId}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
