# org-structure module

The org chart — the foundation of Pathway's routing system. Every Rail step is
assigned to a Post; every Cycle is issued to whoever holds that Post.

## Schema

- **`org_containers`** — Divisions, Departments, Sections, Units. Self-referential
  hierarchy via `parent_id`. The `level` column constrains nesting (a Section
  cannot live inside a Unit; enforced in `actions.ts` via `assertParentIsHigherLevel`).
- **`posts`** — positions held by an Employee (a `user`). `parent_container_id` is
  the container the post sits in (or `NULL` for floating posts). `user_id` is the
  current holder, or `NULL` for vacant.

## Critical query

`listPostsHeldByUser(orgId, userId)` is the routing primitive every downstream
module depends on (My Actions, cycle assignment). Don't break its semantics
without updating call sites.

## Conventions enforced

- Soft delete only (`deletedAt`/`deletedBy`).
- All mutations via `orgAction`.
- Every state-changing action calls `audit()`.
- `revalidatePath("/organization/structure")` after mutations.
- Container nesting validated server-side (`assertParentIsHigherLevel`).
- Post-to-org membership validated server-side (`assignPost` checks `member` table).

## Not yet implemented (deferred from kernel)

- Canvas-based drag/drop builder (Phase 7) — current UI is a nested list.
- `node_connections` table (manually drawn lines between nodes on the alpha canvas) —
  visual-only, not load-bearing for routing.
- Historical post assignments — current model only tracks the current holder.
  Audit log captures changes for now; first-class history can be added later
  (likely a `post_assignments` table).
