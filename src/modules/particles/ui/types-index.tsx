"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Settings, Trash2 } from "lucide-react"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ParticleCube } from "@/components/ui/particle-cube"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
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
    <div className="space-y-8">
      <div className="flex justify-end">
        <BlueprintButton
          variant="primary"
          onClick={() => {
            setShowCreate(true)
          }}
          particle
        >
          New Particle Type
        </BlueprintButton>
      </div>
      <div className="space-y-4">
        <SectionDivider label="Fig · 01 / Defined Types" count={types.length} />

        {types.length === 0 ? (
          <RegCard state="new" className="px-12 py-16 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              No particle types defined
            </p>
            <p
              className="mx-auto mt-3 max-w-[42ch]"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "#444",
                lineHeight: 1.55,
              }}
            >
              Define a Particle Type for each kind of entity your business tracks — Clients, Leads,
              Properties, Heavy Machinery. Then create instances and route them through Rails.
            </p>
            <div className="mt-7">
              <BlueprintButton
                variant="primary"
                onClick={() => {
                  setShowCreate(true)
                }}
                particle
              >
                Define First Type
              </BlueprintButton>
            </div>
          </RegCard>
        ) : (
          <ul className="space-y-3">
            {types.map((t) => (
              <li key={t.id}>
                <TypeRow type={t} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateTypeDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}

function TypeRow({ type }: { type: ParticleTypeRow }) {
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
    <Link href={`/particles/${type.id}`} className="block">
      <RegCard state="queued" className="transition-[background-color]">
        <div className="flex items-start gap-5">
          <ParticleCube state="queued" size={36} className="mt-0.5" />

          <div className="min-w-0 flex-1">
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                fontWeight: 600,
                color: "#0F0F0F",
                lineHeight: 1.25,
                letterSpacing: "-0.005em",
              }}
            >
              {type.name}
            </h3>
            {type.description && (
              <p
                className="mt-1 line-clamp-2 max-w-[60ch]"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "#666",
                  lineHeight: 1.4,
                }}
              >
                {type.description}
              </p>
            )}
            <p
              className="mt-3 flex items-center gap-2.5"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 500,
                color: "#5A7A92",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              <span>
                {String(type.fieldCount)} field{type.fieldCount === 1 ? "" : "s"}
              </span>
              <span style={{ color: "#CCC" }}>·</span>
              <span>
                {String(type.instanceCount)} instance{type.instanceCount === 1 ? "" : "s"}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 gap-1">
            <Link
              href={`/particles/${type.id}/edit`}
              onClick={(e) => {
                e.stopPropagation()
              }}
              className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] hover:bg-white"
            >
              <Settings className="size-3.5" strokeWidth={1.5} />
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] hover:bg-white"
            >
              <Trash2 className="size-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </RegCard>
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
              disabled={submitting || !name}
            >
              {submitting ? "Creating..." : "Create"}
            </BlueprintButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export type { ParticleType }
