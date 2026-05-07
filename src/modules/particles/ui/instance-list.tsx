"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteParticle } from "../actions"

interface ParticleRow {
  id: string
  name: string
  data: Record<string, unknown>
  createdAt: string
}

function formatPreview(v: unknown): string {
  if (v == null) return "—"
  if (typeof v === "string") return v === "" ? "—" : v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return JSON.stringify(v)
}

export function InstanceList({
  typeId,
  particles,
  previewKeys,
}: {
  typeId: string
  particles: ParticleRow[]
  previewKeys: { key: string; label: string }[]
}) {
  const router = useRouter()

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    const result = await deleteParticle({ id })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  if (particles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">No instances yet.</p>
        <Link href={`/particles/${typeId}/new`} className="mt-3 inline-block">
          <Button>Create the first one</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-muted)]/30">
          <tr className="text-left text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
            <th className="px-3 py-2">Name</th>
            {previewKeys.map((p) => (
              <th key={p.key} className="px-3 py-2">
                {p.label}
              </th>
            ))}
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {particles.map((p) => (
            <tr key={p.id} className="hover:bg-[var(--color-muted)]/20">
              <td className="px-3 py-2 font-medium">
                <Link href={`/particles/${typeId}/${p.id}/edit`} className="hover:underline">
                  {p.name}
                </Link>
              </td>
              {previewKeys.map((pk) => {
                const v = p.data[pk.key]
                return (
                  <td key={pk.key} className="px-3 py-2 text-[var(--color-muted-foreground)]">
                    {formatPreview(v)}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right">
                <Button size="sm" variant="ghost" onClick={() => void handleDelete(p.id, p.name)}>
                  <Trash2 className="size-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
