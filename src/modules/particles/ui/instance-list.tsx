"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { BlueprintLink } from "@/components/ui/blueprint-button"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import { deleteParticle } from "../actions"

interface ParticleRow {
  id: string
  name: string
  data: Record<string, unknown>
  createdAt: string
  parentName: string | null
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
      <div className="space-y-4">
        <SectionDivider label="Fig · 01 / Instances" count={0} />
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
            No instances yet
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
            Each instance is one real-world thing of this type — a specific Client, a specific Lead,
            a specific Property.
          </p>
          <div className="mt-6">
            <BlueprintLink href={`/particles/${typeId}/new`} variant="primary" particle>
              Create the first one
            </BlueprintLink>
          </div>
        </RegCard>
      </div>
    )
  }

  const showParentColumn = particles.some((p) => p.parentName !== null)

  return (
    <div className="space-y-4">
      <SectionDivider label="Fig · 01 / Instances" count={particles.length} />
      <RegCard state="queued" className="overflow-hidden p-0">
        <table className="w-full" style={{ fontFamily: "var(--font-sans)" }}>
          <thead>
            <tr style={{ backgroundColor: "#F4F4F4" }}>
              <Th>Name</Th>
              {showParentColumn && <Th>Parent</Th>}
              {previewKeys.map((p) => (
                <Th key={p.key}>{p.label}</Th>
              ))}
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {particles.map((p, i) => (
              <tr
                key={p.id}
                style={{
                  borderTop: i === 0 ? undefined : "1px solid #E4E4E4",
                  backgroundColor: "transparent",
                }}
                className="hover:bg-[#FAFAFA]"
              >
                <Td>
                  <Link
                    href={`/particles/${typeId}/${p.id}/edit`}
                    className="hover:underline"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#0F0F0F",
                    }}
                  >
                    {p.name}
                  </Link>
                </Td>
                {showParentColumn && <Td muted>{p.parentName ?? "—"}</Td>}
                {previewKeys.map((pk) => (
                  <Td key={pk.key} muted>
                    {formatPreview(p.data[pk.key])}
                  </Td>
                ))}
                <Td align="right">
                  <button
                    type="button"
                    onClick={() => void handleDelete(p.id, p.name)}
                    className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] hover:bg-white"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </RegCard>
    </div>
  )
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.2em",
        color: "#888",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align = "left",
  muted = false,
}: {
  children: React.ReactNode
  align?: "left" | "right"
  muted?: boolean
}) {
  return (
    <td
      className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}
      style={{
        fontFamily: muted ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: muted ? 11 : 14,
        color: muted ? "#666" : "#0F0F0F",
        letterSpacing: muted ? "0.06em" : undefined,
      }}
    >
      {children}
    </td>
  )
}
