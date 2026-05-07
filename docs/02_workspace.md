# Pathway — Workspace (Employee-Facing Surfaces)

> Specs for the Workspace nav group: Dashboard, My Actions, Calendar.
> These are the day-to-day screens employees and managers live in. The Admin nav group (`03_admin.md`) is where managers go to _configure_; this file is where everyone goes to _execute_.

**Read `00_overview.md` first**, especially the "tickets, not lists" thesis. The whole design of My Actions hinges on it. If you treat My Actions as a task list, you will build the wrong thing.

---

## SECTION: My Actions

The My Actions page is the **single most important screen in Pathway**. It is the heads-up display (HUD) every employee and manager opens to see what work has been issued to them right now. It is not a project board, not a task list, not a Kanban — it's a **ticket queue**. Work shows up here when it's been issued. Work leaves here when it's been completed. The only way out is through.

This is where the assembly-line metaphor lands in actual UI. When an employee completes a Cycle on this page, the particle physically advances to the next terminal, and the next employee's My Actions populates with the new ticket. The conveyor belt is structural, not interpersonal.

---

## SCREEN: My Actions — List View

**PURPOSE:** The employee's primary work surface. Shows all currently-issued cycles, orders, and to-dos for the active post profile.

**ROUTE:** `/my-actions`

**ACCESS:** Every authenticated employee. (Managers and executives also use this — managers have cycles too, see overview thesis.)

**PARENT NAV:** Workspace → My Actions (sidebar)

**THESIS LINK:** This screen is the runtime expression of the "tickets, not lists" thesis from `00_overview.md`. Read that section before modifying anything here.

---

### LAYOUT

- **Left sidebar (global nav):** Standard Pathway nav.
- **Top-left of sidebar:** Org switcher ("Apex Media") + **Post Profile switcher** (currently labeled "God Mode" in the screenshots — see Post Profile Switcher section below for the real behavior).
- **Header:** Breadcrumb (`WORKSPACE > MY ACTIONS`), screen title "My Actions", subtitle "Prioritize and clear operational work."
- **Top right:** Two action buttons: **"Start a Rail"** (orange) and **"Issue Order"** (outline). Visibility is conditional on the active post's authority.
- **Tab bar:** Three tabs — **Cycles** | **Orders** | **To Dos**
- **Below tabs:** Search bar ("Search tasks...") + filter dropdown ("All Types")
- **Main area:** List of tiles for the active tab.

---

### POST PROFILE SWITCHER (top-left of sidebar)

**Critical concept that's easy to miss:** the dropdown in the top-left of the sidebar is a **post profile switcher**.

**Why it exists:** an employee can hold multiple Posts in the org chart simultaneously (e.g., Project Manager AND Lead Materials Purchaser). Each Post has its own My Actions inbox because each Post receives its own issued work. The switcher lets the employee toggle between which Post's inbox they're currently viewing.

**Behavior:**

- **Single-post employees:** the switcher just shows their one post; effectively a no-op.
- **Multi-post employees:** the switcher lists every Post they hold, with the currently-active one highlighted. Clicking another post swaps the entire My Actions view to that post's inbox (Cycles, Orders, To Dos all refresh to reflect the new active post).

**NOTE on "God Mode":** Some screenshots show a "God Mode" label on this switcher. That is a **dev-only tool**, not a customer feature — see `00_overview.md` Section 6 "God Mode — Development Only." Customer-shipped builds must strip God Mode; the switcher shown to customers is the Post Profile switcher described above. Admins in customer builds get full platform-config access via their Team Role but do NOT get a "view as any Post" mode.

---

### TAB 1: CYCLES

**Purpose:** The primary surface. Shows all rail-issued cycle tickets currently assigned to the active post.

**Each cycle tile shows:**

- **Status indicator** (left circle icon): visual marker for tile type
- **Cycle name** (e.g., "Director Resolution Review")
- **Particle + rail name** (e.g., "ABC CORP — Client Upset Resolution Rail")
- **Checklist progress** (e.g., "3/3 checklist" or "0/3 checklist")
- **Type indicator** — which kind of cycle this is (Task / Approval / Loop Back / Stuck Initializer). "Stuck Initializer" = a rail run where the user started filling the Initialize form but didn't finish; see Start a Rail flow below. This type indicator replaces the old "status" concept — see "Why no Pending/In Progress" below.
- **Last activity timestamp** ("21 days ago")
- **Description preview** (one line of the cycle's task description)
- **Tile background gradient** — color shifts from cool to urgent based on **time temperature** (actual elapsed time vs Ideal Time). Tiles with no Ideal Time set don't get a temperature gradient.

**Multiple cycles in queue at once:** An employee can have several cycle tickets pending simultaneously, even from the same rail or across rails. Within the bounded set of issued work, the employee picks which to do first based on judgment (urgency, dependencies they know about, time temperature). This is intentional — see the thesis in `00_overview.md`.

**Tile click → opens Cycle Detail screen** (see below).

---

#### Why no Pending / In Progress / Blocked statuses

Pathway intentionally does NOT use traditional task statuses like "Pending", "In Progress", or "Blocked". The reasoning, per the thesis in `00_overview.md`:

- **A cycle in your inbox IS in progress.** Whether you've physically started clicking on it doesn't matter. It's been issued to you, it's your responsibility, the clock is running. The "Pending vs In Progress" distinction is project-management theater that adds noise without information.
- **"Blocked" is explicitly rejected.** Other PM tools let users mark tickets as "Blocked" and wait for someone to come help. Pathway treats this as a failure mode — if you're blocked, you call your manager and figure it out. You don't park work in a "waiting" state and expect rescue. The system is built for accountability, not passive escalation.
- **Cycle "type" is what matters, not "status".** The relevant distinction is whether this is a regular Task cycle, an Approval (quick yes/no), a Loop Back (someone sent work back to you), or a Stuck Initializer (you started a rail and didn't finish initializing). These are _different kinds of work_, not different states of the same work, and they're filterable.
- **Time temperature handles urgency.** Instead of statuses to communicate "this is getting old", the tile color does it visually. Red tile = act now. Cool tile = on pace.
- **The only state transitions that exist** are:
  - In inbox (assigned, not yet completed)
  - Completed (gone from inbox, advances rail)
  - Cancelled (force-removed by manager, vanishes from inbox + notification fires)
  - Reassigned (vanishes from inbox, appears in new assignee's)
  - Looped back (still in your inbox, but a duplicate also went back to a prior post)

---

**Sort / filter behavior:**

- **"All Types" filter dropdown** — filters cycles by their _kind_ and by _particle type_:
  - **Type:** All / Tasks (regular cycle work) / Approvals (quick yes-no) / Loop Backs / Stuck Initializers
  - **Particle type:** filter to cycles relating to a specific particle type (e.g., "only show me Client cycles" or "only Lead cycles")
  - **Particle instance:** filter to cycles relating to a specific particle (e.g., "only show me ABC CORP cycles")
- **Search bar** — text search across cycle name, particle name, rail name
- **Default sort:** by **time temperature**, hottest first. Cycles with no Ideal Time set (no temperature) sort to the bottom.
- **User-customizable sort:** the employee can change the sort order — by issuance date, by particle, by rail, etc. Saved per-user.
- **Important nuance — issuance date is NOT a substitute for time temperature.** A 10-day cycle issued 7 days ago is _colder_ than a 2-day cycle issued 10 minutes ago. The relevant question is "how close am I to the deadline this rail expected", not "how long ago did this hit my inbox." Time temperature answers the right question.

---

#### Tile Layout — Scaling Problem & Proposed Solution

**The problem:** Vertical card stacking works at 5–10 cycles. At 30+, the My Actions inbox becomes a scroll-fest and the employee loses visibility of what's actually urgent. The current vertical-tile UX needs to evolve.

**Recommended approach: Solitaire-stacked grouping by particle**

Cycles are grouped into "stacks" by their particle (or by rail type, user-toggleable). Each stack shows:

- The **top (hottest) cycle** in the stack visible by default — name, type, time temperature
- A **stack header** with the particle name and a count badge ("+ 3 more")
- The **stack header color** reflects the _hottest_ cycle inside it, so the eye is drawn to stacks containing red cycles
- **Click a stack** → expands it inline (or in a side panel) to show every cycle in that group, sorted by time temperature

This compresses an inbox of 30+ cycles into maybe 8-12 stacks visible in one viewport. The employee can scan the whole landscape, see which particle/rail needs attention first, and drill in.

**Alternative layout: Compact row list** (fallback)

- Same vertical layout but with much tighter rows (single line per cycle, not full card)
- Sticky group headers per particle
- Lower engineering effort, less visual sophistication, doesn't fundamentally solve the scale problem but defers it.

**Future option: Heat-map dual-pane**

- Left: small grid of colored squares (one per cycle, colored by time temperature)
- Right: detail of selected cycle/stack
- Highest visual scaling (handles hundreds of cycles) but most novel — revisit after the basic stacked version is built and validated.

**For V1: build the solitaire-stacked layout** as the default, with a view toggle to fall back to the vertical card list if users prefer it.

[TBD — exact stacking interaction (click vs hover, expand inline vs side panel), grouping toggle (by particle vs by rail vs flat), saved preferences per user]

---

### TAB 2: ORDERS

**Purpose:** Shows orders (and eventually programs) that have been issued to the active post by a human with issuance authority.

**Future state:** When Programs & Orders is fully built, this tab will show both Orders (one-off directives) and Program-derived items (Action Items issued from a Program by a manager). For now, only Orders are present.

**Each order tile shows:**

- **Status indicator** (left icon)
- **Order title** (e.g., "Clean the car", "Take out the trash")
- **Status badge** ("Done" / pending / etc.)
- **From** field — who issued the order (e.g., "From: sageepic01+am@gmail.com")
- **Item count** (if checklist exists) — e.g., "2/2 items" or "3/3 items"
- **Date** (issue date or due date)
- Completed orders show with strikethrough text and "Done" badge

**Sections:** Orders can be grouped by status (e.g., "COMPLETED" section header in the screenshot). Other sections likely include "Active" or "Pending."

**Tile click → expands inline (dropdown), NOT a separate detail page.** Order detail is much simpler than Cycle detail because orders are themselves simpler:

- Title, notes, due date
- Checklist (with checkboxes)
- Comments
- Complete button (active when checklist is complete)
- Optional attached particle reference

When the tile is collapsed it shows the order title + status. Click expands the row downward to show full content. Click again to collapse.

**Why inline expand instead of a detail page:** orders are small, focused, and shouldn't require a full screen transition. The inline expand keeps the user in their inbox flow.

---

### TAB 3: TO DOS

**Purpose:** The employee's personal scratchpad. Ad hoc, dynamic, employee-managed items that are NOT issued by a rail or by another person with authority.

**Critical distinction from Cycles and Orders:**

- Cycles and Orders are _issued to_ the employee — they cannot dismiss them, can only complete or escalate
- To Dos are **created by the employee themselves** for their own tracking
- To Dos are flexible, personal, and don't have rail enforcement

**Use cases:**

- "Set up an extra meeting with the client to clarify design before completing this cycle"
- "Call John to follow up on Bobby's request"
- "Check on refund discount from last month"

**Grouping:** To Dos are organized by **the particle they relate to** (e.g., grouped under "ABC CORP" in the screenshot) OR by the **cycle they're associated with**, when the to-do was created from inside a Cycle Detail page. This contextual grouping is important — to-dos aren't a flat list; they're attached to the work they support.

**Each to-do shows:**

- **Checkbox** (left) to mark complete
- **To-do text** (e.g., "Meeting with John and go over material")
- **Due date** (optional, e.g., "Due Mar 27, 2026")

**Section headers:** The relevant grouping (particle name in colored bar, e.g., blue "ABC CORP" header).

**Top-level "Add To Do" button:** A button at the top of the To Dos tab lets the employee add a free-floating to-do not tied to any specific cycle. The add flow asks for: text, optional due date, and optional grouping (which particle or cycle this relates to, or "none" for a fully personal item). To-dos created from inside a Cycle Detail page automatically inherit the cycle as their grouping.

---

### TOP-RIGHT ACTION BUTTONS

These buttons appear conditionally based on the active post's authority. An employee with no issuance authority sees no buttons (or sees them disabled).

#### "Start a Rail" button (orange)

**TRIGGER:** click
**ACTION:** opens **Start a Rail** modal

**Start a Rail modal — first stage:**

- Title: "Start a Rail"
- Subtitle: "Choose a rail to start."
- **List of rails the active post is authorized to start** (per the rail's "Who Can Start This Rail" setting in Rail Settings). Each rail shown as a clickable row.
- Close (×) button

**On rail selection → modal advances to second stage (Start Rail setup):**

- Title: "Start Rail"
- Subtitle: "Set up [Rail Name] before starting."
- **Particle type** dropdown — select which particle type this rail run is for (since a single rail can support multiple particle types via 1-to-many mapping)
- **Assigned to** dropdown — "The employee responsible for this rail." This is the runtime equivalent of the rail's primary assignee at initiation.
- **Per-terminal post auto-assignment preview:** Below "Assigned to", the modal shows a list of terminals on the rail and their auto-assigned employees (e.g., "Account Manager: sageepic01+am@gmail.com — Auto-assigned"). Vacant posts are flagged: "Vacant — no one assigned to this post." This gives the initiating user a sanity-check before launching: they can see exactly who will receive cycles as the particle moves through the rail.
- **Cancel button** + **Start Rail button** (orange)

**On Start Rail click:**

- Validates that all required Initialize node fields are filled
- If validation passes: creates a new particle on the rail, advances past the Initialize node, and the first cycle ticket appears in the assigned post's My Actions inbox
- If validation fails: an **error banner appears at the top of the modal** identifying which required fields are missing. The user fills them in and retries.

**Stuck Initializer fallback:** If the initiating user starts filling the modal, gets distracted, and walks away without finishing, the partial initializer is **saved as a draft and dropped into their own My Actions Cycles inbox** as a special tile type: "Stuck Initializer." The tile is visually distinct (different color or banner) and shows which rail it's for. The user comes back later, opens it from their inbox, finishes filling in the missing data, and clicks Start Rail. This prevents the "I tried to start a rail but got pulled away and now we forgot to start it" failure mode.

#### "Issue Order" button (outline)

**TRIGGER:** click
**ACTION:** opens **Issue Order** modal

**Issue Order modal contents:**

- Title: "Issue Order"
- Subtitle: "Create an order and assign it to one or more team members."
- **Title** (text input, required) — order title
- **Notes** (textarea) — "Additional context, instructions..." Long-form free text field for context, instructions, links, anything the recipient needs to know beyond the title and checklist.
- **Due Date** (date picker, defaults to today)
- **Checklist** — "Add checklist item..." text input + `+` button to add items. Multi-item lists supported.
- **Attach Files** — optional file upload zone. Files attached at issuance travel with the order to every assignee.
- **Attach Particle (optional)** — dropdown to link this order to an existing particle (so it shows up under that particle's context elsewhere in the system)
- **Assignees** (required, multi-select) — checkbox list of all employees in the org, each with name + role indicator. Multiple assignees supported (e.g., "send this order to all three of these people simultaneously").
- **Cancel** button + **Issue Order** button (orange)

**On Issue Order click:**

- Creates the order
- Issues it to every selected assignee (each gets their own copy in their Orders tab)
- Does NOT advance any rail — orders are independent of rail flow
- The order also appears in the issuer's **Admin → Orders** tracking page (see `03_admin.md` Orders Admin)

**Permission to issue orders:** Org-chart-derived authority — the issuer must be at or above the recipient in the org chart. The "Can issue orders to people outside their direct reports" checkbox extends this beyond the standard constraint. See `00_overview.md` Section 4.

#### "Create Program" button (planned, not yet built)

When Programs are implemented, a third button will appear here for posts authorized to create programs. This will open the Program Builder (manager's planning surface) — separate from My Actions, but launched from this top-right cluster. See `04_programs_orders.md`.

---

### EMPTY STATES

- **Cycles tab empty:** "No cycles in your queue. New work will appear here when it's issued."
- **Orders tab empty:** "No orders. Orders issued to you will appear here."
- **To Dos tab empty:** "No to-dos yet. Add personal items from a cycle or use the + button."

[TBD — exact empty state copy]

---

---

## SCREEN: Cycle Detail (clicked from a cycle tile in My Actions)

**PURPOSE:** The full execution surface for a single cycle. This is where the employee actually does the work, fills in manifest data, completes the checklist, and triggers the handoff to the next terminal.

**ROUTE:** `/my-actions/cycle/[cycle-id]`

**ACCESS:** The employee assigned to this cycle. Managers with authority over the assigned employee's post can also open the page and take actions on the cycle (see "Manager actions on a junior's cycle" below).

**ENTERED FROM:** Clicking a cycle tile in the Cycles tab.

---

### LAYOUT

- **Top-left:** Back arrow + cycle name (e.g., "Director Resolution Review")
- **Top-right:** Type badge (e.g., "Task" / "Approval" / "Loop Back" / "Stuck Initializer" — see "Why no Pending/In Progress" in the My Actions section above)
- **Main column (left/center):**
  - Rail Position visual
  - Rail progress card
  - Task Description
  - Checklist
  - Loop Back + Complete Task buttons
  - To Dos sub-section
  - Comments sub-section
- **Right column (sidebar panel):** Two tabs — **Manifest Data** | **SOP & Tools**

---

### MAIN COLUMN ELEMENTS

#### Rail Position visual (top of main column)

A simplified inline visualization of where this cycle sits within the larger rail. Rendered as a horizontal sequence of circles (consistent with the Rail Run Detail "eagle eye" diagram from `03_admin.md`).

- **Each circle = one node in the rail**, in sequence
- **Circle states:**
  - **Completed** (green checkmark): step has been done
  - **Active** (orange/red highlighted, larger): the current cycle (this one)
  - **Upcoming** (gray): future cycles not yet reached
- **Each circle is labeled** with the node name (e.g., "Complaint Intake", "Front-Line Resolution", "Director Resolution...", "Financial Concession...", "Case Close & Post-Mortem") and the assigned post (e.g., "Account Manag...", "Owner / Director")
- **Header text:** "RAIL POSITION — 3 of 5"
- **"View full rail →" link** (top right of this section): opens the full Rail Run Detail page from `03_admin.md`
- **Horizontal scroll arrows** if the rail has more nodes than fit in the visible width

This gives the employee context: they can see what came before, what's coming next, and who's responsible for each step. It's eagle-eye orientation — not interactive editing.

#### Rail progress card

Below the position visual, a card showing:

- **Rail name** (e.g., "Client Upset Resolution Rail")
- **Status badge** ("Active")
- **Progress bar** with node count (e.g., "5 / 7 nodes")
- **NEXT STEP section:** shows the next cycle in the rail with its name, type badge ("Approval"), and assignee ("Assigned next to: Owner / Director")

This tells the employee what their work is feeding into next — it makes the handoff visible and creates accountability for quality (if I do my work badly, it's about to land in a specific person's lap).

#### Task Description

A read-only block showing the description text of this Task node, as defined in the Rail Builder. Example: "Director reviews the full case, speaks directly with the client, and decides the official resolution path (retain / goodwill credit / refund / accept churn)."

#### Checklist

The checklist items defined on this Task node in the Rail Builder, rendered as checkboxes.

- **Each item:** checkbox + item text + (if applicable) **"Required" red asterisk**
- **Header:** "Checklist" with progress count on the right (e.g., "0 / 3" or "3 / 3")
- **Behavior:** clicking a checkbox marks the item complete. Required items must be checked before "Complete Task" becomes active. Non-required items are optional.
- **Visual on completion:** completed items show with strikethrough text and a colored (orange) checkbox

#### Loop Back button + Complete Task button

A horizontal pair of buttons below the checklist.

##### Complete Task button (orange)

**Disabled state:** Opaque/grayed out when required checklist items are incomplete OR required manifest fields are unfilled. Cannot be clicked.

**Active state:** Solid orange when all required items + required manifest fields are complete. Clickable.

**TRIGGER:** click
**ACTION:**

1. Marks the cycle as complete
2. Removes the cycle tile from this employee's My Actions
3. Advances the particle to the next terminal on the rail
4. Issues a new cycle tile to the next assigned post (per rail definition + assignment mode — Static / Round-robin / Manager-assigned / Conditional)
5. Updates the manifest with whatever was filled in during this cycle
6. Logs the completion in the rail's audit trail with timestamp + acting employee

This is the conveyor-belt moment from the thesis. The button is the handoff.

##### Loop Back button (outline, with curved-arrow icon)

**Always available** (no pre-conditions to enable).

**TRIGGER:** click
**ACTION:** opens **Loop Back modal**

**Loop Back modal contents:**

- **Title:** "Loop Back"
- **Recipient picker** (required) — which previous post/employee on this rail is being looped back to. Dropdown lists every prior cycle on the rail with its post + employee. Default: most recent prior cycle.
- **Reason field** (required, textarea) — "Explain why you're sending this back." Free text. Mandatory because Loop Back without a reason is a Slack chase, not accountability. The reason is preserved permanently in the rail's audit log.
- **Optional file attachments**
- **Cancel** + **Send Loop Back** (orange) buttons

**On Send Loop Back:**

1. The current cycle **stays in the looper's My Actions** (unchanged — they still need to complete it eventually)
2. A **duplicate "Loop Back" cycle ticket** is generated and sent to the recipient post's My Actions
3. The duplicate ticket is visually marked: **red or orange tile** with **bold "LOOP BACK" label**, the looper's name, the reason, and a link back to the original cycle
4. The audit log records the loop-back event with full context
5. The recipient handles the loop-back by opening it and reviewing what's needed

**Why Loop Back exists structurally:** without it, the implicit cultural pattern in any operational team is "the previous step was sloppy, but I'm the one who has to fix it because I can't move forward otherwise." That's how bad work gets normalized. Loop Back forces the screw-up back to the screwer-upper, with their name on it, in their inbox, with a written reason. It's accountability through UI rather than interpersonal pressure.

---

##### Working a Loop Back (recipient side)

When an employee opens a Loop Back tile from their inbox, the Cycle Detail page renders almost identically to a normal cycle, with a few key differences:

- **Header banner:** Bold "LOOP BACK FROM [Looper Name]" with the reason quoted prominently. This is the first thing the recipient sees.
- **Original cycle reference:** Link to the cycle that triggered the loop-back, so the recipient can see what downstream work is being held up.
- **Same checklist + manifest panel** as the original cycle they ran — but with the data pre-filled from when they originally completed it. They review, fix what's wrong, and re-submit.
- **The Complete Task button is renamed "Complete Loop Back"** (orange, same position, same disable behavior — gated on required checklist + manifest fields).
- **Mandatory completion notes field** (above or next to Complete Loop Back): "What did you find? What was missing? Any recommendations for the rail?" Free text. This is how the recipient documents what actually happened so the manager can see it later.

**On Complete Loop Back click:**

1. The duplicate Loop Back tile leaves the recipient's inbox
2. The completion notes are recorded in the audit log
3. The original looper's cycle is updated with the corrected manifest data (so when they go back to their cycle, the missing info is now there and they can complete their work)
4. **Stat protection:** if the recipient indicated in their notes that the loop-back was sent in error or unnecessary, this is captured as audit data and the recipient's stats are NOT marked with a negative loop-back. Manager review may follow.

**Why the completion notes matter:**

- Protects the recipient from unfair negative marks if the loop-back was a false alarm
- Gives managers data on which rails are generating excessive loop-backs (signal of a poorly-designed rail step or a chronically-bad employee)
- Captures rail-improvement suggestions at the moment they're discovered

---

##### Loop Back contestation (handled out of band)

If the recipient disagrees with a loop-back, **Pathway does NOT provide an in-app contestation system.** The recipient is expected to call or message the looper directly to clarify. Pathway is not a chat tool — it's a workflow infrastructure. Direct human communication for disputes is normal and encouraged.

If the loop-back was sent in error, the recipient's completion notes capture that context. Managers reviewing loop-back stats will see the explanation and understand whether the recipient was at fault or whether the looper jumped the gun.

**Why no in-app contestation:** building a contestation flow would create endless ping-pong between employees inside the system, turning Pathway into a passive-aggressive Slack. The structural choice is: the system flags the issue and provides accountability infrastructure (loop-back tile + reason + completion notes), but the actual interpersonal resolution happens outside the system, like adults.

---

##### Multi-target Loop Back (deferred)

A loop-back currently goes to **one specific prior cycle/post**. If the looper finds that multiple prior steps have problems, they send **multiple separate loop-backs** — one to each responsible post, each with its own reason. They may also message those people directly to coordinate.

**Why this is the right call for V1:** building a multi-target loop-back UI (pick three prior cycles, write a different reason for each, fan out duplicates) is doable but adds complexity that hasn't been tested with real users yet. The manual workaround (multiple separate loop-backs) is workable in the rare cases it happens. Revisit after V1 if usage patterns justify it.

**Manager benefit of multiple loop-backs:** when a manager sees three loop-backs on the same rail in the same week, that's a strong signal the rail is poorly designed. Loop-back data is valuable for continuous rail improvement.

[TBD — chained loop-backs (recipient loops it back further to someone before them) — possible but deferred until multi-target is built. For now, treat each loop-back as a single hop.]

#### To Dos section

A scoped to-do list specific to this cycle. Allows the employee to add personal sub-actions while working the cycle.

- **Header:** "To Dos"
- **Add input row:** text input "Add a to-do..." + date picker + **Add** button
- **List of to-dos:** each with checkbox, text, optional due date, delete (trash) icon
- **Visibility:** these to-dos also appear in the My Actions To Dos tab, grouped under this cycle (per the To Dos tab grouping rule)
- **Persistence:** to-dos created here are tied to this cycle. When the cycle is completed and moves to the next terminal, the to-dos **archive with the cycle** — they're no longer visible in the live To Dos tab. The audit log preserves them for historical lookup if needed, but employees don't need to see completed-cycle to-dos cluttering their inbox.

This is where the "creative director needs to schedule another client meeting" example from your dictation lives. The cycle itself doesn't need to predict every meeting that might happen — the employee adds them as to-dos as the work unfolds.

#### Comments section

Free-form comments thread for this cycle. Used for handoff notes, questions, or context that other people working the rail might need to see.

- **Header:** "Comments" with comment icon
- **Add comment input:** textarea "Add a comment. Use @email to mention a teammate..."
- **@-mention support:** typing @ followed by an email triggers a teammate picker; mentioning someone notifies them
- **Attach files** button (paperclip icon) — file attachment for comments
- **Add comment** button (orange)
- **Comment list** below — each comment shows author, timestamp, body, and any attached files
- **Empty state:** "No comments yet. Add context, handoff notes, or questions here."

---

### RIGHT COLUMN — MANIFEST DATA TAB

The right sidebar has two tabs: **Manifest Data** and **SOP & Tools**.

#### Manifest Data tab (default)

The full manifest form for this rail run. Every field is shown, in the order defined by the manifest template, with any field-level permissions applied (hidden fields not shown).

**Field rendering:**

- Each field appears with its label, type-appropriate input, and **red asterisk if required for this specific cycle** (per the Task node's Required Fields configuration)
- Already-filled fields from prior cycles are pre-populated and **editable** by the current cycle's employee. Edits are captured in the audit log with timestamp and acting user.
- **Why editable, not read-only:** real example — a lead is captured with "Sarah D" because the lead-intake person didn't get a last name. The sales person later has a full conversation and gets "Sarah Druskin." The downstream person needs to be able to correct the data. Same goes for business names that get updated, addresses that get clarified, contact info that turns out to be wrong. This is just like pen and paper — someone should be able to scratch out and correct, and the audit log preserves history.
- **Manifest lock/unlock toggle:** to prevent accidental deletion of valuable data, the manifest panel has a **lock toggle**. By default the manifest is locked (read-only). The employee clicks unlock to make fields editable, makes the change, and the field saves. This is friction against accidental edits, not a permission system. Anyone with cycle access can flip the lock.
- Empty fields can be filled in by this cycle's employee
- **Required-field gating:** all fields marked required for this Task node must be filled before "Complete Task" becomes active

**Persistence across the rail:** Data filled at any cycle stays visible and editable at every subsequent cycle (per the manifest persistence rule from `03_admin.md`). This isn't a per-cycle form — it's the same manifest, growing as the particle moves.

**Field types** are inherited from the manifest template — see `03_admin.md` Manifest Builder for the full list.

**Files attached at any cycle should propagate through the entire rail.** The primary file location is a **dedicated "Files" section at the top of the Manifest Data tab** (above the form fields). Any cycle can upload files there, and downstream cycles see them all in one place. File attachment in the Comments section is also kept for inline conversational use (e.g., "here's the screenshot I'm asking about"), but the Files section in the manifest is the canonical store.

#### SOP & Tools tab

A simple list of links the employee may need to do this cycle well. Each link is a hyperlink to an external resource.

**Two categories of links:**

- **SOPs / Policies** — internal documentation on how to do this work. Examples: "Financial Concession Policy", "Escalation Review Guidelines", inspection photo standards, design specs, chemical specifications.
- **Tools** — direct deep-links to the external tools where the work actually happens. Examples: a link straight to the client's Canva file, a link to the QuickBooks proposal template, a link to a Google Drive folder, a link to a specific Notion page.

**Each link is rendered as a button-style row** with the link's title and an external-link arrow icon.

**Why this exists:** Pathway is the workflow/routing layer, not the production tool. The actual work happens in Canva, QuickBooks, Figma, Google Docs, etc. SOP & Tools is how Pathway hands off cleanly to those external tools — the employee doesn't have to hunt for the right file or remember the right policy doc, because both are right there next to the cycle. This dramatically reduces friction and forgotten-step errors.

**Defined where?** Links in this tab are configured per Task node in the Rail Builder, in the "SOP & Tools" section of the Task node properties panel. The rail designer adds the relevant links once when building the rail, and they show up here for every cycle that runs through that node.

---

### HEADER BADGES (top-right of cycle detail)

- **Type badge** — shows the cycle type: "Task" / "Approval" / "Loop Back" / "Stuck Initializer". For Approval-type cycles, the badge says "Approval"; for Statistic, "Statistic"; etc.

**Why no status badge:** Pathway does not use Pending / In Progress / Blocked statuses. Type is what matters — the kind of work, not an artificial progress state. See the "Why no Pending / In Progress / Blocked statuses" section in My Actions above.

---

### MANAGER ACTIONS ON A JUNIOR'S CYCLE

When a manager (anyone with authority over the assigned employee's post) opens a Cycle Detail page belonging to a junior, they can take **all the same actions the assigned employee can take**: check off checklist items, edit manifest data, leave comments, even click Complete Task to force-complete the cycle.

**Why this exists:** real operational scenarios require it.

- **Sick / parental leave / fired:** the assigned employee isn't available to handle their cycles. Reassignment is one option, but if there's no one else to reassign to (small team, specialized role), the manager has to step in directly and clear the work.
- **In-meeting blocker:** the sales person is in a meeting with a major client, an Approval cycle lands in their inbox, and someone needs to sign off NOW. The manager has authority to handle it on the sales person's behalf so the rail doesn't stall.
- **Quality intervention:** the manager can spot-check work in progress and correct mistakes mid-flow.

**"Manage as" toggle:** to prevent accidental clicks (a manager just looking at a cycle and accidentally completing it), entering action mode requires the manager to flip a **"Manage as [Employee Name]"** toggle at the top of the Cycle Detail page. Toggle off = read-only view. Toggle on = full action access. The toggle's state is visually obvious (different background color or border on the page) so the manager always knows when they're in action mode vs viewing.

**Audit log:** every action taken in "Manage as" mode is logged with both the acting manager's name and the assigned employee's name, so the trail is clear: "Sage Epic completed checklist item on Erik Roh's cycle."

---

### CANCELLED CYCLES

When a manager cancels a rail run (via the **Cancel this run** action button on the Rail Run Detail page in `03_admin.md`), any cycles currently sitting in employee inboxes for that rail are removed.

**Behavior:**

1. The cycle tile **vanishes from the assigned employee's My Actions** immediately
2. A **notification fires to the affected employee** through the bell-icon notification system: "Your cycle [Cycle Name] on [Rail Name] was cancelled by [Manager Name]. Reason: [cancellation reason]."
3. The cancellation event is logged in the audit trail

The employee doesn't get to keep working a cycle that no longer exists, but they do get a clear explanation of why it disappeared, so they're not confused.

---

### EDGE CASES / OPEN QUESTIONS

- **Cycle tile click while another employee has the same cycle open** — concurrency model TBD. Two employees can't simultaneously complete the same cycle (only one assignee per particle at a terminal), but managers viewing might overlap.
- **Tile color gradient** — exact color stops for time temperature (cool, warm, hot, urgent)
- **Approval-node cycles** — when the cycle is an Approval node rather than a Task node, how does Cycle Detail render? Probably just two big Approve / Reject buttons in place of the checklist + Complete Task. Needs its own spec session (parked under non-Task node property panel TBDs).
- **Failed Initializer cycles** — these have been spec'd as "Stuck Initializer" tiles in the Cycles inbox. Detailed Cycle Detail rendering for these is TBD: probably shows the partially-filled initializer form with the missing required fields highlighted and a "Resume" / "Discard" affordance.

---

---

## SCREEN: Dashboard

**PURPOSE:** The user's customizable personal landing page. A high-level glance at "what matters most" — assembled from configurable tiles that the user picks themselves. Different from My Actions (forced ticket queue) and Calendar (forced time projection) — the Dashboard is **opt-in personalization**: the user chooses which tiles to see and how to arrange them.

**Default landing page.** When a user logs into Pathway, they land here first — getting a moment of orientation before diving into the work. My Actions is one click away if they want to skip the orientation.

**ROUTE:** `/dashboard`

**ACCESS:** Every authenticated employee. Same Post Profile scoping as My Actions and Calendar.

**PARENT NAV:** Workspace → Dashboard (sidebar, top of the workspace nav group)

---

### LAYOUT (view mode)

- **Left sidebar (global nav):** Standard Pathway nav, Post Profile switcher, Org Switcher
- **Header:** Breadcrumb (`WORKSPACE > DASHBOARD`), screen title "Dashboard", subtitle "Your personalised view of what matters most."
- **Top right:** **Edit Dashboard** button (pencil icon)
- **Top of page (managers + multi-post employees):** Dashboard tabs — see Dashboard Tabs section below
- **Main area:** A grid of tiles arranged in rows. Tiles flow left-to-right, wrap to next row when full, with sizes determining width.

---

### TILE SIZING

Tiles have three width sizes, set in edit mode:

- **Size 1** — narrow (roughly quarter-width of the main content area). Good for compact stats and short lists.
- **Size 2** — medium (roughly half-width). Good for lists with a few items, like My Tasks or Loop-backs.
- **Size 3** — wide (roughly three-quarters or full width). Good for charts, calendar previews, activity feeds.

Tile heights are auto-determined by content. There is no manual height control in V1.

[TBD — exact column count and breakpoint behavior on smaller screens. V1 assumes desktop; mobile rendering will likely collapse to single-column stack.]

---

### LAYOUT MODEL

The dashboard uses a **simple drag-and-drop flow layout**, not a strict grid system or freeform Miro-style canvas. The goal is "easy and obvious," not "infinitely flexible."

- Tiles flow left-to-right within rows, wrapping to the next row when the current row fills up
- The user drags tiles to reorder them in edit mode
- Width comes from the size selector (1/2/3); height is auto
- Tiles snap into the flow naturally — no pixel-perfect positioning required
- Empty space at the end of a row is just empty; the user doesn't need to manage gaps

Keep it simple. Don't overthink the layout engine.

---

### EDIT MODE

Triggered by clicking **Edit Dashboard** in the top-right. When active:

- **Top-right button changes** from "Edit Dashboard" to **"Done"** (orange) — click to exit edit mode and save
- **Every tile gets a red ✕ delete button** in its top-right corner — click to remove the tile
- **Every tile gets a size selector** at its bottom edge: small numbered buttons "1 / 2 / 3" — current size highlighted in orange — click another number to resize the tile
- **Tiles become draggable** — the user can grab a tile anywhere on its body and drag it to a new position. Other tiles reflow to make room.
- **An empty "+ Add Tile" placeholder** appears at the end of the existing tiles. Click it to open the **Add Tile modal** (see below).

Exiting edit mode by clicking **Done** saves the layout to the user's preferences (per dashboard, per Post Profile).

---

### ADD TILE MODAL

Triggered by clicking the "+ Add Tile" placeholder in edit mode.

**Modal contents:**

- Title: "Add a Tile"
- Grid of tile type cards, each with:
  - Tile type name (e.g., "KPI Stat", "My Tasks")
  - One-line description of what the tile shows
- **Cancel** button + **Add Tile** button (orange, enabled once a type is selected)
- After adding, the new tile appears in the dashboard at the next available position with default size 2

**V1 tile catalog (what appears in the modal):**

| Tile Type                         | What it shows                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KPI Stat**                      | A mini chart for one of your tracked statistics. Pulls from the statistic catalog defined in `06_statistics.md`. When added to the dashboard, the user picks which stat to display via a searchable dropdown (respecting their visibility scope). |
| **My Tasks**                      | Your active cycles and approvals from My Actions, abbreviated list with click-through to individual cycles                                                                                                                                        |
| **Loop-backs**                    | Tasks that have been sent back to you for action, with a count and quick-access list                                                                                                                                                              |
| **Orders Inbox**                  | Standalone orders assigned to you, pulled from My Actions Orders tab                                                                                                                                                                              |
| **Org Overview**                  | High-level rail KPIs for your organisation — Active Flows, Completed, Cancelled, Avg. Completion (this is the four-stat row visible in screenshots; full stat catalog deferred to Statistics screen session)                                      |
| **Calendar Preview**              | Next 7 days of dashboard events from the Calendar screen, condensed to a mini agenda view                                                                                                                                                         |
| **Active Programs**               | Programs you currently own or run, with progress indicators and quick access to each                                                                                                                                                              |
| **Recent Activity**               | Feed of recent completions, loop-backs sent and received, cycles passing through your terminal                                                                                                                                                    |
| **Notification Feed**             | Inline view of bell-icon notifications without needing to open the dropdown — useful if the user wants notifications visible at a glance                                                                                                          |
| **Team Workload** (managers only) | Heat-map of team members' current workload with time temperature indicators — surfaces overloaded employees and clear capacity. Permission-scoped to the manager's authority.                                                                     |

[TBD — additional tile types as customer feedback comes in. Examples to evaluate later: "Manager Nudges Outstanding", "Particle Spotlight" (pin a specific particle's status), "Today's Schedule" (calendar focused on just today).]

---

### TILE INTERACTION (view mode)

Tiles are interactive in two ways:

- **Inline interactivity within the tile** — where it makes sense, items inside a tile are clickable. Examples:
  - In the **My Tasks** tile, clicking a listed cycle name opens that specific Cycle Detail
  - In the **Active Programs** tile, clicking a program name opens that Program Detail
  - In the **Notification Feed** tile, clicking a notification jumps to the relevant cycle, just like in the bell dropdown
- **"View all →" link at the bottom of each tile** — every tile has a link in its footer that goes to the full screen behind it. Clicking "View all" on My Tasks goes to My Actions. Clicking "View all" on Loop-backs goes to the My Actions Cycles tab filtered to loop-backs. Clicking "View all" on Calendar Preview goes to the Calendar screen. Etc.

The combo means: the dashboard is fast for the common case (glance and click into a specific item), and one click away from the full experience for everything else.

---

### DASHBOARD TABS (managers + multi-post employees)

Most users see a single dashboard — their own Personal dashboard scoped to their active Post Profile.

**Managers and multi-post employees** get a **tab system** at the top of the Dashboard screen, allowing them to maintain multiple dashboards for different scopes:

- **Personal tab** (default) — the user's own dashboard for their currently-active Post Profile
- **Custom dashboard tabs** — additional dashboards the user creates manually for specific scopes

**Adding a dashboard tab:**

A user clicks **"+ Add Dashboard"** at the end of the tab row. They're prompted to:

1. **Name the dashboard** (e.g., "Marketing Department", "Sarah's Dashboard", "PM + Lead Materials Combined")
2. **Select which Posts to scope it to** — a multi-select picker showing every Post the user has authority over (their own posts + any junior posts they manage). They can pick one or many.
3. The new tab appears in the tab row, scoped to the chosen posts. The user can customize its tiles independently from other tabs.

**Why this design:**

- **For managers:** A project manager with three reports can build a dashboard tab for each report individually ("Sarah", "Bob", "Jerry") to monitor their work, plus one for the team as a whole ("My Team"), plus their own Personal tab. Each tab shows tiles scoped to that subset of the org.
- **For multi-post employees:** Someone who holds both "Project Manager" and "Lead Materials Purchaser" posts can either toggle between two Personal dashboards via the Post Profile switcher, OR create a single "Combined" dashboard tab that shows tiles aggregating both posts' data. Their choice — neither approach is forced.

**Permission scoping:**

The Posts a user can include in a custom dashboard are determined by their org chart authority:

- **CEO / Owner** — can include any Post in the org
- **Department head** — can include any Post within their department
- **Section / Unit lead** — can include any Post within their section/unit
- **Individual contributor with multiple posts** — can include their own posts only
- **Individual contributor with one post** — does not see the "+ Add Dashboard" affordance at all (no scopes available beyond their single Personal default)

This is org-chart-derived authority — the same rules from `00_overview.md` Section 4.2. A user can scope a custom dashboard tab to any Post they have authority over (their own posts plus any posts below them in the org chart).

**Tab management:**

- Tabs can be reordered by drag (left/right within the tab row)
- Tabs can be renamed by double-click on the tab title
- Tabs can be deleted via a × button on the tab in edit mode
- The Personal tab is **not deletable** — every user always has at least their own Personal dashboard
- Each tab maintains its own independent tile layout, saved per-user

---

### POST PROFILE SCOPING

For users with multiple Posts, the **Personal dashboard tab** auto-scopes to the currently-active Post Profile (set via the Post Profile switcher in the top-left sidebar).

Switching the Post Profile updates the Personal tab's contents to show that post's data — same scoping behavior as My Actions and Calendar. This means a multi-post employee effectively has multiple Personal dashboards (one per Post), accessed via the profile switcher.

If they prefer a unified view, they can create a custom dashboard tab that combines multiple of their own posts (per the Dashboard Tabs section above). Custom tabs are NOT affected by the Post Profile switcher — they always show the posts they were configured for.

---

### EDGE CASES / OPEN QUESTIONS

- **Empty dashboard state** — what does the dashboard look like for a brand-new user who hasn't added any tiles yet? Probably ships with a default tile set: My Tasks, Loop-backs, Orders Inbox, Org Overview, Calendar Preview. The user can edit/delete from there.
- **Tile data freshness** — do tiles refresh on page load only, or poll for updates? My instinct: refresh on page load, with optional manual refresh button per tile. Real-time polling adds load and isn't necessary for most tiles. The Notification Feed tile may need light polling to stay current.
- **Tile permission failures** — what if a manager creates a dashboard tab scoped to a junior, then later loses authority over that junior (junior moves to a different department)? The tab should either become read-only with a "permission lost" indicator or auto-delete with a notification. [TBD]
- **Tile-specific configuration** — some tiles may need their own settings (e.g., KPI Stat needs to know _which_ statistic to show; Calendar Preview might allow "next 7 days" vs "next 14 days"). Tiles that need configuration should open a small settings panel when added, before they appear on the dashboard. [TBD — exact settings UI per tile type, deferred to per-tile spec sessions.]
- **Dashboard sharing / templates** — out of scope for V1. A future feature could let users share dashboard layouts as templates (e.g., "Standard PM Dashboard" pre-built by the company admin and assignable to all PMs).

---

## SCREEN: Calendar

**PURPOSE:** Time-axis projection of the user's Pathway work. Shows when cycles, orders, to-dos, and recurring rail-issued work are due — at a glance, mapped across days.

**Critical scoping note:** This is **NOT a general-purpose calendar.** It is not meant to replace Google Calendar, Outlook, or any meeting/personal-event tool. It only shows things that exist inside Pathway and have a date attached. No meetings. No personal events. No external calendar sync (at least not in V1).

The calendar is the time-axis equivalent of My Actions: same scope, same data, different visualization. Where My Actions answers "what's in my queue right now?", the Calendar answers "when is my queue due?"

**ROUTE:** `/calendar`

**ACCESS:** Every authenticated employee. Same Post Profile scoping as My Actions — see Post Profile Switcher in the My Actions section.

**PARENT NAV:** Workspace → Calendar (sidebar)

---

### LAYOUT

- **Left sidebar (global nav):** Standard Pathway nav. Same Post Profile switcher / Org Switcher as My Actions.
- **Header:** Breadcrumb (`WORKSPACE > CALENDAR`), screen title with current month/year ("April 2026")
- **Top right:** **Today** button (jumps to current date) + prev/next month arrows
- **Top right (managers only):** **Personal | Team** tab toggle — see Manager Calendar Tabs section below
- **Filter bar:** Filter dropdown for event types — see Filtering section
- **View toggle:** Month / Week selector — see Views section
- **Main area:** Calendar grid (7-column week, multi-row month) showing event tiles on each date cell

---

### VIEWS

The calendar supports **two views**:

- **Month view (default)** — full month at a glance, 7 columns (Sun–Sat), one cell per day. Best for high-level "what's coming up this month."
- **Week view** — single week, more vertical room per day. Best when there's a lot stacked on individual days and you need detailed visibility.

**Day view is intentionally not included.** A day view would mostly duplicate what My Actions already shows for "today" and would add clutter without value. If a user wants to see today's work in detail, they go to My Actions.

---

### EVENT RENDERING ON A DATE CELL

When multiple items fall on the same date, the calendar shows the **first 2–3 items inline**, then a **"+ N more" overflow link** for the rest. Clicking "+ N more" opens a popover or expanded view showing all items for that day.

Each event tile on a date cell shows:

- **Color band / left border** indicating the event type (see Color Coding below)
- **Type icon** (small leading glyph)
- **Truncated event name** (e.g., "Director Resoluti...")
- **Optional time temperature** for cycle events (see Time Temperature below)

This is the same overflow pattern Google Calendar and most modern calendars use — familiar UX, no learning curve.

---

### COLOR CODING + ICONS BY EVENT TYPE

Each event type gets a distinct color band and icon prefix so users can scan the calendar and triage at a glance:

| Type                     | Color  | Icon              | What it represents                                                                                    |
| ------------------------ | ------ | ----------------- | ----------------------------------------------------------------------------------------------------- |
| **Cycle**                | Orange | ✓ (checkbox)      | A rail- or program-issued cycle in the user's My Actions queue                                        |
| **Order**                | Blue   | 📋 (clipboard)    | A standalone order issued via the Issue Order button                                                  |
| **To Do**                | Gray   | • (dot)           | A personal to-do with a date attached                                                                 |
| **Recurring rail cycle** | Purple | ↻ (refresh/cycle) | A scheduled or recurring rail-issued cycle from a Scheduled/Recurring Initializer (see `03_admin.md`) |

[TBD — exact color hex values to be tuned during build, but the conceptual mapping above is locked in.]

---

### TIME TEMPERATURE INTEGRATION (cycle events only)

Cycle events on the calendar inherit the **time temperature** behavior from My Actions tiles:

- Cycle events approaching their Ideal Time start shifting from cool orange to warmer orange to red
- Overdue cycles render with a red indicator on the calendar tile
- Hovering an overdue cycle tile shows the exact time temperature ("3 days overdue")

Orders and To Dos do not have time temperature (no Ideal Time concept). They use static type-based colors only.

This makes the calendar a useful **escalation surface** as well as a planning surface — a manager scanning the upcoming week sees red tiles and knows where to intervene before things slip further.

---

### RECURRING RAIL CYCLES — PRESENT AND FUTURE

This is the one place the calendar **breaks the "you only see what's in your inbox" rule**, and intentionally so.

For **recurring rail-issued cycles** (rails started by a Scheduled/Recurring Initializer — see `03_admin.md`), the calendar shows both:

- **Currently issued recurring cycles** (the ones already in the user's inbox) — rendered as solid tiles
- **Projected future recurring cycles** that haven't been issued yet — rendered as **ghosted/lighter tiles** so users can see the schedule going forward

**Why this is allowed for recurring rails specifically:** the whole point of a Scheduled/Recurring Initializer is that the work is _predictable_. The user already knows their Monday inspection is happening every Monday. Hiding the future occurrences would force them to check a separate schedule somewhere. Showing them on the calendar is genuinely useful for personal time-blocking and planning.

**Why this is NOT extended to other future work:** for non-recurring cycles, future cycles haven't been issued yet, the assignee hasn't been determined, and showing them would reintroduce the buffet problem the thesis exists to prevent. The recurring case is the _only_ exception because the schedule is locked at the rail level, not the issuance level.

**Visual distinction:** ghosted future tiles render at ~40% opacity with a dashed border or similar treatment. Hovering shows "Scheduled — not yet issued." Clicking jumps to the rail definition (not a cycle detail page, since the cycle doesn't exist yet).

---

### EVENT INTERACTION

- **Click any event tile** → jumps directly to its detail page (Cycle Detail for cycles, Order expanded view for orders, the cycle the to-do is attached to for to-dos, the rail definition for projected future recurring tiles)
- **Hover an event tile** → tooltip with full name, particle/rail context, and time temperature (if applicable)
- **Click an empty date cell** → no action in V1 (this is not a general calendar, you can't "create an event")

---

### CANCELLED AND COMPLETED EVENTS

**Cancelled events:** removed from the calendar entirely. If a cycle gets cancelled by a manager, it disappears from the calendar at the same time it disappears from My Actions. The calendar reflects current reality, not history.

**Completed events:** stay on the calendar **on the date they were completed**, rendered with a **checkmark indicator** and faded styling. This makes the calendar double as a passive "what I got done this week" view, useful for retrospective and personal accountability without any extra effort. Completed events are not interactive in the same way live events are — clicking them opens the archive view of the completed cycle/order, not the live execution surface.

---

### MANAGER CALENDAR TABS — Personal | Team

**For users who manage other employees**, the calendar adds a tab toggle at the top:

- **Personal tab (default)** — same as the regular employee view: only shows events from the manager's own active Post Profile
- **Team tab** — shows events from every Post in the manager's area of authority, layered together. Useful for capacity planning ("when does my whole team have heavy days coming up?") and load balancing.

**Without this split, a manager's calendar would be unusably cluttered** — managers have their own cycles AND oversight visibility into their team's cycles, and dumping all of that into a single view defeats the purpose.

**Team tab behavior:**

- Events from different employees are color-coded by employee (in addition to type-based icon prefix)
- A legend in the sidebar shows which color = which employee
- Clicking an event in Team view opens the cycle in "view as manager" mode (read-only by default; manager can flip the "Manage as [Employee]" toggle to take action — same mechanic as Cycle Detail for managers in `02_workspace.md`)

**Permission scoping:** the Personal/Team toggle only appears for users who actually have direct reports (per the org chart). Individual contributors with no juniors don't see the toggle at all — their calendar is implicitly Personal-only.

**Authority resolution for Team view:** A user sees every Post within their **full area of authority**, not just direct reports. A Section lead sees all Posts under their Section (any depth). A Department head sees all Posts in the Department. The Owner sees the entire org. This matches the org-chart-derived authority model from `00_overview.md` Section 4.2 and is consistent with how Rail Activity, Admin Programs, and dashboard tab scoping work.

---

### FILTERING

A filter dropdown above the calendar grid lets the user narrow what's shown. Filter dimensions:

- **Event type** (multi-select): Cycles / Orders / To Dos / Recurring rail cycles. Default: all types shown.
- **Particle type** (multi-select): filter to events related to specific particle types (e.g., "only show Client cycles" or "only Lead cycles")
- **Particle instance** (multi-select): filter to events for a specific particle (e.g., "only show ABC CORP events")
- **Rail** (multi-select): filter to events from specific rails
- **Time temperature** (single-select threshold): "Show only overdue" / "Show warm or hotter" / "All"
- **Completed events** (toggle): show/hide completed event records on the calendar

**Filter persistence:** filter selections are saved per-user across sessions, so a user who always wants "only Cycles + Orders, no recurring stuff" doesn't have to re-set it every visit.

[TBD — does the filter dropdown also include a "by employee" filter when in Manager Team view? Probably yes for managers with large teams.]

---

### EDGE CASES / OPEN QUESTIONS

- **Multi-day events** — if a cycle has both an issuance date and a due date several days later, does it span those days on the calendar (like Google Calendar's all-day event bars), or only show on the due date? Likely only show on the due date for simplicity, with the issuance date visible in the hover tooltip.
- **Time of day** — V1 calendar is date-only. Does a cycle due "April 15 at 3pm" show up the same as one due "April 15 end of day"? V1: yes, both render on April 15 with no time-of-day distinction. Adding time-of-day rendering is a future enhancement.
- **Timezone handling** — the calendar respects the user's local timezone. Cycles issued from a rail in another timezone display in the viewer's local time.
- **iCal / Google Calendar export** — out of scope for V1. Pathway is not trying to replace external calendars; users who want their Pathway dates in their main calendar will need to manually create blocks. Export/sync is a future enhancement and a deliberate scoping choice (see Principle 5: Pathway is workflow infrastructure, not production tooling — and that includes calendar tooling).
- **Mobile rendering** — the month view doesn't fit well on a phone screen. Mobile likely defaults to week view or a list view. [TBD when mobile spec is captured.]
