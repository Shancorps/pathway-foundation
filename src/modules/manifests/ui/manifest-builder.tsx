"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { ArrowLeft } from "lucide-react"
import { updateManifest } from "../actions"
import type { Manifest, ManifestFieldDef } from "../schema"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Button } from "@/components/ui/button"
import { FieldCanvas } from "./field-canvas"
import { FieldPalette } from "./field-palette"
import { FieldPropertiesPanel } from "./field-properties-panel"
import { SettingsPanel } from "./settings-panel"

interface Props {
  manifest: Manifest
}

/**
 * Deterministic stringify with sorted keys at every level. Plain JSON.stringify
 * is key-insertion-order-dependent, so the same data structure with different
 * key orderings (e.g. state built from spread + add vs prop from Postgres
 * JSONB) produces different strings. That made the dirty check stay true after
 * a successful save when only key order had shifted.
 */
function canonicalStringify(v: unknown): string {
  return JSON.stringify(v, (_key: string, val: unknown): unknown => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(obj).sort()) out[k] = obj[k]
      return out
    }
    return val
  })
}

export function ManifestBuilder({ manifest }: Props) {
  const router = useRouter()
  const [name, setName] = useState(manifest.name)
  const [description, setDescription] = useState(manifest.description ?? "")
  const [tags, setTags] = useState<string[]>(manifest.tags)
  const [fields, setFields] = useState<ManifestFieldDef[]>(manifest.fields)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const dirty =
    name !== manifest.name ||
    description !== (manifest.description ?? "") ||
    canonicalStringify(tags) !== canonicalStringify(manifest.tags) ||
    canonicalStringify(fields) !== canonicalStringify(manifest.fields)

  const { execute, status, result } = useAction(updateManifest, {
    onSuccess: () => {
      // Refresh the route to pick up the just-saved manifest from the DB.
      router.refresh()
      // Briefly flash "Saved" so the click has visible feedback.
      setJustSaved(true)
      window.setTimeout(() => {
        setJustSaved(false)
      }, 2000)
    },
  })

  function handleSave() {
    execute({
      id: manifest.id,
      name,
      description: description || null,
      tags,
      fields,
    })
  }

  function handleBack() {
    // If a save is mid-flight, don't prompt — the changes are already in
    // transit to the server. Navigating is safe; if the save fails the
    // banner will surface on next edit. (Without this, the race between
    // clicking Save and the server response means `dirty` is still true
    // for ~50–200ms after click, and the prompt fires incorrectly.)
    if (status === "executing") {
      router.push("/admin/manifest-management")
      return
    }
    if (dirty && !confirm("You have unsaved changes. Discard them?")) return
    router.push("/admin/manifest-management")
  }

  const selected = selectedKey ? (fields.find((f) => f.key === selectedKey) ?? null) : null

  function updateField(updater: (f: ManifestFieldDef) => ManifestFieldDef) {
    if (!selectedKey) return
    const current = fields.find((f) => f.key === selectedKey)
    if (!current) return
    const updated = updater(current)
    setFields((curr) => curr.map((f) => (f.key === selectedKey ? updated : f)))
    // If the slug was renamed, follow selection to the new key.
    if (updated.key !== selectedKey) setSelectedKey(updated.key)
  }

  function deleteField(key: string) {
    setFields((curr) => curr.filter((f) => f.key !== key).map((f, i) => ({ ...f, position: i })))
    if (selectedKey === key) setSelectedKey(null)
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-[36rem] flex-col bg-[var(--bp-surface-card)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b p-3">
        <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back to manifests">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
          }}
          className="flex-1 bg-transparent text-lg font-medium outline-none"
          aria-label="Manifest name"
        />
        <div className="flex items-center gap-3">
          {dirty && <span className="text-muted-foreground text-xs">Unsaved changes</span>}
          {!dirty && justSaved && (
            <span className="text-xs" style={{ color: "var(--bp-accent-orange)" }}>
              Saved
            </span>
          )}
          <BlueprintButton
            variant="primary"
            particle
            onClick={handleSave}
            disabled={!dirty || status === "executing"}
          >
            {status === "executing" ? "Saving…" : "Save"}
          </BlueprintButton>
        </div>
      </div>
      {result.serverError && (
        <div className="bg-destructive/10 text-destructive border-destructive/20 border-b p-2 text-sm">
          {result.serverError}
        </div>
      )}

      {/* Three columns */}
      <div className="grid flex-1 grid-cols-[16rem_1fr_20rem] overflow-hidden">
        <FieldPalette fields={fields} setFields={setFields} />
        <FieldCanvas
          fields={fields}
          setFields={setFields}
          selectedKey={selectedKey}
          setSelectedKey={setSelectedKey}
          onDelete={deleteField}
        />
        {selected ? (
          <FieldPropertiesPanel
            key={selected.key}
            field={selected}
            updateField={updateField}
            onClose={() => {
              setSelectedKey(null)
            }}
          />
        ) : (
          <SettingsPanel
            description={description}
            setDescription={setDescription}
            tags={tags}
            setTags={setTags}
          />
        )}
      </div>
    </div>
  )
}
