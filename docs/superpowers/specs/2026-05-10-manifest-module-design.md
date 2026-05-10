# Manifest Module — V1 Design

**Date:** 2026-05-10
**Status:** Approved (brainstorming → writing-plans)
**Scope:** Foundation + attach. Templates, attachment to rails, per-particle runtime instances, builder UI, cycle-level read/edit, deletion safety. Folders, drafts/migration, slash commands, inline create, and several field types are explicitly deferred.

---

## 1. Purpose

Manifests are run-scoped data forms that travel with a particle as it moves through a rail's terminals. Unlike particles (entity-scoped data that persists), a manifest's data is per-rail-run — every particle running through a rail gets its own copy of every manifest attached to that rail.

This V1 builds the foundation: a builder for designing manifest templates, the ability to attach one or more to a rail, per-particle runtime instances that fill in as the particle advances, and the safety rails (deletion refusal when in use, audit logging on every mutation) that keep things from breaking.

V1 unblocks downstream roadmap items that depend on the Manifest module existing: the Initialize and Manifest rail node types, the Programs & Orders planning layer, and the partially-built `statistic-manifest` runtime mode.

The full product spec lives in `docs/03_admin.md` (Manifest Management section). This design document specifies what's actually built in V1 and what's deferred.

---

## 2. Architecture

A new `src/modules/manifests/` module, scaffolded from the items template. It owns three tables and shares a field-type kernel with particles.

**Tables:**

- `manifests` — the template (name, fields JSONB array). Mirrors `particle_types`.
- `rail_manifests` — join table. Says which manifests are attached to which rails, in what order. Multiple per rail.
- `rail_run_manifests` — runtime data. One row per (rail run × attached manifest), holds a JSONB blob keyed by field slug. Mirrors `particles.data`.

**Shared field-type kernel** at `src/lib/field-types.ts`. The existing `particleFieldTypes` const is renamed to `kernelFieldTypes` and re-exported under the old name during migration. Particles and manifests both import from the kernel. Adding a field type is one edit in one place.

**File uploads** route through the existing `files` module. Manifest field values for `file_upload` types store a file ID; rendering goes through `/api/files/[id]` so manifest attachments stay private by default.

**Rail Builder integration:** the existing left panel gains a "Manifest" tab next to "Steps." Attach, reorder, and detach manifests from a rail.

**Cycle Detail integration:** the My Actions cycle detail screen gains a Manifest panel showing every attached manifest with editable fields.

---

## 3. Schema

### 3.1 `manifests` (template)

```
id              text PK
organization_id text FK → organization.id (restrict)
name            text not null
description     text nullable
tags            text[] not null default '{}'
fields          jsonb (ManifestFieldDef[]) not null default '[]'
created_at / updated_at / created_by / updated_by / deleted_at / deleted_by
index (organization_id, deleted_at)
```

`ManifestFieldDef` (TypeScript shape, lives in JSONB):

```ts
{
  key: string                            // slug, snake_case, unique within manifest
  label: string
  type: KernelFieldType
  position: number
  required: boolean                      // template-level hint only; gating is per-Task-node
  readOnly: boolean
  helpText?: string
  placeholder?: string
  defaultValue?: string
  // type-specific
  options?: string[]                     // select, multi_select
  min?: number; max?: number             // number
  currency?: string                      // currency (e.g., "USD")
  fileMultiple?: boolean                 // file_upload
  particleTypeIds?: string[]             // particle_ref ("any" if empty)
}
```

### 3.2 `rail_manifests` (join)

```
id             text PK
rail_id        text FK → rails.id (cascade)
manifest_id    text FK → manifests.id (restrict)
position       integer not null
created_at / updated_at
unique (rail_id, manifest_id)
index (rail_id)
index (manifest_id)
```

The `restrict` on `manifest_id` is what enforces "manifests in use can't be deleted." The action layer translates this into a friendly error with the dependent rail names.

### 3.3 `rail_run_manifests` (runtime)

```
id             text PK
rail_run_id    text FK → rail_runs.id (cascade)
manifest_id    text FK → manifests.id (restrict)
data           jsonb (Record<slug, unknown>) not null default '{}'
created_at / updated_at / updated_by
unique (rail_run_id, manifest_id)
index (rail_run_id)
```

Rows are created when a rail run is initialized, matching the rail's currently attached `rail_manifests` set. If a manifest is later attached to the rail, in-flight runs get their row created lazily on first read or first save (handled in `manifests/queries.ts` so callers don't worry about it).

### 3.4 Field-type kernel

`src/lib/field-types.ts`:

```ts
export const kernelFieldTypes = [
  "text",
  "text_area",
  "number",
  "date",
  "select",
  "phone",
  "email",
  "yes_no",
  "currency",
  "multi_select",
  "url",
  "file_upload",
  "particle_ref",
] as const
export type KernelFieldType = (typeof kernelFieldTypes)[number]
```

The 6 new types (yes_no, currency, multi_select, url, file_upload, particle_ref) are added in this work. Particles automatically gains them in its UI palette in the same release because they share the kernel.

Migration safety: existing particle data is untouched. The migration adds the new types as valid values for any DB-side check constraint on field type. Particles UI gains them as palette options; the rendering layer is generic enough that no per-type renderer change is required for existing particle types.

### 3.5 Required-to-advance (rails-side)

Required-to-advance is not a manifest schema concern. Each Task node in `rails.nodes` JSONB gains a `requiredManifestFieldSlugs: string[]` config (optional, default `[]`). The advance logic in `src/modules/rail-runs/actions.ts` checks these slugs against the `rail_run_manifests.data` for the relevant manifest at advance time.

### 3.6 Detach semantics

Detaching a manifest from a rail with in-flight runs preserves the runtime `rail_run_manifests` rows. UI hides the manifest from new cycle inputs but read views still show it as "Detached: [manifest name]" with the data preserved. This favors data preservation over schema cleanliness.

---

## 4. Builder UI — Manifest Management

### 4.1 Routes

- `/admin/manifest-management` — list view
- `/admin/manifest-management/[manifestId]` — builder

### 4.2 List view

- Header: breadcrumb `ADMIN > MANIFEST MANAGEMENT`, title "Manifests", subtitle "Capture structured team input."
- Top right: **+ New Manifest** button (orange)
- Search bar: filters by name + description
- Tag-filter dropdown (multi-select)
- Grid of manifest tiles: name, one-line description, "Template" badge, field count, `...` menu (Edit / Duplicate / Delete)
- Empty state: "No manifests yet — Create your first manifest template to start collecting data on your rails."

**Folders are NOT in V1.** Deferred to a future polish pass.

### 4.3 Create modal

Triggered by the **+ New Manifest** button. Standard pattern:

- Manifest Name (required)
- Description (optional textarea)
- Tags (chip input)
- Cancel + Create Manifest

On submit, creates a draft row and navigates to the builder.

### 4.4 Builder layout

Three-column layout. Top bar shows back arrow, editable manifest name, "Unsaved changes" indicator, and the Save button (orange, disabled until changes exist).

**Left panel — Field palette.** Drag-and-drop only (no slash-command insertion in V1). Lists the 13 input field types. No display fields (Heading/Text/Divider) in V1.

**Center canvas — manifest preview.**

- Dragged fields render in their actual rendering state — what the runtime user will see
- Drop zones appear between fields when dragging
- Click a field to select it → right panel switches to that field's properties
- Drag handle on left edge of each field to reorder
- `×` icon when selected to delete (with the field-deletion enforcement from §4.7)
- Inline label edit by clicking the label
- Required fields show a red asterisk

Empty state: "No fields yet — Drag fields from the palette to start building your manifest"

**Right panel — Manifest Settings (default state, no field selected):**

- Description (textarea)
- Tags (chip input)

**Right panel — Field Properties (when a field selected):**

- Common: Label, Variable Slug (auto-generated, editable), Placeholder, Help Text, Default Value, Required toggle, Read-Only toggle
- Per-type extras:
  - Number → Min, Max
  - Select / Multi-Select → Options list (add/remove/reorder)
  - Currency → currency code/symbol picker
  - File Upload → Single vs multiple files toggle
  - Particle Ref → Allowed particle types filter (empty = any)

### 4.5 Variable slug

- Auto-generated from the label on field creation: lowercase, underscore-separated, strip special characters
- Collision in the same manifest → append a number (`field_name_2`)
- User can manually edit (advanced, rare)
- Stored as a first-class field attribute. Templating consumers (`{{slug}}` in task descriptions, etc.) are deferred — the slug just exists for now so future consumers don't require rebuilding manifests.

### 4.6 Save behavior

- Save button disabled until changes exist
- Back arrow with unsaved changes prompts: "You have unsaved changes. Discard them?" with Cancel / Discard
- **No draft/migration prompt in V1.** When Save is pressed on a manifest that has ≥1 in-flight rail run referencing it, the action returns a `MANIFEST_IN_USE` error listing the dependent rails. Workarounds: clone-and-replace, or wait for in-flight runs to complete.
- A manifest attached to a published rail with zero in-flight runs is editable. (Note: this is a softer gate than deletion in §4.7 — _deletion_ is refused on any rail attachment, _save-edit_ is refused only on active runs.)

### 4.7 Deletion + field-deletion enforcement

- Deleting a manifest in use by ≥1 rail (regardless of run state) is refused. Error lists the dependent rails. Admin must detach from each rail before deleting.
- Deleting a field from a manifest is refused if the field is referenced by:
  - A Task node's `requiredManifestFieldSlugs`
  - A Statistic node's `manifestField`
  - Error lists the referencing nodes/rails.
- Both refusals are intentionally friction-heavy — the alternative is silently orphaning references and breaking rails at runtime.
- **Workaround for deprecation:** rename the manifest with a suffix like "DEPRECATED v1" and stop attaching it to new rails. Old rails keep running; new rails use the replacement.

---

## 5. Runtime UI — Rail Builder + Cycle Detail

### 5.1 Rail Builder — Manifest tab

The rail builder's left panel currently has a Steps tab. We add a Manifest tab next to it.

- Lists currently-attached manifests with drag-handles to reorder and `×` to detach
- **+ Add Manifest** opens a picker: search box + scrollable list of every manifest in the org. Click to attach.
- **No inline create in V1** — to make a new manifest, navigate to Manifest Management. Picker only.
- Detach with in-flight runs shows soft warning: "This manifest has data on N in-flight runs. The data will be preserved but hidden from new cycles. Detach?"

### 5.2 Task node config — Required manifest fields

When a Task node is selected in the rail builder, its right-panel config gains a "Required manifest fields" section:

- Checkbox list grouped by manifest. Only fields from manifests _attached to this rail_ appear.
- Checking a field means "this Task node cannot complete until this field is filled."
- Stored as `requiredManifestFieldSlugs: string[]` on the Task node config in `rails.nodes`.

### 5.3 Cycle Detail — Manifest panel

In the My Actions cycle detail screen, below the existing description/SOP content, a Manifest panel renders:

- Each attached manifest is a collapsible section. Default: expanded if it has any required-for-this-cycle fields, else collapsed.
- Required-for-this-cycle fields show a single red asterisk. (Template-level `required` is a builder-side hint only — no asterisk at runtime, to avoid double-asterisk confusion.)
- All fields are editable unless `readOnly` at template level.
- **Edits autosave** on blur (debounced). Each save calls a `manifest.updateData` action that diffs old vs. new, writes the new data, and writes an audit row with `action: "manifests.data_updated"` and the changed slugs + old/new values.
- **Lock toggle** at the panel level (per `02_workspace.md`) — flips edits off for this cycle's view to prevent accidents. Doesn't lock other cycles.
- File upload fields use the existing files module: clicking "Upload file" opens the standard file picker; rendered as a download link to `/api/files/[id]`.
- Particle-ref fields show a particle picker scoped to allowed types.

### 5.4 Mark Complete — required-field gate

The cycle's Mark Complete server action validates that every slug in the Task node's `requiredManifestFieldSlugs` has a non-empty value in the relevant `rail_run_manifests.data`.

- If any required field is empty: returns a structured error → UI highlights missing fields with "Fill required fields to advance." No force-advance for the assignee in V1 — that's a manager-only flow specified separately.
- If valid: existing rail-runs advance logic runs unchanged.
- **Stale slug references** (a slug listed in `requiredManifestFieldSlugs` whose manifest has since been detached from the rail, or whose field has been removed from the manifest): silently ignored at advance time. The check only fires when the slug resolves to a real attached manifest field. This prevents rails from getting stuck when a manifest is detached or evolves. Stale references can be cleaned up by re-saving the Task node config.

### 5.5 Other surfaces that read manifest data

- **Cycle history timeline** — shows manifest changes inline ("Sage updated Contract Amount: $25k → $30k")
- **Run detail page** — shows full manifest panel as read-only summary
- **Rail Stats** — the existing `statistic-manifest` runtime mode references `manifestField`; this becomes resolvable now

---

## 6. Permissions

- New per-user checkbox: **"Can build manifests"** — default OFF for Members, ON for Admins. Wired into the existing per-user permissions system in `src/modules/auth/`. Owners always have it.
- Reading manifest data in cycle detail and editing fields at runtime requires no new permission. If you can see the cycle, you can edit its manifest data, subject to:
  - Per-field `readOnly` at template level
  - Panel-level lock toggle
- Detaching a manifest from a rail in the Rail Builder uses the existing "Can edit rails" permission. No new gate.

---

## 7. Module structure

Following the standard module pattern from `src/modules/items/`:

```
src/modules/manifests/
  schema.ts        # manifests, rail_manifests, rail_run_manifests tables
  queries.ts       # listManifests, getManifest, getRailManifests,
                   # getRailRunManifests, ensureRunRows (lazy creation)
  actions.ts       # createManifest, updateManifest, deleteManifest,
                   # attachToRail, detachFromRail, reorderRailManifests,
                   # updateRunData, deleteField (with refusal logic)
  types.ts         # ManifestFieldDef, Zod schemas for action inputs
  ui/              # builder components, list view, cycle-detail panel
  README.md        # module overview + how to extend
```

All mutations use `orgAction` and call `audit()`. All actions chain `.inputSchema(zodSchema)` (enforced by the static check). Reads come through `queries.ts`; routes never import `db` directly.

Per-module list updates (PostToolUse hook reminds about these on schema edits):

- `tests/e2e/helpers/reset-db.ts` → append `manifests`, `rail_manifests`, `rail_run_manifests` to `TABLES_TO_TRUNCATE`
- `app/api/jobs/cron/purge-deleted/route.ts` → add a delete loop for `manifests` (rail_manifests and rail_run_manifests cascade-delete via FK or get cleaned with their parents)
- `src/db/schema.ts` → `export * from "@/modules/manifests/schema"`

Updates to other modules:

- `src/modules/rails/schema.ts` — Task node config gains `requiredManifestFieldSlugs: string[]`
- `src/modules/rail-runs/actions.ts` — advance logic checks the slugs
- `src/modules/rails/ui/rail-palette.tsx` — Manifest node remains "Soon" (still blocked on Initialize/Manifest node features)
- `src/lib/field-types.ts` — new shared kernel; `src/modules/particles/schema.ts` updated to import from it

---

## 8. Testing

### 8.1 Integration tests — `tests/integration/manifests.test.ts`

Following the existing integration test pattern (real Postgres, transactional rollback):

- Create a manifest, add fields, save → row exists with the fields JSONB shape
- Attach to a rail → `rail_manifests` row created, position assigned
- Start a rail run → `rail_run_manifests` rows lazily created for each attached manifest
- Write a value via `manifest.updateData` → data JSONB updated, audit row written; file_upload field stores file ID
- Mark cycle complete with required field empty → action rejected with structured error
- Mark cycle complete with required field filled → succeeds, run advances
- Delete manifest in use → refused with dependent rails list
- Delete field referenced by a Task node's `requiredManifestFieldSlugs` → refused
- Delete field referenced by a Statistic node's `manifestField` → refused
- Detach a manifest with in-flight runs → succeeds; runtime data preserved
- Cross-org isolation: org A cannot read org B's manifests, attach them, or write to their runtime rows

### 8.2 E2E test — `tests/e2e/manifests.spec.ts`

Golden path:

1. Log in as Admin → navigate to Manifest Management → create "Closing Documents" manifest with 5 fields → save
2. Open Rail Builder for an existing rail → Manifest tab → attach Closing Documents → mark "Lead Name" required on the first Task node → save & publish
3. Issue an order on that rail for a particle → log in as the assignee → see Closing Documents in the cycle's manifest panel → fill Lead Name → mark complete → cycle advances

### 8.3 Unit tests

- Slug generation rules: lowercase, underscore-separated, strip specials, collision suffix `_2`
- Kernel field-type validators: currency parses, file_upload returns valid file ID, particle_ref resolves to an existing particle of allowed type, multi_select rejects values outside the options list

### 8.4 Validation

`pnpm verify --tier=2` must pass before declaring the module complete. This covers typecheck, lint, check-actions (verifies `.inputSchema()` is on every action), unit, integration, and a production build.

---

## 9. Out of scope for V1 (deferred)

| Feature                                                                              | When                                      |
| ------------------------------------------------------------------------------------ | ----------------------------------------- |
| Folders for Manifest Management (and Rail Management)                                | Future polish pass                        |
| Draft/published versioning + Migration Prompt modal                                  | When Sage hits the limitation             |
| Slash-command (`/`) field insertion                                                  | Power-user polish                         |
| Inline manifest creation from Rail Builder                                           | Bundled with builder polish               |
| Display fields (Heading, Text, Divider)                                              | When a manifest needs visual breaks       |
| Per-field/per-cycle visibility permissions                                           | Spec already calls this V1.5              |
| `{{slug}}` templating consumers (task descriptions, SOP links, integration payloads) | Per-consumer feature                      |
| Manifest Node and Initialize Node on the rail canvas                                 | Next roadmap item after this lands        |
| Force-advance through unfilled required manifest fields                              | Manager override flow, separate feature   |
| `tags`, `address`, `post_ref`, `link`, `checklist` field types                       | Add to kernel as customer demand surfaces |

---

## 10. What this unblocks

After V1 lands, the following roadmap items become unblocked and can be designed/built:

1. **Initialize rail node** — writes initial manifest data when a particle enters the rail
2. **Manifest rail node** — collects manifest data at a specific cycle (currently "Soon" in palette)
3. **Programs & Orders** — depends on Manifests for run-scoped data
4. **`statistic-manifest` runtime mode** — already partially built, becomes resolvable
5. **`{{slug}}` templating** — start wiring consumers (task descriptions first)
