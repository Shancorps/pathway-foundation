"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
    <div className="space-y-10">
      {/* Type settings */}
      <section className="space-y-4">
        <SectionDivider label="Fig · 01 / Type Settings" />
        <RegCard state="queued" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
              <p
                className="mt-2"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "#666",
                  lineHeight: 1.5,
                }}
              >
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
          <div className="flex justify-end">
            <BlueprintButton
              variant="primary"
              size="sm"
              onClick={handleSaveMeta}
              disabled={savingMeta || !name || !nameLabel}
              particle
            >
              {savingMeta ? "Saving..." : "Save Settings"}
            </BlueprintButton>
          </div>
        </RegCard>
      </section>

      {/* Fields */}
      <section className="space-y-4">
        <SectionDivider label="Fig · 02 / Fields" count={type.fields.length} />

        <div className="flex justify-end">
          <BlueprintButton
            variant="primary"
            size="sm"
            onClick={() => {
              setShowAddField(true)
            }}
            particle
          >
            Add Field
          </BlueprintButton>
        </div>

        {type.fields.length === 0 ? (
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
              No fields defined
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
              Define what data this Particle Type tracks. Each field becomes part of the form for
              new instances.
            </p>
          </RegCard>
        ) : (
          <ul className="space-y-2">
            {type.fields.map((field, idx) => (
              <li key={field.key}>
                <RegCard state="queued" className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => void move(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move up"
                        className="grid place-items-center border border-transparent p-1 hover:border-[#E4E4E4] hover:bg-white disabled:opacity-30"
                      >
                        <ArrowUp className="size-3" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void move(idx, 1)}
                        disabled={idx === type.fields.length - 1}
                        aria-label="Move down"
                        className="grid place-items-center border border-transparent p-1 hover:border-[#E4E4E4] hover:bg-white disabled:opacity-30"
                      >
                        <ArrowDown className="size-3" strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0F0F0F",
                          }}
                        >
                          {field.label}
                        </p>
                        <FieldTypePill label={TYPE_LABELS[field.type]} />
                        {field.required && <RequiredPill />}
                      </div>
                      <p
                        className="mt-1"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "#888",
                          letterSpacing: "0.08em",
                        }}
                      >
                        key · {field.key}
                        {field.options && field.options.length > 0 && (
                          <> · options · {field.options.join(", ")}</>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingField(field)
                        }}
                        className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] hover:bg-white"
                        aria-label="Edit field"
                      >
                        <Pencil className="size-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteField(field.key)}
                        className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] hover:bg-white"
                        aria-label="Delete field"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </RegCard>
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

function FieldTypePill({ label }: { label: string }) {
  return (
    <span
      className="px-1.5 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: "0.18em",
        color: "#5A7A92",
        border: "1px solid #5A7A92",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  )
}

function RequiredPill() {
  return (
    <span
      className="px-1.5 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: "0.18em",
        color: "#E8711A",
        border: "1px solid #E8711A",
        textTransform: "uppercase",
      }}
    >
      Required
    </span>
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
            <p
              className="mt-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "#888",
                letterSpacing: "0.06em",
              }}
            >
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
              disabled={submitting || !label}
            >
              {submitting ? "Saving..." : mode === "add" ? "Add Field" : "Save"}
            </BlueprintButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
