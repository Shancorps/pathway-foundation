# Manifest Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the V1 Manifest module — templates, attachment to rails, per-particle runtime instances, builder UI, cycle-level read/edit, deletion safety. Unblocks Initialize/Manifest rail nodes and the Programs layer.

**Architecture:** New `src/modules/manifests/` module with three tables (`manifests`, `rail_manifests`, `rail_run_manifests`) mirroring the particles pattern. Shared field-type kernel at `src/lib/field-types.ts` consumed by both particles and manifests. Rail Builder gains a Manifest tab; Cycle Detail gains a Manifest panel.

**Tech Stack:** Next.js 16, Drizzle ORM (Postgres), next-safe-action with `orgAction`, shadcn/Tailwind, Vitest (unit + integration), Playwright (e2e), pino (logging).

**Spec:** `docs/superpowers/specs/2026-05-10-manifest-module-design.md`

---

## File Structure

**Created:**

```
src/lib/field-types.ts                              # shared kernel
src/modules/manifests/schema.ts                     # 3 tables + JSONB types
src/modules/manifests/types.ts                      # Zod schemas
src/modules/manifests/queries.ts                    # reads
src/modules/manifests/actions.ts                    # writes
src/modules/manifests/slug.ts                       # slug generation utility
src/modules/manifests/README.md                     # module overview
src/modules/manifests/ui/manifest-list.tsx          # list view grid
src/modules/manifests/ui/create-manifest-modal.tsx  # +New Manifest modal
src/modules/manifests/ui/manifest-builder.tsx       # 3-column builder shell
src/modules/manifests/ui/field-palette.tsx          # left panel: draggable types
src/modules/manifests/ui/field-canvas.tsx           # center: drop target + render
src/modules/manifests/ui/field-renderer.tsx         # render any field type
src/modules/manifests/ui/field-properties-panel.tsx # right: per-field config
src/modules/manifests/ui/settings-panel.tsx         # right: manifest-level config
src/modules/manifests/ui/rail-manifest-tab.tsx      # rail builder integration
src/modules/manifests/ui/cycle-manifest-panel.tsx   # cycle detail integration
src/modules/manifests/ui/required-fields-config.tsx # task/approval node integration
app/(app)/admin/manifest-management/page.tsx        # list route
app/(app)/admin/manifest-management/[manifestId]/page.tsx  # builder route
tests/integration/manifests.test.ts                 # backend integration tests
tests/e2e/manifests.spec.ts                         # golden path e2e
tests/unit/manifests-slug.test.ts                   # slug utility unit tests
```

**Modified:**

```
src/db/schema.ts                                    # export manifests schema
src/modules/particles/schema.ts                     # use shared kernel
src/modules/rails/schema.ts                         # rail_nodes.requiredManifestFieldSlugs
src/modules/rails/ui/rail-editor.tsx                # add Manifest tab
src/modules/rails/ui/task-node-dialog.tsx           # add required-fields config
src/modules/rails/ui/approval-dialog.tsx            # add required-fields config
src/modules/rail-runs/actions.ts                    # advance gate + lazy init
src/modules/rail-runs/queries.ts                    # include manifest data in run reads
app/(app)/my-actions/[cycleId]/page.tsx             # add Cycle Manifest panel
app/api/jobs/cron/purge-deleted/route.ts            # delete loop for manifests
tests/e2e/helpers/reset-db.ts                       # truncate manifests tables
src/modules/auth/permissions.ts                     # "Can build manifests" flag
```

---

## Phase A — Foundation: Field-type kernel + schema

### Task 1: Extract shared field-type kernel

**Files:**

- Create: `src/lib/field-types.ts`
- Modify: `src/modules/particles/schema.ts`

- [ ] **Step 1: Create the shared kernel module**

```typescript
// src/lib/field-types.ts

/**
 * The kernel field type catalog. Shared between particles (entity-scoped data)
 * and manifests (run-scoped data). Adding a new type here makes it available
 * everywhere field types are consumed.
 *
 * Type-specific properties live in the consumer's field-def shape
 * (e.g., ParticleFieldDef.options for select; ManifestFieldDef.currency for currency).
 */
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

/**
 * Subset of kernel types that particles supports. Particles intentionally
 * excludes file_upload (use the files module separately) and particle_ref
 * (parent_particle_id is the structured way to reference a parent).
 *
 * Manifests use the full kernel.
 */
export const particleFieldTypes = [
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
] as const satisfies readonly KernelFieldType[]

export type ParticleFieldType = (typeof particleFieldTypes)[number]
```

- [ ] **Step 2: Update particles/schema.ts to import from kernel**

Find the existing `particleFieldTypes` const and `ParticleFieldType` type at the top of `src/modules/particles/schema.ts` (lines 13-27). Replace them with an import.

```typescript
// src/modules/particles/schema.ts (top of file, after the drizzle imports)
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { organization, user } from "@/modules/auth/schema"
import { type ParticleFieldType, particleFieldTypes } from "@/lib/field-types"

// (Remove the old "export const particleFieldTypes = [...]" block.)
// Re-export for backwards compat with any local consumers.
export { particleFieldTypes }
export type { ParticleFieldType }
```

- [ ] **Step 3: Run typecheck to confirm nothing broke**

Run: `pnpm typecheck`
Expected: PASS — particles schema and any consumers compile against the shared kernel.

- [ ] **Step 4: Run unit tests**

Run: `pnpm test:unit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/field-types.ts src/modules/particles/schema.ts
git commit -m "$(cat <<'EOF'
feat(field-types): extract shared kernel for particles + manifests

Particles now imports types from src/lib/field-types.ts. Adds 4 new
types to the particles palette (yes_no, currency, multi_select, url)
that are inert until UI surfaces them. Manifests will use the full
13-type kernel including file_upload and particle_ref.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Manifests schema — three tables

**Files:**

- Create: `src/modules/manifests/schema.ts`
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Write the schema file**

```typescript
// src/modules/manifests/schema.ts
import { sql } from "drizzle-orm"
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import type { KernelFieldType } from "@/lib/field-types"
import { organization, user } from "@/modules/auth/schema"
import { rails } from "@/modules/rails/schema"
import { railRuns } from "@/modules/rail-runs/schema"

/**
 * One field definition in a manifest template. Stored as an entry in the
 * manifests.fields jsonb array.
 *
 * `key` is the system slug (snake_case, unique within a manifest). It's the
 * stable identifier for the field's value in rail_run_manifests.data.
 * Renaming the label is safe; changing the key orphans existing values.
 */
export interface ManifestFieldDef {
  key: string
  label: string
  type: KernelFieldType
  position: number
  required: boolean
  readOnly: boolean
  helpText?: string
  placeholder?: string
  defaultValue?: string
  // Per-type extras
  options?: string[] // select, multi_select
  min?: number // number
  max?: number // number
  currency?: string // currency (e.g., "USD")
  fileMultiple?: boolean // file_upload
  particleTypeIds?: string[] // particle_ref ("any" if empty)
}

/**
 * Manifest template. Mirrors particle_types: a JSONB array of field defs
 * lets us evolve the field shape without a migration each time.
 */
export const manifests = pgTable(
  "manifests",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    fields: jsonb("fields").$type<ManifestFieldDef[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("manifests_org_deleted_idx")
      .on(t.organizationId, t.createdAt.desc())
      .where(sql`${t.deletedAt} is null`),
  ],
)

/**
 * Join table — which manifests are attached to which rails, in what order.
 * Multiple manifests per rail are allowed (the spec example: a delivery rail
 * with separate roofing + painting manifests).
 *
 * `manifest_id` uses ON DELETE RESTRICT — that's how "manifests in use can't
 * be deleted" is enforced at the DB level. Action layer translates the
 * Postgres FK violation into a friendly error with dependent rail names.
 */
export const railManifests = pgTable(
  "rail_manifests",
  {
    id: text("id").primaryKey(),
    railId: text("rail_id")
      .notNull()
      .references(() => rails.id, { onDelete: "cascade" }),
    manifestId: text("manifest_id")
      .notNull()
      .references(() => manifests.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rail_manifests_rail_manifest_idx").on(t.railId, t.manifestId),
    index("rail_manifests_manifest_idx").on(t.manifestId),
  ],
)

/**
 * Runtime data — one row per (rail run × attached manifest). Created lazily
 * when a rail run starts (matching the rail's currently-attached manifests)
 * or on first read/write for a manifest attached after the run started.
 *
 * `data` is a JSONB blob keyed by ManifestFieldDef.key (slug). Values are
 * untyped at the DB level; the action layer validates against the current
 * field defs at write time.
 */
export const railRunManifests = pgTable(
  "rail_run_manifests",
  {
    id: text("id").primaryKey(),
    railRunId: text("rail_run_id")
      .notNull()
      .references(() => railRuns.id, { onDelete: "cascade" }),
    manifestId: text("manifest_id")
      .notNull()
      .references(() => manifests.id, { onDelete: "restrict" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("rail_run_manifests_run_manifest_idx").on(t.railRunId, t.manifestId)],
)

export type Manifest = typeof manifests.$inferSelect
export type NewManifest = typeof manifests.$inferInsert
export type RailManifest = typeof railManifests.$inferSelect
export type NewRailManifest = typeof railManifests.$inferInsert
export type RailRunManifest = typeof railRunManifests.$inferSelect
export type NewRailRunManifest = typeof railRunManifests.$inferInsert
```

- [ ] **Step 2: Export manifests schema from db/schema.ts**

Add the line near the other module exports in `src/db/schema.ts`:

```typescript
export * from "@/modules/manifests/schema"
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — schema imports resolve.

- [ ] **Step 4: Commit**

```bash
git add src/modules/manifests/schema.ts src/db/schema.ts
git commit -m "$(cat <<'EOF'
feat(manifests): add module schema (manifests, rail_manifests, rail_run_manifests)

Three tables mirroring the particles pattern: template with JSONB fields
array, join table for rail attachment with RESTRICT FK to enforce
deletion-when-in-use refusal at the DB level, and runtime data table
keyed by (rail_run, manifest).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add `requiredManifestFieldSlugs` to rail_nodes

**Files:**

- Modify: `src/modules/rails/schema.ts`

- [ ] **Step 1: Add the column + type to rail_nodes**

Open `src/modules/rails/schema.ts`. Add this type definition near `RailNodeChecklistItem` and `RailNodeToolsLink` (around line 96):

```typescript
/**
 * Per-node required-manifest-field reference. Used by Task and Approval nodes
 * to gate cycle advance: the cycle cannot complete until every entry's
 * `fieldSlug` has a non-empty value in the rail_run_manifests row for the
 * referenced `manifestId`.
 *
 * Stored top-level (not in `config`) because it applies to multiple node
 * types and benefits from being uniformly addressable, like checklistItems
 * and toolsLinks.
 *
 * Stale entries (manifest no longer attached, or field removed from the
 * manifest) are silently ignored at advance time — see spec §5.4.
 */
export interface RailNodeRequiredManifestField {
  manifestId: string
  fieldSlug: string
}
```

Then in the `railNodes` table definition (around line 146, near `toolsLinks`), add the column:

```typescript
    toolsLinks: jsonb("tools_links").$type<RailNodeToolsLink[]>().notNull().default([]),
    requiredManifestFieldSlugs: jsonb("required_manifest_field_slugs")
      .$type<RailNodeRequiredManifestField[]>()
      .notNull()
      .default([]),
    // ...rest of columns unchanged...
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/rails/schema.ts
git commit -m "$(cat <<'EOF'
feat(rails): add required_manifest_field_slugs column to rail_nodes

Top-level JSONB column (not config-nested) holding refs to manifest
fields that must be filled before a Task or Approval cycle can advance.
Stale references are silently ignored at advance time.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Generate and apply the migration

**Files:**

- Create: `src/db/migrations/<auto-named>.sql`

- [ ] **Step 1: Generate the migration**

Run: `pnpm db:generate`

Expected: a new SQL file in `src/db/migrations/` containing CREATE TABLE statements for `manifests`, `rail_manifests`, `rail_run_manifests`, an ALTER TABLE for `rail_nodes` adding the `required_manifest_field_slugs` column, and the indexes.

- [ ] **Step 2: Review the generated SQL**

Open the new migration file in `src/db/migrations/`. Confirm:

- CREATE TABLE for all three new tables, with the FKs and indexes
- ALTER TABLE rail_nodes ADD COLUMN required_manifest_field_slugs jsonb NOT NULL DEFAULT '[]'
- No DROP statements, no rename-without-rebuild, no NOT-NULL-on-nullable-column-with-data (this is purely additive — should be fine)

If the migration looks wrong, run `pnpm db:check` and consult the `migration-review` skill before applying.

- [ ] **Step 3: Apply the migration locally**

Run: `pnpm db:migrate`
Expected: migration applies cleanly. Local Postgres now has the new tables.

- [ ] **Step 4: Verify schema matches**

Run: `pnpm db:check`
Expected: no drift.

- [ ] **Step 5: Commit**

```bash
git add src/db/migrations/
git commit -m "$(cat <<'EOF'
feat(db): migration for manifests + rail_nodes.required_manifest_field_slugs

Additive migration: creates manifests, rail_manifests, rail_run_manifests
with their FKs and indexes; adds the required-fields jsonb column to
rail_nodes with default '[]' so existing rows are untouched.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase B — Module backend: types, slug, queries, actions

### Task 5: Slug utility + unit tests

**Files:**

- Create: `src/modules/manifests/slug.ts`
- Create: `tests/unit/manifests-slug.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/manifests-slug.test.ts
import { describe, expect, it } from "vitest"
import { generateSlug, ensureUniqueSlug } from "@/modules/manifests/slug"

describe("generateSlug", () => {
  it("lowercases and underscore-joins", () => {
    expect(generateSlug("Final Monthly Retainer")).toBe("final_monthly_retainer")
  })

  it("strips special characters", () => {
    expect(generateSlug("Lead Name (primary)")).toBe("lead_name_primary")
    expect(generateSlug("Email/Phone?")).toBe("email_phone")
    expect(generateSlug("$ Amount")).toBe("amount")
  })

  it("collapses multiple spaces and underscores", () => {
    expect(generateSlug("foo   bar")).toBe("foo_bar")
    expect(generateSlug("foo___bar")).toBe("foo_bar")
  })

  it("trims leading/trailing underscores", () => {
    expect(generateSlug("  hello  ")).toBe("hello")
    expect(generateSlug("---test---")).toBe("test")
  })

  it("returns a fallback for empty/all-strip input", () => {
    expect(generateSlug("")).toBe("field")
    expect(generateSlug("$$$")).toBe("field")
  })
})

describe("ensureUniqueSlug", () => {
  it("returns the slug as-is if not in the existing set", () => {
    expect(ensureUniqueSlug("foo", new Set())).toBe("foo")
    expect(ensureUniqueSlug("foo", new Set(["bar", "baz"]))).toBe("foo")
  })

  it("appends _2 on first collision", () => {
    expect(ensureUniqueSlug("foo", new Set(["foo"]))).toBe("foo_2")
  })

  it("increments the suffix until unique", () => {
    expect(ensureUniqueSlug("foo", new Set(["foo", "foo_2", "foo_3"]))).toBe("foo_4")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/manifests-slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/modules/manifests/slug.ts

/**
 * Generates a snake_case slug from a human-readable label.
 * Lowercase, underscore-separated, special characters stripped.
 * Returns "field" if input is empty or all-strip.
 */
export function generateSlug(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return slug || "field"
}

/**
 * Ensures the slug doesn't collide with anything in `existing`.
 * On collision, appends _2, _3, etc. until unique.
 */
export function ensureUniqueSlug(slug: string, existing: Set<string>): string {
  if (!existing.has(slug)) return slug
  let n = 2
  while (existing.has(`${slug}_${n}`)) n++
  return `${slug}_${n}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/unit/manifests-slug.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/manifests/slug.ts tests/unit/manifests-slug.test.ts
git commit -m "$(cat <<'EOF'
feat(manifests): slug generation utility + tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Zod schemas for action inputs

**Files:**

- Create: `src/modules/manifests/types.ts`

- [ ] **Step 1: Write the types module**

```typescript
// src/modules/manifests/types.ts
import { z } from "zod"
import { kernelFieldTypes } from "@/lib/field-types"

const fieldDefBase = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  type: z.enum(kernelFieldTypes),
  position: z.number().int().nonnegative(),
  required: z.boolean(),
  readOnly: z.boolean(),
  helpText: z.string().max(500).optional(),
  placeholder: z.string().max(200).optional(),
  defaultValue: z.string().max(2000).optional(),
  options: z.array(z.string().min(1).max(200)).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string().min(3).max(8).optional(),
  fileMultiple: z.boolean().optional(),
  particleTypeIds: z.array(z.string()).optional(),
})

export const manifestFieldDefSchema = fieldDefBase

export const createManifestInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
})

export const updateManifestInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  fields: z.array(manifestFieldDefSchema).optional(),
})

export const deleteManifestInput = z.object({ id: z.string() })

export const attachManifestInput = z.object({
  railId: z.string(),
  manifestId: z.string(),
})

export const detachManifestInput = z.object({
  railId: z.string(),
  manifestId: z.string(),
})

export const reorderRailManifestsInput = z.object({
  railId: z.string(),
  manifestIds: z.array(z.string()).min(1),
})

export const updateRunManifestDataInput = z.object({
  railRunId: z.string(),
  manifestId: z.string(),
  data: z.record(z.string(), z.unknown()),
})

export const setRequiredFieldsInput = z.object({
  railNodeId: z.string(),
  required: z.array(z.object({ manifestId: z.string(), fieldSlug: z.string().min(1).max(80) })),
})

export type CreateManifestInput = z.infer<typeof createManifestInput>
export type UpdateManifestInput = z.infer<typeof updateManifestInput>
export type AttachManifestInput = z.infer<typeof attachManifestInput>
export type UpdateRunManifestDataInput = z.infer<typeof updateRunManifestDataInput>
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/manifests/types.ts
git commit -m "$(cat <<'EOF'
feat(manifests): zod schemas for action inputs

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Queries — list, get, rail attachments, run data, lazy ensure

**Files:**

- Create: `src/modules/manifests/queries.ts`

- [ ] **Step 1: Write the queries module**

```typescript
// src/modules/manifests/queries.ts
import "server-only"
import { createId } from "@paralleldrive/cuid2"
import { and, asc, eq, inArray, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { manifests, railManifests, railRunManifests } from "./schema"
import { railRuns } from "@/modules/rail-runs/schema"

interface ListOptions {
  withDeleted?: boolean
}

export async function listManifestsForOrg(orgId: string, opts: ListOptions = {}) {
  const where = opts.withDeleted
    ? eq(manifests.organizationId, orgId)
    : and(eq(manifests.organizationId, orgId), isNull(manifests.deletedAt))
  return db.select().from(manifests).where(where).orderBy(manifests.name)
}

export async function getManifestForOrg(orgId: string, id: string) {
  const [row] = await db
    .select()
    .from(manifests)
    .where(
      and(eq(manifests.organizationId, orgId), eq(manifests.id, id), isNull(manifests.deletedAt)),
    )
    .limit(1)
  return row ?? null
}

/**
 * The manifests currently attached to a rail, in attachment order.
 * Returned with the manifest template fields joined in for one-shot rendering.
 */
export async function getRailManifests(railId: string) {
  return db
    .select({
      attachment: railManifests,
      manifest: manifests,
    })
    .from(railManifests)
    .innerJoin(manifests, eq(manifests.id, railManifests.manifestId))
    .where(and(eq(railManifests.railId, railId), isNull(manifests.deletedAt)))
    .orderBy(asc(railManifests.position))
}

/**
 * Manifest data rows for a rail run. Includes detached manifests
 * (template-joined) so the cycle UI can show "Detached: ..." entries.
 */
export async function getRailRunManifests(railRunId: string) {
  return db
    .select({
      runRow: railRunManifests,
      manifest: manifests,
    })
    .from(railRunManifests)
    .innerJoin(manifests, eq(manifests.id, railRunManifests.manifestId))
    .where(eq(railRunManifests.railRunId, railRunId))
}

/**
 * Lazy-creates rail_run_manifests rows for any manifest currently attached
 * to the rail but missing a run row. Idempotent. Called from the cycle
 * detail loader and from updateRunData before any write.
 */
export async function ensureRailRunManifestRows(railRunId: string) {
  const [run] = await db
    .select({ railId: railRuns.railId })
    .from(railRuns)
    .where(eq(railRuns.id, railRunId))
    .limit(1)
  if (!run) return

  const attached = await db
    .select({ manifestId: railManifests.manifestId })
    .from(railManifests)
    .where(eq(railManifests.railId, run.railId))

  if (attached.length === 0) return

  const existing = await db
    .select({ manifestId: railRunManifests.manifestId })
    .from(railRunManifests)
    .where(eq(railRunManifests.railRunId, railRunId))
  const existingSet = new Set(existing.map((r) => r.manifestId))

  const toInsert = attached
    .filter((a) => !existingSet.has(a.manifestId))
    .map((a) => ({
      id: createId(),
      railRunId,
      manifestId: a.manifestId,
      data: {},
    }))

  if (toInsert.length > 0) {
    await db.insert(railRunManifests).values(toInsert)
  }
}

/**
 * Which rails currently use a given manifest. For the deletion-refusal
 * error message and the field-deletion-refusal check.
 */
export async function getRailsUsingManifest(orgId: string, manifestId: string) {
  // Join through railManifests to rails to get names. Filter to org.
  return db.execute<{ id: string; name: string }>(
    // Use raw SQL to avoid pulling in the rails import cycle.
    // (Drizzle alternative is fine; keep whichever the rails module uses elsewhere.)
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    // The existing items module uses `db.select().from(...).innerJoin(...)`.
    // Mirror that here for consistency:
    // (placeholder — implement using the rails table import below)
    {} as never,
  )
}
```

- [ ] **Step 2: Replace the `getRailsUsingManifest` placeholder with the real Drizzle query**

The placeholder above is intentional — replace it now. Update the file's imports and the function body:

```typescript
// At top of src/modules/manifests/queries.ts, add:
import { rails } from "@/modules/rails/schema"

// Replace the getRailsUsingManifest function with:
export async function getRailsUsingManifest(orgId: string, manifestId: string) {
  return db
    .select({ id: rails.id, name: rails.name })
    .from(railManifests)
    .innerJoin(rails, eq(rails.id, railManifests.railId))
    .where(
      and(
        eq(railManifests.manifestId, manifestId),
        eq(rails.organizationId, orgId),
        isNull(rails.deletedAt),
      ),
    )
    .orderBy(rails.name)
}
```

Remove the broken placeholder body and the `eslint-disable` comment.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/manifests/queries.ts
git commit -m "$(cat <<'EOF'
feat(manifests): server-only query layer

Lists, lookups, rail attachment reads, lazy ensure for run rows, and
a getRailsUsingManifest helper for deletion-refusal error context.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Actions — CRUD + attach/detach/reorder + update run data

**Files:**

- Create: `src/modules/manifests/actions.ts`

This is the biggest single file in the plan. Each action follows the exact pattern from `src/modules/items/actions.ts` (orgAction → metadata → inputSchema → action → audit → revalidate).

- [ ] **Step 1: Write the actions module**

```typescript
// src/modules/manifests/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { and, eq, isNull, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { ActionError, orgAction } from "@/lib/safe-action"
import { audit } from "@/modules/audit/audit"
import { railNodes } from "@/modules/rails/schema"
import { railRuns } from "@/modules/rail-runs/schema"
import { manifests, railManifests, railRunManifests } from "./schema"
import { ensureRailRunManifestRows, getRailsUsingManifest } from "./queries"
import {
  attachManifestInput,
  createManifestInput,
  deleteManifestInput,
  detachManifestInput,
  reorderRailManifestsInput,
  setRequiredFieldsInput,
  updateManifestInput,
  updateRunManifestDataInput,
} from "./types"

export const createManifest = orgAction
  .metadata({ actionName: "manifests.create" })
  .inputSchema(createManifestInput)
  .action(async ({ parsedInput, ctx }) => {
    const id = createId()
    await ctx.db.insert(manifests).values({
      id,
      organizationId: ctx.activeOrg.id,
      name: parsedInput.name,
      description: parsedInput.description,
      tags: parsedInput.tags,
      fields: [],
      createdBy: ctx.session.user.id,
      updatedBy: ctx.session.user.id,
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.created",
      { resourceType: "manifest", resourceId: id, metadata: { name: parsedInput.name } },
    )
    revalidatePath("/admin/manifest-management")
    return { id }
  })

export const updateManifest = orgAction
  .metadata({ actionName: "manifests.update" })
  .inputSchema(updateManifestInput)
  .action(async ({ parsedInput, ctx }) => {
    const { id, fields, ...rest } = parsedInput

    // If fields are being updated, refuse when there are in-flight runs
    // referencing this manifest. Detached manifests with surviving rail_run_manifests
    // rows still count as "in flight" — covered by the same query.
    if (fields !== undefined) {
      const inFlight = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(railRunManifests)
        .innerJoin(railRuns, eq(railRuns.id, railRunManifests.railRunId))
        .where(
          and(
            eq(railRunManifests.manifestId, id),
            // Only block on runs that haven't finished. Adjust the predicate
            // if rail_runs uses a different "active" signal.
            isNull(railRuns.completedAt),
          ),
        )
      const count = inFlight[0]?.count ?? 0
      if (count > 0) {
        throw new ActionError(
          "MANIFEST_IN_USE",
          `Cannot edit fields: ${count} in-flight rail run(s) reference this manifest.`,
        )
      }

      // Field-deletion enforcement: if a field is being removed (or its key
      // changed) and that key is referenced by a rail node's
      // requiredManifestFieldSlugs OR a statistic node's manifestField,
      // refuse with the list of referencing nodes.
      const [existing] = await ctx.db
        .select({ fields: manifests.fields })
        .from(manifests)
        .where(eq(manifests.id, id))
        .limit(1)
      const oldKeys = new Set((existing?.fields ?? []).map((f) => f.key))
      const newKeys = new Set(fields.map((f) => f.key))
      const removedKeys = [...oldKeys].filter((k) => !newKeys.has(k))

      if (removedKeys.length > 0) {
        // Check rail_nodes.requiredManifestFieldSlugs (JSONB array of {manifestId, fieldSlug})
        // Use a JSONB containment query — Postgres can match on any element matching {manifestId: id, fieldSlug: <removed>}
        const requiringNodes = await ctx.db.execute<{
          rail_node_id: string
          rail_id: string
          field_slug: string
        }>(sql`
          select
            rn.id as rail_node_id,
            rn.rail_id,
            elem->>'fieldSlug' as field_slug
          from rail_nodes rn,
            jsonb_array_elements(rn.required_manifest_field_slugs) elem
          where rn.organization_id = ${ctx.activeOrg.id}
            and rn.deleted_at is null
            and elem->>'manifestId' = ${id}
            and elem->>'fieldSlug' = any(${removedKeys})
        `)
        if (requiringNodes.rows.length > 0) {
          const slugs = [...new Set(requiringNodes.rows.map((r) => r.field_slug))].join(", ")
          throw new ActionError(
            "FIELD_IN_USE",
            `Cannot remove field(s) ${slugs}: referenced by ${requiringNodes.rows.length} rail node(s) as required-to-advance.`,
          )
        }

        // Check rail_nodes.config for statistic nodes referencing this field
        const statNodes = await ctx.db.execute<{
          rail_node_id: string
          field_slug: string
        }>(sql`
          select
            rn.id as rail_node_id,
            rn.config->>'manifestField' as field_slug
          from rail_nodes rn
          where rn.organization_id = ${ctx.activeOrg.id}
            and rn.deleted_at is null
            and rn.type = 'statistic'
            and rn.config->>'manifestField' = any(${removedKeys})
        `)
        if (statNodes.rows.length > 0) {
          const slugs = [...new Set(statNodes.rows.map((r) => r.field_slug))].join(", ")
          throw new ActionError(
            "FIELD_IN_USE",
            `Cannot remove field(s) ${slugs}: referenced by ${statNodes.rows.length} statistic node(s) as their value source.`,
          )
        }
      }
    }

    const setExpr: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.session.user.id,
    }
    if (rest.name !== undefined) setExpr.name = rest.name
    if (rest.description !== undefined) setExpr.description = rest.description
    if (rest.tags !== undefined) setExpr.tags = rest.tags
    if (fields !== undefined) setExpr.fields = fields

    const result = await ctx.db
      .update(manifests)
      .set(setExpr)
      .where(
        and(
          eq(manifests.id, id),
          eq(manifests.organizationId, ctx.activeOrg.id),
          isNull(manifests.deletedAt),
        ),
      )
      .returning({ id: manifests.id })

    if (result.length === 0) {
      throw new ActionError("NOT_FOUND", "Manifest not found")
    }

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.updated",
      {
        resourceType: "manifest",
        resourceId: id,
        metadata: {
          changedFieldKeys: fields !== undefined ? fields.map((f) => f.key) : undefined,
          name: rest.name,
        },
      },
    )
    revalidatePath("/admin/manifest-management")
    revalidatePath(`/admin/manifest-management/${id}`)
    return { id }
  })

export const deleteManifest = orgAction
  .metadata({ actionName: "manifests.delete" })
  .inputSchema(deleteManifestInput)
  .action(async ({ parsedInput, ctx }) => {
    // Hard-refusal if any rail uses this manifest. Action layer surfaces
    // the dependent rail names; the user must detach first.
    const inUse = await getRailsUsingManifest(ctx.activeOrg.id, parsedInput.id)
    if (inUse.length > 0) {
      throw new ActionError(
        "MANIFEST_IN_USE",
        `Cannot delete: in use by ${inUse.length} rail(s): ${inUse.map((r) => r.name).join(", ")}. Detach from each rail before deleting.`,
      )
    }

    const result = await ctx.db
      .update(manifests)
      .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
      .where(
        and(
          eq(manifests.id, parsedInput.id),
          eq(manifests.organizationId, ctx.activeOrg.id),
          isNull(manifests.deletedAt),
        ),
      )
      .returning({ id: manifests.id })

    if (result.length === 0) {
      throw new ActionError("NOT_FOUND", "Manifest not found or already deleted")
    }

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.deleted",
      { resourceType: "manifest", resourceId: parsedInput.id },
    )
    revalidatePath("/admin/manifest-management")
    return { id: parsedInput.id }
  })

export const attachManifestToRail = orgAction
  .metadata({ actionName: "manifests.attach_to_rail" })
  .inputSchema(attachManifestInput)
  .action(async ({ parsedInput, ctx }) => {
    // Determine next position
    const [maxRow] = await ctx.db
      .select({ max: sql<number>`coalesce(max(${railManifests.position}), -1)::int` })
      .from(railManifests)
      .where(eq(railManifests.railId, parsedInput.railId))
    const nextPos = (maxRow?.max ?? -1) + 1

    const id = createId()
    await ctx.db
      .insert(railManifests)
      .values({
        id,
        railId: parsedInput.railId,
        manifestId: parsedInput.manifestId,
        position: nextPos,
      })
      .onConflictDoNothing({
        target: [railManifests.railId, railManifests.manifestId],
      })

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.attached_to_rail",
      {
        resourceType: "rail",
        resourceId: parsedInput.railId,
        metadata: { manifestId: parsedInput.manifestId },
      },
    )
    revalidatePath(`/admin/rail-management/${parsedInput.railId}`)
    return { id, railId: parsedInput.railId, manifestId: parsedInput.manifestId }
  })

export const detachManifestFromRail = orgAction
  .metadata({ actionName: "manifests.detach_from_rail" })
  .inputSchema(detachManifestInput)
  .action(async ({ parsedInput, ctx }) => {
    await ctx.db
      .delete(railManifests)
      .where(
        and(
          eq(railManifests.railId, parsedInput.railId),
          eq(railManifests.manifestId, parsedInput.manifestId),
        ),
      )
    // Note: rail_run_manifests rows are intentionally preserved so in-flight
    // run data isn't lost. Reattaching the manifest to the rail later will
    // surface the existing data again.

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.detached_from_rail",
      {
        resourceType: "rail",
        resourceId: parsedInput.railId,
        metadata: { manifestId: parsedInput.manifestId },
      },
    )
    revalidatePath(`/admin/rail-management/${parsedInput.railId}`)
    return { railId: parsedInput.railId, manifestId: parsedInput.manifestId }
  })

export const reorderRailManifests = orgAction
  .metadata({ actionName: "manifests.reorder_rail_manifests" })
  .inputSchema(reorderRailManifestsInput)
  .action(async ({ parsedInput, ctx }) => {
    await ctx.db.transaction(async (tx) => {
      for (let i = 0; i < parsedInput.manifestIds.length; i++) {
        await tx
          .update(railManifests)
          .set({ position: i, updatedAt: new Date() })
          .where(
            and(
              eq(railManifests.railId, parsedInput.railId),
              eq(railManifests.manifestId, parsedInput.manifestIds[i]!),
            ),
          )
      }
    })
    revalidatePath(`/admin/rail-management/${parsedInput.railId}`)
    return { railId: parsedInput.railId }
  })

export const updateRunManifestData = orgAction
  .metadata({ actionName: "manifests.update_run_data" })
  .inputSchema(updateRunManifestDataInput)
  .action(async ({ parsedInput, ctx }) => {
    // Lazy-ensure the row exists (covers manifests attached after the run started).
    await ensureRailRunManifestRows(parsedInput.railRunId)

    // Read current data for the audit diff.
    const [existing] = await ctx.db
      .select()
      .from(railRunManifests)
      .where(
        and(
          eq(railRunManifests.railRunId, parsedInput.railRunId),
          eq(railRunManifests.manifestId, parsedInput.manifestId),
        ),
      )
      .limit(1)
    if (!existing) {
      throw new ActionError("NOT_FOUND", "Manifest is not attached to this rail run.")
    }

    const oldData = existing.data ?? {}
    const newData = { ...oldData, ...parsedInput.data }

    await ctx.db
      .update(railRunManifests)
      .set({
        data: newData,
        updatedAt: new Date(),
        updatedBy: ctx.session.user.id,
      })
      .where(eq(railRunManifests.id, existing.id))

    // Diff: which slugs changed and to what.
    const changedSlugs = Object.keys(parsedInput.data).filter(
      (k) =>
        JSON.stringify((oldData as Record<string, unknown>)[k]) !==
        JSON.stringify(parsedInput.data[k]),
    )

    if (changedSlugs.length > 0) {
      await audit(
        {
          db: ctx.db,
          organizationId: ctx.activeOrg.id,
          actorUserId: ctx.session.user.id,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        "manifests.data_updated",
        {
          resourceType: "rail_run",
          resourceId: parsedInput.railRunId,
          metadata: {
            manifestId: parsedInput.manifestId,
            changedSlugs,
          },
        },
      )
    }

    revalidatePath(`/runs/${parsedInput.railRunId}`)
    return { ok: true }
  })

export const setNodeRequiredFields = orgAction
  .metadata({ actionName: "manifests.set_node_required_fields" })
  .inputSchema(setRequiredFieldsInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await ctx.db
      .update(railNodes)
      .set({
        requiredManifestFieldSlugs: parsedInput.required,
        updatedAt: new Date(),
        updatedBy: ctx.session.user.id,
      })
      .where(
        and(
          eq(railNodes.id, parsedInput.railNodeId),
          eq(railNodes.organizationId, ctx.activeOrg.id),
          isNull(railNodes.deletedAt),
        ),
      )
      .returning({ id: railNodes.id, railId: railNodes.railId })

    if (result.length === 0) {
      throw new ActionError("NOT_FOUND", "Rail node not found")
    }
    revalidatePath(`/admin/rail-management/${result[0]!.railId}`)
    return { railNodeId: parsedInput.railNodeId }
  })
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — every action has `.inputSchema()`, every mutation calls `audit()` and `revalidatePath()`.

- [ ] **Step 3: Run the static check-actions check**

Run: `pnpm verify --tier=1`
Expected: PASS — including the `check-actions` script that enforces `.inputSchema()`.

- [ ] **Step 4: Commit**

```bash
git add src/modules/manifests/actions.ts
git commit -m "$(cat <<'EOF'
feat(manifests): server actions

createManifest, updateManifest (with in-flight-run edit refusal),
deleteManifest (with in-use refusal), attach/detach/reorder rail
manifests, updateRunManifestData (with diff-based audit), and
setNodeRequiredFields. All chain orgAction + inputSchema + audit.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase C — Manifest Builder UI

The builder UI is broken into focused tasks. The pattern: read in the server-component page, hand to a client builder shell, then composed leaf components.

### Task 9: List view route + grid component

**Files:**

- Create: `app/(app)/admin/manifest-management/page.tsx`
- Create: `src/modules/manifests/ui/manifest-list.tsx`

- [ ] **Step 1: Write the server-component page**

```tsx
// app/(app)/admin/manifest-management/page.tsx
import { redirect } from "next/navigation"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { listManifestsForOrg } from "@/modules/manifests/queries"
import { ManifestList } from "@/modules/manifests/ui/manifest-list"

export default async function ManifestManagementPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding")

  const items = await listManifestsForOrg(orgId)

  return (
    <PageShell breadcrumb={["ADMIN", "MANIFEST MANAGEMENT"]}>
      <TitleBlock title="Manifests" subtitle="Capture structured team input." />
      <ManifestList manifests={items} />
    </PageShell>
  )
}
```

> If `PageShell` or `TitleBlock` use a different prop API in this repo, mirror the props from `app/(app)/items/page.tsx` (the items list route shows the canonical pattern).

- [ ] **Step 2: Write the client list component**

```tsx
// src/modules/manifests/ui/manifest-list.tsx
"use client"

import Link from "next/link"
import { useState } from "react"
import { CreateManifestModal } from "./create-manifest-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Manifest } from "../schema"

interface Props {
  manifests: Manifest[]
}

export function ManifestList({ manifests }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const filtered = manifests.filter((m) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return m.name.toLowerCase().includes(q) || (m.description?.toLowerCase().includes(q) ?? false)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search manifests..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="ml-auto">
          <Button onClick={() => setOpen(true)}>+ New Manifest</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          {manifests.length === 0
            ? "No manifests yet — Create your first manifest template to start collecting data on your rails."
            : "No manifests match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link
              key={m.id}
              href={`/admin/manifest-management/${m.id}`}
              className="hover:bg-accent rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium">{m.name}</h3>
                <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
                  Template
                </span>
              </div>
              {m.description && (
                <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">{m.description}</p>
              )}
              <p className="text-muted-foreground mt-3 text-xs">{m.fields?.length ?? 0} fields</p>
            </Link>
          ))}
        </div>
      )}

      <CreateManifestModal open={open} onOpenChange={setOpen} />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (the modal is a forward reference — Task 10 fills it in. If TS complains, stub `CreateManifestModal` as `() => null` and complete in Task 10.)

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/admin/manifest-management/page.tsx src/modules/manifests/ui/manifest-list.tsx
git commit -m "$(cat <<'EOF'
feat(manifests): list view route + grid component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Create Manifest modal

**Files:**

- Create: `src/modules/manifests/ui/create-manifest-modal.tsx`

- [ ] **Step 1: Write the modal**

```tsx
// src/modules/manifests/ui/create-manifest-modal.tsx
"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { createManifest } from "../actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateManifestModal({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tagsRaw, setTagsRaw] = useState("")

  const { execute, status, result } = useAction(createManifest, {
    onSuccess: ({ data }) => {
      if (data?.id) {
        onOpenChange(false)
        router.push(`/admin/manifest-management/${data.id}`)
      }
    },
  })

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Manifest</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Create a new manifest template for your organization.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manifest-name">Manifest Name</Label>
            <Input
              id="manifest-name"
              placeholder="e.g., Closing Documents, Permitting"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manifest-desc">Description (Optional)</Label>
            <Textarea
              id="manifest-desc"
              placeholder="What is this manifest for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manifest-tags">Tags (Optional)</Label>
            <Input
              id="manifest-tags"
              placeholder="comma, separated, tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
            />
          </div>
        </div>
        {result?.serverError && <p className="text-destructive text-sm">{result.serverError}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || status === "executing"}
            onClick={() =>
              execute({
                name: name.trim(),
                description: description.trim() || undefined,
                tags,
              })
            }
          >
            Create Manifest
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Run dev server, smoke test**

Run: `pnpm dev` (background) then navigate to `/admin/manifest-management` in your browser.
Expected: list page loads. Click + New Manifest. Modal opens. Submit "Test Manifest". Page redirects to `/admin/manifest-management/<new-id>` (which 404s for now — Task 11 builds it).

- [ ] **Step 4: Commit**

```bash
git add src/modules/manifests/ui/create-manifest-modal.tsx
git commit -m "$(cat <<'EOF'
feat(manifests): create-manifest modal

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Builder shell + route

**Files:**

- Create: `app/(app)/admin/manifest-management/[manifestId]/page.tsx`
- Create: `src/modules/manifests/ui/manifest-builder.tsx`

- [ ] **Step 1: Write the route**

```tsx
// app/(app)/admin/manifest-management/[manifestId]/page.tsx
import { notFound, redirect } from "next/navigation"
import { PageShell } from "@/components/ui/page-shell"
import { getSession } from "@/modules/auth/session"
import { getManifestForOrg } from "@/modules/manifests/queries"
import { ManifestBuilder } from "@/modules/manifests/ui/manifest-builder"

interface Props {
  params: Promise<{ manifestId: string }>
}

export default async function ManifestBuilderPage({ params }: Props) {
  const { manifestId } = await params
  const session = await getSession()
  if (!session) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding")

  const manifest = await getManifestForOrg(orgId, manifestId)
  if (!manifest) notFound()

  return (
    <PageShell breadcrumb={["ADMIN", "MANIFEST MANAGEMENT", manifest.name]}>
      <ManifestBuilder manifest={manifest} />
    </PageShell>
  )
}
```

- [ ] **Step 2: Write the builder shell**

```tsx
// src/modules/manifests/ui/manifest-builder.tsx
"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { ArrowLeft } from "lucide-react"
import { updateManifest } from "../actions"
import type { Manifest } from "../schema"
import type { ManifestFieldDef } from "../schema"
import { Button } from "@/components/ui/button"
import { FieldCanvas } from "./field-canvas"
import { FieldPalette } from "./field-palette"
import { FieldPropertiesPanel } from "./field-properties-panel"
import { SettingsPanel } from "./settings-panel"

interface Props {
  manifest: Manifest
}

export function ManifestBuilder({ manifest }: Props) {
  const router = useRouter()
  const [name, setName] = useState(manifest.name)
  const [description, setDescription] = useState(manifest.description ?? "")
  const [tags, setTags] = useState<string[]>(manifest.tags ?? [])
  const [fields, setFields] = useState<ManifestFieldDef[]>(manifest.fields ?? [])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const dirty =
    name !== manifest.name ||
    description !== (manifest.description ?? "") ||
    JSON.stringify(tags) !== JSON.stringify(manifest.tags ?? []) ||
    JSON.stringify(fields) !== JSON.stringify(manifest.fields ?? [])

  const { execute, status, result } = useAction(updateManifest, {
    onSuccess: () => {
      // Refresh the route to read the updated manifest from DB
      router.refresh()
    },
  })

  function handleSave() {
    execute({
      id: manifest.id,
      name,
      description: description || null,
      tags,
      fields,
    })
  }

  function handleBack() {
    if (dirty && !confirm("You have unsaved changes. Discard them?")) return
    router.push("/admin/manifest-management")
  }

  const selected = selectedKey ? (fields.find((f) => f.key === selectedKey) ?? null) : null

  function updateField(updater: (f: ManifestFieldDef) => ManifestFieldDef) {
    if (!selectedKey) return
    setFields((curr) => curr.map((f) => (f.key === selectedKey ? updater(f) : f)))
  }

  function deleteField(key: string) {
    setFields((curr) => curr.filter((f) => f.key !== key).map((f, i) => ({ ...f, position: i })))
    if (selectedKey === key) setSelectedKey(null)
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b p-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-transparent text-lg font-medium outline-none"
        />
        <div className="flex items-center gap-2">
          {dirty && <span className="text-muted-foreground text-xs">Unsaved changes</span>}
          <Button onClick={handleSave} disabled={!dirty || status === "executing"}>
            Save
          </Button>
        </div>
      </div>
      {result?.serverError && (
        <div className="bg-destructive/10 text-destructive border-destructive/20 border-b p-2 text-sm">
          {result.serverError}
        </div>
      )}

      {/* Three columns */}
      <div className="grid flex-1 grid-cols-[16rem_1fr_20rem] overflow-hidden">
        <FieldPalette fields={fields} setFields={setFields} />
        <FieldCanvas
          fields={fields}
          setFields={setFields}
          selectedKey={selectedKey}
          setSelectedKey={setSelectedKey}
          onDelete={deleteField}
        />
        {selected ? (
          <FieldPropertiesPanel
            field={selected}
            updateField={updateField}
            onClose={() => setSelectedKey(null)}
          />
        ) : (
          <SettingsPanel
            description={description}
            setDescription={setDescription}
            tags={tags}
            setTags={setTags}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS — leaf components are forward references; TS may flag missing imports. If so, stub each leaf as `export function X() { return null }` in its file and complete in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/admin/manifest-management/\[manifestId\]/page.tsx src/modules/manifests/ui/manifest-builder.tsx
git commit -m "$(cat <<'EOF'
feat(manifests): builder route + shell with three-column layout

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Field palette (left panel)

**Files:**

- Create: `src/modules/manifests/ui/field-palette.tsx`

- [ ] **Step 1: Write the palette**

```tsx
// src/modules/manifests/ui/field-palette.tsx
"use client"

import { createId } from "@paralleldrive/cuid2"
import type { KernelFieldType } from "@/lib/field-types"
import type { ManifestFieldDef } from "../schema"
import { ensureUniqueSlug, generateSlug } from "../slug"

const PALETTE: Array<{ type: KernelFieldType; label: string }> = [
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

export function FieldPalette({ fields, setFields }: Props) {
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
    <div className="border-r p-3">
      <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        Input
      </h4>
      <div className="space-y-1">
        {PALETTE.map((opt) => (
          <button
            key={opt.type}
            draggable
            onDragStart={(e) => handleDragStart(e, opt.type, opt.label)}
            onClick={() => addField(opt.type, opt.label)}
            className="hover:bg-accent w-full cursor-grab rounded border px-2 py-1.5 text-left text-sm active:cursor-grabbing"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `pnpm typecheck`
Expected: PASS

```bash
git add src/modules/manifests/ui/field-palette.tsx
git commit -m "$(cat <<'EOF'
feat(manifests): builder field palette

Click or drag to add. Shared kernel field types for consistency with particles.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Field canvas + drop target + reorder

**Files:**

- Create: `src/modules/manifests/ui/field-canvas.tsx`
- Create: `src/modules/manifests/ui/field-renderer.tsx`

- [ ] **Step 1: Write the renderer (reused on canvas + cycle UI)**

```tsx
// src/modules/manifests/ui/field-renderer.tsx
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
  isRequired?: boolean // overrides template-level required (used at runtime)
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
            onChange={(e) => emit(e.target.value)}
            disabled={disabled || field.readOnly}
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
            onChange={(e) => emit(e.target.value)}
            disabled={disabled || field.readOnly}
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
            value={typeof value === "number" ? value : ((value as string) ?? "")}
            min={field.min}
            max={field.max}
            onChange={(e) => emit(e.target.value === "" ? null : Number(e.target.value))}
            disabled={disabled || field.readOnly}
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
            onChange={(e) => emit(e.target.value)}
            disabled={disabled || field.readOnly}
          />
        </div>
      )

    case "yes_no":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value === true}
            onCheckedChange={(v) => emit(v)}
            disabled={disabled || field.readOnly}
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
            onChange={(e) => emit(e.target.value)}
            disabled={disabled || field.readOnly}
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
                    disabled={disabled || field.readOnly}
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
            onChange={(e) => emit(e.target.value)}
            disabled={disabled || field.readOnly}
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
```

> The two stub field types (`file_upload`, `particle_ref`) are deliberately minimal at the renderer level for V1 — runtime functionality will wire through the existing files module and a particle picker when each is added. They render and persist string IDs in the meantime.

- [ ] **Step 2: Write the canvas with drop target + reorder**

```tsx
// src/modules/manifests/ui/field-canvas.tsx
"use client"

import { createId } from "@paralleldrive/cuid2"
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
        const targetIdx = insertAt > fromIdx ? insertAt - 1 : insertAt
        arr.splice(targetIdx, 0, moved!)
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
            onDrop={(e) => handleDrop(e, 0)}
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
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => setSelectedKey(field.key)}
                  className={`bg-card group hover:border-primary/40 flex items-start gap-2 rounded-lg border p-3 transition-colors ${
                    selectedKey === field.key ? "border-primary" : ""
                  }`}
                >
                  <button
                    draggable
                    onDragStart={(e) => handleReorderStart(e, field.key)}
                    className="text-muted-foreground mt-1 cursor-grab active:cursor-grabbing"
                    onClick={(e) => e.stopPropagation()}
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
              onDrop={(e) => handleDrop(e, fields.length)}
            >
              Drop field here
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Smoke test in browser**

Run dev server. Open the builder for the manifest you created in Task 10. Drag a Text Input from the palette to the canvas. Drag another. Reorder them by dragging the handle. Click one — selection ring appears. Click the X — field deletes. Don't save yet (Task 14 wires up properties).

- [ ] **Step 5: Commit**

```bash
git add src/modules/manifests/ui/field-canvas.tsx src/modules/manifests/ui/field-renderer.tsx
git commit -m "$(cat <<'EOF'
feat(manifests): canvas drop/reorder + reusable field renderer

Renderer is shared between builder canvas (disabled), field properties
panel preview, and runtime cycle panel.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Field properties panel + Manifest settings panel

**Files:**

- Create: `src/modules/manifests/ui/field-properties-panel.tsx`
- Create: `src/modules/manifests/ui/settings-panel.tsx`

- [ ] **Step 1: Write the field properties panel**

```tsx
// src/modules/manifests/ui/field-properties-panel.tsx
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
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Label</Label>
          <Input
            value={field.label}
            onChange={(e) => updateField((f) => ({ ...f, label: e.target.value }))}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Click the label in the canvas to edit inline.
          </p>
        </div>

        <div>
          <Label>Variable Slug</Label>
          <Input
            value={field.key}
            onChange={(e) => updateField((f) => ({ ...f, key: e.target.value }))}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Reference value as <code className="text-xs">{`{{${field.key}}}`}</code>
          </p>
        </div>

        <div>
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder ?? ""}
            onChange={(e) =>
              updateField((f) => ({ ...f, placeholder: e.target.value || undefined }))
            }
          />
        </div>

        <div>
          <Label>Help Text</Label>
          <Textarea
            value={field.helpText ?? ""}
            onChange={(e) => updateField((f) => ({ ...f, helpText: e.target.value || undefined }))}
          />
        </div>

        <div>
          <Label>Default Value</Label>
          <Input
            value={field.defaultValue ?? ""}
            onChange={(e) =>
              updateField((f) => ({ ...f, defaultValue: e.target.value || undefined }))
            }
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
            onCheckedChange={(v) => updateField((f) => ({ ...f, required: v }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="readonly-toggle">Read Only</Label>
          <Switch
            id="readonly-toggle"
            checked={field.readOnly}
            onCheckedChange={(v) => updateField((f) => ({ ...f, readOnly: v }))}
          />
        </div>

        {/* Per-type extras */}
        {field.type === "number" && (
          <>
            <div>
              <Label>Min</Label>
              <Input
                type="number"
                value={field.min ?? ""}
                onChange={(e) =>
                  updateField((f) => ({
                    ...f,
                    min: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <Label>Max</Label>
              <Input
                type="number"
                value={field.max ?? ""}
                onChange={(e) =>
                  updateField((f) => ({
                    ...f,
                    max: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
            </div>
          </>
        )}

        {(field.type === "select" || field.type === "multi_select") && (
          <div>
            <Label>Options (one per line)</Label>
            <Textarea
              value={(field.options ?? []).join("\n")}
              onChange={(e) =>
                updateField((f) => ({
                  ...f,
                  options: e.target.value
                    .split("\n")
                    .map((o) => o.trim())
                    .filter(Boolean),
                }))
              }
            />
          </div>
        )}

        {field.type === "currency" && (
          <div>
            <Label>Currency code</Label>
            <Input
              value={field.currency ?? ""}
              placeholder="USD"
              onChange={(e) =>
                updateField((f) => ({ ...f, currency: e.target.value || undefined }))
              }
            />
          </div>
        )}

        {field.type === "file_upload" && (
          <div className="flex items-center justify-between">
            <Label htmlFor="multi-file-toggle">Allow multiple files</Label>
            <Switch
              id="multi-file-toggle"
              checked={field.fileMultiple ?? false}
              onCheckedChange={(v) => updateField((f) => ({ ...f, fileMultiple: v }))}
            />
          </div>
        )}

        {field.type === "particle_ref" && (
          <div>
            <Label>Allowed particle types (IDs, comma-separated; empty = any)</Label>
            <Input
              value={(field.particleTypeIds ?? []).join(", ")}
              onChange={(e) =>
                updateField((f) => ({
                  ...f,
                  particleTypeIds: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the manifest settings panel**

```tsx
// src/modules/manifests/ui/settings-panel.tsx
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  description: string
  setDescription: (v: string) => void
  tags: string[]
  setTags: (t: string[]) => void
}

export function SettingsPanel({ description, setDescription, tags, setTags }: Props) {
  const tagsRaw = tags.join(", ")
  return (
    <div className="space-y-4 border-l p-4">
      <h3 className="font-medium">Manifest Settings</h3>
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the purpose of this manifest."
        />
      </div>
      <div>
        <Label>Tags</Label>
        <Input
          value={tagsRaw}
          onChange={(e) =>
            setTags(
              e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            )
          }
          placeholder="comma, separated"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Tags help organize and filter manifests.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + browser smoke test**

Run: `pnpm typecheck`
Expected: PASS

In browser: open the builder, add 2 fields, click each, edit label, slug, mark required. Click Save. Reload — fields persist.

- [ ] **Step 4: Commit**

```bash
git add src/modules/manifests/ui/field-properties-panel.tsx src/modules/manifests/ui/settings-panel.tsx
git commit -m "$(cat <<'EOF'
feat(manifests): field properties + settings right panel

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase D — Rail Builder integration

### Task 15: Rail Builder Manifest tab

**Files:**

- Create: `src/modules/manifests/ui/rail-manifest-tab.tsx`
- Modify: `src/modules/rails/ui/rail-editor.tsx`

- [ ] **Step 1: Build the Manifest tab component**

```tsx
// src/modules/manifests/ui/rail-manifest-tab.tsx
"use client"

import { GripVertical, X } from "lucide-react"
import { useMemo, useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { attachManifestToRail, detachManifestFromRail, reorderRailManifests } from "../actions"
import type { Manifest } from "../schema"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import type { RailManifest } from "../schema"

interface AttachedRow {
  attachment: RailManifest
  manifest: Manifest
}

interface Props {
  railId: string
  attached: AttachedRow[]
  allManifests: Manifest[]
}

export function RailManifestTab({ railId, attached, allManifests }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState("")
  const [confirmDetach, setConfirmDetach] = useState<{ manifestId: string; name: string } | null>(
    null,
  )

  const attachAction = useAction(attachManifestToRail)
  const detachAction = useAction(detachManifestFromRail)
  const reorderAction = useAction(reorderRailManifests)

  const attachedIds = new Set(attached.map((a) => a.attachment.manifestId))
  const candidates = allManifests.filter(
    (m) =>
      !attachedIds.has(m.id) &&
      (pickerQuery.trim() === "" || m.name.toLowerCase().includes(pickerQuery.toLowerCase())),
  )

  function handleReorder(fromIdx: number, toIdx: number) {
    const ids = attached.map((a) => a.attachment.manifestId)
    const [moved] = ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, moved!)
    reorderAction.execute({ railId, manifestIds: ids })
  }

  return (
    <div className="space-y-3 p-3">
      <h3 className="text-sm font-medium">Manifests on this rail</h3>
      {attached.length === 0 ? (
        <p className="text-muted-foreground text-xs">No manifests attached.</p>
      ) : (
        <ul className="space-y-1">
          {attached.map((row, idx) => (
            <li
              key={row.attachment.manifestId}
              className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm"
            >
              <button
                disabled={idx === 0}
                onClick={() => handleReorder(idx, idx - 1)}
                className="text-muted-foreground disabled:opacity-30"
              >
                <GripVertical className="h-3 w-3" />
              </button>
              <span className="flex-1 truncate">{row.manifest.name}</span>
              <span className="text-muted-foreground text-xs">
                {row.manifest.fields?.length ?? 0} fields
              </span>
              <button
                onClick={() =>
                  setConfirmDetach({
                    manifestId: row.attachment.manifestId,
                    name: row.manifest.name,
                  })
                }
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
        + Add Manifest
      </Button>

      {/* Picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach a manifest</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search manifests..."
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No matches. Build a manifest in Manifest Management first.
              </p>
            ) : (
              <ul>
                {candidates.map((m) => (
                  <li key={m.id}>
                    <button
                      className="hover:bg-accent w-full rounded px-2 py-1.5 text-left text-sm"
                      onClick={() => {
                        attachAction.execute({ railId, manifestId: m.id })
                        setPickerOpen(false)
                      }}
                    >
                      <div className="font-medium">{m.name}</div>
                      {m.description && (
                        <div className="text-muted-foreground line-clamp-1 text-xs">
                          {m.description}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detach confirmation */}
      <Dialog open={!!confirmDetach} onOpenChange={(open) => !open && setConfirmDetach(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detach {confirmDetach?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Existing in-flight runs will keep the manifest data, but new cycles won't see this
            manifest.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDetach(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDetach) {
                  detachAction.execute({ railId, manifestId: confirmDetach.manifestId })
                  setConfirmDetach(null)
                }
              }}
            >
              Detach
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Wire RailManifestTab into rail-editor.tsx**

Open `src/modules/rails/ui/rail-editor.tsx`. Identify where the "Steps" tab is rendered. Add a sibling Manifests tab using the same tab primitive used elsewhere (likely shadcn `Tabs`).

The exact integration depends on the existing structure — read the file first. Pattern to follow:

```tsx
// In src/modules/rails/ui/rail-editor.tsx, add to the imports:
import { RailManifestTab } from "@/modules/manifests/ui/rail-manifest-tab"

// The component receives `railId`, `attachedManifests`, and `allManifests` from
// the parent server component (rail builder page). Update the parent server
// component (e.g., app/(app)/admin/rail-management/[railId]/page.tsx or wherever
// the RailEditor is loaded) to fetch:
//   const attached = await getRailManifests(railId)
//   const allManifests = await listManifestsForOrg(orgId)
// and pass them into RailEditor.

// Inside the existing tabs:
<TabsList>
  <TabsTrigger value="steps">Steps</TabsTrigger>
  <TabsTrigger value="manifests">Manifests</TabsTrigger>
</TabsList>
<TabsContent value="steps">{/* existing steps panel */}</TabsContent>
<TabsContent value="manifests">
  <RailManifestTab
    railId={railId}
    attached={attachedManifests}
    allManifests={allManifests}
  />
</TabsContent>
```

> Read the existing `rail-editor.tsx` before editing — adjust prop names and the surrounding shell to match. If it doesn't already use shadcn `Tabs`, use whatever tab primitive is in use elsewhere in the rail UI.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Browser smoke test**

In rail builder, open Manifest tab. Empty state. Click + Add Manifest. Picker shows. Select your test manifest. Tab updates with attachment. Click X → detach confirm. Confirm. Tab clears.

- [ ] **Step 5: Commit**

```bash
git add src/modules/manifests/ui/rail-manifest-tab.tsx src/modules/rails/ui/rail-editor.tsx
git commit -m "$(cat <<'EOF'
feat(manifests): rail builder Manifest tab — attach, reorder, detach

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Required-fields config inside Task / Approval node dialogs

**Files:**

- Create: `src/modules/manifests/ui/required-fields-config.tsx`
- Modify: `src/modules/rails/ui/task-node-dialog.tsx`
- Modify: `src/modules/rails/ui/approval-dialog.tsx`

- [ ] **Step 1: Build the required-fields config component**

```tsx
// src/modules/manifests/ui/required-fields-config.tsx
"use client"

import type { Manifest } from "../schema"
import type { RailNodeRequiredManifestField } from "@/modules/rails/schema"
import { Label } from "@/components/ui/label"

interface Props {
  attachedManifests: Manifest[]
  value: RailNodeRequiredManifestField[]
  onChange: (next: RailNodeRequiredManifestField[]) => void
}

export function RequiredFieldsConfig({ attachedManifests, value, onChange }: Props) {
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
      <p className="text-muted-foreground text-sm">
        No manifests attached to this rail. Attach one in the Manifest tab to configure required
        fields.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <Label>Required manifest fields</Label>
      <p className="text-muted-foreground text-xs">
        This cycle cannot complete until each checked field has a value.
      </p>
      {attachedManifests.map((m) => (
        <div key={m.id} className="rounded border p-2">
          <div className="mb-1 text-sm font-medium">{m.name}</div>
          {(m.fields ?? []).length === 0 ? (
            <p className="text-muted-foreground text-xs">No fields in this manifest yet.</p>
          ) : (
            <div className="space-y-1">
              {(m.fields ?? []).map((f) => {
                const checked = value.some((v) => v.manifestId === m.id && v.fieldSlug === f.key)
                return (
                  <label key={f.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={checked} onChange={() => toggle(m.id, f.key)} />
                    {f.label}
                    <span className="text-muted-foreground text-xs">({f.key})</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire into task-node-dialog.tsx**

Open `src/modules/rails/ui/task-node-dialog.tsx`. Add the imports:

```typescript
import { RequiredFieldsConfig } from "@/modules/manifests/ui/required-fields-config"
import type { Manifest } from "@/modules/manifests/schema"
import type { RailNodeRequiredManifestField } from "@/modules/rails/schema"
import { setNodeRequiredFields } from "@/modules/manifests/actions"
import { useAction } from "next-safe-action/hooks"
```

Add to the dialog's props (the parent server-component must pass `attachedManifests` for the rail):

```typescript
attachedManifests: Manifest[]
```

Add state for the required slugs:

```tsx
const [required, setRequired] = useState<RailNodeRequiredManifestField[]>(
  node.requiredManifestFieldSlugs ?? [],
)
const setRequiredAction = useAction(setNodeRequiredFields)
```

Render the section in the dialog body (near the existing checklist/tools-links sections):

```tsx
<RequiredFieldsConfig
  attachedManifests={attachedManifests}
  value={required}
  onChange={setRequired}
/>
```

In the dialog's Save handler, call:

```tsx
setRequiredAction.execute({ railNodeId: node.id, required })
```

(In sequence with the existing save logic. If the existing save action already handles all node fields, extend it to also accept `requiredManifestFieldSlugs` rather than calling the dedicated action.)

- [ ] **Step 3: Mirror the same wiring in approval-dialog.tsx**

The approval dialog follows the same shape — apply the same imports, state, render, and save call as in task-node-dialog.tsx.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Browser smoke test**

In rail builder, attach a manifest with 2-3 fields. Click a Task node. The dialog should show the Required fields section listing those fields. Check one. Save. Reload — the checkbox state persists.

- [ ] **Step 6: Commit**

```bash
git add src/modules/manifests/ui/required-fields-config.tsx src/modules/rails/ui/task-node-dialog.tsx src/modules/rails/ui/approval-dialog.tsx
git commit -m "$(cat <<'EOF'
feat(rails): per-node required-manifest-fields config

Task and Approval node dialogs gain a checkbox list scoped to manifests
attached to the parent rail. Stored on rail_nodes.required_manifest_field_slugs.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase E — Runtime: Rail run init + Cycle Detail

### Task 17: Rail run initialization seeds rail_run_manifests rows

**Files:**

- Modify: `src/modules/rail-runs/actions.ts` (or wherever `createRailRun` / equivalent lives)

- [ ] **Step 1: Identify where rail runs are created**

Run: `grep -n "insert(railRuns)" src/modules/rail-runs/actions.ts`
Expected: a `db.insert(railRuns)` call inside the action that issues a new run.

- [ ] **Step 2: Add seeding immediately after the rail-run insert**

Inside that action, after the new rail run row is inserted (and you have its `id`), call:

```typescript
import { ensureRailRunManifestRows } from "@/modules/manifests/queries"

// ...inside the action, after the rail_runs insert:
await ensureRailRunManifestRows(newRailRunId)
```

> If the action isn't the only place rail runs are created (e.g., sub_flow auto-spawn), repeat this call there too. Search for `insert(railRuns)` across the repo to be sure.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/rail-runs/actions.ts
git commit -m "$(cat <<'EOF'
feat(rail-runs): seed rail_run_manifests rows on run creation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: Mark Complete required-field gate

**Files:**

- Modify: `src/modules/rail-runs/actions.ts`

- [ ] **Step 1: Find the cycle-advance / mark-complete action**

Open `src/modules/rail-runs/actions.ts`. Find the action that completes a cycle and advances the rail run (likely `completeCycle`, `advanceRailRun`, or similar).

- [ ] **Step 2: Add the required-field check before the advance succeeds**

Inside the action, after loading the current rail node and before persisting completion:

```typescript
import { railRunManifests } from "@/modules/manifests/schema"
import { railNodes } from "@/modules/rails/schema"

// Inside the cycle-complete action:
const [node] = await ctx.db
  .select({ requiredManifestFieldSlugs: railNodes.requiredManifestFieldSlugs })
  .from(railNodes)
  .where(eq(railNodes.id, currentNodeId))
  .limit(1)

const requirements = node?.requiredManifestFieldSlugs ?? []

if (requirements.length > 0) {
  const runRows = await ctx.db
    .select()
    .from(railRunManifests)
    .where(eq(railRunManifests.railRunId, railRunId))

  const dataByManifest = new Map(runRows.map((r) => [r.manifestId, r.data ?? {}]))
  const missing: typeof requirements = []
  for (const req of requirements) {
    const data = dataByManifest.get(req.manifestId) as Record<string, unknown> | undefined
    if (!data) continue // stale ref — manifest no longer attached, skip
    const v = data[req.fieldSlug]
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
    if (empty) missing.push(req)
  }

  if (missing.length > 0) {
    throw new ActionError(
      "REQUIRED_FIELDS_MISSING",
      `Fill required manifest fields to advance: ${missing.map((m) => m.fieldSlug).join(", ")}.`,
    )
  }
}
```

> If the action's existing imports don't include `eq` or `ActionError`, add them. The exact variable names (`currentNodeId`, `railRunId`) depend on the existing action's signature — match what's already there.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/rail-runs/actions.ts
git commit -m "$(cat <<'EOF'
feat(rail-runs): cycle advance checks required manifest fields

Stale slug references (manifest detached or field removed) are silently
ignored — only currently-attached manifest fields gate the advance.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: Cycle Detail manifest panel

**Files:**

- Create: `src/modules/manifests/ui/cycle-manifest-panel.tsx`
- Modify: `app/(app)/my-actions/[cycleId]/page.tsx`

- [ ] **Step 1: Build the cycle-side panel**

```tsx
// src/modules/manifests/ui/cycle-manifest-panel.tsx
"use client"

import { ChevronDown, ChevronRight, Lock, Unlock } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { updateRunManifestData } from "../actions"
import type { Manifest, RailRunManifest } from "../schema"
import type { RailNodeRequiredManifestField } from "@/modules/rails/schema"
import { Button } from "@/components/ui/button"
import { FieldRenderer } from "./field-renderer"

interface RunManifestRow {
  runRow: RailRunManifest
  manifest: Manifest
}

interface Props {
  railRunId: string
  rows: RunManifestRow[]
  /** Required slugs for the CURRENT cycle's node — only these get the red asterisk. */
  requiredForCycle: RailNodeRequiredManifestField[]
}

export function CycleManifestPanel({ railRunId, rows, requiredForCycle }: Props) {
  const [locked, setLocked] = useState(false)

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Manifest</h3>
        <Button variant="ghost" size="sm" onClick={() => setLocked((l) => !l)}>
          {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          <span className="ml-1 text-xs">{locked ? "Locked" : "Editable"}</span>
        </Button>
      </div>
      {rows.map((row) => (
        <ManifestSection
          key={row.runRow.id}
          railRunId={railRunId}
          row={row}
          requiredForCycle={requiredForCycle}
          locked={locked}
        />
      ))}
    </div>
  )
}

interface SectionProps {
  railRunId: string
  row: RunManifestRow
  requiredForCycle: RailNodeRequiredManifestField[]
  locked: boolean
}

function ManifestSection({ railRunId, row, requiredForCycle, locked }: SectionProps) {
  const cycleRequired = requiredForCycle.filter((r) => r.manifestId === row.manifest.id)
  const requiredSlugs = new Set(cycleRequired.map((r) => r.fieldSlug))
  const [open, setOpen] = useState(cycleRequired.length > 0)
  const [data, setData] = useState<Record<string, unknown>>(
    (row.runRow.data as Record<string, unknown>) ?? {},
  )

  const saveAction = useAction(updateRunManifestData)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef<Set<string>>(new Set())

  function handleChange(slug: string, value: unknown) {
    setData((d) => ({ ...d, [slug]: value }))
    dirtyRef.current.add(slug)
  }

  function flush() {
    if (dirtyRef.current.size === 0) return
    const patch: Record<string, unknown> = {}
    for (const slug of dirtyRef.current) patch[slug] = data[slug]
    saveAction.execute({
      railRunId,
      manifestId: row.manifest.id,
      data: patch,
    })
    dirtyRef.current = new Set()
  }

  useEffect(() => {
    if (dirtyRef.current.size === 0) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(flush, 750)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // intentionally re-run on every keystroke to refresh the timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const fields = row.manifest.fields ?? []

  return (
    <div className="rounded border">
      <button
        className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {row.manifest.name}
        {cycleRequired.length > 0 && (
          <span className="bg-destructive/10 text-destructive ml-auto rounded px-2 py-0.5 text-xs">
            {cycleRequired.length} required
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t p-3">
          {fields.map((f) => (
            <FieldRenderer
              key={f.key}
              field={f}
              value={data[f.key]}
              onChange={(v) => handleChange(f.key, v)}
              disabled={locked}
              isRequired={requiredSlugs.has(f.key)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Read the cycle detail page to find where to insert it**

Run: `head -100 app/\(app\)/my-actions/\[cycleId\]/page.tsx`
Read the structure. Identify where the cycle's task body / SOP / checklist lives.

- [ ] **Step 3: Wire the panel into the page**

In `app/(app)/my-actions/[cycleId]/page.tsx`:

- Add imports:
  ```tsx
  import { ensureRailRunManifestRows, getRailRunManifests } from "@/modules/manifests/queries"
  import { CycleManifestPanel } from "@/modules/manifests/ui/cycle-manifest-panel"
  ```
- After loading the cycle (which knows the rail-run ID and current node ID):
  ```tsx
  await ensureRailRunManifestRows(cycle.railRunId)
  const manifestRows = await getRailRunManifests(cycle.railRunId)
  const requiredForCycle = currentNode?.requiredManifestFieldSlugs ?? []
  ```
- Render below the existing cycle body:
  ```tsx
  <CycleManifestPanel
    railRunId={cycle.railRunId}
    rows={manifestRows}
    requiredForCycle={requiredForCycle}
  />
  ```

> The exact prop names (`cycle.railRunId`, `currentNode.requiredManifestFieldSlugs`) depend on the existing data shape — adjust to match what the page already loads.

- [ ] **Step 4: Browser smoke test**

Run dev server. Sign in. Issue a cycle for a rail with a manifest attached. Open My Actions → click the cycle. The Manifest panel should appear below the cycle body. Type into a text field. Wait ~1 second — autosave fires (check network tab). Reload — value persists.

Then, mark a field required on the Task node. Click Mark Complete with the field empty — should fail with "Fill required manifest fields to advance." Fill the field. Click Mark Complete — succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/modules/manifests/ui/cycle-manifest-panel.tsx app/\(app\)/my-actions/\[cycleId\]/page.tsx
git commit -m "$(cat <<'EOF'
feat(manifests): cycle detail manifest panel with autosave

Per-cycle required fields highlighted with red asterisk; lock toggle
guards accidental edits; autosave debounced 750ms; data updates
diffed and audit-logged via updateRunManifestData.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase F — Permissions, plumbing, tests

### Task 20: "Can build manifests" permission

**Files:**

- Modify: `src/modules/auth/permissions.ts` (or wherever the per-user permissions are defined)

- [ ] **Step 1: Find the existing permissions module**

Run: `grep -rn "canBuildRails\|canManageOrg\|permissions" src/modules/auth/ | head -20`
Expected: A file (likely `src/modules/auth/permissions.ts` or similar) defining a permissions schema or constants.

- [ ] **Step 2: Add the new permission flag**

Add `canBuildManifests` alongside the existing flags. Mirror the existing pattern exactly (same Zod schema entry, same default for Members/Admins/Owners). Default OFF for Members, ON for Admins, always ON for Owners.

- [ ] **Step 3: Gate the manifest-management routes**

Add a permission check in:

- `app/(app)/admin/manifest-management/page.tsx`
- `app/(app)/admin/manifest-management/[manifestId]/page.tsx`

Mirror the gate used in other Admin routes (whatever Rail Management uses for `canBuildRails`). If a member without permission visits, redirect or show "You don't have permission" using the existing pattern.

> If permissions wiring isn't fleshed out in the codebase yet, gate the routes on the user's role (Admin or Owner) for V1 — and add a TODO comment pointing to the per-user permissions feature.

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm typecheck`
Expected: PASS

```bash
git add src/modules/auth/permissions.ts app/\(app\)/admin/manifest-management/
git commit -m "$(cat <<'EOF'
feat(auth): canBuildManifests permission + route gates

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: Per-module list updates (reset-db + purge cron)

**Files:**

- Modify: `tests/e2e/helpers/reset-db.ts`
- Modify: `app/api/jobs/cron/purge-deleted/route.ts`

- [ ] **Step 1: Append the new tables to TABLES_TO_TRUNCATE**

Open `tests/e2e/helpers/reset-db.ts`. Find the `TABLES_TO_TRUNCATE` array. Append:

```typescript
"rail_run_manifests",
"rail_manifests",
"manifests",
```

Order matters — child tables before parent tables, so `rail_run_manifests` (child of manifests + rail_runs) before `rail_manifests` before `manifests`.

- [ ] **Step 2: Add a delete loop for manifests in the purge cron**

Open `app/api/jobs/cron/purge-deleted/route.ts`. Mirror the existing `items` block:

```typescript
import { manifests } from "@/modules/manifests/schema"

// ...inside the route's per-table delete sequence:
const manifestRes = await db
  .delete(manifests)
  .where(and(isNotNull(manifests.deletedAt), lt(manifests.deletedAt, cutoff)))
  .limit(BATCH_LIMIT) // if the existing pattern uses limit
```

(Use exactly whichever syntax the items block uses.)

- [ ] **Step 3: Run integration tests to confirm reset-db still works**

Run: `pnpm test:integration`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers/reset-db.ts app/api/jobs/cron/purge-deleted/route.ts
git commit -m "$(cat <<'EOF'
chore: register manifests tables in reset-db + purge-deleted

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: Integration tests

**Files:**

- Create: `tests/integration/manifests.test.ts`

- [ ] **Step 1: Write the integration test suite**

```typescript
// tests/integration/manifests.test.ts
import { describe, expect, it, beforeEach } from "vitest"
import { createId } from "@paralleldrive/cuid2"
import { eq } from "drizzle-orm"
import { withTestTransaction, type TestContext } from "@/tests/integration/helpers"
import {
  attachManifestToRail,
  createManifest,
  deleteManifest,
  detachManifestFromRail,
  setNodeRequiredFields,
  updateManifest,
  updateRunManifestData,
} from "@/modules/manifests/actions"
import { manifests, railManifests, railRunManifests } from "@/modules/manifests/schema"
import { ensureRailRunManifestRows } from "@/modules/manifests/queries"

// The exact bootstrapping helpers (createTestOrg, createTestUser, createTestRail,
// createTestRailRun, callAction) depend on this repo's existing integration
// test scaffolding. Mirror the imports from another integration test like
// tests/integration/items.test.ts before filling in.

describe("manifests module", () => {
  it("creates and lists manifests", async () => {
    await withTestTransaction(async (ctx: TestContext) => {
      const result = await ctx.callAction(createManifest, {
        name: "Closing Documents",
        description: "Sales closing artifacts",
        tags: ["sales"],
      })
      expect(result?.data?.id).toBeDefined()

      const rows = await ctx.db
        .select()
        .from(manifests)
        .where(eq(manifests.organizationId, ctx.org.id))
      expect(rows).toHaveLength(1)
      expect(rows[0]!.name).toBe("Closing Documents")
    })
  })

  it("attaches a manifest to a rail and creates run rows on run init", async () => {
    await withTestTransaction(async (ctx: TestContext) => {
      const m = await ctx.callAction(createManifest, { name: "M", tags: [] })
      const manifestId = m!.data!.id
      const rail = await ctx.createTestRail()
      await ctx.callAction(attachManifestToRail, { railId: rail.id, manifestId })

      const run = await ctx.createTestRailRun({ railId: rail.id })
      await ensureRailRunManifestRows(run.id)

      const runRows = await ctx.db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.railRunId, run.id))
      expect(runRows).toHaveLength(1)
      expect(runRows[0]!.manifestId).toBe(manifestId)
    })
  })

  it("writes run data and audits the diff", async () => {
    await withTestTransaction(async (ctx: TestContext) => {
      const m = await ctx.callAction(createManifest, { name: "M", tags: [] })
      const manifestId = m!.data!.id
      await ctx.callAction(updateManifest, {
        id: manifestId,
        fields: [
          {
            key: "lead_name",
            label: "Lead Name",
            type: "text",
            position: 0,
            required: false,
            readOnly: false,
          },
        ],
      })
      const rail = await ctx.createTestRail()
      await ctx.callAction(attachManifestToRail, { railId: rail.id, manifestId })
      const run = await ctx.createTestRailRun({ railId: rail.id })
      await ensureRailRunManifestRows(run.id)

      await ctx.callAction(updateRunManifestData, {
        railRunId: run.id,
        manifestId,
        data: { lead_name: "Sage" },
      })

      const [row] = await ctx.db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.railRunId, run.id))
      expect(row?.data).toMatchObject({ lead_name: "Sage" })
    })
  })

  it("refuses deletion when the manifest is in use", async () => {
    await withTestTransaction(async (ctx: TestContext) => {
      const m = await ctx.callAction(createManifest, { name: "M", tags: [] })
      const manifestId = m!.data!.id
      const rail = await ctx.createTestRail()
      await ctx.callAction(attachManifestToRail, { railId: rail.id, manifestId })

      const result = await ctx.callAction(deleteManifest, { id: manifestId })
      expect(result?.serverError).toContain("Cannot delete")
    })
  })

  it("preserves run data when a manifest is detached", async () => {
    await withTestTransaction(async (ctx: TestContext) => {
      const m = await ctx.callAction(createManifest, { name: "M", tags: [] })
      const manifestId = m!.data!.id
      await ctx.callAction(updateManifest, {
        id: manifestId,
        fields: [
          {
            key: "x",
            label: "X",
            type: "text",
            position: 0,
            required: false,
            readOnly: false,
          },
        ],
      })
      const rail = await ctx.createTestRail()
      await ctx.callAction(attachManifestToRail, { railId: rail.id, manifestId })
      const run = await ctx.createTestRailRun({ railId: rail.id })
      await ensureRailRunManifestRows(run.id)
      await ctx.callAction(updateRunManifestData, {
        railRunId: run.id,
        manifestId,
        data: { x: "saved" },
      })

      await ctx.callAction(detachManifestFromRail, { railId: rail.id, manifestId })

      const [row] = await ctx.db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.railRunId, run.id))
      expect(row?.data).toMatchObject({ x: "saved" })

      const attachments = await ctx.db
        .select()
        .from(railManifests)
        .where(eq(railManifests.railId, rail.id))
      expect(attachments).toHaveLength(0)
    })
  })

  it("refuses cross-org reads", async () => {
    await withTestTransaction(async (ctx: TestContext) => {
      const m = await ctx.callAction(createManifest, { name: "MyOrg M", tags: [] })
      const manifestId = m!.data!.id

      const otherCtx = await ctx.makeOtherOrgContext()
      const result = await otherCtx.callAction(updateManifest, {
        id: manifestId,
        name: "Hijack",
      })
      expect(result?.serverError).toContain("not found")
    })
  })
})
```

> The `withTestTransaction` / `TestContext` helpers are placeholders — read `tests/integration/items.test.ts` (or whatever existing integration test exists) to find the actual helper names in this codebase. Replace the imports + scaffolding accordingly. Each test must run with `orgAction` properly bootstrapped (org + member + session).

- [ ] **Step 2: Run integration tests**

Run: `pnpm test:integration`
Expected: PASS

If failures arise:

- Mismatch with helper API → adjust to existing helpers (read items.test.ts or any sibling integration test)
- FK constraint violations → confirm rail_runs / rails seeded properly in helpers
- "Manifest field deletion" test missing — add a test case mirroring "refuses deletion when in use" but for a Task node referencing the field via setNodeRequiredFields

- [ ] **Step 3: Commit**

```bash
git add tests/integration/manifests.test.ts
git commit -m "$(cat <<'EOF'
test(manifests): integration tests for CRUD, rail attachment, run data, deletion refusal, detach preservation, cross-org isolation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 23: E2E golden path test

**Files:**

- Create: `tests/e2e/manifests.spec.ts`

- [ ] **Step 1: Write the e2e spec**

```typescript
// tests/e2e/manifests.spec.ts
import { expect, test } from "@playwright/test"
import { signInAsAdmin } from "./helpers/auth"
import { resetDb } from "./helpers/reset-db"

test.beforeEach(async () => {
  await resetDb()
})

test("admin builds a manifest, attaches it to a rail, fills it on a cycle", async ({ page }) => {
  await signInAsAdmin(page)

  // 1. Build the manifest
  await page.goto("/admin/manifest-management")
  await page.getByRole("button", { name: "+ New Manifest" }).click()
  await page.getByLabel("Manifest Name").fill("Closing Documents")
  await page.getByLabel("Description (Optional)").fill("Test manifest")
  await page.getByRole("button", { name: "Create Manifest" }).click()

  // Should redirect to builder
  await expect(page).toHaveURL(/\/admin\/manifest-management\/[^/]+/)

  // Add fields by clicking palette items
  await page.getByRole("button", { name: "Text Input" }).click()
  await page.getByRole("button", { name: "Yes / No" }).click()

  // Edit first field's label and mark required
  await page.locator('[data-testid="canvas-field"]').first().click()
  await page.getByLabel("Label").fill("Lead Name")
  await page.getByLabel("Required").click()

  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Unsaved changes")).toHaveCount(0)

  // 2. Attach to a rail (helper required: createTestRailViaUI or seed)
  // For V1, this part of the test is env-dependent — use whichever rail
  // exists in your seeded test data. Adjust the URL below.
  // await page.goto("/admin/rail-management/<test-rail-id>")
  // await page.getByRole("tab", { name: "Manifests" }).click()
  // await page.getByRole("button", { name: "+ Add Manifest" }).click()
  // await page.getByText("Closing Documents").click()

  // 3. Issue an order on that rail and verify the manifest panel appears
  // (depends on existing e2e helpers for issuing an order)
  // ... full golden path, see test plan in spec §8.2

  // For V1, scope the e2e to (1) — building a manifest end-to-end via UI.
  // Add (2) and (3) as separate tests once the rail-management e2e helpers
  // are firmer.
})
```

> The full three-step e2e (build → attach → fill on cycle) requires existing e2e helpers for rail issuance. If those don't exist or aren't easily reusable, scope this V1 test to the build-the-manifest step. The remaining two stages can be added incrementally; the integration tests in Task 22 already cover the full data flow.

- [ ] **Step 2: Run the e2e**

Run: `pnpm test:e2e -- manifests`
Expected: PASS for the build-the-manifest portion. If you've also wired the attach/fill stages, those should pass too.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/manifests.spec.ts
git commit -m "$(cat <<'EOF'
test(manifests): e2e build-and-save golden path

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 24: Module README + final tier-2 verify

**Files:**

- Create: `src/modules/manifests/README.md`

- [ ] **Step 1: Write the module README**

```markdown
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
```

- [ ] **Step 2: Run full tier-2 verification**

Run: `pnpm verify --tier=2`
Expected: typecheck + lint + check-actions + unit + integration + build all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/manifests/README.md
git commit -m "$(cat <<'EOF'
docs(manifests): module README

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Done

The Manifest module is shipped. Verification:

1. `/admin/manifest-management` — list, create, build manifests with the 13 field types
2. Rail Builder Manifest tab — attach, reorder, detach (with data preservation)
3. Task / Approval node config — pick required fields per node
4. Cycle Detail — autosaving manifest panel, lock toggle, required-field gating on Mark Complete
5. Deletion / edit refusals working with friendly error messages
6. `pnpm verify --tier=2` green

Next roadmap item: Initialize / Manifest rail node types now unblocked.
