# manifests

Run-scoped data forms attached to rails. Per-particle runtime data fills in as the particle moves through terminals.

## Tables

- `manifests` — template (name, JSONB fields array). Mirrors `particle_types`.
- `rail_manifests` — join table, multiple manifests per rail, ordered by `position`.
- `rail_run_manifests` — runtime data, one row per (rail run × manifest), JSONB `data` keyed by field slug.

## Field types

13-type kernel shared with particles via `src/lib/field-types.ts`. Adding a new type is one edit there.

## Extending

- **New field type:** add to `kernelFieldTypes` in `src/lib/field-types.ts`. Update the renderer in `ui/field-renderer.tsx`. Add per-type extras to the field-properties panel if needed.
- **Inline manifest creation in Rail Builder:** pending. Pattern: open `manifest-builder.tsx` in a Dialog inside the rail editor; route the `Save` to refresh the rail's `attached` list.
- **Slash-command insertion in builder:** pending. Hook into the canvas's keypress detection.

## Refusal rules

- **Deletion:** refused if the manifest is attached to any rail (regardless of run state). Detach from each rail first.
- **Field edit:** refused if the manifest has any in-flight rail runs. Wait for runs to complete or clone the manifest as a replacement.
- **Field deletion (within builder):** if the field is referenced by a Task/Approval node's `requiredManifestFieldSlugs` or a Statistic node's `manifestField`, the action layer refuses on Save with a list of referencing nodes. The field-card delete in the builder lets the user remove fields locally; the refusal surfaces when they try to persist the change.

## Stale references

A `requiredManifestFieldSlugs` entry whose manifest has been detached from the rail (or whose field has been removed) is silently ignored at advance time. The cycle's Mark Complete only checks fields that resolve to a real attached manifest field.
