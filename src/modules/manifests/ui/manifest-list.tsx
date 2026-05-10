"use client"

import Link from "next/link"
import { useState } from "react"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Input } from "@/components/ui/input"
import type { Manifest } from "../schema"
import { CreateManifestModal } from "./create-manifest-modal"

interface Props {
  manifests: Manifest[]
}

export function ManifestList({ manifests }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = manifests.filter((m) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return m.name.toLowerCase().includes(q) || (m.description?.toLowerCase().includes(q) ?? false)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Search manifests"
          placeholder="Search manifests..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          className="max-w-md"
        />
        <div className="ml-auto">
          <BlueprintButton
            variant="primary"
            particle
            onClick={() => {
              setOpen(true)
            }}
          >
            New Manifest
          </BlueprintButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="py-12 text-center"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--bp-text-secondary)",
            lineHeight: 1.55,
          }}
        >
          {manifests.length === 0
            ? "No manifests yet — create your first manifest template to start collecting data on your rails."
            : "No manifests match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link
              key={m.id}
              href={`/admin/manifest-management/${m.id}`}
              className="rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-accent)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--bp-text-primary)",
                    lineHeight: 1.25,
                  }}
                >
                  {m.name}
                </h3>
                <span
                  className="shrink-0 rounded px-2 py-0.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--bp-text-muted)",
                    backgroundColor: "var(--color-muted)",
                  }}
                >
                  Template
                </span>
              </div>
              {m.description && (
                <p
                  className="mt-1 line-clamp-1"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--bp-text-secondary)",
                    lineHeight: 1.4,
                  }}
                >
                  {m.description}
                </p>
              )}
              <p
                className="mt-3"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--bp-accent-steel-soft)",
                }}
              >
                {m.fields.length} field{m.fields.length === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}

      <CreateManifestModal open={open} onOpenChange={setOpen} />
    </div>
  )
}
