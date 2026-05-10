"use client"

import { ChevronDown, ChevronRight, Lock, Unlock } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { updateRunManifestData } from "../actions"
import type { Manifest, RailRunManifest } from "../schema"
import type { RailNodeRequiredManifestField } from "@/modules/rails/schema"
import { Button } from "@/components/ui/button"
import { FieldRenderer } from "./field-renderer"

interface RunManifestRow {
  runRow: RailRunManifest
  manifest: Manifest
}

interface Props {
  railRunId: string
  rows: RunManifestRow[]
  /** Required slugs for the CURRENT cycle's node — only these get the red asterisk. */
  requiredForCycle: RailNodeRequiredManifestField[]
}

export function CycleManifestPanel({ railRunId, rows, requiredForCycle }: Props) {
  const [locked, setLocked] = useState(false)

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Manifest</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLocked((l) => !l)
          }}
        >
          {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          <span className="ml-1 text-xs">{locked ? "Locked" : "Editable"}</span>
        </Button>
      </div>
      {rows.map((row) => (
        <ManifestSection
          key={row.runRow.id}
          railRunId={railRunId}
          row={row}
          requiredForCycle={requiredForCycle}
          locked={locked}
        />
      ))}
    </div>
  )
}

interface SectionProps {
  railRunId: string
  row: RunManifestRow
  requiredForCycle: RailNodeRequiredManifestField[]
  locked: boolean
}

function ManifestSection({ railRunId, row, requiredForCycle, locked }: SectionProps) {
  const cycleRequired = requiredForCycle.filter((r) => r.manifestId === row.manifest.id)
  const requiredSlugs = new Set(cycleRequired.map((r) => r.fieldSlug))
  const [open, setOpen] = useState(cycleRequired.length > 0)
  const [data, setData] = useState<Record<string, unknown>>(row.runRow.data)

  const saveAction = useAction(updateRunManifestData)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef<Set<string>>(new Set())

  function handleChange(slug: string, value: unknown) {
    setData((d) => ({ ...d, [slug]: value }))
    dirtyRef.current.add(slug)
  }

  useEffect(() => {
    if (dirtyRef.current.size === 0) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (dirtyRef.current.size === 0) return
      const patch: Record<string, unknown> = {}
      for (const slug of dirtyRef.current) patch[slug] = data[slug]
      saveAction.execute({
        railRunId,
        manifestId: row.manifest.id,
        data: patch,
      })
      dirtyRef.current = new Set()
    }, 750)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // intentionally re-run on every keystroke to refresh the timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const fields = row.manifest.fields

  return (
    <div className="rounded border">
      <button
        className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
        onClick={() => {
          setOpen((o) => !o)
        }}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {row.manifest.name}
        {cycleRequired.length > 0 && (
          <span className="bg-destructive/10 text-destructive ml-auto rounded px-2 py-0.5 text-xs">
            {cycleRequired.length} required
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t p-3">
          {fields.map((f) => (
            <FieldRenderer
              key={f.key}
              field={f}
              value={data[f.key]}
              onChange={(v) => {
                handleChange(f.key, v)
              }}
              disabled={locked}
              isRequired={requiredSlugs.has(f.key)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
