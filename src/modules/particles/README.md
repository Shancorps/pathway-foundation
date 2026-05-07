# particles module

The cargo that flows through Rails. A Particle is the identifier of a real-world
thing being acted on (a Lead, a Client, a Property, a Car). Every Rail in
Pathway is bound to a Particle Type, and every Rail Run is bound to a Particle
Instance — see `00_overview.md` Principle 0.

## Schema

- **`particle_types`** — schema-per-Type. The `fields` jsonb column stores an
  array of `ParticleFieldDef` (`{ key, label, type, required, position, options? }`).
  Adding a field to a Type is a JSONB update, not a schema migration. `name_label`
  customizes what the primary identifier is called on the form (e.g. &ldquo;Address&rdquo;
  for Properties).
- **`particles`** — instances. Each carries its `particle_type_id`, a primary
  `name` (the display label), and `data: jsonb` containing the field values
  keyed by the type&rsquo;s field `key`s.

Both tables are soft-deleted. Deleting a Type cascades soft-delete to its
instances so they vanish from the UI together; the cron drains them later.

## Field types (V1)

7 types: `text`, `text_area`, `number`, `date`, `select`, `phone`, `email`. More
can be added (multi-select, file upload, address, related-particle, post,
currency) without a schema change — extend the `particleFieldTypes` enum and the
`validateAndCoerceData` switch in `actions.ts`.

## Validation

`validateAndCoerceData` in `actions.ts` is the gate. It:

1. Strips keys not declared in the Type&rsquo;s fields (silently — keeps `data` clean).
2. Throws `VALIDATION` on missing required fields.
3. Coerces obvious inputs (numbers from strings, dates from ISO strings).
4. Enforces `select` values against the option list.

## UI

Path A (button + modal). The drag-and-drop palette/canvas builder from the alpha
is a future swap-in — the data model is already final.

- `/particles` — Types index (grid of cards with field+instance counts)
- `/particles/[typeId]` — Instance list for that Type
- `/particles/[typeId]/edit` — Type editor (add/edit/reorder/delete fields)
- `/particles/[typeId]/new` — Create instance (dynamic form from Type schema)
- `/particles/[typeId]/[id]/edit` — Edit instance

## Not yet implemented

- Field key renaming (intentionally locked once a field is created — would
  orphan data in existing instances). Re-create the field if the key needs to
  change.
- Drag-and-drop field reorder UI (currently up/down arrows). Drag-and-drop is
  cosmetic; the action `reorderFields` is final.
- Promoted-to-sidebar Types (`show_in_sidebar` column exists; sidebar wiring
  comes when we add the Pathway-style nav groups).
- Bulk import / export.
