# Pathway — Admin Section

> Specs for the Admin nav group: Rail Management, Orders, Manifest Management, Statistics.

---

## SECTION: Rail Management

The Rail Management screen is the heart of Pathway. It's where rails are designed, built, published, monitored, archived, and cancelled. See `00_overview.md` for the Rail / Particle / Terminal vocabulary this depends on.

---

## SCREEN: Rail Management — List View

**PURPOSE:** Browse, search, create, and manage all rails in the organization.

**ROUTE:** `/admin/rail-management`

**ACCESS:** Admins. Members can be granted "Can build rails" via per-user checkboxes (see `00_overview.md` Section 4.3). Members with rail-building permission can construct rails as drafts; publishing requires Admin approval.

**PARENT NAV:** Admin → Rail Management

---

### LAYOUT

- **Header:** Breadcrumb (`ADMIN > RAIL MANAGEMENT`), screen title "Rails", subtitle "Design and orchestrate automation."
- **Top tabs (4):** Rail Management | Rail Activity | Archive | Cancelled
- **Top right:** "New Rail" button (orange)
- **Below tabs:** Search bar ("Search rails...") + "Filter by tag" dropdown + **+ New Folder** button + grid/list view toggle
- **Main area:** Rails organized into folders (or at the root level if not assigned to a folder), displayed as cards (or rows in list view)

---

### FOLDERS (applies to Rail Management list view)

The Rail Management list view supports **single-level folders** for organizing rails as the catalog grows. **The same folder mechanic is used in Manifest Management** — see the Manifest Management section later in this file for the canonical specification. Both screens share the same folder UX.

**Why folders exist on Rail Management:** A real company will have 30+ rails (Sales rails, HR rails, Delivery rails, Permitting rails, Client Issue rails, etc.). Without organization, the list view becomes a scroll-and-search exercise. Folders let admins group related rails by purpose.

**Folder behavior (mirrors Manifest Management):**

- Single level only — no nested folders in V1
- Folders are containers with a name and optional description
- Drag-and-drop rails between folders
- Rails not assigned to a folder live at the root level alongside the folder list
- Folder collapse/expand
- Search ignores folder boundaries
- Tags also ignore folder boundaries — filtering by tag returns matches from every folder
- Folders are org-wide (every Admin sees the same structure)
- Empty folders are allowed
- Delete folder prompts a choice: move contents to root, or move contents to another folder

See the Manifest Management section for the full folder specification — the behavior is identical here.

---

### TABS

#### Tab 1: Rail Management

**Purpose:** Build and publish rails.
**Content:** Cards/rows of all rail definitions in the org. Each card shows:

- Rail name
- Description (or "No description")
- Status badges: `Published`, `Has draft`, `Draft only`
- Node count (e.g. "7 nodes")
- Three-dot menu (TBD — likely Duplicate, Delete, Archive, Edit metadata)

---

#### Tab 2: Rail Activity

**Purpose:** Show every live rail run in the org and where each currently stands.

**Header summary (above the list):**

- Total live count (e.g. "6 live rails")
- Grouped pills by rail type, showing how many runs of each are live (e.g. "Monthly Ad Management Rail 5", "Client Upset Resolution Rail 1"). Clicking a pill filters the list to that rail type.

**Default view: Card list.** Each row shows:

- Particle + rail name (e.g. "ABC CORP — Monthly Ad Management Rail")
- Rail type indicator (icon)
- Current step position: "Step X of Y"
- Current terminal/post (e.g. "Creative Director")
- Current assignee (employee name, e.g. "Sage Epic")
- Last-activity timestamp ("1 day ago")
- Three-dot menu (per-row actions: cancel, reassign, view full detail — TBD)

**Click any row → opens Rail Run Detail page (see below).**

**Permission-based scoping (CRITICAL):**
The Rail Activity tab is scoped to the viewing user's hierarchy and permissions:

- **CEO / Owner / Admin** — sees every live rail in the entire organization
- **Division/Department head** — sees every live rail running through their division/department
- **Section/Unit lead** — sees rails currently at terminals under their area
- **Individual contributor** — sees only rails where they are the current assignee

This scoping is automatic based on the user's Post on the org chart and their permission level (granular permission system TBD).

**Scaling problem & Visual View (planned major feature):**
For high-permission users (CEO, COO), tile/list view does not scale — too many rails to scroll. Rail Activity needs a **Visual View** as an alternative display mode:

- Horizontal graphic resembling the rail builder layout, showing rails as connected sequences of spheres (each sphere = one cycle/node)
- Each sphere is colored by **time temperature** (see Ideal Time below) — green/cool when on-pace, gradient through yellow/orange to red as cycles approach or exceed their Ideal Time
- Bottlenecks, throttling, and long-running cycles become visible at a glance — the manager sees _where_ time is being lost across the org without reading individual rows
- Hovering or clicking a sphere reveals the underlying cycle details and links to the Rail Run Detail page
- View toggle in the top right of the Rail Activity tab (List ↔ Visual)

**Refresh model:** Visual View is **refresh-on-action / page-load**, not real-time animated. State updates when the user reloads or takes an action. This keeps it simple and efficient.

**"View Live" button:** A button on the Visual View that, when active, polls the backend at a short interval and updates the display, simulating real-time. Toggle on for active monitoring sessions; toggle off for static review. This gives the user the choice between "snapshot now" and "watch as it happens" without forcing constant polling on every viewer.

[TBD — exact polling interval, multi-rail stacking layout, filter behavior]

---

#### Tab 3: Archive (Rail Archive)

**Purpose:** Completed rails and their audit log — who did what and when.

**Empty state:** "No completed rails yet — Rails that run to completion will appear here with their full activity log."

**Populated state:** Card list, same format as Cancelled tab. Each row shows:

- Particle + rail name
- Rail type indicator
- Completion timestamp
- Click → opens Rail Run Detail page showing the full historical run including all time-temperature data preserved from when it was live

**Related (separate planned screen):** A **Particle History view** is planned as a separate screen — accessed by clicking on a Particle (not via this tab). Opens an expanded view showing every rail that Particle ran, every step in those rails, who worked on each step, how long each step took, and all attached files. This is different from the Archive tab, which is rail-run-centric. Particle History is particle-centric. To be spec'd later in the project.

---

#### Tab 4: Cancelled (Cancelled Rails)

**Purpose:** Rails stopped before completion, with the reason logged.

**Card list.** Each row shows:

- Particle + rail name (e.g. "ABC CORP — Lead to Closed Deal Rail")
- Rail type indicator (icon)
- "Cancelled X days ago"
- **Cancellation reason** — displayed inline below the row in a quote-style box (e.g. _"Client is actually a fraud."_). If no reason was provided, shows placeholder text _"No reason provided"_.
- **Delete button** (trash icon, right side) — permanently deletes the cancelled rail run record from the system. Confirmation modal required.
  - **Use case:** removing the historical memory of a rail run that should never have existed in the first place — accidental rail starts, fraudulent client particles, test runs that polluted the data, or genuine data-entry errors. Think of an invoice with an error in pen: you don't keep it on file forever, you destroy it once you're sure it's wrong.
  - The two-step flow (Cancelled tab first, then explicit Delete) is intentional: cancelled rails sit in the Cancelled tab so a manager can review them before deciding whether to permanently destroy the record. Cancelling moves the rail run _out of active_; deleting from this tab removes it _from history entirely_.
  - **Permission:** "Can delete cancelled rail runs from history" — checkbox-based, OFF by default for Members, ON for Admins. See `00_overview.md` Section 4.3 (Sensitive checkboxes).

**Click any row → opens Rail Run Detail page** showing the partial run history, where it was cancelled, by whom, and the reason.

**How a rail gets cancelled:** Cancellation happens via the **Cancel this run** action button on the Rail Run Detail page (see below). Clicking it prompts for a cancellation reason (free text, optional but encouraged) and moves the run to the Cancelled tab. **Authority to cancel** is org-chart-derived: any user above the cycle's current assignee in the org chart can cancel the run. Admins can always cancel any run. The "Can force-cancel rail runs" checkbox extends this to non-org-chart-related cancellations if granted.

---

## SCREEN: Rail Run Detail

**PURPOSE:** Universal detail view for a single rail run instance — opened when clicking any row in Rail Activity, Archive, or Cancelled. Shows the full lifecycle of one particle's journey through one rail.

**ROUTE:** `/admin/rail-management/runs/[run-id]`

**ACCESS:** Same permission scoping as Rail Activity tab — users see runs they have authority over.

**CONTENT:**

- **Header:** Particle name + rail name (e.g. "ABC CORP — Monthly Ad Management Rail"), current state badge (Live / Completed / Cancelled), back button
- **Simplified rail diagram (NOT a builder embed):**
  - A clean **horizontal left-to-right line of circles**, one circle per node in the rail
  - Each circle is colored by its state: completed (green), current (blue/active), upcoming (gray), looped-back (yellow), problem/overdue (red gradient per Time Temperature)
  - This is intentionally **simpler than the rail builder canvas** — it's an "eagle eye" overview for visual understanding, not a working dev tool. The user clicks a circle to drill into details.
  - Loop-backs show as small return arrows above the line connecting the looped circles
  - Completed circles display the time spent (e.g. "2.5h") below them
  - Hovering or clicking a circle reveals: assignee post + employee name, time spent, manifest fields captured at this cycle, any notes
- **Per-cycle expanded panel (opens when a circle is clicked):**
  - Time spent at this cycle (actual)
  - Ideal Time set on the node (target)
  - Time temperature color indicator
  - Assigned post + employee name who handled it
  - Loop-backs / re-entries (if any) with timestamps and reasons
  - Manifest field values captured at this cycle
  - Any notes/comments left on this cycle
- **Manifest panel** — full filled-in manifest data for this particle on this rail
- **Particle reference** — link to the particle's record (and to Particle History view when that screen exists)
- **Audit log** — chronological list of every state change, assignment, completion, loop-back, and cancellation event with timestamps and acting user
- **Cancellation details** (only on Cancelled runs) — who cancelled, when, reason

**Action buttons (top right of the screen):**

- **Cancel this run** — stops the rail mid-flow; prompts for cancellation reason; moves the run to the Cancelled tab
- **Reassign current step** — opens a picker to change who's handling the cycle right now (e.g. the assigned employee got sick, swap them out). Available only on the currently active cycle.
- **Nudge** — sends a soft escalation notification to the currently-assigned employee through the bell-icon notification system (see `00_overview.md`). The manager can optionally include a short note ("What's going on with this step?", "Client is asking, can you push this through today?"). The nudge appears in the employee's bell dropdown and links straight to the cycle. Used as the in-app alternative to texting/Slacking the employee. Logged in the audit trail.
- **Force advance** — manager override that pushes the particle to the next step even if VFP isn't met. Logged in the audit trail with the acting user. **Authority:** org-chart-derived (any user above the cycle's current assignee). The "Can override required fields on cycles" checkbox is required for force-advancing through unfilled required manifest fields specifically. See `00_overview.md` Section 4.
- **Edit manifest data** — opens the manifest data inline for direct editing (e.g. correct a typo on a phone number). Edits are logged in the audit trail.
- **Add comment / note** — leaves a comment on the run that other managers can read; appears in the audit log.
- **Export** — downloads the run history as PDF or CSV for legal, audit, or client-reporting purposes.
- **Migrate to another rail** — moves this specific particle to a different rail using the same per-particle "Resume rail at \_\_\_ step" dropdown as the Unpublish/Republish flows.
- **View particle history** — jumps to the Particle History view (when that screen exists; deferred).

**Permission-based visibility on action buttons:** which buttons appear depends on the viewing user's role and authority over the rail. Read-only viewers (e.g., users below the assignee in the org chart, or Partners) see the page but no action buttons. Managers (users above the assignee in the org chart) see action buttons relevant to their authority. Admins see all actions. See `00_overview.md` Section 4.2 for org-chart-derived authority rules.

---

### ELEMENTS — List view

- **"New Rail" button** (top right, orange)
  - TRIGGER: click
  - ACTION: opens **Create Rail** modal
  - **Create Rail modal contents:**
    - Title: "Create Rail"
    - **Name field** (text input, required) — the rail's display name
    - **Description field** (textarea, optional) — placeholder "Optional description"
    - **Cancel button** (left)
    - **Create button** (orange, right) — creates a new draft rail with the given name/description and opens the Rail Builder on a blank canvas (no preset nodes other than whatever the system places by default — likely an empty canvas the user populates)

- **Search bar** ("Search rails...")
  - TRIGGER: type
  - ACTION: filters rails by name match

- **"Filter by tag" dropdown**
  - TRIGGER: click
  - ACTION: opens tag picker; selecting a tag filters the rail list to rails with that tag
  - [TBD — how are tags assigned to rails? In the builder?]

- **Grid/list view toggle** (top right)
  - TRIGGER: click
  - ACTION: switches between card grid and table list view
  - Both views show the same rails with the same data — only the layout differs
  - **Section grouping (in both views):** Rails are grouped with **published rails on top** and **drafts at the bottom**, separated by a visual divider. This keeps the live, active rails prominent and the in-progress drafts visually distinct so users don't confuse the two.

- **Rail card (click)**
  - TRIGGER: click
  - ACTION: opens the rail in the builder
  - If the rail has a draft, opens in draft edit mode; otherwise opens in published view

- **Three-dot menu on rail card**
  - TRIGGER: click
  - ACTION: opens menu with the following actions:
    - **Run Rail** (▶ icon) — initiates the rail; opens the Start a Rail flow so the user can fill in required initial data (Initialize node requirements) and start a new particle on this rail. This is the manual trigger entry point.
    - **Open Builder** (pen icon) — opens the rail in the Rail Builder for structural editing of nodes, manifest, and connections
    - **Edit** (pencil icon) — opens a small modal to edit the rail's name and description only (not the structure)
    - **Duplicate Rail** — creates a full copy of the rail as a new draft, completely independent of the original. Use when piloting a new variant rather than evolving the existing rail.
    - **Delete** (red, trash icon) — deletes the rail
      - **Confirmation modal required** before deletion proceeds
      - **If in-flight particles exist on the rail:** the modal includes a sub-prompt asking what to do with them — options: (a) migrate them to another rail (picks target), or (b) leave them behind (orphaned/cancelled with reason "rail deleted")
      - If no in-flight particles exist, only the standard confirmation is shown

---

---

## SCREEN: Rail Builder

**PURPOSE:** Design, edit, preview, and publish a single rail. Node-based visual flow editor.

**ROUTE:** `/admin/rail-management/[rail-id]`

**ACCESS:** Admins (granular TBD)

**ENTERED FROM:** Clicking a rail card on the list view, or "New Rail" button.

---

### LAYOUT

- **Header:** Back arrow + rail name, status badge (`Published` / `Editing draft` / `Draft`), action buttons (Publish/Unpublish, Discard draft, Preview, three-dot menu, Save)
- **Left panel:** Tab toggle (Steps / Manifest)
  - **Steps tab:** Node palette grouped by category (Rail / Action / Tools)
  - **Manifest tab:** Manifest list for this rail (with "+ Add" button)
- **Main canvas:** Pannable, zoomable flow editor showing connected nodes
- **Right panel (context-sensitive):** Properties panel for the currently selected node
- **Bottom left of canvas:** Zoom controls (+, –, fit-to-screen, lock)

---

### NODE TYPES (left palette — Steps tab)

**CANONICAL SPEC LOCATION:** All node types, their palette tiles, property panels, validation rules, and V1/V1.5 scoping are specified in the **Node Property Panels** section at the end of this file (line ~1248 onward). That section is the authoritative reference.

**Summary of the palette structure** (full spec in Node Property Panels):

Three groups in the left palette, in this order:

**RAIL** (structural flow nodes — define shape of the rail)

- Trigger — Start the flow
- Initialize — Set required fields at start
- Task — Assign a task to an internal post (primary work node, ~90% of cycles)
- Condition — Branch the flow based on predicates (evaluated automatically)
- Parallel — Fork the flow; all branches must complete (no selection / assignment mode)
- End — Terminate the rail

**ACTION** (nodes that do something at a step)

- Approval — Require a human sign-off
- Statistic — Dedicated stat-capture step
- Sub-Flow — Invoke another published rail
- Program Node (V1, not yet built) — Spawn a dynamic Program inline
- Client Task (V1, not yet built) — External client action + internal responsible post
- Vendor Task (V1, not yet built) — External vendor work + internal responsible post

**TOOLS** (external integrations — V1 stubs only)

- Agent — LLM invocation (V1.5 full implementation)
- Integration — HTTP request / webhook (V1.5 full implementation)

**REMOVED:** The "Manifest" node type that appears in some screenshots is being removed. Manifests are attached to the rail (via the Manifest tab on the left panel), not placed as nodes on the canvas. See Node Property Panels section.

See the Node Property Panels section for each node's full palette tile, property panel, runtime behavior, validation rules, and V1 vs V1.5 scoping. Do NOT duplicate the spec here — that section is canonical.

---

### ELEMENTS — Top bar

- **Back arrow** (top left)
  - TRIGGER: click
  - ACTION: returns to Rail Management list view
  - EDGE CASE: prompts confirmation if there are unsaved changes

- **Rail name** (header)
  - Editable inline — click the name to enter edit mode, type to change, click away or press Enter to save

- **Status badge** (`Published` / `Editing draft` / `Draft`)
  - Visual only

- **Publish / Unpublish button**
  - On a draft: shows "Publish"
    - TRIGGER: click
    - ACTION: makes the rail available company-wide; users can now use it
    - If publishing a draft of an existing rail with active particles → opens **Migration Prompt** modal (see Rail Lifecycle below)
  - On a published rail: shows "Unpublish"
    - TRIGGER: click
    - ACTION: removes the rail from company-wide availability
    - If active particles exist → opens **Unpublish Prompt** modal (see Rail Lifecycle below)

- **Discard draft button** (when editing a draft of a published rail)
  - TRIGGER: click
  - ACTION: prompts confirmation; on confirm, deletes the draft and reverts to the published version

- **Preview button**
  - TRIGGER: click
  - ACTION: opens Preview Mode (see below)

- **Three-dot menu** (top bar)
  - TRIGGER: click
  - ACTION: opens menu with the following options:
    - **Rail Settings** — opens the Rail Settings panel on the right side of the canvas (see below)
    - **Restore default layout** — resets all node positions on the canvas to the system's auto-layout (top-to-bottom flow, evenly spaced). Useful when manual repositioning has gotten messy.

- **"[N] Issues" indicator** — DEV-ONLY ARTIFACT
  - The red "Issues" badge visible in some screenshots is a local dev pop-up from the vibe-code environment. It is NOT a feature of the actual Pathway app. Do not implement this.

---

### RAIL VALIDATION (publish-time, non-real-time)

The rail builder runs validation checks on the draft, but **only when the user attempts to Publish** — never in real time as they edit. This avoids nagging the user during construction and only enforces correctness at the moment that matters.

**Validation behavior:**

- **Trigger:** clicking the Publish button. If the rail has any validation issues, publish is blocked and a validation panel surfaces.
- **Validation panel UI:** floating tile in the bottom corner of the builder canvas (similar position to the dev-only Issues badge in the screenshots, but this is the real feature). Shows the count of issues + a list when clicked.
- **Each issue entry shows:**
  - A clear plain-language description of the problem (e.g. "Lead Qualification node has no assignee")
  - On click → the canvas auto-pans and zooms to the offending node (or scrolls to the offending manifest field if the issue is manifest-related), highlighting it
- **Goal:** guide the user to the exact problem, don't just report it.
- **Tile-level surfacing:** the rail card on the Rail Management list view also shows a small validation indicator badge if its current draft has unresolved issues — so a user can see at a glance which drafts are ready and which need attention before opening them.

**Validation rules to check:**

1. **Orphaned node** — any node sitting on the canvas with no incoming or outgoing connections
2. **Missing assignee** — any Task / Approval / Client Task / Vendor Task node without a Post selected in the Assignee field
3. **No Trigger** — the rail has no Trigger node (no entry point for particles)
4. **Multiple Triggers** — the rail has more than one Trigger node (ambiguous entry point)
5. **Dead-end branch** — any node with an output port that doesn't connect to anything downstream (e.g. an Approval's Reject branch with nothing wired to it)
6. **Required manifest field references a deleted field** — a Task node lists a manifest field as required, but that field has been removed from the manifest
7. **Unreachable End node** — an End node exists but no path through the rail leads to it
8. **No End node** — the rail has no End node at all (rails must terminate)
9. **Manual Trigger with no authorized Posts** — a Trigger set to manual mode with no Posts in "Who Can Start This Rail" — nobody can start the rail

[TBD — additional rules can be added as edge cases are discovered]

- **Save button** (orange, top right)
  - TRIGGER: click
  - ACTION: saves the current draft state of the rail (does not publish)

---

### CANVAS BEHAVIOR

- All node types from the left palette can be dragged onto the canvas
- Nodes connect via lines (port-to-port) to define flow direction
- Nodes can be repositioned on canvas
- Clicking any node selects it and opens its properties in the right panel
- The flow runs top-to-bottom (visual convention)

---

### ELEMENTS — Right panel (Task node properties)

Opens when a Task node is selected. Other node types have their own property panels [TBD — to spec separately].

- **Header:** "Task" + close (×) button
- **Name field** (text input)
- **Assignee section**
  - **Mode dropdown** — selects how the assignee is resolved at runtime:
    - **Static** — assignee is a single specific Post; same Post handles every particle
    - **Round-robin** — distributes particles evenly across all employees in the eligible Post(s) (Jan → Bob → Jerry → Jan...)
    - **Manager-assigned** — the Area Manager (star-icon Post) of the relevant container receives an assignment cycle in their inbox to pick the assignee
    - **Dynamic** — [TBD — define exact resolution rules; likely conditional based on manifest data or load]
  - **Assignee value** — always a Post (or set of Posts) from the org chart. At runtime, resolves to whichever employee fills that post. Never a specific employee directly — particles route to roles, not people.
- **Description field** (textarea)
- **Ideal Time field**
  - Numeric input + unit selector (minutes / hours / days)
  - Arbitrary value set by the rail designer based on company standards
  - **Purpose:** every cycle's actual duration is tracked against this Ideal Time. The system uses it to compute a **time temperature** for the cycle.
  - **Behavior at runtime:**
    - As actual elapsed time approaches and exceeds the Ideal Time, the cycle's tile in the employee's `My Actions` inbox shifts color gradually — from cool (on pace) through warm (approaching) to urgent/red (overdue)
    - The same time temperature is used in the **Rail Activity Visual View** for managers, where it surfaces bottlenecks across the org at a glance
    - **Archived rails preserve the time temperature data** so retrospective analysis can identify which steps consistently run hot
  - Optional field — leaving it blank disables time-temperature behavior for this cycle (the cycle is tracked but not color-coded)
- **Checklist section**
  - List of checklist items
  - Each item has a "Required" toggle and a delete button
  - **"+ Add Item" button** — adds a new checklist row
  - Required items must be completed before the task can advance; non-required items are optional and can be skipped
- **Required Fields section**
  - Checkbox list of all manifest fields available on this rail
  - Checking a field marks it as required-for-completion of this task
  - This is the **field-level VFP gate**: the task cannot be completed until all checked fields are filled in
  - Note: manifest data persists across the entire rail. A field filled at an earlier cycle is still filled later. Unrequired fields can stay empty or get filled — "unrequired" only means the cycle can advance without them, not that they're rejected.
- **Track as Statistic toggle**
  - LABEL: "Record data when this task is completed"
  - When toggled on, expands to reveal stat tracking configuration:
    - **Tracking mode** (per stat):
      - **Auto count +1** — on cycle completion, increments the selected statistic by 1 (e.g. "leads contacted this week")
      - **Enter value** — on cycle completion, prompts the employee with a popup to input a numeric/text value to record. The popup modal reads "Enter statistic for [Task Name]" and must be filled and saved before the cycle can complete. If the value maps to a manifest field (via Variable Slug), the popup pre-populates with the manifest value and the user just confirms. See `06_statistics.md` Section 7 for the full mechanic.
    - **Statistic selector** — **searchable** picker of all statistics defined in `06_statistics.md`. Searchable is required because organizations will have hundreds of stats at scale.
    - **Manifest field picker** (when "Enter value" mode is selected AND "Value from field" is chosen) — searchable picker of all input fields on manifests attached to this rail. The selected field's Variable Slug becomes the value source.
    - **"+ Add another stat track" button** — multiple statistics can be tracked from the same cycle. Each gets its own mode + statistic target.
- **SOP & Tools section**
  - "No links yet. Add policy docs or tool links for this step."
  - **"+ Add Link" button** — attach URLs to relevant SOPs, policy docs, employee handbooks, or external tools
  - Visible to the assigned employee at runtime so they have context and reference material in-hand
- **Delete Node button** (red, bottom)
  - TRIGGER: click
  - ACTION: removes node from canvas immediately
  - No confirmation modal — undo system covers accidental deletion

---

### ELEMENTS — Left panel (Manifest tab)

When the user toggles to the Manifest tab on the left panel:

- **Manifest list** — shows all manifests attached to this rail
  - Each manifest entry shows name, field count, and a delete icon
- **"+ Add" button** — adds a new manifest to the rail
  - Opens a picker to select a pre-built manifest template (from Manifest Management) or to create a new one inline
- **Multiple manifests per rail:** A single rail can have multiple manifests attached. This is used when the rail handles multiple services or product types with different data requirements. Example: a delivery rail that supports both roofing AND painting can attach a roofing manifest and a painting manifest separately, avoiding a single bloated manifest with mostly empty fields. Example: a marketing agency rail can have separate manifests for websites, ad spend, and UGC content.
- **Manifest field permissions** can control which fields are visible to which users at runtime — e.g. hide contract value from the onboarding specialist, hide social media passwords from treasury, etc. Permission is per-field, per-node-or-post.
- **Files** can be attached to manifest fields (via File Upload field type).
- **Per-particle instances:** The manifest in the rail builder is the _template_ (schema). At runtime, every particle running through the rail gets its own filled-in instance of the manifest. The template defines what data exists; each particle carries its own copy of that data.

**See `SCREEN: Manifest Management — Manifest Builder` later in this file for full manifest authoring spec.**

---

### ELEMENTS — Right panel (Rail Settings)

Opens from the three-dot menu in the builder top bar → "Rail Settings". This is rail-level metadata, distinct from per-node properties.

- **Header:** "Rail Settings" + close (×) button
- **Description field** (textarea) — placeholder "Describe what this rail does..." Longer-form description than the rail card's quick description.
- **Tags section**
  - List of currently-applied tags shown as removable pills (each with ×)
  - Free text input "Add a tag..." — press Enter to add a new tag
  - **Purpose:** organize and filter rails. Tags surface in the Rail Management list view's "Filter by tag" dropdown.
  - No fixed tag taxonomy — companies define their own (e.g. by division, by particle type, by phase).
- **Metadata section**
  - **Custom key-value pairs** for categorization
  - Two side-by-side inputs ("Key" / "Value") with a `+` button to add the pair to the list
  - Existing pairs shown as a list, each removable
  - **Purpose:** structured tagging beyond free-text tags. Useful for integrations, reporting, and programmatic queries (e.g. `client_facing=true`, `revenue_tier=enterprise`, `priority=p1`).
- **"Who Can Start This Rail" section**
  - List of currently-authorized Posts (each shown as a removable pill with ×)
  - **"Add a post..."** dropdown — picker that lists all Posts from the org chart
  - Helper text: _"Only people assigned to these posts will see this rail in My Actions."_
  - **Purpose:** controls **issuance authority** at the rail level. Determines which Posts on the org chart are allowed to manually trigger this rail (via Run Rail action or via the Trigger node when set to Manual mode).
  - This is the rail-level expression of the same authority concept that governs Programs and Orders.

---

### ELEMENTS — Bottom controls

- **Zoom in (+) / Zoom out (–) / Fit-to-screen / Lock** — standard canvas controls

---

---

## SCREEN: Rail Builder — Preview Mode

**PURPOSE:** Walk through the rail step-by-step as if you were the assigned employee, to verify the flow before publishing.

**ENTERED FROM:** Preview button in the rail builder.

---

### LAYOUT

- **Top bar:** "Preview Mode" badge, step indicator ("Step 2 of ~7"), close (×) button, progress bar (right side)
- **Main area:** Renders the current step exactly as the assigned employee would see it at runtime
  - Step title and node type label (e.g. "Lead Qualification — Task Step")
  - Node description
  - "Assigned to:" line showing the post (e.g. "Owner / Director")
  - **For Task Steps:** Checklist (with checkboxes and "Required" tags) followed by Manifest Data form
  - **For Approval Steps:** "Choose an outcome:" prompt with two large branch buttons (Approve / Reject), each leading down a different path
  - **For Condition / Parallel / Sub-Flow / Agent / Integration nodes:** [TBD — preview rendering for non-Task node types]
- **Bottom bar:** "Back" button (left) + "Next: [next step name]" button (orange, right). On Approval steps, the bottom-right area instead reads "Select a branch above to continue" until the user picks a branch.

---

### BEHAVIOR

- Preview is a **visual walkthrough** of how the assigned employee will see each cycle of the rail. The rail builder can step forward and back to verify the flow before publishing.
- **Step counter "Step X of ~Y"** — the `~` (approximately) prefix is intentional. Because rails contain branching nodes (Approval, Condition, Parallel), the actual number of steps a particle traverses depends on which branches it takes. The preview can only estimate the total step count, so it shows an approximation rather than a precise number.
- **Approval node preview** — when previewing an Approval step, the builder picks which branch to follow by clicking Approve or Reject. The preview then proceeds down that branch. There's no "go back and try the other branch" within a single preview pass — to see the other branch, the builder restarts preview and chooses differently.
- [TBD — confirm whether preview is fully interactive (the builder can fill in fake manifest data and the data persists for downstream steps) or whether forms are visible but inert]

---

---

## RAIL LIFECYCLE — STATES & TRANSITIONS

### States

- **Draft only** — brand-new rail, never published. Invisible to non-admin users.
- **Published** — live and available company-wide. Particles can run through it.
- **Published + Has draft** — a published version exists AND a separate working draft of an updated version is being edited. The draft does not affect the live version until re-published.
- **Editing draft** — the draft is currently being modified.
- **Unpublished** — was published, no longer available. Active particles handled per Unpublish flow (see below).
- **Archived** — completed runs stored for reference.
- **Cancelled** — runs that were terminated mid-flow with a reason.

### Editing a published rail

When a user clicks into a published rail to edit it, the system **automatically creates a new draft**. The live published version keeps running untouched, with all in-flight particles continuing on it normally. The user works in the draft. This is a misclick safeguard — someone playing around with an idea cannot accidentally break a working rail.

The rail card shows both badges: `Published` AND `Has draft`. The user can return to the draft anytime to keep working, or discard it without affecting the live version.

### Publishing a draft of an existing rail (Migration Prompt)

When a draft is published over an already-published rail, the system shows a **Migration Prompt** modal asking the user which currently active particles on the old version should switch to the new published version.

**Modal contents:**

- Title: "Migrate active particles to the new version?"
- Summary: how many particles are currently in-flight on the old version
- **Bulk action selector at top:**
  - **Migrate all** — every active particle moves to the new version
  - **Migrate none** — every active particle finishes on the old version; the new version only applies to particles created from this point forward
  - **Select specific particles** — enables the per-particle list below for granular control
- **Per-particle list** (always shown for review, fully active when "Select specific particles" is chosen):
  - Each row shows: particle name, current step on the old rail, and a **dropdown labeled "Resume rail at \_\_\_ step"** listing every step on the new rail
  - The user picks which step on the new rail each migrating particle should land on
  - **Resume placement is always manual selection right now.** Auto-matching by post name or step number is a future enhancement, but there are too many edge cases to do it automatically today (renamed posts, restructured flows, added/removed steps).
  - Particles not selected for migration finish on the old version
- Confirm / Cancel buttons

**Default migration behavior:** "Migrate all" with the new rail's first step as the default placement, but the user must actively confirm. They can switch to per-particle review at any time before confirming.

**When NOT to migrate:** If the draft is structurally a different rail (substantially different steps, assignees, manifests), the user should choose Migrate None and effectively treat the draft as a sibling rail rather than a replacement. To support this case cleanly, the rail builder also offers:

- **Duplicate Rail button** (in the rail card three-dot menu and/or builder top-bar three-dot menu) — creates a full copy of the rail as a new draft, completely independent of the original. Use this when piloting a new variant rather than evolving the existing one.
- **"Import from existing rail"** option when starting a New Rail — lets the user start a fresh draft pre-filled with the contents of an existing published rail, then tweak. Same outcome as Duplicate but initiated from the New Rail flow.

**UI placement (confirmed):**

- **Duplicate Rail** lives in the rail card three-dot menu on the Rail Management list view (alongside Run Rail / Open Builder / Edit / Delete).
- **Import from existing rail** is an option inside the Create Rail modal — when the user clicks "New Rail," the modal includes a checkbox or dropdown labeled something like "Start from an existing rail" that pre-fills the new draft with the contents of a chosen published rail. The user can then tweak.

### Unpublishing a rail (Unpublish Prompt)

When the user clicks Unpublish on a rail with active particles, the system shows an **Unpublish Prompt** modal asking what to do with each active particle.

**Modal contents:**

- Title: "This rail has [N] active particles. What should happen to them?"
- Summary: list of in-flight particles, where each currently sits
- Options (per-particle or bulk):
  - **Cancel** — the particle is terminated and moved to the Cancelled tab with reason "Rail unpublished"
  - **Migrate to another rail** — picks a target rail and uses the same per-particle "Resume rail at \_\_\_ step" dropdown pattern as the Migration Prompt above. Manual selection only for now.
  - **Let finish** — the particle is allowed to complete on the (now-unpublished) rail; no new particles can start, but in-flight ones run to completion
- Confirm / Cancel buttons

**Default behavior:** None — the user must explicitly choose. Unpublishing with active particles cannot proceed without an explicit decision.

If the rail has zero active particles, Unpublish proceeds without a prompt.

---

### OPEN QUESTIONS / TBDs (Rail Management)

Resolved items removed; remaining open items:

- **Tag assignment** — where in the UI? Currently spec'd on Rail Settings panel; confirm if tags should also be inline-editable on the rail card.
- **Rail Activity tab — multi-rail stacking** — when Visual View has many concurrent rails, how do they stack visually? TBD.
- **Preview mode interactivity** — is preview fully interactive (fillable manifest data persisting across steps) or inert visual walkthrough only? TBD.
- **Cascade trigger** — currently spec'd as a Trigger type (previous-rail completion). Confirm no separate node type is needed.
- **Agent node configuration** — full property list for V1.5 implementation.
- **Integration node** — supported integration list for V1.5.

[Previously open questions now resolved — see main spec body:

- Editing a published rail → auto-creates draft (Rail Lifecycle section)
- In-flight particles on re-publish → Migration Prompt
- In-flight particles on unpublish → Unpublish Prompt
- Property panels for non-Task nodes → Node Property Panels section
- Manifest node use case → Manifest node REMOVED
- Statistic node vs Track-as-Statistic toggle → both exist, covered in Node Property Panels]

---

---

## SECTION: Manifest Management

The Manifest Management screen is where reusable manifest templates are created, organized, and maintained. Manifests built here become available to attach to rails in the Rail Builder, where they fill in with data as particles run through the workflow.

**Terminology note for the dev team:** The current UI labels this area "Forms" in some places. **The canonical name is "Manifest"**, not "Form." Update the following labels:

- Page title: "Forms" → **"Manifests"**
- "New Form" button → **"New Manifest"**
- "Create Form" modal → **"Create Manifest"**
- "Form Name" field → **"Manifest Name"**
- "Form Settings" right panel → **"Manifest Settings"**
- Empty state copy "Drag fields from the palette to start building your form" → **"Drag fields from the palette to start building your manifest"**

The reason for "Manifest" over "Form": this isn't a static one-shot form like a survey. It's a data container that **travels with a particle on a rail**, growing as the particle moves through terminals. The name reflects the train metaphor — the manifest is the documentation that travels with the cargo.

---

## SCREEN: Manifest Management — List View

**PURPOSE:** Browse, search, organize, and manage all manifest templates in the organization.

**ROUTE:** `/admin/manifest-management`

**ACCESS:** Requires the "Can build manifests" checkbox (default OFF for Members, ON for Admins). See `00_overview.md` Section 4.3.

**PARENT NAV:** Sidebar → Admin → Manifest Management

### LAYOUT

- **Header:** Breadcrumb (`ADMIN > MANIFEST MANAGEMENT`), screen title "Manifests", subtitle "Capture structured team input."
- **Top right:** **New Manifest** button (orange)
- **Search bar:** "Search manifests..." — filters by manifest name and description
- **Filter by tag dropdown:** select one or more tags to narrow the visible manifests
- **Folder organization** — see Folders section below
- **Main area:** Grid of manifest tiles

### Manifest tile

Each tile shows:

- **Manifest name** (e.g., "Lead to Closed Deal", "Monthly Ad Management", "Client Upset Resolution")
- **Description** (one-line summary, e.g., "Master manifest form for the Lead to Closed Deal")
- **"Template" badge** (visual marker indicating this is a reusable template)
- **Field count** (e.g., "14 fields", "0 fields")
- **`...` overflow menu** — Edit, Duplicate, Delete, Move to folder

**Tile click → opens the Manifest Builder for that manifest.**

### Folders (NEW — applies to both Manifest Management AND Rail Management)

Both Manifest Management and Rail Management list views support **single-level folders** for organizing the catalog as it grows.

**Why folders exist:** A real company will have 30+ manifests (and 30+ rails). Without organization, the list view becomes a scroll-and-search exercise. Folders let admins group related templates by purpose — Sales manifests, HR manifests, Delivery manifests, Permitting manifests, Client Issue manifests, etc.

**Folder behavior:**

- **Single level only.** No nested folders. Folder, then items inside. Keeps the UI simple. (Nested folders can be added in V1.5 if customers ask.)
- **Folders are containers** with a name and optional description
- **Drag-and-drop** manifests/rails between folders
- **Manifests/rails not assigned to a folder** live at the root level alongside the folder list
- **Folder collapse/expand** — click the folder header to collapse/expand its contents
- **Search ignores folder boundaries** — searching across all manifests returns matches from every folder
- **Tags also ignore folder boundaries** — filtering by tag returns matches from every folder
- **Folders are org-wide** — every Admin sees the same folder structure
- **Empty folders are allowed** — folders can exist without any items inside

**Folder management:**

- **+ New Folder** button (in the page header or via a folder management mode)
- Click a folder name to rename it
- Right-click or `...` menu on a folder → Rename / Delete / Edit description
- **Delete folder** prompts a choice: move contents to root, or move contents to another folder

**Important: this folder feature applies identically to Rail Management list view.** See Rail Management section earlier in this file — the same folder mechanic should be added there.

[TBD — exact folder UX details: sidebar tree view vs inline expand/collapse, drag-and-drop animations, folder icons, color coding. Defer to UX session when wireframes exist.]

### Tile sort and filter

- **Default sort:** alphabetical by name
- **Filter by tag** (multi-select dropdown)
- **Filter by folder** (when folders exist, click into a folder to scope the view)

### Empty state

Before any manifests exist:

- "No manifests yet"
- "Create your first manifest template to start collecting data on your rails."
- **+ New Manifest** button

---

## SCREEN: Create Manifest modal

**TRIGGERED BY:** New Manifest button on the list view

**Modal contents:**

- Title: "Create Manifest"
- Subtitle: "Create a new manifest template for your organization."
- **Manifest Name** input (required) — placeholder "e.g., Employee Feedback, Customer Survey"
- **Description (Optional)** textarea — placeholder "What is this manifest for?"
- **Tags (Optional)** input — type a tag, press Enter, repeat
- **Cancel** + **Create Manifest** button (orange)

**On Create Manifest:**

- Creates the manifest as a draft and opens the Manifest Builder

---

## SCREEN: Manifest Builder

**PURPOSE:** Create and edit a single manifest template — the form schema that travels with particles on a rail.

**ROUTE:** `/admin/manifest-management/[manifest-id]`

**ACCESS:** Requires the "Can build manifests" checkbox. See `00_overview.md` Section 4.3.

**ENTERED FROM:**

- Manifest Management list view → click any manifest tile
- Create Manifest modal → click "Create Manifest"
- Inside the Rail Builder → "Add Manifest" → opens the Manifest Builder for inline creation/editing

---

### LAYOUT

Three-column layout:

- **Left panel — Field palette** — draggable field types organized into Display and Input groups
- **Center canvas** — the manifest preview where dragged fields land. Empty state shows "No fields yet — Drag fields from the palette to start building your manifest"
- **Right panel — Manifest Settings / Field Properties** — context-switching panel. When no field is selected, shows Manifest Settings (description + tags). When a field is clicked, shows that field's properties.

**Top bar:**

- **Back arrow** + manifest name (editable inline by clicking)
- **Top right:** "Unsaved changes" indicator (when changes pending) + **Save** button (orange, disabled until changes exist)

---

### LEFT PANEL — Field palette

Draggable field types organized into two groups. **Drag fields from this panel onto the canvas to add them.** Fields can also be added via slash-command insertion (see Slash-Command Insertion section below).

#### Group: DISPLAY (non-input visual elements)

Display fields are structural — they organize the manifest visually but don't collect data. Use them to break long forms into sections, add explanatory text, or visually separate areas.

- **Heading** — section header text (large/bold)
- **Text** — paragraph or label text (regular weight, for instructions or context)
- **Divider** — horizontal rule (visual separator)

#### Group: INPUT (data-collecting fields)

Input fields collect actual data that becomes part of the particle's manifest as it travels through the rail.

| Field Type       | Use                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Text Input**   | Single-line text                                                                                |
| **Text Area**    | Multi-line text / long text                                                                     |
| **Number Input** | Numeric value (integer or decimal)                                                              |
| **Date Input**   | Date picker                                                                                     |
| **Email Input**  | Validated email address                                                                         |
| **Phone Input**  | Phone number with light formatting                                                              |
| **URL Input**    | Validated URL                                                                                   |
| **Currency**     | Numeric with currency formatting                                                                |
| **Yes / No**     | Boolean toggle                                                                                  |
| **Tags**         | Free-form tag input (type and press Enter)                                                      |
| **Select**       | Single-choice dropdown                                                                          |
| **Multi-Select** | Multi-choice (checkboxes)                                                                       |
| **Checklist**    | List of checkbox items                                                                          |
| **File Upload**  | File attachment (single or multiple)                                                            |
| **Address**      | Structured address (street, city, state, zip)                                                   |
| **Link**         | Hyperlink with display text                                                                     |
| **Particle**     | References another particle in the system (e.g., link this manifest field to a Client particle) |
| **Post**         | References a Post on the org chart                                                              |

**Field type catalog alignment:** This list aligns with the Particle Type field type catalog in `05_particles.md`. The two builders use the same field type vocabulary so users learn it once and apply it everywhere. The only field type intentionally NOT included here is "Related Manifests" (a manifest inside a manifest is conceptually weird and not supported).

---

### CENTER CANVAS — Form preview

The canvas is where dragged fields render in their actual form-rendering state. This is what the user filling out the manifest at runtime will see.

**Behavior:**

- **Drag from left palette** to add a field
- **Drop zones** appear between existing fields when dragging — drag to insert at a specific position
- **"Drop field here"** placeholder visible at the bottom of the canvas always (and also between fields when relevant)
- **Click a field** to select it — the right panel switches to that field's properties
- **Drag an existing field** to reorder (vertical drag handles or grab anywhere on the field body)
- **Inline label editing** — click a field's label directly on the canvas to edit it without going to the right panel
- **Delete a field** via the `×` icon that appears when the field is selected
- **Required fields** display a red asterisk next to their label

**Empty state:**
"No fields yet — Drag fields from the palette to start building your manifest"

---

### SLASH-COMMAND INSERTION (Notion-style)

In addition to drag-and-drop from the left palette, users can insert fields via **slash commands**:

- Type `/` anywhere in the canvas (when not editing an existing field's text)
- A small picker opens at the cursor position with a searchable list of every field type
- Type a few letters to filter (e.g., `/num` → Number Input)
- Press Enter or click to insert the field at the current position

This is significantly faster for power users who don't want to break flow to drag from the side panel.

**Both insertion methods are supported.** Drag-and-drop is more discoverable for new users; slash commands are faster for experienced users. Same applies to the Particle Type editor in `05_particles.md`.

---

### RIGHT PANEL — Manifest Settings (default state)

When no field is selected, the right panel shows manifest-level settings:

- **Description** (textarea) — "Describe the purpose of this manifest." Displayed alongside the manifest in the list view and inside rails that use this manifest.
- **Tags** input — "Add a tag..." Type a tag and press Enter. Tags appear as removable chips. Helper text: "Press Enter to add a tag. Tags help organize and filter manifests."

---

### RIGHT PANEL — Field Properties (when a field is selected)

When the user clicks a field on the canvas, the right panel switches to show that field's configuration. The header reflects the field type (e.g., "Number Input"), and a `×` button returns to Manifest Settings.

**Properties common to all input field types:**

- **Label** — the field's display name (also editable inline on the canvas). Helper text: "Click the label in the canvas to edit inline."
- **Variable Slug** — the system-internal reference name for this field, auto-generated from the label (e.g., "Number Field" → `number_field`). Helper text: "Use this to reference the value: `{{number_field}}`". Slugs exist primarily for the dev/system internals — most users don't type them, but they enable templated references in other parts of the system (rail step descriptions, automation, integration payloads). See Variable Slug System below.
- **Placeholder** — text shown in the empty input as a hint
- **Help Text** — optional helper text shown below the field at runtime
- **Default Value** — pre-fills the field with a default. Helper text: "Stored as text for now; type-specific defaults can be refined later."
- **Required toggle** — if ON, the field must be filled before any cycle that requires it can advance. Required fields display a red asterisk.
- **Read Only toggle** — if ON, the field shows the value at runtime but cannot be edited by anyone filling out the manifest. Use case: a field that's calculated by the system or set by an upstream cycle and shouldn't be tampered with downstream (e.g., a "Lead Score" computed automatically, or a contract amount locked after sales sign-off).

**Properties specific to certain field types:**

- **Number Input** adds: **Min** and **Max** numeric constraints
- **Select / Multi-Select** add: **Options** list (add/remove/reorder selectable values)
- **Currency** adds: **Currency code/symbol** picker
- **File Upload** adds: **Single file vs multiple files** toggle, optional file type restriction
- **Particle** adds: **Allowed particle types** filter (or "any" — single or multi-reference TBD)
- **Post** adds: **Single or multi-post** toggle
- **Date Input** adds: **Earliest / latest** date constraints (optional)

**No "Hidden" toggle.** Earlier drafts considered a Hidden property for hiding fields from certain terminals at runtime. This is **explicitly NOT included** in V1. Per-cycle field visibility creates significant administrative complexity (every Task node would need a "show these fields" config), and the value isn't worth the cost. Instead, V1 relies on:

- **All manifest fields are visible at every cycle.** Every employee at every step sees the entire manifest data accumulated so far.
- **Manifest lock/unlock toggle** (per Cycle Detail in `02_workspace.md`) prevents accidental edits to prior data.
- **Audit log** captures every manifest edit with timestamp and acting user, so accidents can be traced.
- **Read Only toggle** (per-field, manifest-template-level) provides static read-only fields where appropriate.

If customers need true per-cycle field visibility, that's a V1.5 feature. The simple default works for almost every operational scenario.

---

### VARIABLE SLUG SYSTEM

Each input field has a **variable slug** — an auto-generated lowercase identifier derived from the label (e.g., "Final Monthly Retainer" → `final_monthly_retainer`). The slug is editable but most users won't touch it.

**What slugs are for:**

- **System-internal references** — the dev uses slugs as the canonical key for storing and retrieving field values
- **Templated references** — fields can be referenced as `{{slug}}` in other parts of the system. Future use cases include:
  - Task node descriptions: "Call {{contact_name}} at {{contact_phone}}"
  - SOP/Tools links with templated URLs: `https://canva.com/clients/{{client_id}}/files`
  - External order email subjects: `Work order: {{work_type}} for {{client_name}}`
  - Statistic tracking based on field values
- **Integration payloads** — when Pathway sends data to external systems via webhooks/integrations, the slug is the field key in the payload

**For V1**, slugs exist as a stored property and are visible in the field properties panel, but the templating use cases above are mostly future. The dev team should preserve the slug as a first-class field attribute even if templating isn't fully wired yet, because adding it later means rebuilding all existing manifests.

**Slug generation rules:**

- Auto-generated from the label on field creation
- Lowercase, underscore-separated
- Strip special characters
- If the slug collides with another field's slug in the same manifest, append a number (`field_name_2`)
- User can manually edit the slug (advanced; rare)

---

### MANIFEST TEMPLATE PHILOSOPHY

- **Templates over one-offs (strong default):** Best practice is to build manifests as reusable templates here, not as one-off inline forms in individual rails. Even infrequent processes (tax forms, client-upset workflows) benefit from being templated for the next time they're needed. Building a rail-specific manifest that only gets used once is considered a design mistake.
  - **Implication for the builder UI:** when a user creates a manifest inline in the Rail Builder, the system should make "save as template" the path of least resistance — ideally the default action.
- **Variant manifests for similar-but-different use cases:** Templates can be cloned and modified for variants. Example: "Construction permit" manifest in different cities — the core fields are shared, but each city adds its local permit requirements. Most of the manifest stays the same; expansion only adds the deltas. In practice, manifest variants often pair with rail variants — cloning a rail for "Austin" vs "Round Rock" typically means cloning its manifests too.
- **Multiple manifests on one rail:** When a rail handles multiple service types, attach multiple manifests rather than building one bloated all-fields manifest.
- **Per-instance at runtime:** Templates define schema. Each particle running a rail carries its own filled-in instance of every manifest attached to that rail.
- **Rail size is a customer choice:** Some businesses prefer one large six-month delivery rail with many manifests; others prefer many small phase-rails that cascade-trigger each other. Pathway must support both equally well.

**Required vs optional design philosophy:** The required/optional distinction is a **policy decision and risk-allocation tradeoff**, not a technical limitation.

- **Too many required fields = wasted labor risk.** Forcing critical data upfront blocks downstream work that could have started. The white-house example: if paint color isn't required before prep, the crew might prep, base-coat white, then sit on a perfectly white house for two weeks waiting on the customer's color choice — and that white coat gets dirty and needs redoing.
- **Too many optional fields = bottleneck risk.** Letting work start without key data causes downstream rework or invalidation. The same painting example with the _opposite_ failure mode: paint color _should_ have been required so the crew didn't prep before knowing the answer.

The rail designer is making a risk-allocation decision: which is worse for _this_ operation — waiting on missing data, or doing rework when assumptions change? Required fields enforce critical-path data. Optional fields prevent bottlenecks when downstream data isn't yet available.

---

### MANIFEST LIFECYCLE — VERSIONING & MIGRATION

Manifests follow the **same draft model as Rails** (see Rail Lifecycle section earlier in this file).

**Editing a published manifest:**

1. The first edit creates a **draft** version of the manifest. The published version remains live and continues to be used by in-flight particles.
2. The user makes their edits in the draft (add fields, remove fields, change properties).
3. When ready, the user clicks **Publish**. The system shows a **Migration Prompt** modal asking what to do with in-flight particles using the previous version.
4. Migration options mirror the Rail Migration Prompt: Migrate all to the new version, Migrate none (let in-flight finish on the old version), or Select specific particles per-particle.
5. After migration, the new version becomes the canonical published manifest.

**Why drafts:** Manifests are referenced by published rails and may be in active use by hundreds of in-flight particles at any moment. Editing them in place would change the schema mid-run, breaking expectations and potentially losing data. The draft model lets the manifest builder safely iterate without disrupting active work.

---

### MANIFEST DELETION

When an admin tries to delete a manifest template that's currently used by published rails:

**The deletion is REFUSED with a list of dependents.** The system shows: "This manifest is in use by [N] rails: [Rail A], [Rail B], [Rail C]. Remove this manifest from those rails before deleting."

The admin must:

1. Open each rail in the Rail Builder
2. Remove the manifest from the rail
3. Republish the rail (which goes through normal Migration Prompt)
4. Once all references are cleared, return to Manifest Management and delete

This is intentionally friction-heavy because deleting a manifest could orphan particle data and break rails. The admin is forced to clean up dependencies explicitly.

**Workaround for deprecation:** If the admin wants to retire a manifest without breaking existing rails, they can **rename it to indicate deprecation** (e.g., "Lead to Closed Deal — DEPRECATED v1") and stop attaching it to new rails. The old manifest stays live for in-flight runs; new rails use the replacement.

---

### TOP BAR / SAVE BEHAVIOR

- **Back arrow** (top left) — returns to Manifest Management list view. If unsaved changes exist, prompts confirmation modal: "You have unsaved changes. Discard them?" with Cancel / Discard buttons.
- **Manifest name** (header) — editable inline; click to enter edit mode, type to change, click away or press Enter to save
- **Unsaved changes indicator** — text "Unsaved changes" appears next to the Save button when changes are pending
- **Save button** (orange, top right) — disabled when no unsaved changes; clicking persists the manifest. For published manifests with active references, Save creates a draft version that requires explicit Publish to activate.

---

### OPEN QUESTIONS / TBDs (Manifest Management)

- **Particle field type** — single or multi-reference? Filter by particle type at config time or runtime? Defer to per-field-type spec if needed.
- **Post field type** — single or multi-reference? Filter by container? Defer to per-field-type spec if needed.
- **Folder UX details** — sidebar tree vs inline expand, drag-and-drop animations, folder icons. Defer to UX session.
- **Templating system roll-out** — when do `{{slug}}` references actually become functional in task descriptions, SOP links, etc.? Variable slug is stored from V1, but the templating consumers may roll out incrementally.
- **Auto-generated slug collision handling** — confirm the suffix-number approach.
- **Save-as-template UX from inline manifest creation in Rail Builder** — make it the default action when creating a manifest inline.

---

## SECTION: Orders (Admin Tracking View)

The Orders admin page is the **issuer-side tracking view** for standalone Orders. It is the mirror of the My Actions Orders tab — same data, opposite audience.

| View                        | Surface               | Audience                              | Purpose                                      |
| --------------------------- | --------------------- | ------------------------------------- | -------------------------------------------- |
| **My Actions → Orders tab** | Workspace (recipient) | "Orders I've been told to do"         | Execute work                                 |
| **Admin → Orders**          | Admin (issuer)        | "Orders I've issued and their status" | Track outstanding orders, confirm completion |

Without this page, an issuer would have to remember every order they sent and ping people manually for status. With it, they have a single live list that updates as recipients complete work. It is also distinct from the Programs Command View — Programs have their own richer monitoring surface; standalone Orders are simpler and only need this lightweight tracker.

---

## SCREEN: Orders Admin

**PURPOSE:** Personal tracking dashboard for orders the current user has issued. Shows what's outstanding, what's been completed, what's been cancelled.

**ROUTE:** `/admin/orders`

**ACCESS:** All Team members can view this page. The data is **personal scope only** — each user sees only the orders THEY personally issued. Members and Admins use the same view; there is no "see everyone's orders" mode in V1.

**Why personal scope only:** the simple, common case is "track my own outstanding orders." Org-wide visibility would clutter the page and isn't needed for the issuer's use case. If a manager wants to see what orders one of their juniors has issued, they go to that junior's Employee Profile drilldown page (deferred — see Section "Open Questions" below).

**PARENT NAV:** Sidebar → Admin → Orders

---

### LAYOUT

- **Header:** Breadcrumb (`ADMIN > ORDERS`), screen title (implicit — no big title shown in screenshots, just the section headers)
- **Search bar** + **filter controls** (TBD exact placement — top of page)
- **Three sections** stacked vertically, each with a header and count:
  - **OPEN (N)** — orders that haven't been completed yet
  - **COMPLETED (N)** — orders the recipient marked done
  - **CANCELLED (N)** — orders the issuer cancelled before they were completed

Each section is visually grouped with a section header. Empty sections may collapse or hide entirely (TBD — minor UX detail).

---

### ORDER TILE

Each order in any section renders as a tile showing:

- **Status icon** (left circle, color-coded by section: orange = open, green = completed, gray = cancelled)
- **Title** (e.g., "Wash the car", "Fix this")
- **Status badge** ("Open" / "Completed" / "Cancelled")
- **Assignee count** (e.g., "1 assignee" — orders can be issued to multiple people simultaneously)
- **Item count** (if checklist exists, e.g., "0/3 items", "3/3 items")
- **Issuer reference** ("By: sageepic01@gmail.com" — this is always the current user since the scope is personal, so it's a redundant display in this view but kept for consistency with the recipient view)
- **Due date** (if set, e.g., "Due Mar 18, 2026")

**Tile click → expands inline as a dropdown** (NOT a centered modal). Same UX pattern as the Orders tab in My Actions for consistency. The current implementation uses a centered modal which should be replaced with inline expansion to match.

**Click-through behavior:**

- Clicking the **assignee** in the expanded view opens that team member's profile / drilldown page (deferred screen)
- Clicking the **attached particle** (if any) opens the particle's Detail page in `05_particles.md`

---

### EXPANDED ORDER VIEW (inline dropdown)

When a tile is clicked, it expands inline to reveal:

- **Title** (header)
- **From:** issuer (always the current user in this view)
- **Notes / long-form text** — freeform context the issuer provided when creating the order. Can include text and links. (Was missing from earlier spec; orders need a notes field beyond just title + checklist.)
- **Attached files** (if any) — files the issuer attached when creating the order, downloadable
- **Attached Particle** (if any) — the particle the order relates to, with name and link
- **Due date** (if set)
- **Checklist** — items with checkboxes. **In this view (issuer side), checkboxes are read-only display** — the recipient is the one who checks them off. The issuer just sees the current state.
- **Assignees** — list of who the order was issued to, each clickable
- **Action buttons** at the bottom — see Issuer Actions below

---

### ISSUER ACTIONS (on an Open order)

When the issuer expands one of their open orders, they have several action buttons available:

- **Mark complete** — force-complete on behalf of the recipient. Used when the work was actually done but the recipient never checked it off in Pathway. Logged in audit history with the issuer's name.
- **Cancel order** — closes the order without marking it complete. Moves it to the Cancelled section. Optional reason field.
- **Edit order** — opens the order for modification:
  - Change title, notes, due date
  - Add or remove checklist items
  - Add or remove attached files
  - Change attached particle
- **Add checklist items** — quick affordance to extend the checklist on the fly without opening full Edit
- **Reassign** — change who the order is assigned to. Picks a new assignee (or assignees), removes the order from the previous person's My Actions, adds it to the new one's. Logged in audit.
- **Nudge** — sends a bell notification to the recipient ("Hey, what's the status?"). Same nudge mechanic as Rail Run Detail in Section "Rail Run Detail" above. Optional short note attachable.

**Issuer Actions on a Completed order:**

- **Reopen** — moves the order back to Open status (rare, used when completion was premature or in error)
- **View only** — no other actions; completed orders are mostly archive

**Issuer Actions on a Cancelled order:**

- **Reactivate** — moves the order back to Open. Useful if cancellation was a mistake.
- **Permanently delete** — removes the order from history entirely. Permission-restricted via the "Can delete cancelled rail runs from history" checkbox (which we'll generalize to "Can delete cancelled records" — applies to both rails and orders).

---

### SORT AND FILTER

**Default sort:**

- **OPEN section** — by **due date**, soonest first. Orders with no due date sort to the bottom.
- **COMPLETED section** — by **completion date**, most recent first
- **CANCELLED section** — by **cancellation date**, most recent first

**Sort toggle:** A small filter / sort control near the search bar lets the user switch between:

- Date (most recent first)
- Date (oldest first)
- Due date
- Title (alphabetical)

User-customizable; saved per-user.

**Search:** A search bar at the top of the page searches across order titles. Lightweight, just title for V1.

**Filter controls:**

- **Filter by assignee** — multi-select dropdown of every team member the current user has issued orders to. Picks one or many to narrow the list.
- **Filter by attached particle** — multi-select dropdown of particles attached to any of the user's orders. (Optional; only shows if the user has issued orders with attached particles.)

[TBD — additional filters as needed: by date range, by completion status, by checklist progress. Defer until users ask for more.]

---

### COMPLETION FLOW (recipient → issuer)

For full mechanics, see `02_workspace.md` Orders tab and `04_programs_orders.md` Section 12 (Compliance Routing). Summary:

1. Recipient receives the order in their My Actions Orders tab
2. Recipient expands the tile, checks off the checklist, fills in any required deliverables, clicks **Mark as Done**
3. The order moves from Open to Completed in the recipient's view
4. **A compliance notification fires to the issuer's bell-icon notification system** ("[Recipient name] completed [Order title]")
5. The order moves from Open to Completed in the issuer's Admin Orders view
6. If the issuer was on this Orders page when the completion fired, the page **refreshes on next interaction or page load** (no real-time polling in V1, same as other admin pages)

---

### EDGE CASES / OPEN QUESTIONS

- **Multi-assignee completion semantics** — if an order is issued to 3 people simultaneously, does it complete when ANY one of them marks it done, or when ALL of them do? My instinct: it depends on the order's nature. V1 default: each assignee gets their own copy of the order, and each completes independently. The issuer sees the order as "Completed" only when all assignees have marked done. Partial completion shows as "1 of 3 done" in the tile. [Confirm or override.]
- **Recipient cancellation** — can a recipient cancel an order they were issued? **No.** Per the thesis, recipients cannot dismiss issued work. If they can't do an order, they call the issuer and the issuer cancels it from the Admin Orders page. This matches the no-dismiss principle from `00_overview.md` Section 1.
- **Order acceptance step** — there is **no acceptance step**. Orders go live immediately when issued. If the recipient disagrees, they call the issuer and the issuer cancels it. (Same model as Loop Back contestation — handled out of band.)
- **Deleting orders from history** — same model as deleting cancelled rail runs from history. Permission-gated, destructive, two-step (cancel first → delete from cancelled tab → permanent removal). See `00_overview.md` Section 4.3 sensitive checkboxes.
- **Search across notes / checklist items** — V1 searches only titles. If users ask for full-text search across notes and checklist items, add later.

---

### FORWARD REFERENCE: Employee Profile Drilldown (deferred screen)

A use case that came up while spec'ing this page: **a manager wants to click into a junior's profile and see _everything_ that junior is doing in Pathway** — their cycles, the orders they've received, the orders they've issued, their programs, their stats, their time temperature heatmap, their loop-backs, their training records, etc. A single unified operational drilldown.

This is **distinct from the Employee Particle detail page** (in `05_particles.md`), which shows HR data — fields, post assignments, training records. The Employee Particle is the _data record_; the Employee Profile Drilldown would be the _operational view_.

They might be the same page with tabs (Profile / Operational / History) or two separate pages. Either way, this is a manager-facing surface that aggregates data across Cycles, Orders, Programs, and Stats for one specific person.

**Deferred to a future session.** Likely belongs in either `02_workspace.md` (as a manager workspace screen) or alongside Statistics. Spec when we get there.

---

### DATA MODEL NOTE

Standalone Orders are their own object, not Action Items inside a Program. The data model:

```
orders
├── id
├── title
├── notes (long text)
├── due_date (nullable)
├── issuer_id (FK to team_accounts)
├── attached_particle_id (nullable, FK)
├── status (enum: open, completed, cancelled)
├── created_at, updated_at, completed_at, cancelled_at
└── audit_log

order_assignees
├── order_id (FK)
├── assignee_id (FK to team_accounts)
├── status (enum: open, completed)  -- per-assignee status for multi-assignee orders
└── completed_at

order_checklist_items
├── id
├── order_id (FK)
├── text
├── checked (bool)
├── checked_by (FK, nullable)
├── checked_at (nullable)
└── order (int)

order_files
├── id
├── order_id (FK)
├── file_url
├── filename
└── uploaded_at
```

Cross-reference: see `02_workspace.md` Orders tab for the recipient view, and `04_programs_orders.md` Section 13 for the conceptual relationship to Program-issued orders.

---

## SECTION: Node Property Panels (Complete Reference)

**PURPOSE:** Detailed specification of every node type in the Rail Builder palette. Each node has a left-panel tile (how it appears in the palette) and a right-panel property sheet (what configuration shows when the node is selected on the canvas).

**LEGACY NAMING CORRECTION:** Earlier spec used "Initializer" to describe the rail-start mechanism. The actual implementation uses **two distinct nodes that work together:**

- **Trigger** — defines HOW the rail begins (manual click / webhook / previous-rail-complete / scheduled / stat-threshold)
- **Initialize** — defines WHAT must be set up before the rail can proceed (particle assignments, manifest pre-fills, post assignments when multiple holders of same post exist)

Anywhere earlier spec references "Initializer" in the rail-start context, treat it as referencing this Trigger + Initialize pair.

**LEGACY REMOVAL:** The palette currently shows a **"Manifest" node type** ("Update manifest"). This is being **removed** — the rail-attached Manifest tab handles manifest data already, and a dedicated node is redundant. Dev should drop this from the palette.

---

### Palette structure (canonical)

Three groups in the left palette, in this order:

**RAIL** (structural flow nodes — define shape of the rail)

- Trigger
- Initialize
- Task
- Condition
- Parallel
- End

**ACTION** (nodes that do something at a step)

- Approval
- Statistic
- Sub-Flow
- Program Node _(new for V1, not yet built)_
- Client Task _(new for V1, not yet built)_
- Vendor Task _(new for V1, not yet built)_

**TOOLS** (external integrations — V1.5+)

- Agent _(spec stub only for V1 — full implementation deferred)_
- Integration _(spec stub only for V1 — full implementation deferred)_

---

### Common properties on every node

Every node's property panel, regardless of type, includes:

- **Header:** node type label (e.g., "Task", "Condition") + close (×) button
- **Name** field — editable label shown on the canvas node
- **Delete Node button** (red, bottom of panel) — removes the node with no confirmation modal (undo system covers accidents)

Node-specific properties follow the common header. When a property is not explicitly documented below, assume the panel has only the common properties.

---

## NODE: Trigger

**PURPOSE:** Defines how a rail run begins. Every rail has exactly one Trigger node, always at the top of the flow.

**Palette tile:**

- Icon: play triangle
- Label: "Trigger"
- Subtitle: "Start the flow"

**Property panel:**

- Name (default: "Trigger")
- **Type** dropdown:
  - **Manual (click to start)** — V1 default. Rail runs are initiated by a user clicking Start a Rail from My Actions or the Rail Management list.
  - **Scheduled** (V1.5) — runs on a cron-like schedule
  - **Webhook** (V1.5) — runs when an external HTTP request is received
  - **Previous-rail completion** (V1.5) — runs when another specified rail completes
  - **Stat-threshold** (V1.5) — runs when a statistic crosses a threshold (see `06_statistics.md` Section 9)
- Helper: "More trigger types will be available in future updates."

**V1 behavior:** Manual-only. The Type dropdown shows other options as disabled/future. A rail with a Manual trigger appears in the "Start a Rail" picker in My Actions.

**Validation:** every rail MUST have exactly one Trigger node. Publishing is blocked if Trigger is missing or duplicated.

**TBD:** exact trigger-type configuration UIs for V1.5 types.

---

## NODE: Initialize

**PURPOSE:** Checkpoint that captures everything the rail needs to start running: particles, assignees (for ambiguous post assignments), and pre-filled manifest data. Runs immediately after the Trigger fires.

**Palette tile:**

- Icon: clipboard with arrow
- Label: "Initialize"
- Subtitle: "Set required fields"

**Property panel:**

- Name (default: "Initialize")
- Helper text when rail has no manifest attached: "No manifest fields or forms configured for this flow. Add fields or forms in the Manifest panel to make them available for initialization."
- When a manifest IS attached, the panel shows:
  - **Required Particles** section — lists particle-type fields the rail expects. Each row shows particle type + current selection affordance. At runtime, the user starting the rail picks the specific particle(s) to attach. (E.g., a Lead-to-Closed rail requires a Lead particle; a Construction rail requires a Client particle + Property particle.)
  - **Required Assignees** section — lists post assignments that need to be picked at runtime when multiple people hold the same post. Example: Sales Section has 4 Sales Reps all holding the "Sales Rep" post; the user starting a Lead-to-Closed rail picks which specific rep this instance goes to. Each row shows the post and an "auto-select" toggle (if ON, system picks round-robin or by assignment rules).
  - **Required Manifest Fields** section — lets the rail designer flag which manifest fields MUST be pre-filled at rail start (vs which can be filled later in the flow). Each field from the attached manifest shows as a checkbox with a Required toggle. Required-at-start fields appear in the Start a Rail modal as mandatory inputs.

**Relationship to Trigger:** Trigger defines the _how_ of starting (manual click, webhook, etc.). Initialize defines the _what_ needs to be collected/assigned at start. They always appear as a pair in the flow: Trigger → Initialize → rest of the rail.

**Relationship to Client Task / Vendor Task nodes:** If the rail contains Client Task or Vendor Task nodes downstream, the Initialize node MUST capture the required Client particle and/or Vendor particle at start. Validation enforces this: publishing is blocked if a Client Task exists but no Client particle is captured by Initialize.

**TBD:**

- Auto-select assignment rules (round-robin / workload-balanced / random) — deferred to assignment-logic session
- Multi-assignee initialization (a single post captured at Initialize but with multiple posts needing assignment) — minor edge case

---

## NODE: Task

**PURPOSE:** A step where a specific post completes work. The most common node in any rail. **Already fully spec'd earlier in this file** — see the "ELEMENTS — Right panel (Task node properties)" section in Rail Builder. Summary below for completeness:

**Property panel summary:**

- Name
- Assignee — static/dynamic toggle + post picker (static picks one post; dynamic uses rail logic to pick at runtime)
- Description
- Checklist — items that must be checked before task can complete
- **Track as Statistic** toggle (with Count / Value-from-field modes — see `06_statistics.md` Section 7)
- SOP & Tools — link attachments for reference
- Delete Node

**Validation:** Task nodes must have an assignee (static post or dynamic rule) by the time the rail is published.

---

## NODE: Condition

**PURPOSE:** Branch the flow based on predicates. Evaluates branches top-to-bottom; first match wins; last branch without a predicate is the "else" default.

**Palette tile:**

- Icon: decision-tree dots
- Label: "Condition"
- Subtitle: "Branch the flow"

**Property panel:**

- Name
- **Branches** section — list of branches, each with:
  - Expand chevron (reveals predicate editor)
  - Branch label (editable, e.g., "Yes", "No", "High Value", "Low Value")
  - `else` badge on the last branch if no predicate is set
  - Delete icon per branch (minimum 2 branches enforced)
- **Predicate editor** (when a branch is expanded):
  - Field reference dropdown — pick a manifest field to test (by Variable Slug)
  - Operator dropdown — `equals`, `not equals`, `greater than`, `less than`, `contains`, `is empty`, `is not empty`, `is one of`
  - Value input — the right-hand-side value to compare against
  - For multi-condition branches (AND/OR logic): + Add condition button
- **+ Add Branch** button
- Helper: "Branches are evaluated in order. The first matching predicate is used. Leave the last branch without a predicate as a default 'else' case."

**Canvas rendering:** the Condition node on the canvas shows each branch as a labeled sub-row with its own outbound connector dot. Each branch is wired independently to a downstream node.

**Validation:**

- Minimum 2 branches
- All branches except the last must have a predicate (or be the designated else)
- Every branch must have an outbound connection (no dead-end branches)

**TBD:**

- Multi-condition branches (AND/OR) — V1 supports single-predicate; multi-predicate deferred to V1.5 unless customers demand
- Predicate evaluation for non-manifest sources (stat values, time, particle field values) — V1.5
- Validation for operator/value type compatibility (e.g., blocking "greater than" on a text field)

---

## NODE: Parallel

**PURPOSE:** Fork the flow into multiple branches that run simultaneously. All branches must complete before the rail continues past the Parallel node's join point.

**Palette tile:**

- Icon: parallel-lines / fork symbol
- Label: "Parallel"
- Subtitle: "Run branches simultaneously"

**Property panel:**

- Name
- **Branches** section — list of branches (default: "Branch A", "Branch B"), each with:
  - Label (editable)
  - Delete icon (minimum 2 branches enforced)
- **+ Add Branch** button
- Helper: "All branches execute simultaneously. Minimum 2 branches required."

**Semantic:** when the rail reaches the Parallel node, the particle forks — each branch runs independently. The rail's "next step" for a particle isn't single-valued during parallel execution; it's multi-valued (one position per branch). The rail waits at the join point until ALL branches have completed, then resumes.

**Canvas rendering:** Parallel node shows each branch as a sub-row with its own outbound connector dot. Downstream, the branches converge at an implicit join before the next node.

**Validation:**

- Minimum 2 branches
- Every branch must have at least one downstream node
- Parallel branches must converge back to a single node (no dangling branches)

**TBD:**

- **Racing mode** — V1.5 enhancement where the first branch to complete wins and others cancel. Currently every branch must complete (all-must-finish semantics).
- Partial-completion timeout — what happens if one branch stalls indefinitely? Deferred.
- Visual affordance for the join point on the canvas.

---

## NODE: End

**PURPOSE:** Terminates the rail. The particle's rail run is marked Complete when it reaches an End node.

**Palette tile:**

- Icon: red/orange square
- Label: "End"
- Subtitle: "End the flow"

**Property panel:**

- Name (default: "End")
- Delete Node

That's it. Dead simple.

**Validation:**

- Every rail MUST have at least one End node
- Every non-End node must eventually connect to an End node (no orphaned paths)
- Multiple End nodes are allowed (useful when Condition branches terminate differently — e.g., "Lead Lost" branch ends one way, "Deal Closed" ends another)

**TBD:**

- Differentiated End states — e.g., "Completed Successfully" vs "Completed Abnormally" vs "Cancelled". V1 treats all End nodes as equivalent completion. V1.5 may add End types with different downstream behavior (e.g., Loss Reason capture on "Lead Lost" End).

---

## NODE: Approval

**PURPOSE:** A step that requires explicit sign-off from a specific post (manager, lead, executive) before the rail can continue. The approver receives the cycle in their My Actions and can Approve or Reject.

**Palette tile:**

- Icon: user with checkmark
- Label: "Approval"
- Subtitle: "Request approval"

**Property panel:**

- Name
- **Approver** — static/dynamic toggle + post picker. Same mechanic as Task node assignee.
- **Description** — context for the approver (what they're approving, what to check)
- **Approval mode:**
  - **Approve / Reject** (default) — two outcomes, two outbound paths
  - **Approve / Reject with reason** — reject requires a free-text reason
  - **Multi-approver** (V1.5) — require multiple posts to approve before continuing
- **On Rejection:** dropdown
  - **Loop back to [specific step]** — pick a previous node to send the particle back to
  - **End the rail** — terminate (routes to nearest End node)
  - **Continue to rejection branch** — rail continues down a separate branch (like a Condition node's "No" path)
- **Reference data** — optional section showing manifest fields the approver should see at decision time. Pick which fields to surface.
- Delete Node

**Runtime behavior:**

- When the particle reaches an Approval node, a cycle appears in the approver's My Actions with Approve + Reject buttons prominently displayed
- The approver sees the surfaced reference data, makes a decision, optionally adds a reason
- Approval advances the particle to the next node
- Rejection follows the configured On Rejection path
- All approvals/rejections are logged with timestamp, approver, reason

**Validation:**

- Approver must be set (static post or dynamic rule) before publishing
- On Rejection path must be configured (can't leave it undefined)

**TBD:**

- Multi-approver mechanics (serial vs parallel, quorum rules) — V1.5
- Approval delegation — can an approver delegate to someone else temporarily (vacation, etc.)? V1.5
- Expiry / auto-decision — if the approver doesn't respond within X time, does the rail auto-approve or auto-reject or escalate? V1.5, likely per-approval configurable.

---

## NODE: Statistic

**PURPOSE:** A dedicated step for recording a statistic value. Distinct from the "Track as Statistic" toggle on Task nodes — this is a node whose entire purpose is stat capture, used when the rail designer wants a simpler, explicit moment for stat entry.

**Palette tile:**

- Icon: bar-chart / metric symbol
- Label: "Statistic"
- Subtitle: "Update statistic"

**Property panel:**

- Name
- **Assignee** — static/dynamic toggle + post picker (who enters the stat?)
- **Statistic** — searchable dropdown of all stats in the org (same picker as Task node's Track as Statistic picker)
- **Value mode** — radio:
  - **Count +1** — arrival at this node adds 1 to the stat (no data entry required, advances immediately)
  - **Enter value** — assignee must enter a value before advancing. Opens a popup at the step.
  - **Value from manifest field** — auto-reads a manifest field's value via Variable Slug
- **Description** (optional) — context shown to the assignee at runtime
- Delete Node

**Runtime behavior:**

- **Count +1:** node activates → stat increments → particle advances. No user interaction needed.
- **Enter value:** node activates → cycle appears in assignee's My Actions with a simple "Enter [Stat Name]" form → assignee submits → stat records value → particle advances.
- **Value from manifest field:** node activates → reads the field's value → stat records it → particle advances. No user interaction unless the field is empty, in which case falls back to Enter value.

**Why this exists separately from Task's Track as Statistic toggle:** some rail designers prefer explicit stat-entry steps over hidden toggles on Task nodes. The dedicated Statistic node is easier to scan on the canvas ("this is where we record the number") vs a Task with a hidden Track toggle.

**Validation:**

- Statistic must be selected before publishing
- Assignee required for Enter value mode (can be omitted for Count +1 and Value from manifest field modes)

**TBD:**

- Multi-stat entry at a single Statistic node — V1 supports one stat per node; multi-stat deferred
- Conditional stat updates (only record if a predicate matches) — V1.5

---

## NODE: Sub-Flow

**PURPOSE:** Invoke another rail as a sub-process. The parent rail pauses (optionally) until the sub-rail completes, then continues.

**Palette tile:**

- Icon: nested-arrows / grid
- Label: "Sub-Flow"
- Subtitle: "Run another flow"

**Property panel:**

- Name
- **Target Flow** dropdown — picks another published rail in the org. Searchable. (E.g., "Lead to Closed Deal Rail", "Monthly Ad Management", "Client Upset Resolution", "Test".)
- **Wait for completion** toggle — "Flow pauses until sub-flow finishes"
  - ON (default): parent rail pauses at this node until the sub-flow reaches an End node
  - OFF: parent rail continues immediately; sub-flow runs independently in parallel
- **Particle handoff:** inherited from parent by default — the parent rail's particles are passed to the sub-flow's Initialize node. Sub-flow can reference parent manifest data.
- **Manifest data merge** — how does the sub-flow's completed manifest get merged back into the parent? TBD — likely "merge on completion" by default.
- Delete Node

**Runtime behavior:**

- When the parent rail reaches the Sub-Flow node, a new rail run is initiated using the Target Flow rail as the template
- The new run is tagged as a child of the parent, visible in Rail Activity as a linked pair
- If Wait for completion is ON: parent pauses; parent resumes when child hits End
- If Wait for completion is OFF: parent continues immediately; child runs independently

**Difference from Program Node** (see below): Sub-Flow references a **pre-built rail template**. Program Node spins up a **dynamic program** at runtime with flexible action items defined by a manager. Sub-Flow = "run this specific rail"; Program Node = "run a custom program to get this thing done however you see fit."

**Validation:**

- Target Flow must be selected before publishing
- Target Flow must be a published rail (not a draft)
- Circular sub-flow references must be blocked (Rail A → Sub-Flow Rail A creates infinite recursion)

**TBD:**

- Particle inheritance rules — does the child inherit all parent particles, or just selected ones? V1 likely inherits all; configurable in V1.5.
- Error handling — what happens if the sub-flow is cancelled or fails? Does the parent also cancel or continue?
- Sub-flow's own Initialize — if the child rail's Initialize needs more data than the parent provides, prompt the parent-rail assignee to fill the gap before sub-flow starts.

---

## NODE: Program Node (NEW — V1, not yet built)

**PURPOSE:** Insert a dynamic Program interior at a specific step in the rail. The rail pauses; a responsible manager opens an embedded Program (see `04_programs_orders.md` for Program concept) and issues whatever action items they need to get this step done. When the Program is closed (all items complete or manager force-closes), the rail resumes.

**Distinction from Sub-Flow:**

- **Sub-Flow** references a **pre-built static rail** — "always run THIS rail here"
- **Program Node** spins up a **fresh dynamic program** at runtime — "at this step, the manager figures out what needs doing and assigns it dynamically"

Use case from construction example: a "Demolition" step in a construction rail. Demolition isn't the same every time — sometimes it needs permits, sometimes hazmat handling, sometimes just a crew. A Program Node here lets the on-site manager open a fresh Program for this specific demolition, issue whatever action items they need to each person, and close it when demolition is done. The rail then proceeds to the next step.

**Palette tile:**

- Icon: similar to Sub-Flow but differentiated (TBD — distinct visual to signal "dynamic" not "fixed")
- Label: "Program Node"
- Subtitle: "Run a dynamic program"

**Property panel:**

- Name
- **Responsible Post** — static/dynamic post picker. The post whose holder will own the embedded Program and decide what action items to issue.
- **Description** — context for the responsible manager (what the step is about, what needs to happen)
- **Expected duration** (optional) — rough estimate for the Program's completion. Used for Ideal Time calculation.
- **Pre-populated context** — optional checkbox list: "Pass parent rail's manifest data into the Program context," "Pass attached particles into the Program context." Default: both ON.
- **Wait for completion** — always ON by default (the rail must wait for the manager to close the embedded Program before proceeding). **Unlike Sub-Flow, this is not toggleable** — the Program Node's purpose is to gate the rail on dynamic work.
- Delete Node

**Runtime behavior:**

- When the rail reaches the Program Node, a cycle appears in the responsible post's My Actions: "Open Program for [Step Name]"
- Clicking opens the Program interior inline (see `04_programs_orders.md` Three-Tab Program Detail)
- Parent rail's context (manifest data, particles) is pre-loaded into the Program
- Responsible manager issues action items to internal/external actors as needed, tracks compliance
- When the manager force-closes the Program (or all items complete), the rail resumes to the next node
- Program's completion data (deliverables, notes) is logged against the parent rail's audit trail

**Validation:**

- Responsible Post must be set before publishing

**TBD:**

- **Program template defaults** — V1.5 enhancement: a Program Node can have a "default template" with pre-filled suggested action items, giving managers a starting scaffold instead of a blank Program. Defer.
- **Nested Program Nodes** — a Program Node inside a Sub-Flow inside a Program Node... limit to 3 levels deep? Circular protection.
- **Who can close the embedded Program** — only the Responsible Post holder, or also their managers in the org chart? Likely both (managers can always close).
- **Visual affordance** to differentiate Program Node from Sub-Flow on the canvas at a glance.

---

## NODE: Client Task (NEW — V1, not yet built)

**PURPOSE:** A step where an external **client** performs an action (signs a contract, provides information, approves a proposal, uploads a file). The task is delivered to the client via a hosted external page; an internal **responsible post** owns accountability for making sure the client actually does it.

**Key architectural point:** A Client Task is NOT just "the client does this." It has BOTH a client-facing component AND an internal responsible post. The responsible post (typically an account manager, project manager, or liaison) is the accountability anchor. If the client doesn't respond, the rail's problem surfaces on the internal post's My Actions, not on the client's side.

**Palette tile:**

- Icon: external-user / person with outgoing arrow
- Label: "Client Task"
- Subtitle: "External client action"

**Property panel:**

- Name
- **Client particle field** — dropdown auto-bound to the Client particle captured by the Initialize node (read-only, informational — confirms which Client this task targets)
- **Responsible Post (internal)** — static/dynamic post picker. Who internally owns making sure this client completes the task. Typically an account manager / project manager / liaison.
- **Scope of Work** — long text, what the client is being asked to do. Shown on the hosted external page.
- **Deliverables** — what the client is expected to submit:
  - Checklist items
  - Required files (file upload fields)
  - Required responses (manifest fields the client must fill)
- **Response Window** — date or duration (e.g., "5 business days from send"). Used to calculate overdue warnings.
- **Delivery tone** dropdown — Employee Order / Vendor Work Packet / **Client Request** (default for Client Task) — see `04_programs_orders.md` Section 11 for tone mechanics
- **Reminder schedule** — optional (e.g., "remind after 2 days, again after 4 days")
- Delete Node

**Runtime behavior:**

- When the rail reaches the Client Task node, two things happen simultaneously:
  1. A cycle is created in the **Responsible Post's** My Actions: "Client Task active for [Client Name]: [Task Name]"
  2. A **hosted external page** is generated at a unique URL (e.g., `pathway.app/c/[token]`), and the client is notified via email with a link
- The internal responsible post sees the cycle with status indicators: "Waiting on client" / "Client viewed" / "Client submitted" / "Overdue"
- The responsible post has action buttons: **Send reminder** / **Mark complete on behalf of client** (with reason) / **Cancel task** (with reason)
- When the client submits on the external page, the task auto-completes, the rail advances, and the responsible post's cycle closes with a success marker
- If the client doesn't respond by the response window, the responsible post's cycle flags as overdue and Nudge/Escalate actions become available

**Hosted external page (see `04_programs_orders.md` Section 10 for External Action Item):**

- Client-branded (org's logo + org name)
- Shows: org name, Scope of Work, Deliverables checklist, form fields, file uploads, Submit button
- No Pathway login required — token-authenticated link
- Client can save progress and return later
- Token is per-task, can be revoked

**Validation:**

- Responsible Post must be set before publishing
- Scope of Work must be non-empty
- At least one Deliverable item (checklist, file, or field) must be defined
- **Critical validation**: if this rail has a Client Task node, the Initialize node MUST capture a Client particle. Publishing blocked otherwise.

**Audit / compliance:**

- All client interactions logged (viewed at, submitted at, reminders sent)
- Hosted page view tracked for compliance / dispute resolution

**TBD:**

- Multi-client tasks (one task, multiple clients) — V1.5
- Client identity verification beyond token (email confirmation, 2FA) — V1.5
- Client re-submission after rejection — currently one-shot; revision cycles TBD
- Comment thread between client and responsible post on the hosted page — V1.5

---

## NODE: Vendor Task (NEW — V1, not yet built)

**PURPOSE:** A step where an external **vendor / contractor / supplier** performs work. Mechanically nearly identical to Client Task, but with vendor-specific delivery tone and semantics (this is work being bought/commissioned, not a client request).

**Key architectural point:** Same as Client Task — the Vendor Task has BOTH a vendor-facing component AND an internal **responsible post** (typically a purchasing manager, site supervisor, or project coordinator) who owns accountability.

**Palette tile:**

- Icon: external-user / truck / toolbox (TBD — distinct from Client Task)
- Label: "Vendor Task"
- Subtitle: "External vendor work"

**Property panel:**

Identical structure to Client Task, with these differences:

- **Vendor particle field** — auto-bound to the Vendor particle captured by Initialize (not Client)
- **Responsible Post (internal)** — typically purchasing / site supervisor / PM
- **Scope of Work** — what the vendor is being commissioned to do
- **Deliverables** — same structure (checklist, files, fields). Often includes: photos of completed work, invoices, certificates, warranties, compliance documents
- **Response Window** — often measured in days-to-weeks vs client tasks which are often hours-to-days
- **Delivery tone** — defaults to **Vendor Work Packet** (formal, specification-oriented, often includes PO numbers and compliance language) — see `04_programs_orders.md` Section 11
- **Purchase order reference** (optional) — PO number field for accounting integration
- **Cost estimate** (optional) — expected cost, for budget tracking

**Runtime behavior:**
Identical to Client Task. Responsible post tracks progress via their My Actions cycle; vendor interacts via hosted external page.

**Validation:**
Same as Client Task, but requires a **Vendor particle** captured by Initialize (not Client).

**TBD:**

- Vendor comparison / multi-bid mode — a single node that issues the same work to multiple vendors and picks the best response. V1.5.
- Integration with accounting systems for PO / invoice tracking — V1.5, part of Integrations session.
- Vendor performance tracking — stat auto-updates on vendor completion time and quality. V1.5.

---

## NODE: Agent (V1 placeholder — stub implementation)

**PURPOSE:** Invoke an LLM to perform a step automatically. For V1, this exists as a palette tile and property panel scaffold but is not fully wired. Full implementation deferred to V1.5.

**Palette tile:**

- Icon: robot / AI symbol
- Label: "Agent"
- Subtitle: "Run agent"

**Property panel (existing implementation, V1 stub):**

- Name
- **Provider** dropdown — "Select provider..." (options: Claude / OpenAI / future)
- **System Prompt** — textarea, "Instructions for the agent..."
- **Temperature** — slider, 0-1, default 0.7
- Delete Node

**V1 behavior:** Agent nodes can be placed on the canvas and configured, but they don't actually execute in V1. When a rail reaches an Agent node at runtime, it falls through to the next node (effectively a no-op).

**TBD for V1.5:**

- Credential selection (pull from Settings → Credentials)
- Input context — what manifest data and particles the agent can see
- Output handling — where does the agent's response go? (manifest field update, downstream node input, audit log)
- Tool/function calling
- Retry / error handling
- Cost tracking

---

## NODE: Integration (V1 placeholder — stub implementation)

**PURPOSE:** Fire an HTTP request to an external system. For V1, this exists as a palette tile and property panel scaffold but is not fully wired. Full implementation deferred to V1.5.

**Palette tile:**

- Icon: external-link / webhook
- Label: "Integration"
- Subtitle: "External action"

**Property panel (existing implementation, V1 stub):**

- Name
- **Method** dropdown — POST (default), GET, PUT, DELETE, PATCH
- **URL** — placeholder "https://api.example.com/..."
- **Headers** section — "No headers. Add custom HTTP headers if needed." + **Add Header** button
- **Body** textarea with `{"key": "value"}` placeholder
- **Authentication** dropdown — default "none" (options: none / Basic / Bearer token / API key header / OAuth)
- Delete Node

**V1 behavior:** Integration nodes can be placed on the canvas and configured, but they don't actually execute in V1. Falls through like Agent.

**TBD for V1.5:**

- Credential-based auth (pull Bearer token from Settings → Credentials so the key isn't hard-coded in the rail)
- Variable Slug substitution in URL, headers, body (e.g., `https://api.example.com/clients/{{client_id}}`)
- Response handling — store response in manifest field, branch based on response status, etc.
- Retry / error handling
- Rate limiting per org

---

## CROSS-CUTTING: Canvas & Connector mechanics

Observations from the screenshots that apply to every node:

- **Connector dots** — small orange dots on the left/right edges of every node. These are the connection points for drawing lines between nodes. Clicking and dragging from a dot draws a connection to another node's dot.
- **Node selection** — clicking a node selects it (orange outline) and opens its property panel on the right. Clicking empty canvas deselects.
- **Node drag** — nodes can be repositioned on the canvas by drag.
- **Multi-select** — (TBD) shift-click or lasso-select multiple nodes for bulk delete/move.
- **Canvas zoom** — bottom-left controls: `+` / `-` / fit-to-screen / lock. Lock prevents accidental canvas panning.
- **Auto-layout** — (TBD) button to auto-arrange nodes vertically or horizontally for clean readability.

---

## CROSS-CUTTING: Validation summary

Consolidated from per-node validation rules above. These run at Publish time:

1. **Exactly one Trigger** node per rail
2. **At least one End** node per rail
3. **Every non-End node** must eventually connect to an End (no orphan paths)
4. **Every Condition branch** must have an outbound connection
5. **Every Parallel branch** must converge back to a single node
6. **Every Task** must have an assignee
7. **Every Approval** must have an approver and On Rejection path
8. **Every Statistic** node must have a statistic selected (and assignee for Enter value mode)
9. **Every Sub-Flow** must have Target Flow selected and must not be circular
10. **Every Program Node** must have Responsible Post set
11. **Every Client Task** requires a Client particle in Initialize
12. **Every Vendor Task** requires a Vendor particle in Initialize
13. **No circular Sub-Flow references**

Publish button is disabled until all validations pass; validation errors are surfaced inline with navigate-to-error affordance.
