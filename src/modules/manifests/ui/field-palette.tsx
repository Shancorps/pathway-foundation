"use client"

import type { KernelFieldType } from "@/lib/field-types"
import type { ManifestFieldDef } from "../schema"
import { ensureUniqueSlug, generateSlug } from "../slug"

const PALETTE: { type: KernelFieldType; label: string }[] = [
  { type: "text", label: "Text Input" },
  { type: "text_area", label: "Text Area" },
  { type: "number", label: "Number Input" },
  { type: "date", label: "Date Input" },
  { type: "select", label: "Select" },
  { type: "phone", label: "Phone Input" },
  { type: "email", label: "Email Input" },
  { type: "yes_no", label: "Yes / No" },
  { type: "currency", label: "Currency" },
  { type: "multi_select", label: "Multi-Select" },
  { type: "url", label: "URL Input" },
  { type: "file_upload", label: "File Upload" },
  { type: "particle_ref", label: "Particle Reference" },
]

interface Props {
  fields: ManifestFieldDef[]
  setFields: (updater: (f: ManifestFieldDef[]) => ManifestFieldDef[]) => void
}

export function FieldPalette({ setFields }: Props) {
  function addField(type: KernelFieldType, label: string) {
    setFields((curr) => {
      const slugBase = generateSlug(label)
      const existingKeys = new Set(curr.map((f) => f.key))
      const key = ensureUniqueSlug(slugBase, existingKeys)
      const newField: ManifestFieldDef = {
        key,
        label,
        type,
        position: curr.length,
        required: false,
        readOnly: false,
      }
      return [...curr, newField]
    })
  }

  function handleDragStart(e: React.DragEvent, type: KernelFieldType, label: string) {
    e.dataTransfer.setData("application/x-pathway-field", JSON.stringify({ type, label }))
    e.dataTransfer.effectAllowed = "copy"
  }

  return (
    <div className="overflow-y-auto border-r p-3">
      <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        Input
      </h4>
      <div className="space-y-1">
        {PALETTE.map((opt) => (
          <button
            key={opt.type}
            draggable
            onDragStart={(e) => {
              handleDragStart(e, opt.type, opt.label)
            }}
            onClick={() => {
              addField(opt.type, opt.label)
            }}
            className="hover:bg-accent w-full cursor-grab rounded border px-2 py-1.5 text-left text-sm active:cursor-grabbing"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
