"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createParticle, updateParticle } from "../actions"
import type { ParticleFieldDef, ParticleType } from "../schema"

interface FormProps {
  type: ParticleType
  initial?: { id: string; name: string; data: Record<string, unknown> }
}

export function ParticleForm({ type, initial }: FormProps) {
  const router = useRouter()
  const isEdit = Boolean(initial)
  const [name, setName] = useState(initial?.name ?? "")
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const field of type.fields) {
      const v = initial?.data[field.key]
      if (v == null) out[field.key] = ""
      else if (typeof v === "string") out[field.key] = v
      else if (typeof v === "number" || typeof v === "boolean") out[field.key] = String(v)
      else out[field.key] = JSON.stringify(v)
    }
    return out
  })
  const [submitting, setSubmitting] = useState(false)

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSubmitting(true)
    const data: Record<string, unknown> = {}
    for (const field of type.fields) {
      const v = values[field.key] ?? ""
      if (v !== "") data[field.key] = v
    }

    const result =
      isEdit && initial
        ? await updateParticle({ id: initial.id, name, data })
        : await createParticle({ particleTypeId: type.id, name, data })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    router.push(`/particles/${type.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div>
        <Label htmlFor="particle-name">{type.nameLabel}</Label>
        <Input
          id="particle-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
          }}
          required
          autoFocus
        />
      </div>
      {type.fields.map((field) => (
        <FieldInput
          key={field.key}
          field={field}
          value={values[field.key] ?? ""}
          onChange={(v) => {
            setValue(field.key, v)
          }}
        />
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            router.back()
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !name}>
          {submitting ? "Saving..." : isEdit ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ParticleFieldDef
  value: string
  onChange: (next: string) => void
}) {
  const id = `field-${field.key}`
  const labelEl = (
    <Label htmlFor={id}>
      {field.label}
      {field.required && <span className="ml-1 text-red-500">*</span>}
    </Label>
  )
  const helpEl = field.helpText ? (
    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{field.helpText}</p>
  ) : null

  if (field.type === "text_area") {
    return (
      <div>
        {labelEl}
        <Textarea
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
          }}
          required={field.required}
          rows={3}
        />
        {helpEl}
      </div>
    )
  }
  if (field.type === "select") {
    return (
      <div>
        {labelEl}
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {helpEl}
      </div>
    )
  }
  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "date"
        ? "date"
        : field.type === "email"
          ? "email"
          : field.type === "phone"
            ? "tel"
            : "text"
  return (
    <div>
      {labelEl}
      <Input
        id={id}
        type={inputType}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        required={field.required}
      />
      {helpEl}
    </div>
  )
}
