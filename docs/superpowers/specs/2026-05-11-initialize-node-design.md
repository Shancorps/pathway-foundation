# Initialize Rail Node — V1 Design

**Date:** 2026-05-11
**Status:** Approved (brainstorming → writing-plans)
**Depends on:** Manifest module V1 (on `feat/manifest-module`, awaiting Shancorps review)
**Scope:** A new `initialize` rail node type that gates the start of a rail run on operator-supplied data: required manifest fields and post-holder selections for multi-holder Posts. Optional per rail. Manual trigger only for V1; webhook/cascade triggers come later.

---

## 1. Purpose

Today, `startRail(railId, particleId)` is a single atomic step: a rail-run is created and the first cycle is issued. There is no human-input step in between. For some operations that is correct — pick a particle, click Start, work begins. For others it is not. The rail designer often needs the initiator to supply context before the rail proceeds:

- "What's the lead source?" (manifest pre-fill)
- "Of the three Sales Reps, who's owning this one?" (post-holder selection)
- "Which property is this contract attached to?" (particle data — deferred for V1)

Initialize is the **gatekeeper**. It sits between the trigger (manual today, webhook/cascade later) and the first Task cycle. Its single responsibility: validate that the rail has the data it needs to actually run, gathering it from the operator if not. If the gate fails, no rail-run is created.

The full product spec gives this kind of step its own canvas presence — a node, not an invisible config — so the rail's flow reads as `trigger → initialize → task → ... → end`.

---

## 2. Architecture

**One new rail node type, one new column on `rail_runs`.** No new module, no new tables.

- **Design time:** Initialize is a new entry in the `railNodeTypes` enum and a new variant in the `RailNodeConfig` discriminated union. Its config holds the list of manifest field slugs that must be filled at start. Post-holder slots are derived at runtime from the rail's node graph — not stored as design-time config.
- **Run time:** a new `rail_runs.post_holder_assignments` JSONB column (`Record<postId, userId>`) stores the operator's holder picks. Cycle issuance consults this map: if a cycle's `postId` is in the map, it goes to the assigned user; otherwise the existing all-holders behavior is preserved.
- **Manifest pre-fill** writes through to `rail_run_manifests.data` using the same shape and code path as the existing per-cycle manifest writes. No new manifest storage.

**Opt-in per rail.** A rail without an Initialize node behaves identically to today — single-call start, no modal, cycles route to all holders. Adding an Initialize node activates the gate.

**Always position 1.** Trigger is position 0. Initialize, if present, is position 1. The first Task is position 2+. Auto-snap on add: dropping Initialize anywhere on the canvas inserts it at position 1 regardless of where the designer drops it.

**Exactly zero or one.** A rail cannot have two Initialize nodes. Publish refuses; the palette tile disables when one already exists.

---

## 3. Schema

### 3.1 `rails/schema.ts`

Extend `railNodeTypes`:

```ts
export const railNodeTypes = [
  "trigger",
  "initialize",
  "task",
  "end",
  "approval",
  "statistic",
  "sub_flow",
] as const
```

Extend `RailNodeConfig`:

```ts
| {
    kind: "initialize"
    requiredManifestFieldSlugs: RailNodeRequiredManifestField[]  // reuse the shape from Task/Approval nodes — { manifestId, fieldSlug }[]
  }
```

No table-level changes — Initialize uses the existing `rail_nodes` row shape, just with a new `type` value and a new config variant.

### 3.2 `rail-runs/schema.ts`

Add one column to `railRuns`:

```ts
postHolderAssignments: jsonb("post_holder_assignments")
  .$type<Record<string, string>>()
  .notNull()
  .default({}),
```

Keys are `posts.id`, values are `user.id`. Empty `{}` is the default and means "no Initialize narrowed cycle routing for this run; use the existing all-holders fan-out."

### 3.3 Publish-time validation

The existing rail publish action (`rails/actions.ts`) gains two checks:

1. **At most one Initialize.** Multiple Initialize nodes → publish refused.
2. **Initialize is at position 1 if present.** Any other position → publish refused. (Auto-snap on add makes this unreachable from the UI; the check is defense-in-depth against direct API calls or future imports.)

Stale `requiredManifestFieldSlugs` (slugs pointing to fields that no longer exist on attached manifests) are **not** rejected at publish — same precedent as Task/Approval `requiredManifestFieldSlugs` in spec §5.4. They're silently ignored at runtime.

---

## 4. Builder UI

### 4.1 Palette

`rails/ui/rail-palette.tsx` currently lists Initialize under "Soon" / disabled. This work flips it to enabled. Drag → drop → auto-snap to position 1.

If the rail already has an Initialize node, the palette tile is disabled with a tooltip: "Only one Initialize per rail."

### 4.2 Initialize node card on canvas

Visually a node like Task or Approval — type badge, name, position. Default name: `"Initialize"`. No assignee Post (Initialize doesn't issue a cycle to anyone). No checklist, no tools links, no idealMinutes.

### 4.3 Initialize node dialog

Click the Initialize node → dialog opens. Modeled on `task-node-dialog.tsx`. Contents:

- **Name** input (editable, default `"Initialize"`)
- **Description** textarea (optional, designer's notes)
- **Required at start** section — the same `RequiredFieldsConfig` component built for Task/Approval nodes in Task 16, with a different label/header ("Required at start" instead of "Required to advance"). Reads/writes the Initialize node's `config.requiredManifestFieldSlugs` instead of the top-level `requiredManifestFieldSlugs` column.
- **Post-holder selection (read-only preview)** — informational panel listing every Post used anywhere on this rail. For each Post, shows current holders ("Sales Rep — Alice, Bob, Carol"). Explanatory text: "At run-start, the operator picks one of these for each Post that has multiple holders."

The `RequiredFieldsConfig` component picks up a small abstraction — pass a `label` prop so the two consumers (Task/Approval vs Initialize) show their own header text. No new component.

### 4.4 Save behavior

Standard — uses the existing `updateNode` action. Save disabled until changes. Initialize node included in the rail's existing publish lifecycle.

### 4.5 Deletion

Initialize node can be deleted via the same delete affordance as other nodes. If deleted with `requiredManifestFieldSlugs` populated, the config goes with the node. New rail starts revert to today's behavior (no gate, cycles to all holders, no manifest pre-fill).

---

## 5. Runtime UX

### 5.1 Prepare query (new)

`prepareStartRail(railId, particleId)` — server-only, read-only. Returns one of:

- `{ requiresInitialize: false }` — the rail has no Initialize node. Caller proceeds straight to `startRail` with no modal.
- `{ requiresInitialize: true, requirements: { manifestFields, multiHolderPosts } }` — the rail has Initialize. Caller opens the modal.

`requirements.manifestFields` is the resolved view of the Initialize node's `requiredManifestFieldSlugs` — each slug joined to its `ManifestFieldDef` so the modal can render label, type, options, etc. Grouped by `manifestId`.

`requirements.multiHolderPosts` is derived: for every distinct `postId` referenced by any node on the rail, look up `postAssignments`. If holder count > 1, include `{ postId, postTitle, holders: [{ userId, userName }, ...] }`. Posts with 0 or 1 holders are omitted (0 → cycle can't issue there anyway; 1 → auto-routes today, no operator choice needed).

### 5.2 Start Rail modal

A new client component in `rail-runs/ui/start-rail-modal.tsx`. Opens when `prepareStartRail` returned `requiresInitialize: true`. Contents:

- Header: "Start: {rail name} — {particle name}"
- **Post assignments** section — one picker (dropdown of holders) per multi-holder Post. All required.
- **Required information** section — the manifest fields rendered via the existing `FieldRenderer` from the manifests module. All required.
- Footer: Cancel + **Start Rail** (BlueprintButton, disabled until every required field and every picker has a value).

The particle is NOT re-asked — the operator already selected it on the previous screen. The modal trusts the inbound `particleId`.

### 5.3 Start action (extended)

`startRail` action input schema gains an optional `initializeData`:

```ts
initializeData?: {
  postHolderAssignments: Record<string, string>  // postId → userId
  manifestData: Record<string, Record<string, unknown>>  // manifestId → { slug → value }
}
```

Server-side validation:

- Load the rail's nodes. If an Initialize node exists:
  - `initializeData` must be present
  - Every multi-holder Post used by the rail must have an entry in `postHolderAssignments`
  - For each entry, the assigned `userId` must currently hold the Post in `postAssignments` (security check — prevents an operator from sending cycles to arbitrary org users)
  - Every slug in `initializeNode.config.requiredManifestFieldSlugs` must have a non-empty value in `initializeData.manifestData[manifestId]` for the slug's parent manifest
- If no Initialize node: `initializeData` is ignored (caller shouldn't send it, but server tolerates).

On valid input, the action runs atomically:

1. Insert `rail_runs` row (`status: "running"`, with `postHolderAssignments` from input)
2. `ensureRailRunManifestRows(runId)` (existing helper)
3. Apply `initializeData.manifestData` to the relevant `rail_run_manifests.data` rows
4. `audit(..., "rail_runs.started_with_initialize", { metadata: { filledSlugs, assignedPostHolders } })` — separate from existing `rail_runs.started` event so the timeline can show the gate explicitly
5. `advanceRun(ctx, run, 0)` walks from trigger → past Initialize (auto-passes; gate already cleared) → to first Task

### 5.4 Cycle issuance respects post assignments

The existing cycle-issuance logic in `rail-runs/actions.ts` (the place that decides which user(s) get a cycle for a given Post) reads the run's `postHolderAssignments`:

- If the cycle's `postId` is in the map → issue to that single `userId`
- Otherwise → existing fan-out to all holders of the Post

This is the single behavior change to the rail-runs runtime. Everything else is unchanged.

### 5.5 Initialize in the cycle timeline

The per-run timeline view shows Initialize node activity as a single audit entry:

> **Sage** initialized the rail at 9:14 AM
> Set Lead Source: Referral, Contact Phone: 555-0100
> Assigned Sales Rep: Bob

Matches the pattern used for trigger node activity today. Initialize doesn't issue a cycle, so it doesn't appear as a cycle row — just an audit entry.

### 5.6 Where the Start button lives

The existing Start Rail trigger UI (likely on a particle detail page or a "Start a rail" button somewhere) hooks in here. Pseudocode:

```ts
const prep = await prepareStartRail(railId, particleId)
if (prep.requiresInitialize) {
  openStartRailModal(prep.requirements) // submit → calls startRail with initializeData
} else {
  await startRail({ railId, particleId }) // existing one-call path
}
```

---

## 6. Permissions

- **Building/configuring Initialize:** existing "Can edit rails" permission. No new permission.
- **Starting a rail with Initialize:** existing rail-start permission. No new permission. The post-assignment security check (assigned user must actually hold the post) is per-action, not per-permission.

---

## 7. Code organization

No new module. Initialize lives in the existing files:

- `src/modules/rails/schema.ts` — type enum + config variant
- `src/modules/rails/ui/rail-palette.tsx` — flip Initialize from "Soon" to enabled
- `src/modules/rails/ui/initialize-node-dialog.tsx` (new) — config dialog, mirrors `task-node-dialog.tsx`
- `src/modules/rails/ui/rail-editor.tsx` — wire the dialog into the canvas node click handler
- `src/modules/rail-runs/schema.ts` — `post_holder_assignments` column
- `src/modules/rail-runs/queries.ts` — new `prepareStartRail` query
- `src/modules/rail-runs/actions.ts` — extend `startRail` input + validation + write paths; update cycle-issuance routing
- `src/modules/rail-runs/ui/start-rail-modal.tsx` (new) — operator-facing modal
- `src/modules/manifests/ui/required-fields-config.tsx` — accept a `label` prop so it can serve both consumers

Migration is purely additive: enum value added, one column added with default.

Per-module list updates (the PostToolUse hook reminds about these on schema edits):

- `tests/e2e/helpers/reset-db.ts` — no changes (no new tables)
- `app/api/jobs/cron/purge-deleted/route.ts` — no changes (no new soft-delete surfaces)

---

## 8. Testing

### 8.1 Integration tests — `tests/integration/initialize-node.test.ts`

- Start a rail WITHOUT Initialize → cycles go to all holders of multi-holder Posts (today's behavior preserved)
- Start a rail WITH Initialize, all data filled → run created; first cycle goes to the chosen holder only
- Start a rail WITH Initialize, missing a required manifest field → rejected with `VALIDATION` listing missing slugs
- Start a rail WITH Initialize, missing a post assignment for a multi-holder Post → rejected
- Start a rail WITH Initialize, assigned userId doesn't hold the post → rejected (`FORBIDDEN`)
- After successful start: `rail_run_manifests.data` contains the supplied values; `rail_runs.post_holder_assignments` contains the picks
- A later cycle on a single-holder Post routes correctly (no regression)
- Editing the Initialize node's `requiredManifestFieldSlugs` on a published rail with active in-flight runs → allowed; the change applies only to future starts; in-flight runs are unaffected
- Deleting the Initialize node from a rail → future starts skip the gate; existing in-flight runs unaffected
- Adding a second Initialize node → rejected at publish
- Publish with Initialize at a position other than 1 → rejected (defense-in-depth; UI auto-snaps so this shouldn't happen in practice)
- Sub-flow targeting a rail that has Initialize → rejected at publish (V1 limitation; see §9)

### 8.2 E2E test — `tests/e2e/initialize.spec.ts`

Golden path:

1. Designer opens a published rail, adds Initialize node from palette (auto-snaps to position 1)
2. Configures 2 required manifest fields, saves, re-publishes
3. Operator opens the particle detail page, clicks Start Rail → modal appears
4. Fills the 2 required fields + picks holders for any multi-holder Posts → submits
5. Page navigates to the rail run; first cycle is visible in My Actions for the chosen holder

### 8.3 Unit tests

- Auto-snap logic on Initialize add (helper that computes target position when a node is dropped)
- `prepareStartRail` derivation: given a rail's nodes + postAssignments, return the correct `multiHolderPosts` shape

### 8.4 Validation

`pnpm verify --tier=2` must pass before declaring complete.

---

## 9. Out of scope for V1

| Feature                                                                               | When                                                                                                     |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Particle data fill at start (filling missing required-on-particle-type fields inline) | Later — particle editing has its own flow                                                                |
| Rail variant selection at start                                                       | Future — rail variants don't exist as a concept yet                                                      |
| Webhook trigger payloads providing Initialize data                                    | When webhook trigger type lands                                                                          |
| Cascade trigger (one rail's end starts another) supplying Initialize data             | When cascade trigger lands                                                                               |
| Multiple Initialize nodes per rail                                                    | Probably never                                                                                           |
| Sub-flow auto-spawn into a rail with Initialize                                       | Future — needs sub-flow → child data-passing protocol; for V1, publish-time rejection with a clear error |
| Round-robin / workload-based holder assignment                                        | Future — Sage flagged this as a follow-up                                                                |
| Per-rail Initialize defaults ("always Alice for Sales Rep on this rail")              | Future preference                                                                                        |
| Re-prompting for Initialize data if a run pauses and resumes                          | Future — runs don't pause today                                                                          |
| Showing Initialize node activity beyond a single "started" audit entry                | Future polish                                                                                            |
| Reassigning a post-holder mid-run                                                     | Future — V1 falls back to "all current holders" if the assigned user becomes unavailable                 |

---

## 10. What this unblocks

Initialize is the foundation that future trigger types (webhook, cascade) layer on top of:

- **Webhook trigger** — when added, supplies Initialize data via payload; same server-side validation rejects malformed payloads.
- **Cascade trigger** — when added, supplies Initialize data by mapping from the previous rail's `rail_run_manifests` / particle data; same validation.
- **Initialize-aware sub-flow** — when added, parent rail can supply Initialize data to the child auto-spawn.
- **Round-robin / workload-balanced holder assignment** — extension to the post-holder section: instead of an operator picker, an algorithm chooses; same `post_holder_assignments` storage.

Each of these can be added without re-architecting Initialize itself.
