# rail-runs module

The conveyor belt itself. This is where Pathway's whole thesis becomes real:
work is _issued_ to Terminals, advances when complete, and cannot leave the
inbox without being done.

## Schema

- **`rail_runs`** — one execution of a Rail on a specific Particle. Bound at
  runtime to both via FK RESTRICT (Principle 0). status: `running` |
  `completed` | `cancelled`.
- **`cycles`** — issued tickets, one per Task step. Title / description /
  checklist / ideal_minutes are SNAPSHOTTED from the source rail_node so
  editing the rail mid-flight doesn't mutate live work. The Post assignment
  (post_id) is also frozen — but who currently holds that Post is resolved
  _live_ via post_assignments at query time, so a Post reassignment routes
  the cycle to the new holder(s) automatically.

## The routing primitive

`listMyActionCycles(orgId, userId)` joins:

```
cycles → post_assignments (live holder lookup) → posts → rail_runs → rails → particles
```

Filters: cycle is open (no completed_at / cancelled_at), post not soft-deleted,
user is one of the post's current holders. This is the My Actions inbox query
and the most-touched query in the runtime.

## The conveyor-belt transition

`completeCycle` is the single most important action in the app:

1. Verifies the user holds the cycle's Post.
2. Verifies all required checklist items are checked.
3. Stops any running work timer (rolls accumulated minutes forward).
4. Marks the cycle complete (completed_at, completed_by).
5. Finds the next Task node in the rail (by position).
6. If a next node exists → issues a new cycle for it (snapshotting the
   template). If not → marks the rail run complete.

This single function is "Particle advances to next Terminal." Everything else
in Pathway exists to make this moment correct.

## Three timers per cycle (kernel)

1. **Wall clock** (`issued_at`) — auto. UI displays "in your inbox for 1h 14m."
2. **Active work timer** — opt-in. User clicks Start → `timer_started_at` set;
   user clicks Stop → elapsed minutes added to `time_spent_minutes`,
   `timer_started_at` cleared. Multiple sessions accumulate.
3. **Ideal time** — copied from `rail_nodes.ideal_minutes` at issue. Displayed
   alongside actual to surface drift (red badge if over).

## Multi-holder routing

Posts can have multiple current holders (post_assignments). A cycle assigned to
a Post with three holders shows up in all three of their inboxes. Whoever
completes it first removes it from everyone's inbox; we record `completed_by`
so the audit trail is honest.

## Cancellation

`cancelRailRun` cascades: marks the run cancelled and cancels every open
cycle in it. Already-completed cycles are not touched. The reason is captured
in `cancellation_reason` for the audit trail.

## What's not yet here (post-kernel)

- Loop Back (sending a cycle back to a previous post with a written reason).
  Spec'd in `02_workspace.md` as accountability through UI.
- Force-cancel by manager / reassignment-mid-run.
- Timer history (we accumulate minutes; we don't keep a session log yet).
- Branching node types (Approval, Condition, Parallel, Sub-Flow, End) — they'll
  introduce the need for an edges table and conditional advancement logic.
- Compliance signal upstream (Principle 10) — when a cycle completes, fire a
  notification to whoever issued the rail run.
