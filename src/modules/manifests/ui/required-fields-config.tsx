"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { RailNodeRequiredManifestField } from "@/modules/rails/schema"
import type { Manifest } from "../schema"

interface Props {
  attachedManifests: Manifest[]
  value: RailNodeRequiredManifestField[]
  onChange: (next: RailNodeRequiredManifestField[]) => void
  /**
   * Section heading. Defaults to "Required manifest fields" — the wording for
   * Task / Approval nodes ("required to advance"). The Initialize dialog
   * overrides this to "Required at start".
   */
  label?: string
  /**
   * Helper text shown directly under the heading. Defaults to the
   * Task/Approval phrasing ("This cycle cannot complete until each checked
   * field has a value."). Initialize overrides with its own.
   */
  helperText?: string
}

const DEFAULT_LABEL = "Required manifest fields"
const DEFAULT_HELPER_TEXT = "This cycle cannot complete until each checked field has a value."

/**
 * Per-node required-manifest-fields config. Renders a checklist grouped by
 * each manifest attached to the parent rail. Toggling a field adds or removes
 * a `{manifestId, fieldSlug}` entry from `value`.
 *
 * The cycle for the node hosting this config cannot complete until every
 * checked field has a non-empty value in the rail run's manifest data.
 */
export function RequiredFieldsConfig({
  attachedManifests,
  value,
  onChange,
  label = DEFAULT_LABEL,
  helperText = DEFAULT_HELPER_TEXT,
}: Props) {
  function toggle(manifestId: string, fieldSlug: string) {
    const exists = value.some((v) => v.manifestId === manifestId && v.fieldSlug === fieldSlug)
    if (exists) {
      onChange(value.filter((v) => !(v.manifestId === manifestId && v.fieldSlug === fieldSlug)))
    } else {
      onChange([...value, { manifestId, fieldSlug }])
    }
  }

  if (attachedManifests.length === 0) {
    return (
      <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
        <Label className="text-sm">{label}</Label>
        <p className="text-xs" style={{ color: "var(--bp-text-muted)", lineHeight: 1.5 }}>
          No manifests attached to this rail. Attach one in the Manifests panel (top bar) to
          configure required fields.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        {value.length > 0 && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.06em",
              color: "var(--bp-text-muted)",
            }}
          >
            {String(value.length)} required
          </span>
        )}
      </div>
      <p className="text-xs" style={{ color: "var(--bp-text-muted)", lineHeight: 1.5 }}>
        {helperText}
      </p>
      <div className="space-y-2">
        {attachedManifests.map((m) => {
          const fields = m.fields.slice().sort((a, b) => a.position - b.position)
          return (
            <div
              key={m.id}
              className="rounded p-2"
              style={{
                border: "1px solid var(--bp-border-default)",
                backgroundColor: "var(--bp-surface-card)",
              }}
            >
              <div
                className="mb-1.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  color: "var(--bp-text-secondary)",
                  textTransform: "uppercase",
                }}
              >
                {m.name}
              </div>
              {fields.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--bp-text-muted)" }}>
                  No fields in this manifest yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {fields.map((f) => {
                    const checked = value.some(
                      (v) => v.manifestId === m.id && v.fieldSlug === f.key,
                    )
                    return (
                      <li key={f.key}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              toggle(m.id, f.key)
                            }}
                          />
                          <span style={{ color: "var(--bp-text-primary)" }}>{f.label}</span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              letterSpacing: "0.06em",
                              color: "var(--bp-text-muted)",
                            }}
                          >
                            ({f.key})
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
