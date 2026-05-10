"use client"

import type { ManifestFieldDef } from "../schema"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  field: ManifestFieldDef
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  showLabel?: boolean
  /** Overrides template-level required (used at runtime when a node marks it required). */
  isRequired?: boolean
}

export function FieldRenderer({
  field,
  value,
  onChange,
  disabled,
  showLabel = true,
  isRequired,
}: Props) {
  const required = isRequired ?? field.required
  const displayLabel = showLabel ? (
    <Label className="flex items-center gap-1">
      {field.label}
      {required && <span className="text-destructive">*</span>}
    </Label>
  ) : null

  // Compute a single isDisabled value: either the prop disabled or the field's readOnly.
  // Both are booleans, so `||` is intentional (nullish coalescing would mishandle false).
  const isDisabled = Boolean(disabled) || field.readOnly

  function emit(v: unknown) {
    if (!disabled) onChange?.(v)
  }

  switch (field.type) {
    case "text":
    case "phone":
    case "email":
    case "url":
      return (
        <div className="space-y-1">
          {displayLabel}
          <Input
            type={field.type === "email" ? "email" : "text"}
            placeholder={field.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => {
              emit(e.target.value)
            }}
            disabled={isDisabled}
          />
          {field.helpText && <p className="text-muted-foreground text-xs">{field.helpText}</p>}
        </div>
      )

    case "text_area":
      return (
        <div className="space-y-1">
          {displayLabel}
          <Textarea
            placeholder={field.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => {
              emit(e.target.value)
            }}
            disabled={isDisabled}
          />
          {field.helpText && <p className="text-muted-foreground text-xs">{field.helpText}</p>}
        </div>
      )

    case "number":
    case "currency":
      return (
        <div className="space-y-1">
          {displayLabel}
          <Input
            type="number"
            placeholder={field.placeholder ?? (field.type === "currency" ? "0.00" : undefined)}
            value={typeof value === "number" ? value : typeof value === "string" ? value : ""}
            min={field.min}
            max={field.max}
            onChange={(e) => {
              emit(e.target.value === "" ? null : Number(e.target.value))
            }}
            disabled={isDisabled}
          />
          {field.type === "currency" && (
            <p className="text-muted-foreground text-xs">{field.currency ?? "USD"}</p>
          )}
        </div>
      )

    case "date":
      return (
        <div className="space-y-1">
          {displayLabel}
          <Input
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => {
              emit(e.target.value)
            }}
            disabled={isDisabled}
          />
        </div>
      )

    case "yes_no":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value === true}
            onCheckedChange={(v) => {
              emit(v)
            }}
            disabled={isDisabled}
          />
          {displayLabel}
        </div>
      )

    case "select":
      return (
        <div className="space-y-1">
          {displayLabel}
          <select
            className="bg-background w-full rounded-md border px-2 py-1.5 text-sm"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => {
              emit(e.target.value)
            }}
            disabled={isDisabled}
          >
            <option value="">— Select —</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )

    case "multi_select":
      return (
        <div className="space-y-1">
          {displayLabel}
          <div className="space-y-1">
            {(field.options ?? []).map((opt) => {
              const selected = Array.isArray(value) && (value as unknown[]).includes(opt)
              return (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={isDisabled}
                    onChange={() => {
                      const arr = Array.isArray(value) ? [...(value as string[])] : []
                      const idx = arr.indexOf(opt)
                      if (idx === -1) arr.push(opt)
                      else arr.splice(idx, 1)
                      emit(arr)
                    }}
                  />
                  {opt}
                </label>
              )
            })}
          </div>
        </div>
      )

    case "file_upload":
      return (
        <div className="space-y-1">
          {displayLabel}
          <p className="text-muted-foreground text-xs">
            File upload — wired to existing files module at runtime. Click to upload.
          </p>
        </div>
      )

    case "particle_ref":
      return (
        <div className="space-y-1">
          {displayLabel}
          <Input
            placeholder="Particle ID"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => {
              emit(e.target.value)
            }}
            disabled={isDisabled}
          />
          <p className="text-muted-foreground text-xs">
            Particle picker UI — picker upgrade pending. Free-text ID for V1.
          </p>
        </div>
      )

    default:
      return <div className="text-muted-foreground text-sm">Unsupported field type</div>
  }
}
