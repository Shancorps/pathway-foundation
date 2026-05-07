# Pathway — Programs & Orders

> The planning layer that converts management thinking into enforced execution.
> Read `00_overview.md` first, especially the "tickets, not lists" thesis. Programs & Orders is a direct extension of that thesis to _dynamic_ and _unverified_ work — the stuff that doesn't yet have a Rail.

---

## STATUS

**Concept layer + Issue Orders flow: complete.**

**Deferred to later sessions (when UI exists):**

- Program Builder visual UI spec (canvas layout, drag/drop, right-panel editor for Action Items)
- Command View visual UI spec (full layout, metric tiles, real-time updates)
- Hosted web page experience for external recipients (vendor work packet page, client request page) — V1 is just "a link to a web page", richer portal experience deferred
- Program Templates (saving programs as reusable templates)

---

## 1. The Core Insight

Pathway's enforced rails excel at repeatable, well-defined workflows. But every company has work that **isn't yet repeatable** — custom delivery projects, first-time processes, one-off engagements, dynamic situations where the next step depends on what just happened. Rails can't enforce work that doesn't have a known shape.

**Programs are the planning surface for that messy middle.** They are unverified Rails — same underlying mechanics (steps, terminals, manifests, particles, VFP) but governed differently because the work is still being figured out as it happens.

The deeper definition: **A Rail is a verified Program. A Program is an unverified Rail.** They are not different _kinds_ of objects — they're the same kind of object at different points in their maturation.

| Concept     | Nature                       | Lifecycle                       | Enforcement                                          |
| ----------- | ---------------------------- | ------------------------------- | ---------------------------------------------------- |
| **Rail**    | Permanent workflow blueprint | Persists until formally updated | Full — steps locked, sequence enforced               |
| **Program** | Temporary project plan       | Created, executed, archived     | Soft — manager-controlled issuance, no auto-blocking |

A Program does not replace or compete with a Rail. It is the **thinking layer** that feeds the execution layer. Over time, Programs that recur enough times to stabilize _can_ be promoted into Rails — making Programs a natural prototyping surface for future enforced workflows. (Promotion-to-Rail is deferred as a feature; users who want to convert a successful program to a rail can manually rebuild it in Rail Management for now.)

---

## 2. The Strategic-vs-Tactical Distinction

The reason Programs and Rails coexist comes from how real organizations actually plan work. There are **two different planning modes** at play:

### Strategic planning (Rails)

The work is known. The pattern is verified. The steps are locked. The system enforces them. Employees execute without thinking about the structure — they just do what's in front of them, the rail handles routing, and the company gets repeatable wins.

### Tactical planning (Programs)

The work is dynamic. The shape is partially known but the interior is variable. The manager is **on the ground**, judgment is required, and the next step depends on what just happened. The system can't enforce a sequence because the sequence is being discovered in real time.

**Example: A construction site demolition.**

The rail says: "Survey site → put together a demolition program → execute demolition → wrap up, photos, verify."

The middle step is a **Program** because the manager doesn't know in advance whether there's a pool, a rose garden, vases that need protecting, or cement behind the wall they're tearing down. They walk the site, see the conditions, and build a plan in the moment. They issue work to their crew as they decide what needs to happen first. Some items they planned for end up being unnecessary. Some items emerge mid-job that they couldn't have predicted.

This is **tactical management**, and it's the core thing Programs exist to enable. A Rail would force the manager to either over-specify the demolition step (creating brittle structure that breaks on every job) or under-specify it (creating empty structure that doesn't help). A Program lets the manager build the plan that fits _this specific site_, dynamically, and issue it as they go.

---

## 3. The Cascade of Planning Levels

Programs map cleanly onto how organizational hierarchy actually works. Each level of the org chart **plans at a different level of abstraction**, and Programs cascade downward through delegation.

| Level                | Thinks at                                                        | Issues to       | Receives as                                    |
| -------------------- | ---------------------------------------------------------------- | --------------- | ---------------------------------------------- |
| **VP of Operations** | "Get this house remodeled"                                       | Project Manager | An objective + responsibility                  |
| **Project Manager**  | "We need demo done. What are the 4-5 things needed?"             | Lead/Foreman    | A high-level Program with broad action items   |
| **Lead/Foreman**     | "Here are the 4 things today. Figure out how and what you need." | Workers         | A more granular Program tactically fleshed out |
| **Worker**           | "Start on this, then this, then this."                           | (Themselves)    | Issued cycle tickets in their My Actions inbox |

Each level **converts a higher-level objective into a more granular plan.** The senior doesn't pre-plan the junior's program — the senior gives the junior the objective and the junior builds out their own program to satisfy it. **Delegation is re-planning at a lower abstraction level**, not just task-handing.

This means Programs need to be **hand-offable** to subordinates, with the expectation that the new owner will _expand_ the program before issuing. When a C-suite issues a 5-step Program to a manager, the manager receives it not as "execute these 5 steps" but as "expand these 5 steps into your own tactical Program for your team." The handoff is the moment of re-planning at a lower abstraction level.

---

## 4. The Parenting Model (issuance philosophy)

The cleanest analogy for how Programs issue work is parenting:

> A parent doesn't put a list of "brush teeth, clean room, get ready for school" on the wall and expect the kids to self-execute. The kids will get distracted, do nothing, get nothing done. Instead, the parent gives one order at a time. _"Go brush your teeth."_ Once that's done, _"Now make your bed."_ The parent holds the next order until the current one is finished. The parent thinks; the kid does.

Project management tools collapse this — they put all 47 items on the board and say "go." Programs separate it: the manager plans in private, then **issues work in waves** based on capacity, judgment, and what just happened.

This is why Programs have an **explicit Issue Orders moment** between planning and execution. The plan exists. The work isn't live yet. The manager decides when to release each piece. Workers see only what's been issued to them, in their My Actions inbox, just like every other Pathway cycle.

---

## 5. Core Vocabulary

### Program

A planning surface for dynamic, unverified, project-scoped work. Contains a list of Action Items, a Program Objective, a Target Completion Date, and an owner. Programs progress through three phases: **Plan → Issue Orders → Command View** (with execution happening in recipients' own inboxes during the Command View phase).

### Action Item

The discrete unit of work inside a Program. The manager plans Action Items in the Plan phase; the system converts them into live work when they're issued. Each Action Item has:

- A **name** and **description**
- An **assignment type** (Internal / External Vendor / External Client)
- A **recipient** (Post for internal, vendor contact for external, client contact for client)
- An **estimated duration** (optional)
- A **phase tag** (optional, for phased issuance)
- A **soft dependency** (optional — "awaits [other item]", advisory only, does NOT block issuance)
- **Attached materials** (files, specs, SOPs)
- **Required deliverables** (what the recipient must produce/upload/confirm)
- A **VFP standard** (the quality bar for completion)
- A **response window** (for external recipients only — how long they have to respond)
- A **per-item description** intended for the recipient (used in vendor work packet / client request emails — distinct from the manager's internal name for the item)

**Lifecycle:** Action Item → (issued) → Cycle (internal) / Vendor Work Packet (vendor) / Client Request (client). Once issued, the Action Item is "live" and the recipient sees it in their appropriate surface. The original Action Item record persists in the Program for tracking and audit.

### Order

An **Order is the act of issuing a step**. That's it. Universal definition.

When a Rail routes a cycle to a terminal, the system is technically issuing an order on the manager's behalf — automatically, structurally. We don't call it that because the rail handles it without human intervention.

When a manager clicks "Issue" on an Action Item in a Program, they're explicitly issuing an order — the same act, but human-initiated.

When a manager clicks the standalone "Issue Order" button on My Actions, they're issuing a one-off directive that isn't part of any Program or Rail — just a quick small ask.

All three are "orders" in the conceptual sense. The system disambiguates by context:

- **Standalone "Issue Order" button** — for one-off small directives that don't justify a Program. Lives on the My Actions top-right.
- **Issuance inside a Program** — labeled simply "Issue" or "Issue all" / "Issue phase 1" / "Issue single" depending on the mode. The button doesn't say "Issue Order" because the context is already clear.
- **Rail-issued cycles** — happen automatically; no UI label needed because the system handles them silently.

### Program Owner

The manager responsible for planning and issuing the program. Initially the creator, but can be **transferred** to a subordinate (delegation cascade — see Section 3). The new owner is expected to expand the program before issuing if needed.

### Issuer

The person who actually clicked "Issue" on a specific Action Item. Stored per-item for compliance routing — completion notifications fire back to the issuer, not necessarily the program owner. (In most cases they're the same person, but in handoff scenarios the issuer of a specific item is whoever was the active owner at the time of issuance.)

### Compliance (completion notification upstream)

When an issued Action Item is completed by its recipient (employee, vendor, or client), the system fires a **compliance notification** back to the item's issuer via the bell-icon notification system (see `00_overview.md`). This is how the manager learns "this is done — you can issue the next thing if it was waiting on this." Compliance is the upward signal that closes the loop on every issued order.

---

## 6. Programs vs Rails vs Orders — Quick Reference

|                        | Rail                                                               | Program                                                                                  | Standalone Order                            |
| ---------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------- |
| **What it is**         | Verified, repeatable workflow                                      | Unverified, dynamic project plan                                                         | One-off directive                           |
| **Built where**        | Rail Management (Admin)                                            | My Programs (Workspace) or Programs (Admin)                                              | "Issue Order" button (My Actions top-right) |
| **Editable structure** | Locked when published; edits create a draft                        | Always editable while open                                                               | N/A — it's just a single directive          |
| **Sequencing**         | Strictly enforced by the system                                    | Manager-controlled; phases + soft queueing                                               | Single item, no sequence                    |
| **Issuance**           | Automatic (rail handles routing)                                   | Manual via Issue mode (Issue All / Phase / Single)                                       | Single click, immediate                     |
| **Recipients**         | Internal posts only (external via Client Task / Vendor Task nodes) | Internal posts, vendors, clients                                                         | Internal post(s) only                       |
| **Closing**            | Particle reaches End node                                          | Manager explicitly closes                                                                | Recipient marks complete                    |
| **Lifecycle**          | Persistent until unpublished                                       | Created, planned, issued, monitored, closed                                              | Created, completed, archived                |
| **Audit trail**        | Full rail run history                                              | Full program history (planned items, issued items, completions, loop-backs, close state) | Simple completion log                       |

---

## 7. Programs in the Pathway Hierarchy

### Programs nest inside Rails (one direction only)

A Rail can contain a **Program Node** as a step. When a particle reaches that step, the system spawns a Program for the responsible manager to fill in dynamically. The rail waits at that step until the manager closes the embedded Program, then advances to the next step.

**The reverse is NOT true:** A Program does NOT embed a Rail. If you already have a verified Rail for a workflow (e.g., a client onboarding rail), you don't add an "onboarding step" inside a Program — that would defeat the purpose. Instead, you use the **cascade-from-rail-completion** Trigger mechanic: when one workflow finishes, it triggers another. Rails and Programs hand off to each other through Triggers, not embedding.

**Why one-directional?** Because Programs are the _unverified_ layer. Embedding a verified Rail inside an unverified Program would mix concerns. Instead, you trigger the rail as a separate workflow and let it run on its own enforcement track.

### Program Node (new Rail Builder node type)

A new node type to be added to the Rail Builder palette in `03_admin.md` under the ACTION group (alongside Sub-Flow, Approval, Statistic, Client Task, Vendor Task). Short version:

- **Program Node** represents a **dynamic interior** — a place in the rail where the work shape isn't predictable enough to lock down.
- When the particle reaches a Program Node, the system spawns an empty Program for the responsible manager (assigned post on the node).
- The rail particle **pauses at this node** until the manager closes the embedded Program. Then the rail advances.
- Pattern: surround a Program Node with predictable rail steps. Pre-step: "Survey site, prepare to plan demolition." Program Node: dynamic demolition. Post-step: "Wrap up, take photos, verify."

This is how Pathway handles workflows that are _mostly_ repeatable but have one or two genuinely dynamic stretches. You get the rail's enforcement around the predictable parts and the program's flexibility in the middle.

[Cross-reference to `03_admin.md` — Program Node is spec'd in the Node Property Panels section, under the ACTION group alongside Sub-Flow, Approval, Statistic, Client Task, Vendor Task.]

---

## 8. Where Programs Live in the UI

### Workspace → "My Programs" (new screen)

A new screen in the Workspace nav group, sibling to My Actions and Calendar. **Anyone can create a Program** — programs aren't admin-only. They're a workspace tool for any employee who needs to plan their own work or coordinate work for others within their authority.

**My Programs shows:**

- All programs the current user is the **Owner** of (the ones they're actively planning or running)
- Filter / sort by status (active, closed)
- Click a program → opens Program Detail (three-tab view, see Section 9)

**Why separate from My Actions:** My Actions is for **work assigned to you that you must comply with**. My Programs is for **planning your own work and others'**. Different cognitive modes. Conflating them would defeat the "tickets, not lists" thesis — managing your own program is _thinking_, not _executing_.

### Admin → "Programs" (eagle-eye view)

A new screen in the Admin nav group, sibling to Rail Management and Orders. This is the **manager eagle-eye view** of every program in the org, scoped to the viewer's permissions:

- **CEO / Owner / Admin** — sees every program in the entire org
- **Department head** — sees every program owned by anyone in their department
- **Section/Unit lead** — sees programs under their area
- **Individual contributor** — does NOT see this screen at all (they only have My Programs for their own)

Same scoping model as Rail Activity in `03_admin.md`. The admin Programs view is a list/grid of programs with filters by owner, status, target date. Click into a program to see its Program Detail (same three-tab view).

### Top-right "New Program" button

Available on My Programs. Clicking it opens a Program Creation modal with the header fields (objective, target date, optional client/entity reference) and immediately creates the Program in Plan state, opening the Program Builder.

[Confirmed: the **"New Program" button** appears in **two places** for ease of access:

- On the **My Programs** screen (top-right)
- On the **My Actions** screen top-right, alongside Start a Rail and Issue Order

Both buttons open the same Program Creation modal. The redundancy is intentional — users shouldn't have to navigate to a different screen just to start planning something.]

---

## 9. Program Detail — Three-Tab Structure

When a user opens a single program (from My Programs or Admin Programs), they see a **Program Detail** screen with three tabs at the top, representing the three phases the manager interacts with.

### Tab 1: Plan

The manager's planning canvas. **Private to the program owner and any other managers with view access.** No employees, vendors, or clients see anything in this tab.

**Layout:**

- **Program header** — Objective, Target Completion Date, Client/Entity reference, Owner
- **Action Items list** — every planned action item, mixed internal + external, optionally grouped by phase
- **Add Action Item button** — opens the Action Item editor in a side panel or modal
- **Edit existing items** by clicking on them
- **Reorder** by drag (within or across phases)

Each Action Item row shows:

- Name + description (truncated)
- Assignment type badge (**Internal** / **External Vendor** / **External Client**) — visually distinct
- Recipient name (post for internal, vendor name for external, client name for client)
- Phase tag (if applicable)
- Status (Planned / Issued / Done / etc.)
- For external items, the delivery channel and contact info are shown inline (e.g., "Deliver via: email | Contact: tony@graniteworks.com | Response window: 48 hrs")

**Action Item editor (side panel or modal):**

The editor schema differs by assignment type — **Internal items** and **External items** have different fields because they're going to very different audiences.

**Internal Action Item fields:**

- Name (internal-facing)
- Description (internal-facing)
- Assigned terminal/post (single post; resolves to employee at runtime)
- Estimated duration
- Phase
- Soft dependency ("awaits [other item]")
- Attached materials (files, SOPs, reference docs)
- Required deliverables (checklist of what they need to produce/upload)
- VFP standard

When issued, this becomes a Cycle in the recipient's My Actions inbox.

**External Vendor Action Item fields:**

- Name (internal-facing — what the manager calls it on the Plan)
- **Per-recipient description** (what the vendor sees in their email — separate from internal name)
- **Vendor reference** — either (a) pick an existing Vendor particle from `05_particles.md` (auto-populates contact info), OR (b) enter raw contact info for a one-off vendor (name, email, phone). Picking a particle is preferred for recurring vendors; raw entry is the escape hatch for ad-hoc use. See `03_admin.md` Vendor Task node for the equivalent particle-based flow in Rail Builder.
- Delivery channel (email / SMS / unique URL)
- **Scope of Work** (rich text, what the vendor is being asked to do)
- **Attached materials** (specs, drawings, measurement files — these are sent with the work packet)
- **Deliverables required from vendor** (checklist: confirm acceptance, provide ETA, upload completion confirmation, etc.)
- Response window (e.g., 48 hours)
- Phase
- Soft dependency

When issued, this becomes a Vendor Work Packet — a structured email/SMS/link containing the scope, materials, deliverables, and a hosted web page where the vendor can respond and upload.

**External Client Action Item fields:**

- Name (internal-facing)
- **Per-recipient description** (what the client sees — warmer tone)
- **Client reference** — either (a) pick an existing Client particle from `05_particles.md` (auto-populates contact info), OR (b) enter raw contact info for a one-off client (name, email, phone, optional preferred language). Picking a particle is strongly preferred for clients; raw entry is an escape hatch. See `03_admin.md` Client Task node for the equivalent particle-based flow in Rail Builder.
- Delivery channel (branded email / SMS / link)
- **What we need from you** (a friendly checklist of asks)
- Attached materials (design mockups, options to choose from)
- Response window (treated as a soft deadline with follow-up reminders, not hard enforcement)
- Phase
- Soft dependency

When issued, this becomes a Client Request — a warmer, branded hosted page showing project progress and a guided action.

**The same underlying mechanics power all three** (planning surface, manifest data, audit, completion compliance). The difference is the **delivery tone and the editor schema** to match the audience.

### Tab 2: Issue Orders

The conversion surface. Where planned Action Items become live work.

**Layout:**

- **Program header banner** at the top (Objective + Target Completion Date — same as Plan view, for context)
- **Issuance Mode selector:** three buttons — **Issue all** / **Issue phase [N]** / **Issue single**
- **Action Items list** — same items as the Plan tab, but now with a status indicator and an "Issue" affordance per item

**Three issuance modes:**

| Mode                | Behavior                                                                                                                                                            | Best for                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Issue all**       | Every Action Item in the program converts to live work simultaneously. Phases and soft dependencies are respected as advisory ordering hints, but everything fires. | Well-defined projects with clear sequences. Templates or repeated programs.                                  |
| **Issue phase [N]** | Only Action Items tagged with the selected Phase are issued. Remaining phases stay in Plan. The manager issues the next phase manually when ready.                  | Complex projects requiring adaptive management. Issue Phase 1, watch it clear, assess, then issue Phase 2.   |
| **Issue single**    | One Action Item at a time. Manual selection per item. Maximum control.                                                                                              | Dynamic real-time management. Manager sees someone finish, evaluates capacity, picks the next item to issue. |

**Multi-select / batch issuance:** Within the Issue Single mode, the manager can select multiple Action Items via checkboxes and click "Issue selected" to fire them all at once. This is a UX affordance for "I want to issue these three items together but not the rest."

**Per-item state in this view:**

- **Issuing to [Recipient Name]** — currently being issued (during the click moment)
- **Queued — awaits [item]** — soft-dependent on another item that hasn't been issued/completed; advisory only, the manager can override by clicking Issue anyway
- **Phase 2 — not yet issued** — phase-tagged item waiting for its phase to be issued
- **Issued** — already pushed to the recipient
- **Done** — recipient has marked it complete (compliance received)
- **No "Blocked" status** — the word "Blocked" is rejected per the My Actions thesis. Items that aren't ready show "Not yet issued" or "Queued — awaits X", framed as planning state, not as obstruction.

**What happens at issuance:**

1. Manager clicks Issue (single item, phase, or all)
2. The Action Item record stays in the Program (it's now in "issued" status)
3. The system creates the live work in the appropriate recipient surface:
   - **Internal:** A new Cycle appears in the assigned post's My Actions inbox, with the Program Objective at the top, the description, the checklist (from Required Deliverables + the manager's internal items), the manifest fields, and a Complete button. The button label depends on the recipient's relationship to the issuer:
     - **"Complete + forward"** if the recipient is NOT the issuer (delegated work) — completion fires a compliance notification upstream
     - **"Complete"** or **"Mark Done"** if the recipient IS the issuer (self-issued, personal program item) — no compliance fires because there's nothing to forward
     - See Section 12.5 below for the personal program treatment
   - **External Vendor:** The system sends the Vendor Work Packet via email (or SMS, or generates a unique URL). The vendor receives a structured message with scope, materials, deliverables, and a link to a hosted response page.
   - **External Client:** The system sends the Client Request via branded email (or SMS, or generates a unique URL). The client receives a warmer, branded page showing project progress and a guided action.
4. The compliance routing is set up — when the recipient eventually completes the item, a notification fires back to the issuer's bell icon
5. The Issue Orders tab updates the item status

### Tab 3: Command View

The manager's live monitoring dashboard for the program after issuance has begun.

**Layout:**

- **Program header banner** at top (Objective + Target Completion Date)
- **Top metric tiles (4):**
  - **Issued** — count (e.g., "2 of 6")
  - **Completed** — count
  - **In Progress** — count
  - **On Track For** — date (the projected completion date based on current pace, compared to target)
- **Two-column body:**
  - **Left: Issued + Active** — items that have been pushed live and are currently being worked. Each row shows item name, status (Done / Active), assignee/recipient, time spent.
  - **Right: Ready to Issue** — items that haven't been issued yet but could be. Each row has an inline "Issue now" link. Items with soft dependencies show "Awaiting [item]" instead of an Issue link (the manager can still click through to issue if they choose to override).

**Live updates:**

- The Command View **refreshes on action / page load**, similar to the Rail Activity Visual View (see `03_admin.md`)
- Optional **"View Live"** toggle that polls for updates at a short interval — useful during active monitoring sessions, off during static review
- When a compliance notification fires (a recipient completes their item), the Command View updates the metrics and the item moves from "Issued + Active" to "Completed"

**Manager actions available in Command View:**

- **Issue more items** — click "Issue now" on a Ready to Issue item without leaving Command View
- **Open an active item** — click into an issued item to see its current state, assignee, time, manifest data, comments
- **Nudge** — same nudge mechanic as Rail Run Detail (`03_admin.md`); fires a notification to the recipient
- **Reassign** — change who's handling an active item (e.g., the assigned employee got sick)
- **Add Action Items dynamically** — programs are dynamic; the manager can add new items mid-execution as needs emerge. New items appear in Plan and become Ready to Issue. _This is the key tactical-management feature._
- **Close program** — see Section 10

### Why no "Execute" tab

Earlier drafts of this feature included a fourth tab called "Execute" showing the recipient's view of an issued item. That was redundant: **execution doesn't happen in the Program Detail screen.** Execution happens in the recipients' own surfaces — employees see issued items in their My Actions inbox, vendors see them in their email, clients see them on their hosted request page. The manager doesn't need an Execute tab because the manager isn't the one executing. The Command View is where the manager monitors execution from their planning seat.

The four-phase lifecycle (Plan → Issue → Execute → Command) is still conceptually valid as a _philosophy_. But in the UI, the manager only interacts with three of the four phases. The fourth phase happens elsewhere by design.

---

## 10. Closing a Program

A Program ends when its owner explicitly closes it. There is **no auto-close** based on all-items-completed, because programs are dynamic — the manager might keep adding items right up until they decide the work is done.

**Close Program button** lives in the Program Detail header (or in the Command View toolbar).

**On click — confirmation modal:**

If all Action Items are completed, the modal is a simple "Close program?" confirm.

If there are uncompleted Action Items, the modal prompts:

> **"This program has [N] uncompleted action items. What do you want to do?"**
>
> - **Mark all as completed and close** — marks every remaining item complete (rare; only use when the manager genuinely did finish them in real life and just didn't tick the boxes in Pathway)
> - **Close with items left uncompleted** — closes the program; uncompleted items are preserved as "uncompleted at close" in the audit history
> - **Cancel** — go back, don't close

**Key principle: the system never auto-marks uncompleted items as done.** The history is honest. If something didn't happen, the archive shows it didn't happen. This matters for retrospective analysis ("did we actually do everything we planned?") and for trust ("the data tells the truth").

**On close:**

- Program enters Closed state
- Final state of all items is preserved (completed, uncompleted, never issued)
- Audit log captures the close action, who closed it, and the disposition of any uncompleted items
- The program moves to a Closed section / archive in My Programs (and in Admin Programs)
- [TBD — what happens to in-flight Cycles in employee inboxes when their parent program is closed? Most likely they remain active and the close just means "no more new items will be issued from this program." Confirm in a later session.]

---

## 11. Three Delivery Tones — Same System Underneath

When an Action Item is issued, the underlying mechanics are identical regardless of recipient type. **What changes is the tone, the delivery channel, and the level of context shown.** This is the feature's core design principle: _one system, one command surface, three audiences. The tone changes — the tracking doesn't._

### Employee → Order

- **Tone:** Direct, action-first. "Here is your assignment. Complete these steps. Mark done."
- **Delivered to:** Pathway My Actions inbox (Cycles tab)
- **Enforcement:** Full — the cycle is locked into Pathway's normal cycle mechanics (checklist required, manifest required-field gating, Complete button only active when prerequisites met)
- **Visibility:** Their task only. They see the Program Objective at the top so they know the endgame, but they don't see the rest of the program board.
- **Look & feel:** Standard Pathway cycle UI from `02_workspace.md`, with one addition: completion fires a compliance notification back to the issuer (see Section 12).

### External Vendor → Work Packet

- **Tone:** Professional, scoped, transactional. "You've been assigned this work order. Confirm and deliver by Thursday."
- **Delivered to:** Email or SMS, containing a link to a hosted web page. Optionally, a unique URL the manager can copy and send via any other channel.
- **Enforcement:** Response window. The vendor has [X] hours/days to respond (set per Action Item). If they don't respond by the window's end, follow-up reminders fire automatically. Beyond that, the manager gets escalated. (Hard enforcement isn't possible — the vendor isn't a Pathway user — but soft enforcement via deadlines + reminders + manager escalation is.)
- **Visibility:** Their scope only. They see what they're being asked to do, the program objective at the top for context, the attached materials, and the deliverables required. They don't see the rest of the program or any internal items.
- **V1 hosted page:** scope of work, attached materials (downloadable), deliverables required (numbered list), respond button. Functional, not branded or rich. **Persistent portal experience deferred.**

### External Client → Request

- **Tone:** Warm, guided, friendly. "Hi Maria, here's how your project is going. We need a few things from you to keep it moving."
- **Delivered to:** Branded email (or SMS, or link). The branding reflects the company's identity (e.g., Apex Remodeling), not Pathway.
- **Enforcement:** Soft deadline + automated follow-up. Clients are not employees; you can't enforce them. You can remind them, escalate to their primary contact in your company, and track non-response.
- **Visibility:** Project progress (which phase the project is in) + their specific asks (what we need from them right now). They don't see internal items or other clients.
- **V1 hosted page:** company branding banner, friendly greeting, project progress indicator (e.g., "Planning → Design → Build → Finishing → Handoff" with current phase highlighted), the specific asks ("we need you to..."), action button, attached materials (design options, mockups). Same V1 simplicity as vendor; **richer portal deferred.**

---

## 12. Compliance Routing — How Completion Closes the Loop

When any issued Action Item is completed by its recipient — internal employee, external vendor, or external client — the system fires a **compliance notification** back to the issuer.

**Mechanics:**

1. **Recipient marks item complete** in their respective surface:
   - Internal employee clicks "Complete + forward" (or "Complete Task") in their cycle detail page
   - Vendor clicks "Confirm completion" or uploads required deliverables via the hosted page
   - Client clicks "Mark done" or completes the asks via the hosted page

2. **The Action Item moves to "Done" status** in the Program

3. **A compliance notification fires** to the issuer (the manager who clicked Issue on this specific item) via the bell-icon notification system (`00_overview.md`)
   - The notification reads something like "Mike R. completed Site survey + measurements" or "Granite Works confirmed countertop fabrication" or "Maria Martinez approved design selections"
   - Click the notification → jumps to the Command View for the parent program

4. **The Command View updates** the metrics live (or on next refresh):
   - Issued count stays the same
   - Completed count increments
   - In Progress count decrements
   - Any items with a soft dependency on this completed item now show as "Ready to issue" instead of "Awaiting [item]"

5. **The audit log captures** the completion event with timestamp, recipient, time spent (where applicable), and any deliverables uploaded

**Why this matters:** the compliance notification is what closes the planning loop. Without it, the manager has to actively check their Command View to see what's done. With it, the manager gets a passive feed of "this is done, you can move forward." It's the upward signal that lets the cascade of issuance work — finish triggers issue triggers finish triggers issue, all the way through the program.

**For batched orders:** if the issuer pushed three items at once and all three complete around the same time, the system uses **smart grouping** for compliance notifications:

- If completions are spread out in time, each fires its own bell notification
- If completions cluster within a short window (e.g., ~5 minutes — exact threshold tunable), they group into a single bell entry: "3 items completed on Kitchen Remodel program"
- Clicking the grouped entry expands to show the individual completions, each linking to its respective item in the Command View
- This keeps the bell from getting spammed when batches close out together while still preserving individual visibility when completions are spread across the day

**For external recipients without a Pathway login:** the compliance still routes to the _internal_ issuer's bell. Vendors and clients don't have bells of their own — they're not Pathway users. The compliance loop is internal-facing only, but it carries the result of external activity.

---

## 12.5. Personal Programs (when you're the planner AND the executor)

Not every Program is delegation. Sometimes a Program is just **you planning your own work** — you're the owner, every Action Item is assigned to yourself, and there's nobody else to issue anything to. In this case, the Program is essentially a structured personal task list. You build out the steps, you do the work, you check things off.

**This is a real and important use case.** A creative director planning their own week. A project manager mapping out their own quarterly review prep. A sales lead breaking down their own day's outreach into discrete action items. Programs are the planning surface for _judgment work_, and judgment work isn't always shared — sometimes you're the only one doing it.

### How personal programs differ from delegated programs

The same Program Detail screen and the same Action Item editor work for both, but the behavior changes when items are **self-assigned** (recipient = issuer):

- **No compliance notifications fire.** There's no upstream issuer to notify because you're already that person. Completing a self-assigned item just marks it done in the Program; no bell entry, no fanfare.
- **Complete button label changes** from "Complete + forward" to **"Complete"** or **"Mark Done"** — the "+ forward" suffix is dropped because there's nothing to forward to.
- **Inline check-off from the Program Detail screen.** For personal items, the Program owner can check items off **directly from the Plan tab or Command View tab** without having to navigate to My Actions, click into the cycle, fill the checklist, and hit Complete. A simple checkbox next to each self-assigned item suffices. This makes personal Programs feel like a faster to-do list rather than the heavy ceremony of full Cycles.
- **The cycles also still appear in My Actions.** Self-assigned items still create Cycles in the owner's My Actions inbox so they show up alongside other work. The owner can complete them from My Actions OR from inside the Program Detail screen — either path works, and completion in one updates the other.

### Mixed personal/delegated programs

A Program can have both kinds of items in the same plan: some assigned to yourself, some delegated to juniors. The system handles each item according to its assignee:

- Self-assigned items behave personally (inline check-off available, no compliance, "Complete" label)
- Delegated items behave normally (full ceremony, compliance fires upstream, "Complete + forward" label)

This means you can use a single Program to plan both your own work and your team's work for the same project, without needing a separate "personal mode" or "delegation mode" switch. The Program is just a Program; the items behave according to who's doing them.

### Why this matters

Without this treatment, users who tried to use Programs as a personal task list would be forced through the full delegation ceremony for items they're doing themselves — clicking through cycles, marking checklists, hitting Complete + forward buttons that have nothing to forward. That friction would push them back to Notion or Apple Reminders for personal planning, fragmenting their work across surfaces. By making Programs gracefully handle the personal case, we keep all planning work in Pathway where the rest of the company's operational reality lives.

---

## 13. Standalone Issue Order (the My Actions button)

Already spec'd in `02_workspace.md`. Repeating the essentials here for cross-reference:

The **Issue Order button** on the My Actions top-right is a fast-path for one-off directives that don't justify a full Program. Use cases:

- "Get flowers and clean the car before the 3pm client meeting"
- "Pick up the cement breaker from the warehouse on your way to the site"
- "Check on the refund discount from last month"

**Architecturally distinct from Program-issued orders.** A standalone Order is its own object — not an Action Item, not part of any Program, not tracked in Command View. It's a single directive with:

- Title, notes, due date, optional checklist, optional attached particle, one or more assignees
- Lives in the recipient's My Actions Orders tab as an inline-expanding tile
- Completes when the recipient clicks done; archives to the Orders history

**Why we keep them separate from Programs:** A standalone Order is _small_. Wrapping it in a Program with one Action Item would add ceremony for no benefit. The Issue Order button is the lightweight path; Programs are the heavyweight planning surface. Both exist because real work has both shapes.

**Naming:** the standalone button stays as "Issue Order" — no rename. The collision with Program-issuance language ("Issue all", "Issue phase 1", "Issue single") is resolved by context: Program issuance buttons live inside the Program Detail screen and use shorter labels because the surrounding context already makes it clear what's being issued.

---

## 14. Reconciliation with Existing Specs

Several concepts that were forward-referenced from `03_admin.md` (Rail Builder) collapse with concepts in this document:

### Client Task node ↔ Client Request

The **Client Task node** in the Rail Builder palette and the **Client Request** delivery mode in Programs & Orders are **the same underlying thing** — both route work to a client via emailed/SMS link to a hosted web page. The only difference is _where the trigger comes from_:

- Client Task node: planned in advance as a step on a Rail; fires automatically when the particle reaches that step
- Client Request: created ad-hoc inside a Program; fires when the manager issues the Action Item

Both produce the same warm, branded, client-facing hosted page. Same tone, same enforcement, same compliance routing. The data model and the recipient experience should be unified — only the upstream trigger differs.

### Vendor Task node ↔ Vendor Work Packet

Same collapse. The **Vendor Task node** in Rail Builder and the **Vendor Work Packet** delivery mode in Programs & Orders are the same thing under different names. Both route work to a vendor via email/SMS/link. Both produce the same professional, scoped, transactional hosted page. The data model is unified.

**Implementation note for the dev team:** build the "external recipient task" mechanics once (hosted page rendering, delivery channels, response handling, deliverable upload, compliance routing) and have both the Rail Builder node and the Program Action Item editor produce instances of the same underlying object. One concept, two creation surfaces.

### Stuck Initializer ↔ External Order Initialization

The "Stuck Initializer" tile concept from `02_workspace.md` (an incomplete rail initializer that drops into the initiator's inbox) is conceptually parallel to the way External Action Item responses surface. Both are "work that came back to you and needs your attention before it can advance." Different mechanics, same user-facing pattern: shows up in your inbox as a tile, you click in, you handle it, you move on.

[TBD — full reconciliation when both surfaces are built and tested.]

---

## 15. Open Questions / Deferred to Later Sessions

**Deferred to follow-up Programs & Orders sessions:**

- **Program Builder visual UI** — full Plan tab canvas layout, drag/drop ordering, Action Item editor side panel, phase grouping visualization. Wait for UI mockups before spec'ing in detail.
- **Command View visual UI** — exact metric tile layout, two-column body, real-time refresh interactions. Wait for UI mockups.
- **External hosted page visual designs** — vendor work packet page, client request page. V1 is "just a link to a web page." Richer portal experience comes later.
- **Program Templates** — saving programs as reusable templates (e.g., "Standard kitchen remodel program"). Significant feature, deferred.
- **Notification grouping** — when a batch of orders completes around the same time, do compliance notifications group into one bell entry or fire individually?
- **In-flight cycles when parent program closes** — what happens to active Cycles in employee inboxes when their parent program is force-closed?
- **"Complete + forward" vs "Complete Task" button label** — for Cycles that came from a Program vs Cycles that came from a Rail, do we use a different button label, or unify? Compliance routing happens either way, so the label is just UX cosmetics.

**Permissions (resolved per `00_overview.md` Section 4):**

- **Create a Program** — open to any Member by default. Anyone can plan their own work. The "Can create programs" checkbox is ON for Members by default.
- **Issue items from a Program** — the issuer must have authority over the recipient. For internal items: org-chart-derived (the issuer must be at or above the recipient's Post). For external items (vendor / client): any program owner can issue. The "Can issue orders to people outside their direct reports" checkbox extends internal issuance beyond the standard org chart constraint.
- **Transfer Program ownership** — current owner can transfer to anyone in the org. The receiver auto-accepts if they're a subordinate; otherwise an explicit accept is required. Admins can force-transfer any program.
- **See the Admin Programs eagle-eye view** — org-chart-derived authority. CEO sees all, department heads see their department's programs, etc. The "Can see all programs in the org" checkbox grants org-wide visibility regardless of org chart position.
- **Close a Program** — the program owner can close their own programs. Admins can close any program. No additional checkbox needed.

**Open architectural questions:**

- Promotion to Rail — explicitly deferred, may revisit if customers ask
- Programs containing other Programs (nested programs) — almost certainly not needed, but flag if it comes up
- Cross-program dependencies (Action Item in Program A awaits an item in Program B) — almost certainly out of scope, programs should be self-contained
