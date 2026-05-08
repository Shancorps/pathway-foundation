# rails module

Workflow blueprints. A Rail defines the path a Particle takes through Terminals
to be transformed step-by-step. Phase 4 will build the runtime (Rail Runs +
Cycles) on top of these definitions.

## Schema

- **`rails`** — name, description, status (`draft` | `published`), `published_at`,
  and the load-bearing `particle_type_id` FK that pins this Rail to one Particle
  Type at design time (Principle 0). FK is `RESTRICT` so a Type can't be
  hard-deleted while rails reference it.
- **`rail_nodes`** — the steps. `type` is `trigger` or `task` for the kernel.
  `post_id` references the Terminal a Task is performed at (NULL for trigger;
  RESTRICT FK so wired-in Posts can't be hard-deleted). `position` orders the
  nodes linearly within the rail. The trigger always sits at position 0.

The kernel intentionally uses **position-based linear ordering** instead of an
edges table. Branching node types (Condition, Parallel, Sub-Flow, etc.) will
come post-kernel and will introduce a proper `rail_edges` table and migrate
existing rails into it.

## Lifecycle

- **createRail** auto-creates the Trigger node — every rail has exactly one,
  and the user can never add or delete it.
- Editing nodes is blocked while `status = published`. `unpublishRail` flips it
  back to draft so the user can change things, then republish.
- **publishRail** validates: at least one Task, every Task has a `post_id`, and
  all referenced Posts are still alive in the org. A vacant Post is fine —
  Cycles will sit in the queue until someone is assigned to that Post.
- Soft-deleting a rail cascades soft-delete to its nodes; restoring undoes both.

## Critical query

`getRailWithNodes(orgId, railId)` returns the rail + ordered nodes in a single
shape. Phase 4 will use it to instantiate Rail Runs.

## Not yet implemented

- Canvas/drag-drop builder (Phase 7).
- Edges table for non-linear graphs (post-kernel, when branching nodes land).
- Rail tags, "who can start this rail" (Post gating), republish-with-changes
  ("has draft" badge from the alpha) — all later polish.
- Run-time logic. Rails currently just exist as definitions; Phase 4 wires them
  to the routing engine.
