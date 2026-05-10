"use client"

import { GripVertical, X } from "lucide-react"
import { useState } from "react"
import type { KernelFieldType } from "@/lib/field-types"
import type { ManifestFieldDef } from "../schema"
import { ensureUniqueSlug, generateSlug } from "../slug"
import { FieldRenderer } from "./field-renderer"

interface Props {
  fields: ManifestFieldDef[]
  setFields: (updater: (f: ManifestFieldDef[]) => ManifestFieldDef[]) => void
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
  onDelete: (key: string) => void
}

export function FieldCanvas({ fields, setFields, selectedKey, setSelectedKey, onDelete }: Props) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  function handleDrop(e: React.DragEvent, insertAt: number) {
    e.preventDefault()
    const raw = e.dataTransfer.getData("application/x-pathway-field")
    const reorderKey = e.dataTransfer.getData("application/x-pathway-field-reorder")

    if (raw) {
      // New field from palette
      const { type, label } = JSON.parse(raw) as { type: KernelFieldType; label: string }
      setFields((curr) => {
        const slugBase = generateSlug(label)
        const key = ensureUniqueSlug(slugBase, new Set(curr.map((f) => f.key)))
        const newField: ManifestFieldDef = {
          key,
          label,
          type,
          position: insertAt,
          required: false,
          readOnly: false,
        }
        const before = curr.slice(0, insertAt)
        const after = curr.slice(insertAt)
        return [...before, newField, ...after].map((f, i) => ({ ...f, position: i }))
      })
    } else if (reorderKey) {
      // Reorder existing
      setFields((curr) => {
        const fromIdx = curr.findIndex((f) => f.key === reorderKey)
        if (fromIdx === -1 || fromIdx === insertAt) return curr
        const arr = [...curr]
        const [moved] = arr.splice(fromIdx, 1)
        if (!moved) return curr
        const targetIdx = insertAt > fromIdx ? insertAt - 1 : insertAt
        arr.splice(targetIdx, 0, moved)
        return arr.map((f, i) => ({ ...f, position: i }))
      })
    }
    setDragOverIndex(null)
  }

  function handleReorderStart(e: React.DragEvent, key: string) {
    e.dataTransfer.setData("application/x-pathway-field-reorder", key)
    e.dataTransfer.effectAllowed = "move"
  }

  return (
    <div className="overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-3">
        {fields.length === 0 ? (
          <div
            className="text-muted-foreground rounded-lg border-2 border-dashed py-12 text-center"
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverIndex(0)
            }}
            onDrop={(e) => {
              handleDrop(e, 0)
            }}
          >
            No fields yet — Drag fields from the palette to start building your manifest
          </div>
        ) : (
          <>
            {fields.map((field, idx) => (
              <div key={field.key}>
                {dragOverIndex === idx && <div className="bg-primary/40 mb-2 h-1 rounded" />}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverIndex(idx)
                  }}
                  onDrop={(e) => {
                    handleDrop(e, idx)
                  }}
                  onClick={() => {
                    setSelectedKey(field.key)
                  }}
                  className={`bg-card group hover:border-primary/40 flex items-start gap-2 rounded-lg border p-3 transition-colors ${
                    selectedKey === field.key ? "border-primary" : ""
                  }`}
                >
                  <button
                    draggable
                    onDragStart={(e) => {
                      handleReorderStart(e, field.key)
                    }}
                    className="text-muted-foreground mt-1 cursor-grab active:cursor-grabbing"
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                    aria-label="Reorder field"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <div className="flex-1">
                    <FieldRenderer field={field} disabled />
                  </div>
                  {selectedKey === field.key && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(field.key)
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete field"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div
              className="text-muted-foreground rounded-lg border-2 border-dashed py-6 text-center text-sm"
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverIndex(fields.length)
              }}
              onDrop={(e) => {
                handleDrop(e, fields.length)
              }}
            >
              Drop field here
            </div>
          </>
        )}
      </div>
    </div>
  )
}
