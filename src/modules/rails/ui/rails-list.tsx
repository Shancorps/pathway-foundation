"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Play, Trash2 } from "lucide-react"
import { BlueprintButton, BlueprintLink } from "@/components/ui/blueprint-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ParticleCube } from "@/components/ui/particle-cube"
import { RegCard, type RegCardState } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
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
import { startRail } from "@/modules/rail-runs/actions"

interface RailRow {
  id: string
  name: string
  description: string | null
  particleTypeId: string
  particleTypeName: string | null
  status: string
}

interface ParticleTypeOption {
  id: string
  name: string
}

interface ParticleOption {
  id: string
  name: string
  particleTypeId: string
}

export function RailsList({
  rails,
  particleTypes,
  particles,
}: {
  rails: RailRow[]
  particleTypes: ParticleTypeOption[]
  particles: ParticleOption[]
}) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <BlueprintButton
          variant="primary"
          onClick={() => {
            setShowCreate(true)
          }}
          disabled={particleTypes.length === 0}
          particle
        >
          New Rail
        </BlueprintButton>
      </div>

      {particleTypes.length === 0 && (
        <RegCard state="new" className="px-10 py-10 text-center">
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
            No particle types yet
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
            Rails route Particles. Define at least one Particle Type before creating a rail.
          </p>
          <BlueprintLink href="/particles" variant="outline" className="mt-6">
            Go to Particle Types →
          </BlueprintLink>
        </RegCard>
      )}

      {rails.length === 0 && particleTypes.length > 0 ? (
        <div className="space-y-4">
          <SectionDivider label="Fig · 01 / Defined Rails" count={0} />
          <RegCard state="new" className="px-10 py-12 text-center">
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
              No rails defined
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
              Define a Rail to specify how a Particle moves through Terminals — what steps run, in
              what order, at which Posts.
            </p>
          </RegCard>
        </div>
      ) : rails.length > 0 ? (
        <div className="space-y-4">
          <SectionDivider label="Fig · 01 / Defined Rails" count={rails.length} />
          <ul className="space-y-3">
            {rails.map((r) => (
              <li key={r.id}>
                <RailRowItem rail={r} particles={particles} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <CreateRailDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        particleTypes={particleTypes}
      />
    </div>
  )
}

function RailRowItem({ rail, particles }: { rail: RailRow; particles: ParticleOption[] }) {
  const router = useRouter()
  const [showRun, setShowRun] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete rail "${rail.name}"?`)) return
    const result = await deleteRail({ id: rail.id })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  const matchingParticles = particles.filter((p) => p.particleTypeId === rail.particleTypeId)
  const isPublished = rail.status === "published"
  const cardState: RegCardState = isPublished ? "active" : "queued"

  return (
    <>
      <div className="block">
        <RegCard state={cardState} className="transition-[background-color]">
          <div className="flex items-start gap-5">
            <ParticleCube state={cardState} size={36} className="mt-0.5" />

            <Link href={`/rails/${rail.id}`} className="min-w-0 flex-1">
              <h3
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#0F0F0F",
                  lineHeight: 1.25,
                }}
              >
                {rail.name}
              </h3>
              {rail.particleTypeName && (
                <p
                  className="mt-1.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 500,
                    color: "#5A7A92",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Operates on · {rail.particleTypeName}
                </p>
              )}
              {rail.description && (
                <p
                  className="mt-2 line-clamp-2 max-w-[60ch]"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    color: "#666",
                    lineHeight: 1.4,
                  }}
                >
                  {rail.description}
                </p>
              )}
              <div className="mt-3">
                <StatusPill published={isPublished} />
              </div>
            </Link>

            <div className="flex shrink-0 flex-col items-end gap-2">
              {isPublished && (
                <BlueprintButton
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowRun(true)
                  }}
                  title={
                    matchingParticles.length === 0
                      ? `Create a ${rail.particleTypeName ?? "Particle"} first`
                      : "Run this rail on a Particle"
                  }
                >
                  <Play className="size-3" />
                  Run
                </BlueprintButton>
              )}
              <button
                type="button"
                onClick={handleDelete}
                className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] hover:bg-white"
                aria-label="Delete rail"
              >
                <Trash2 className="size-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </RegCard>
      </div>
      <RunRailDialog
        open={showRun}
        onOpenChange={setShowRun}
        rail={rail}
        particles={matchingParticles}
      />
    </>
  )
}

function StatusPill({ published }: { published: boolean }) {
  const color = published ? "#E8711A" : "#888"
  return (
    <span
      className="px-2 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: published ? "#fff" : color,
        backgroundColor: published ? "#E8711A" : "transparent",
        border: `1px solid ${color}`,
      }}
    >
      {published ? "Published" : "Draft"}
    </span>
  )
}

function RunRailDialog({
  open,
  onOpenChange,
  rail,
  particles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rail: RailRow
  particles: ParticleOption[]
}) {
  const router = useRouter()
  const [particleId, setParticleId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!particleId) return
    setSubmitting(true)
    const result = await startRail({ railId: rail.id, particleId })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    const data = result.data
    if (data) {
      const holders = data.firstPostHolders
      const holderText =
        holders.length === 0
          ? "no one is currently assigned to this Post"
          : `currently held by ${holders.join(", ")}`
      alert(
        `Run started.\n\nFirst cycle issued to "${data.firstPostTitle ?? "Post"}" — ${holderText}.\n\nIf that's not you, sign in as one of those users to see it in My Actions.`,
      )
    }
    setParticleId("")
    onOpenChange(false)
    router.push("/my-actions")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run &ldquo;{rail.name}&rdquo;</DialogTitle>
          <DialogDescription>
            Pick which {rail.particleTypeName ?? "Particle"} to send through this rail. The first
            cycle will appear in the assigned Terminal&rsquo;s My Actions inbox.
          </DialogDescription>
        </DialogHeader>
        {particles.length === 0 ? (
          <div
            className="border border-dashed border-[#D4D4D4] p-4 text-center"
            style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#666" }}
          >
            No {rail.particleTypeName ?? "Particle"}s yet.
            <Link href="/particles" className="ml-1 underline">
              Create one
            </Link>{" "}
            first.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="run-particle">Particle</Label>
              <Select value={particleId} onValueChange={setParticleId}>
                <SelectTrigger id="run-particle">
                  <SelectValue placeholder={`Pick a ${rail.particleTypeName ?? "Particle"}`} />
                </SelectTrigger>
                <SelectContent>
                  {particles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                disabled={submitting || !particleId}
              >
                {submitting ? "Starting..." : "Start Rail"}
              </BlueprintButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
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
              disabled={submitting || !name || !particleTypeId}
            >
              {submitting ? "Creating..." : "Create"}
            </BlueprintButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
