"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  addFieldToType,
  deleteField,
  reorderFields,
  updateField,
  updateParticleType,
} from "../actions"
import {
  type ParticleFieldDef,
  type ParticleFieldType,
  type ParticleType,
  particleFieldTypes,
} from "../schema"

const TYPE_LABELS: Record<ParticleFieldType, string> = {
  text: "Text",
  text_area: "Long Text",
  number: "Number",
  date: "Date",
  select: "Select",
  phone: "Phone",
  email: "Email",
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^([0-9])/, "_$1")
      .slice(0, 64) || "field"
  )
}

export function TypeEditor({ type }: { type: ParticleType }) {
  const router = useRouter()
  const [showAddField, setShowAddField] = useState(false)
  const [editingField, setEditingField] = useState<ParticleFieldDef | null>(null)

  const [name, setName] = useState(type.name)
  const [description, setDescription] = useState(type.description ?? "")
  const [nameLabel, setNameLabel] = useState(type.nameLabel)
  const [savingMeta, setSavingMeta] = useState(false)

  async function handleSaveMeta() {
    setSavingMeta(true)
    const result = await updateParticleType({
      id: type.id,
      name,
      description: description || null,
      nameLabel,
    })
    setSavingMeta(false)
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  async function handleDeleteField(key: string) {
    if (!confirm(`Remove field "${key}"? Existing data is preserved on instances but hidden.`))
      return
    const result = await deleteField({ particleTypeId: type.id, key })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  async function move(idx: number, direction: -1 | 1) {
    const target = idx + direction
    if (target < 0 || target >= type.fields.length) return
    const keys = type.fields.map((f) => f.key)
    const fromKey = keys[idx]
    const toKey = keys[target]
    if (!fromKey || !toKey) return
    keys[idx] = toKey
    keys[target] = fromKey
    const result = await reorderFields({ particleTypeId: type.id, keysInOrder: keys })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
          Type settings
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="meta-name">Name</Label>
            <Input
              id="meta-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
          </div>
          <div>
            <Label htmlFor="meta-name-label">Particle Identifier Tag</Label>
            <Input
              id="meta-name-label"
              value={nameLabel}
              onChange={(e) => {
                setNameLabel(e.target.value)
              }}
              placeholder="Name"
            />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              The headline field for this type. e.g. &ldquo;Name&rdquo; for Clients,
              &ldquo;Address&rdquo; for Properties, &ldquo;Business Name&rdquo; for Vendors,
              &ldquo;Brand + Model&rdquo; for Machinery.
            </p>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="meta-description">Description (optional)</Label>
            <Textarea
              id="meta-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
              rows={2}
            />
          </div>
        </div>
        <div>
          <Button size="sm" onClick={handleSaveMeta} disabled={savingMeta || !name || !nameLabel}>
            {savingMeta ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
            Fields ({type.fields.length})
          </h2>
          <Button
            size="sm"
            onClick={() => {
              setShowAddField(true)
            }}
          >
            <Plus className="size-4" />
            Add Field
          </Button>
        </div>

        {type.fields.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
            No fields yet. Click &ldquo;Add Field&rdquo; to define what data this particle tracks.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
            {type.fields.map((field, idx) => (
              <li key={field.key} className="flex items-center gap-3 p-3">
                <div className="flex flex-col">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void move(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void move(idx, 1)}
                    disabled={idx === type.fields.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-3" />
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{field.label}</p>
                    <Badge variant="secondary">{TYPE_LABELS[field.type]}</Badge>
                    {field.required && <Badge variant="outline">Required</Badge>}
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    key: <code>{field.key}</code>
                    {field.options && field.options.length > 0 && (
                      <> · options: {field.options.join(", ")}</>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingField(field)
                  }}
                >
                  <Pencil className="size-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void handleDeleteField(field.key)}>
                  <Trash2 className="size-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FieldDialog
        open={showAddField}
        onOpenChange={setShowAddField}
        mode="add"
        particleTypeId={type.id}
        existingKeys={type.fields.map((f) => f.key)}
      />
      {editingField && (
        <FieldDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingField(null)
          }}
          mode="edit"
          particleTypeId={type.id}
          existingKeys={type.fields.map((f) => f.key)}
          initial={editingField}
        />
      )}
    </div>
  )
}

function FieldDialog({
  open,
  onOpenChange,
  mode,
  particleTypeId,
  existingKeys,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  particleTypeId: string
  existingKeys: string[]
  initial?: ParticleFieldDef
}) {
  const router = useRouter()
  const [label, setLabel] = useState(initial?.label ?? "")
  const [key, setKey] = useState(initial?.key ?? "")
  const [keyTouched, setKeyTouched] = useState(Boolean(initial))
  const [type, setType] = useState<ParticleFieldType>(initial?.type ?? "text")
  const [required, setRequired] = useState(initial?.required ?? false)
  const [optionsRaw, setOptionsRaw] = useState((initial?.options ?? []).join("\n"))
  const [helpText, setHelpText] = useState(initial?.helpText ?? "")
  const [submitting, setSubmitting] = useState(false)

  const effectiveKey = keyTouched ? key : slugify(label)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (mode === "edit" && !initial) return
    if (mode === "add" && existingKeys.includes(effectiveKey)) {
      alert(`A field with key "${effectiveKey}" already exists.`)
      return
    }
    const options =
      type === "select"
        ? optionsRaw
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined

    setSubmitting(true)
    const result =
      mode === "add"
        ? await addFieldToType({
            particleTypeId,
            field: {
              key: effectiveKey,
              label,
              type,
              required,
              ...(options ? { options } : {}),
              ...(helpText ? { helpText } : {}),
            },
          })
        : await updateField({
            particleTypeId,
            key: initial?.key ?? "",
            patch: {
              label,
              type,
              required,
              ...(options ? { options } : {}),
              ...(helpText ? { helpText } : {}),
            },
          })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Field" : "Edit Field"}</DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Define a piece of data this particle type tracks."
              : "Update this field's settings. Changing its label is safe; the underlying key is locked."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value)
              }}
              placeholder="e.g. Company Name, Phone Number, Industry"
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="field-key">
              Key {mode === "edit" && <span className="text-xs">(locked)</span>}
            </Label>
            <Input
              id="field-key"
              value={effectiveKey}
              onChange={(e) => {
                setKeyTouched(true)
                setKey(e.target.value)
              }}
              disabled={mode === "edit"}
              placeholder="snake_case_key"
            />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Auto-generated from the label. Edit to override.
            </p>
          </div>
          <div>
            <Label htmlFor="field-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as ParticleFieldType)
              }}
            >
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {particleFieldTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "select" && (
            <div>
              <Label htmlFor="field-options">Options (one per line)</Label>
              <Textarea
                id="field-options"
                value={optionsRaw}
                onChange={(e) => {
                  setOptionsRaw(e.target.value)
                }}
                rows={4}
                placeholder={`Tech\nConstruction\nRetail`}
              />
            </div>
          )}
          <div>
            <Label htmlFor="field-help">Help text (optional)</Label>
            <Input
              id="field-help"
              value={helpText}
              onChange={(e) => {
                setHelpText(e.target.value)
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="field-required"
              checked={required}
              onCheckedChange={(v) => {
                setRequired(Boolean(v))
              }}
            />
            <Label htmlFor="field-required" className="cursor-pointer text-sm">
              Required
            </Label>
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
            <Button type="submit" disabled={submitting || !label}>
              {submitting ? "Saving..." : mode === "add" ? "Add Field" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
