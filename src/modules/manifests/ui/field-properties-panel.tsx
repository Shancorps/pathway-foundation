"use client"

import { X } from "lucide-react"
import type { ManifestFieldDef } from "../schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  field: ManifestFieldDef
  updateField: (updater: (f: ManifestFieldDef) => ManifestFieldDef) => void
  onClose: () => void
}

export function FieldPropertiesPanel({ field, updateField, onClose }: Props) {
  return (
    <div className="overflow-y-auto border-l p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium capitalize">{field.type.replace(/_/g, " ")}</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close field properties">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Label</Label>
          <Input
            value={field.label}
            onChange={(e) => {
              updateField((f) => ({ ...f, label: e.target.value }))
            }}
          />
        </div>

        <div>
          <Label>Variable Slug</Label>
          <Input
            value={field.key}
            onChange={(e) => {
              updateField((f) => ({ ...f, key: e.target.value }))
            }}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Reference value as <code className="text-xs">{`{{${field.key}}}`}</code>
          </p>
        </div>

        {/* Per-type extras — shown right after Label/Slug so they're prominent. */}
        {field.type === "number" && (
          <>
            <div>
              <Label>Min</Label>
              <Input
                type="number"
                value={field.min ?? ""}
                onChange={(e) => {
                  updateField((f) => ({
                    ...f,
                    min: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }}
              />
            </div>
            <div>
              <Label>Max</Label>
              <Input
                type="number"
                value={field.max ?? ""}
                onChange={(e) => {
                  updateField((f) => ({
                    ...f,
                    max: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }}
              />
            </div>
          </>
        )}

        {(field.type === "select" || field.type === "multi_select") && (
          <div>
            <Label>Options (one per line)</Label>
            <Textarea
              value={(field.options ?? []).join("\n")}
              onChange={(e) => {
                updateField((f) => ({
                  ...f,
                  options: e.target.value
                    .split("\n")
                    .map((o) => o.trim())
                    .filter(Boolean),
                }))
              }}
              placeholder={"Option 1\nOption 2\nOption 3"}
              rows={5}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              One choice per line. These show up as the dropdown / checkbox options when filling
              this field at runtime.
            </p>
          </div>
        )}

        {field.type === "currency" && (
          <div>
            <Label>Currency code</Label>
            <Input
              value={field.currency ?? ""}
              placeholder="USD"
              onChange={(e) => {
                updateField((f) => ({ ...f, currency: e.target.value || undefined }))
              }}
            />
          </div>
        )}

        {field.type === "file_upload" && (
          <div className="flex items-center justify-between">
            <Label htmlFor="multi-file-toggle">Allow multiple files</Label>
            <Switch
              id="multi-file-toggle"
              checked={field.fileMultiple ?? false}
              onCheckedChange={(v) => {
                updateField((f) => ({ ...f, fileMultiple: v }))
              }}
            />
          </div>
        )}

        {field.type === "particle_ref" && (
          <div>
            <Label>Allowed particle types (IDs, comma-separated; empty = any)</Label>
            <Input
              value={(field.particleTypeIds ?? []).join(", ")}
              onChange={(e) => {
                updateField((f) => ({
                  ...f,
                  particleTypeIds: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }}
            />
          </div>
        )}

        <div>
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder ?? ""}
            onChange={(e) => {
              updateField((f) => ({ ...f, placeholder: e.target.value || undefined }))
            }}
          />
        </div>

        <div>
          <Label>Help Text</Label>
          <Textarea
            value={field.helpText ?? ""}
            onChange={(e) => {
              updateField((f) => ({ ...f, helpText: e.target.value || undefined }))
            }}
          />
        </div>

        <div>
          <Label>Default Value</Label>
          <Input
            value={field.defaultValue ?? ""}
            onChange={(e) => {
              updateField((f) => ({ ...f, defaultValue: e.target.value || undefined }))
            }}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Stored as text; type-specific defaults can be refined later.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="required-toggle">Required</Label>
          <Switch
            id="required-toggle"
            checked={field.required}
            onCheckedChange={(v) => {
              updateField((f) => ({ ...f, required: v }))
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="readonly-toggle">Read Only</Label>
          <Switch
            id="readonly-toggle"
            checked={field.readOnly}
            onCheckedChange={(v) => {
              updateField((f) => ({ ...f, readOnly: v }))
            }}
          />
        </div>
      </div>
    </div>
  )
}
