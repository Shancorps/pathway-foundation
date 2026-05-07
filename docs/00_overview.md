# Pathway — App Overview

> Cross-cutting concepts, vocabulary, core loop, and data relationships.
> This file is the shared context for all screen-level specs. Read this first.

---

## STATUS: In progress

Sections marked `[TBD]` will be filled in as we work through the app.

---

## 1. What Pathway is

Pathway is a workflow enforcement layer that sits on top of a company's org structure. **It is a conveyor belt for Particles flowing through Terminals.** A Particle (a Car, a Customer, a Lead, a Property — anything with identity that needs work done to it) arrives at a Terminal (a Post + the Employee currently holding it), the employee Starts/Changes/Stops it to produce the required sub-product, and the Particle advances to the next Terminal automatically. The org chart isn't decorative; it _is_ the routing infrastructure. Posts on the chart become Terminals that Particles flow through.

**This is the foundational mental model. If you forget it, you will build the wrong thing.** A Rail without a Particle is a meaningless sequence of tasks. A Cycle without a Particle has no "what am I working on" answer. The whole architecture exists to move _specific things_ through _specific positions_ in a forced sequence — never lose track of the thing being moved.

### The car wash example (concrete illustration)

A car wash business has two parallel Rails running on two different Particles:

- **Particle 1:** the Car. **Rail:** Car Wash Rail. **Terminal sequence:** Intake → Pre-rinse → Wash → Dry → Detail. Each Cycle produces a sub-product (car logged, dirt removed, clean, dry, polished) that advances the Car to the next Terminal.
- **Particle 2:** the Customer. **Rail:** Payment Rail. **Terminal sequence:** Greeting → Cashier. Each Cycle produces a sub-product (greeted, paid).

Neither Rail alone delivers the business outcome. The final business product — _"Car washed and paid for and returned to customer"_ — emerges from **both Rails completing in parallel**, on different Particles, through different Terminals on the org chart. This is how real operations work: many Particles flowing simultaneously, products combining at the end.

### The "tickets, not lists" thesis

The single most important architectural difference between Pathway and every other project management tool is this:

**Modern PM tools (Monday, Asana, ClickUp, etc.) are databases of work that _should_ be done. Pathway is a ticket queue of work that _must_ be done now.**

In Monday/Asana, the board is a buffet — the employee opens it, browses available work, picks something to start, gets distracted, comes back, picks again. The cognitive load of "what should I work on right now" sits on the employee, every minute of every day. The tool is a database masquerading as a to-do list.

Pathway flips this. Each Post sees only what they have to do, when they have to do it. **Work is _issued_ to them like a ticket** — the same way customer support reps and developers receive bug tickets. They don't browse. They don't pick from a wide menu. They open `My Actions`, see what's in front of them, complete it, and the system handles the handoff to the next station automatically.

Why this matters for _every_ job, not just dev/support: customer support and engineering already work this way because their inputs are naturally ticketable (bugs, complaints, requests). Sales, marketing, ops, finance, construction, and every other function could work this way too — but no one has built the infrastructure to issue tickets for non-bug-tracking work. Pathway is that infrastructure.

### Managers also have tickets

A common misconception: "managers plan, employees execute." That's incomplete. **Managers also have their own cycle tickets.** A sales manager's Monday-morning stats review is a rail. A quarterly review composition is a rail. A creative briefing is a rail. The role of "manager" is itself a Post on the org chart that runs through rails like any other Post.

Managers do also have planning surfaces (Programs, Orders, Command View) that employees don't. But the executive/manager job is _not_ purely planning — it's also rail execution. Pathway treats both equally.

### The desk-organization analogy

Imagine your desk as the surface where work lives. In a normal company, papers come at you all day — emergencies, requests, meetings, things you said you'd do tomorrow. You get sidelined, you push papers aside onto a "to-do later" stack, and that stack becomes a backlog that resurfaces months later as a problem ("we forgot something in their Google Drive eight months ago and now it's a crisis").

**Pathway prevents this structurally by not letting cycles leave your front-facing view until they're actually completed.** Your "desk" — the My Actions inbox — gets full. It will get messy. The only way to clear it is to _do the work_. There is no "side" to push tickets onto. The only way out is through.

The corollary is that **the only way to remove a cycle from your inbox is to complete it, get it loop-backed to the previous person, get reassigned by a manager, or have a manager force-cancel it.** You cannot dismiss a cycle yourself. You cannot "snooze" it indefinitely. The system pins issued work to your view until it's resolved.

This is a feature, not a bug. A full My Actions is a signal — either the employee is overloaded (manager intervention needed) or the work is poorly distributed (rail design needs adjustment). The Rail Activity Visual View we already spec'd is where this surfaces to managers: bottlenecks light up because cycles are sitting hot too long.

### What this means for the employee experience

A few structural consequences flow from the ticket model:

- **The employee never browses a project board.** They see only their own My Actions. They don't see other employees' tickets, the rail board, manager planning surfaces, or future work that hasn't been issued to them yet.
- **The "Complete Task" button is the assembly-line conveyor belt.** Clicking Complete is not just checking a box — it's the structural moment where the particle physically advances to the next terminal and the next employee's My Actions populates with the new ticket.
- **The only structured way to refuse or push back work is Loop Back.** No Slack chase. No "hey can you redo this." Loop Back sends a flagged duplicate ticket back to the previous post with a mandatory written reason, with the loop-backer's name on it. It's accountability through UI, not interpersonal pressure.
- **Multiple cycle tickets can sit in the queue at once.** An employee can have several tickets pending simultaneously, even from the same rail or different rails. Within the bounded set of issued work, the employee picks which to do first based on judgment — but every ticket in the queue is real, issued, do-it-now work, not a "this might happen later" placeholder. This is a third model: not infinite-buffet (Monday) and not strict-FIFO (no choice at all), but bounded-issued-work-with-employee-prioritization.
- **What's _not_ in the inbox doesn't exist for the employee.** If a cycle hasn't been issued to them yet, they don't see it, can't prepare for it, can't worry about it. The system handles "what's next" structurally so the employee can focus on "what's now."

This thesis is the foundation for understanding the My Actions screen, the Loop Back mechanic, the Dashboard vs My Actions distinction, and how Programs & Orders integrate with rails. Read it before any screen-level spec that touches employee-facing surfaces.

---

## 1.5. Core Design Principles

These are the architectural opinions that shape every screen, every behavior, and every decision in Pathway. A dev working on the system should treat these as constraints — not "nice to haves" but "if you violate these, you've built the wrong thing."

### Principle 0: Rails always operate on Particles. (Architectural cornerstone.)

A Rail is not a sequence of tasks in the abstract. **A Rail is the path a specific Particle takes through Terminals.** This is a hard architectural binding, not a convention:

- **Every Rail Definition is bound to a Particle Type.** When a designer creates a Rail, they pick the Particle Type the Rail operates on (Car Wash Rail operates on Cars; Lead-to-Closed-Deal Rail operates on Leads). A Rail with no Particle Type is invalid.
- **Every Rail Run is bound to a specific Particle Instance.** When the Rail starts, the user picks (or auto-creates) the Particle Instance flowing through it (this specific Honda Civic; this specific Lead). A Rail Run with no Particle Instance is invalid.
- **Every Cycle carries the Particle reference forward.** When an employee opens their My Actions and sees a Cycle, they see _what they're working on_ (the Particle) immediately. A Cycle whose worker can't tell what Particle it's about is broken UX.
- **The Cycle's purpose is to produce a sub-product that advances the Particle.** "Complete Task" isn't a checkbox — it's the structural moment where the Particle moves forward to the next Terminal.

This binding propagates everywhere in the schema, the UI, and the routing logic. Skipping it produces a beautiful shell that doesn't actually do anything — because there's no _thing_ being moved through it.

The only exception: Programs (which are unverified Rails — see Principle 1) can run with looser Particle bindings during the Plan phase, but once they issue work to a Terminal, that work is acting on something. If you can't name what's being acted on, you haven't planned the work yet.

### Principle 1: Rail = verified Program. Program = unverified Rail.

A Rail and a Program are **not different kinds of objects**. They are the same kind of object at different points in their maturation lifecycle.

- A **Program** is a workflow whose pattern hasn't yet been proven repeatable. The manager is figuring it out as they go. The structure can be edited dynamically, dependencies are advisory only, and the system doesn't enforce sequencing.
- A **Rail** is a workflow whose pattern has been proven and locked in. The structure is frozen (until intentionally updated through a draft), sequencing is strictly enforced, and the system handles routing automatically.

The same workflow may exist as a Program for months while it's being figured out, then be promoted to a Rail once the pattern stabilizes. **This is the natural maturation path of any workflow** in a real company. Pathway supports both ends of the spectrum and the journey between them.

This means: when you see something in the spec that says "Programs work like X" and "Rails work like Y," ask whether the difference is genuinely architectural or whether it's just enforcement-on vs enforcement-off. Most of the time, it's the latter.

### Principle 2: Strategic vs Tactical planning are different cognitive modes

Real organizations operate in two distinct planning modes:

- **Strategic planning (Rails)** — the work shape is known. The sequence is verified. Employees execute without thinking about the structure. Repeatable wins.
- **Tactical planning (Programs)** — the work shape is partially known with a variable interior. The manager is on the ground, judgment is required, and the next step depends on what just happened. Discoverable in real time.

**Both modes must coexist** because real companies have both kinds of work. A construction company has highly repeatable invoicing rails AND completely unpredictable demolition programs. A marketing agency has standard onboarding rails AND one-off creative pitch programs. Forcing all work into one mode breaks the system: too rigid for tactical work (rails); too loose for repeatable work (programs).

The reason existing PM tools fail isn't that they're missing features — it's that they collapse strategic and tactical work into one surface and ask the user to manage both with the same mental model. Pathway separates them.

### Principle 3: The planning cascade (delegation as re-planning)

Programs cascade downward through the org chart, with each level **re-planning at a lower abstraction**:

| Level                | Plans at                                                         | Issues to       | Receives as                                     |
| -------------------- | ---------------------------------------------------------------- | --------------- | ----------------------------------------------- |
| **VP of Operations** | "Get this house remodeled"                                       | Project Manager | An objective + responsibility                   |
| **Project Manager**  | "We need demo done. What are the 4-5 things needed?"             | Lead/Foreman    | A high-level Program with broad action items    |
| **Lead/Foreman**     | "Here are the 4 things today. Figure out how and what you need." | Workers         | A more granular, tactically fleshed-out Program |
| **Worker**           | "Start on this, then this, then this."                           | (Themselves)    | Issued cycle tickets in their My Actions inbox  |

Each level converts a higher-level objective into a more granular plan. **Delegation isn't task-handing — it's re-planning at a lower abstraction level.** The senior doesn't pre-plan the junior's program; they hand over the objective and the junior builds their own program to satisfy it.

This is why Programs need to be **transferrable to subordinates**, with the expectation that the new owner will _expand_ the program before issuing. A C-suite issuing a 5-step Program to a manager isn't saying "execute these 5 steps" — they're saying "expand these 5 steps into your own tactical Program."

### Principle 4: The parenting model (issuance philosophy)

The cleanest analogy for how Pathway issues work is parenting:

> A parent doesn't put a list of "brush teeth, clean room, get ready for school" on the wall and expect the kids to self-execute. Kids will get distracted, do nothing, get nothing done. Instead, the parent gives one order at a time. _"Go brush your teeth."_ Once that's done, _"Now make your bed."_ The parent holds the next order until the current one is finished. The parent thinks; the kid does.

Project management tools collapse this — they put all 47 items on the board and say "go." Pathway separates planning from execution: the manager plans in private (Rails are pre-planned by the rail designer; Programs are planned dynamically by the manager), then **issues work in waves** based on capacity, judgment, and what just happened.

This is why work is _issued_ in Pathway, not _displayed_. The employee never sees a project board. They see only what's in their inbox right now. The system holds future work and releases it when the time comes.

### Principle 5: Pathway is workflow infrastructure, not production tooling

Pathway does not try to replace Canva, QuickBooks, Figma, Google Docs, Notion, or any other tool where the actual production work happens. **Pathway is the layer above** that controls who's doing what when, then hands off cleanly to the tools where the work itself gets done.

Every Cycle has a "SOP & Tools" tab containing direct deep-links to the external resources the employee needs: SOPs/policies for _how_ to do the work, and tool links to the _exact place_ (the specific Canva file, the specific QuickBooks page, the relevant Notion doc). The employee doesn't have to hunt — Pathway hands them the link.

This is a deliberate scoping choice: **Pathway is the workflow layer, not the work layer.** A dev working on Pathway should not build features that compete with external production tools. Build the routing, the enforcement, the visibility, the accountability. Hand off the actual production to the right tool.

### Principle 6: No auto-fabrication. The history is honest.

**Pathway never marks something complete that wasn't actually completed.** This applies in several places:

- When a Program is closed with uncompleted Action Items, the system asks whether to mark them complete or leave them uncompleted in history. It does NOT auto-complete them.
- When a cycle is cancelled, the cancellation is recorded with a reason — not silently swept away.
- When a manager force-completes a junior's cycle, the audit log records both the manager's name AND the original assignee, so the trail is honest.
- Loop Back completion notes capture _what was found_, including whether the loop back was sent in error — protecting recipients from unfair negative marks.

This matters for trust. The data tells the truth. Retrospectives can ask "did we actually do what we planned?" and get an honest answer. Stats reflect reality. Managers can see what's actually happening, not what people pretended happened.

### Principle 7: Accountability through UI, not interpersonal pressure

Loop Back is the canonical example, but the pattern is everywhere in Pathway. When something needs to be pushed back, escalated, or refused, **the system provides a structured channel** with mandatory context capture, recipient routing, and audit logging. The result is accountability that doesn't depend on how brave the employee is or how good they are at confrontation.

The cultural pattern this replaces: "the previous step was sloppy, but I'm the one who has to fix it because I can't move forward otherwise." Without a Loop Back mechanism, that pattern normalizes bad work — the screwup gets absorbed by the next person quietly. With Loop Back, the screwup goes back to the screwer-upper, with their name on it, in their inbox, with a written reason. **It's accountability through UI rather than through interpersonal pressure.**

The corollary: **Pathway is not a chat tool.** Disputes, contestations, and casual coordination happen on the phone or on Slack — not inside Pathway. We provide the workflow infrastructure and the accountability scaffolding; humans handle the human conversations. Trying to build chat features into Pathway would turn it into a passive-aggressive Slack and ruin the structural clarity.

### Principle 8: "Blocked" is rejected as a status

Other PM tools let users mark tickets "Blocked" and wait for someone to come help. Pathway treats this as a failure mode.

- **In an employee inbox:** if a cycle is in your inbox, it's in progress. Period. There is no "Pending" or "In Progress" or "Blocked" status. The cycle is your responsibility. If you're actually blocked, you call your manager and figure it out — you don't park the work in a "waiting" state and hope for rescue.
- **In a manager planning surface:** "Blocked" was an old UI artifact and has been removed. Work is either issued or not issued. Items waiting on dependencies show as "Queued — awaits X" (advisory) or "Phase 2 — not yet issued" (phase grouping). Never "Blocked."

The deeper reason: blocking is a passive escalation pattern. It shifts responsibility from the assignee to ambient hope that someone will notice and intervene. Pathway's design assumes **active accountability**: if you have a cycle, it's yours; if you can't do it, you escalate by talking to someone, not by changing a status field.

### Principle 9: What's not in the inbox doesn't exist for the employee

Employees see only what has been issued to them. They cannot see:

- Other employees' cycle queues
- The full rail board for rails they're working on
- Future cycles that will eventually come to them
- Manager planning surfaces (Programs in Plan phase, Command View)
- Org-wide Rail Activity views (those are admin/manager surfaces)

This visibility limit is **structural, not a permission setting**. It's a design decision rooted in the thesis: cognitive load on the employee should be limited to "what's in front of me right now." The manager's job is to plan ahead; the employee's job is to execute the present. Letting employees see future work, other people's queues, or planning surfaces would reintroduce the buffet problem Pathway exists to eliminate.

### Principle 10: The compliance loop closes upward

Every issued piece of work has an issuer — the person who pressed Issue. When the recipient completes that work (whether they're an employee, vendor, or client), a **compliance notification fires upstream** to the issuer's bell-icon notification surface. This is the upward signal that closes the planning loop.

Without this, the manager would have to actively check their Command View / Rail Activity every few minutes to see what's done. With it, the manager gets a passive feed of "this is done, you can move forward." Issuance triggers completion triggers issuance triggers completion — the cascade flows on its own as long as the compliance signal closes the loop.

This applies equally to:

- Internal rail-issued cycles (compliance fires automatically since the system is the "issuer")
- Internal program-issued cycles (compliance fires to the human issuer)
- External vendor work packets (compliance fires to the internal issuer when the vendor confirms)
- External client requests (compliance fires to the internal issuer when the client completes)

External actors don't have bells of their own (they're not Pathway users), but the compliance always returns to the internal person who issued the work. The loop never breaks at the company perimeter.

---

## 2. Core Vocabulary

### Particle

The identifier of the real-world thing being changed by a Rail. A Particle is whatever has identity and undergoes a workflow — the system needs to know _what_ is being changed so the work can be recorded against it.

**Particles are load-bearing, not optional.** Every Rail is bound to a Particle Type at design time. Every Rail Run is bound to a Particle Instance at start time. Every Cycle references the Particle being acted on. See Principle 0 for the binding rules.

**Train analogy:**

- The **Rail** is the railroad track (the workflow path).
- **Pathway itself** is the train — the conveyance that moves the Particle from Terminal to Terminal.
- The **Particle** is the cargo or passenger riding on the train (the thing being worked on).
- Each **Terminal** is a station the train stops at.
- A **Cycle** is what happens to the cargo at one station.
- The **Manifest** is the documentation that travels with the cargo.

**Why this matters:** In a normal company, moving a particle between terminals is itself a job — usually a project manager, coordinator, or front-desk role acting as a human liaison (e.g. the receptionist who walks you back to the doctor's office). Pathway eliminates that role by _being_ the conveyance. The system itself moves the particle. Employees work _on_ the particle when it arrives at their terminal; they don't have to also be responsible for routing it onward. Sometimes an employee who has a step on the rail will also push the particle along, but the structural responsibility for movement belongs to Pathway, not to a person.

**Particle types include (non-exhaustive):**

- **Clients** — for service, sales, and delivery rails
- **Client + sub-asset** — e.g. a client who owns three houses spawns a particle per house, so each house has its own workflow without conflating the work
- **Leads** — prospective clients flowing through sales/qualification rails
- **Employees** — when the employee themselves is the subject of a workflow (HR disputes, training, onboarding, promotions, performance reviews, offboarding). Distinct from employees-as-workers, who _execute_ steps on rails.
- **Physical assets** — heavy machinery, vehicles, equipment, individual properties under maintenance or inspection rails
- **Anything else with identity** that needs to flow through enforced steps

One real-world entity can be represented by multiple Particles across multiple Rails simultaneously. The Particle is an _identifier_, not the entity itself — it's how the system tracks "this specific thing is currently at this specific point in this specific workflow."

### Rail

A complete, **verified**, repeatable, enforced workflow pathway from initiation to completion. Rails are predefined sequences with locked structure. Particles travel along Rails through Terminals. The system enforces sequencing — particles cannot skip steps or reorder them.

A Rail starts its life as an idea, often as a Program that proves itself through repetition. Once the pattern is stable enough to lock down, it's promoted to a Rail. **Rails are verified Programs.** See Principle 1 in Section 1.5.

### Program

A workflow with a **dynamic** interior — same routing concept as a Rail, but the sequence can be edited and altered on the fly. The manager controls issuance manually rather than relying on system-enforced sequencing.

Used when work has a known shape but unpredictable middle: a construction job has known milestones (demo → permitting → framing → electrical) but eight months of variable work in between that can't be statically defined. A creative pitch project has known phases but an unpredictable interior. A new business pilot has no precedent to lock down at all.

**Programs are unverified Rails.** They are the planning surface for work that doesn't yet have a verified pattern. Over time, Programs that recur can be promoted to Rails. See Principle 1 in Section 1.5 and `04_programs_orders.md` for the full treatment.

Key behaviors:

- Programs are owned by an individual (the Program Owner) who plans the work
- Action Items in a Program are NOT live until the manager explicitly Issues them
- Dependencies between Action Items are advisory, not enforced (the manager has judgment)
- Programs can be **personal** (owner self-assigns all items) or **delegated** (items assigned to subordinates) or **mixed**
- Programs can also be issued to **vendors and clients** with appropriate tone-shifted delivery
- Closing a Program is a deliberate manager action, never automatic — see "no auto-fabrication" principle

### Personal Programs

A Program where every Action Item is assigned to the Program Owner themselves. Used as a structured personal task list — somewhere between a flat to-do list and a delegated project. Self-assigned items don't fire compliance notifications (you're notifying yourself, which is silly), and the owner can check items off directly from the Program Detail screen without needing to navigate to My Actions.

Programs can also be **mixed** — some items assigned to yourself, others to subordinates. Self-assigned items behave personally; delegated items behave normally.

This is important because it means Programs serve both delegation use cases AND personal-organization use cases without needing two separate features. See `04_programs_orders.md` Section 12.5.

### Order

The word "Order" has two valid uses in Pathway, and a dev should understand both:

**Universal definition:** An Order is **the act of issuing a step** to a recipient. Every cycle that gets routed to a terminal is, at the conceptual level, an order. The Rail issues orders automatically (the system handles routing). A manager issues orders manually when they click "Issue" on a Program's Action Item. A user issues an order when they click the standalone "Issue Order" button. All three are the same fundamental act: directing work at a recipient.

**Narrow definition (the standalone Order):** A one-off directive issued from one person to another (or to themselves) that isn't part of any Rail or Program — just a small ad-hoc ask. Lives in My Actions Orders tab as an inline-expanding tile. Created via the "Issue Order" button on My Actions top-right. Used when wrapping a small task in a full Program would be ceremony for no benefit.

The system disambiguates between the two uses by context: rail-issued cycles happen silently (no UI label needed), Program issuance buttons say "Issue" / "Issue all" / "Issue phase 1" (context makes it clear), and standalone Orders use the explicit "Issue Order" button.

### Issuer

The person who actually clicked "Issue" on a specific piece of work. Stored per-item for compliance routing — when the work completes, the compliance notification fires back to the issuer's bell.

In most cases the Issuer is the same as the Program Owner, but in handoff scenarios (a senior plans a Program, then transfers it to a junior who issues the items), the Issuer of any specific item is whoever was the active owner at the time of issuance — not necessarily the original creator.

For Rail-issued cycles, the "issuer" is effectively the system itself (the rail handles routing), so there's no human bell to fire to. Compliance for rail cycles flows through the standard rail completion mechanics (next cycle issued, audit logged) rather than through a personal notification.

### Compliance

The upstream signal that fires when a piece of issued work is completed. When an employee, vendor, or client completes their item, the system fires a **compliance notification** back to the item's Issuer via the bell-icon notification surface (see Section 6).

The compliance signal is what closes the planning loop — without it, managers would have to actively check their dashboards. With it, completion is a passive feed of "this is done, you can move forward." Issuance triggers completion triggers more issuance. The cascade flows on its own.

Compliance applies equally to internal employees, external vendors, and external clients. External actors don't have their own bells (they're not Pathway users), but the compliance still routes to the internal issuer. The loop never breaks at the company perimeter. See Principle 10 in Section 1.5.

### Issuance authority (Orders & Programs)

Orders and Programs can only be issued by individuals who have authority to give work to others, based on the org structure. This authority is configured in the Employees / Permissions system (TBD). This is **not** a peer collaboration or request system — it's a directive system. Peer requests for documents or info happen over text/chat, not Pathway.

### Terminal

A _stop_ on a Rail — the location where a Particle currently resides while being worked on. Terminals are logical locations, not necessarily physical ones. A Particle "lives at" a Terminal until it meets the standards required to advance.

**The chain:** Rail → Terminal (a stop) → Post (the role that staffs it) → Employee (the human filling the post).

**Multi-post terminals:** A single Terminal on a Rail can be staffed by more than one Post. Example: a "Sales" terminal could be eligible for B2B salesperson, B2C salesperson, and Enterprise salesperson posts. The system needs to know which posts are eligible to handle particles arriving at that terminal.

**Auto-assign:** When only one eligible post (and one eligible employee) exists at a Terminal, the Particle lands directly in that employee's My Actions inbox automatically — no assignment step needed.

**Assignment Step (for multi-post terminals):** When multiple posts/employees are eligible, the rail can include an explicit **Assignment Step** as the first step of the Cycle. This step appears in the **Area Manager's** inbox (the post with the star icon on the org chart for the relevant container). The manager picks the assignee, and the rest of the Cycle then drops into that employee's My Actions.

**Round-robin distribution:** As an alternative to manager assignment, a Terminal can be configured to auto-distribute Particles across eligible employees in round-robin order (Jan → Bob → Jerry → Jan → ...). Useful for sales leads, treasury cycles, or any work that should be evenly distributed without manager involvement.

**Re-assignment:** Particles can be re-assigned mid-Cycle (e.g. employee gets sick, particle moves to someone else).

**Dynamic Step splitting:** A Step inside a Cycle can be split by a manager into multiple parallel sub-assignments. The manager's action might not be "pick one assignee" but rather "create a brief and parcel out sections to multiple employees, each with their own scope." Example: a creative brief arrives at the Creative terminal; the Creative Director can split the work — copywriter gets body copy, ad specialist gets ad copy, web copywriter gets website copy — three parallel sub-assignments under the same Cycle. The Cycle doesn't advance until all parallel sub-assignments meet VFP.

[TBD — formal name for the split-step concept; revisit when we cover Rail Management]

### Node, Step, Cycle — terminology layers

These three words refer to the same underlying thing from different perspectives:

- **Node** — the technical/builder term. A connected icon on the rail builder canvas. Every box in the rail editor is a node.
- **Step** — the human/runtime term. An actionable item that an employee sees in their inbox and needs to complete.
- **Cycle** — a node that involves a start, a change, and a stop. Encompasses any node where something happens to the particle: a decision, a form being filled, data being gathered, a review, etc.

In practice: every Task node is a Cycle and a Step. Other node types (Condition, Parallel, Approval, Manifest, Statistic, Sub-Flow, Agent, Integration) may or may not be Cycles depending on whether they involve human action — about 90% of human work happens at Task nodes, but Conditionals, Parallels, and Approvals can also involve humans.

### Task

**Two distinct uses of the word "Task" in Pathway:**

1. **Task (node type)** — the primary node type in the rail builder. A Task node represents work performed at a Terminal. Has an assignee, checklist, required manifest fields, and SOPs/tools attached.

2. **Task (employee scratchpad)** — an employee's personal sub-action notes inside a Step. Not enforced, does not advance the Cycle.

Context disambiguates which is meant. In the builder = node type. In the employee inbox = scratchpad.

### Manifest

A traveling data container carried by a Particle as it moves through a Rail. Has two parts:

- **Action Manifest** — the required tasks at each Terminal
- **Data Manifest** — the forms, data, and links collected along the way; grows as the Particle progresses

[TBD — confirm whether Programs and Orders carry Manifests of their own]

### VFP (Valuable Final Product)

The output standard that must be met before a Particle can advance from a Terminal. VFP exists at multiple levels:

- Per Step (must be met to advance within a Cycle)
- Per Terminal/Cycle (must be met to advance the Particle)
- Per Post (defined on the org chart; describes what that role produces overall)
- Per Container (defined on the org chart; describes what that division/dept/section/unit produces overall)

For Orders: VFP = completion of the asked task.
For Programs: VFP = issuer-defined end result; issuer controls when the program closes.

### Ideal Time & Time Temperature

Every Task node in a rail can have an **Ideal Time** — an arbitrary target duration for that cycle, set by the rail designer (e.g. "this lead qualification call should take 30 minutes"). Ideal Time is optional but powerful.

Each running cycle is tracked against its Ideal Time and assigned a **time temperature** — a gradient from cool (on pace) through warm (approaching deadline) to urgent/red (overdue). The temperature is visible in two places:

1. **Employee's `My Actions` inbox** — the cycle tile color shifts as the deadline approaches, creating natural urgency without nagging notifications.
2. **Manager's Rail Activity Visual View** — bottlenecks across the org light up in real time, surfacing where time is being lost without manual analysis.

Time temperature data is **preserved in the archive** so completed runs can be analyzed retrospectively to identify which steps consistently run hot — feeding continuous rail improvement.

### Post

An individual position/job on the org chart. Posts become Terminals when referenced by a Rail. Defined in `01_organization.md`.

### Container

A grouping on the org chart: Division, Department, Section, or Unit. Defined in `01_organization.md`.

### Loop Back

The structured push-back mechanism for cycles. When an employee receives a cycle and discovers that prior work was incomplete, incorrect, or missing required data, they click **Loop Back** instead of trying to fix it themselves or chasing the previous person on Slack.

A Loop Back creates a duplicate cycle ticket that lands in the previous post's My Actions inbox, marked as a red/orange "LOOP BACK" tile with the looper's name and a **mandatory written reason**. The original cycle stays in the looper's inbox unchanged — they still need to complete it eventually, but they can't until the upstream issue is resolved.

Loop Back is the canonical example of **accountability through UI** (see Principle 7 in Section 1.5). It removes the cultural pattern of "just fix the previous person's mistake quietly" by routing the screwup back to the screwer-upper with their name on it. Recipients of loop backs work them like normal cycles, with a "Complete Loop Back" button (renamed from Complete Task) and a mandatory completion notes field capturing what they found and any rail-improvement recommendations.

Loop Back contestation is **handled out of band** — Pathway is not a chat tool. If the recipient disagrees, they call the looper. Stat protection exists so loop backs sent in error don't unfairly mark the recipient's record. Full mechanics in `02_workspace.md`.

### External actors (Clients & Vendors)

Pathway routes work to people **outside** the company in addition to internal employees. Two categories:

- **Client** — the recipient of the company's services. Often the subject of a particle (e.g. a client particle flowing through a delivery rail), but can also be an _assignee_ on specific steps where the client themselves needs to act (review, approve, supply information, sign off).
- **Vendor / Contractor** — an external party doing work _for_ the company (subcontractors, freelancers, inspectors, suppliers).

Both are routed via dedicated node types in the rail builder (Client Task, Vendor Task — see `03_admin.md`) and via Client Requests / Vendor Work Packets in Programs & Orders (see `04_programs_orders.md`). Delivery is via emailed or SMS link to a hosted web page; full app membership is NOT required. An optional guest account may exist for external actors who want persistent logins, but it's never mandatory. The friction floor for external actor participation is "click a link, complete the form."

This is structurally important: Pathway is not just a company-internal workflow tool. Rails span the company's full operational reality, including the external parties the work depends on.

### Programs & Orders (the planning layer)

Programs and Orders are the parallel work-organization layer alongside Rails. The relationship to Rails is the most important framing:

- **Rail** — verified, locked, repeatable. The pattern is known. The system enforces sequencing automatically.
- **Program** — unverified, dynamic, project-scoped. The manager's planning surface for work that doesn't yet have a verified pattern. Manager controls issuance manually. Can be promoted to a Rail when the pattern stabilizes.
- **Order** — at the universal level, the act of issuing a step. At the narrow level, a one-off standalone directive (the "Issue Order" button on My Actions).

**Key architectural points** (full treatment in `04_programs_orders.md`):

- Rails and Programs are the same kind of object at different lifecycle stages — see Principle 1
- Programs cascade through the org via delegation, with each level re-planning at a lower abstraction — see Principle 3
- Programs can be **personal** (owner self-assigns), **delegated**, or **mixed**
- Programs can issue work to **three audiences** with the same underlying mechanics but different tones: Employee Orders (direct, action-first), Vendor Work Packets (professional, scoped), Client Requests (warm, guided)
- Programs have a three-tab Detail view: **Plan / Issue Orders / Command View**. There is no Execute tab — execution happens in recipients' own surfaces (employee My Actions, vendor email, client link), not inside the Program
- **Programs can be embedded inside Rails as dynamic sub-flows** via the Program Node — example: a construction Rail has a "Demolition" step that's actually a Program because every site is different. The reverse (Rails inside Programs) is NOT supported — use cascade-from-rail-completion handoff instead
- Compliance routing: when a recipient completes an issued item, a notification fires upstream to the issuer — see Principle 10

**Where Programs live in the UI:**

- **Workspace → My Programs** — a new screen where any user manages their own programs
- **Admin → Programs** — eagle-eye view of every program in the org, scoped to viewer authority
- **"New Program" button** appears on both My Actions top-right and My Programs top-right for easy access

Full Programs & Orders spec: see `04_programs_orders.md`.

---

## 3. The Core Loop

There are two parallel flows in Pathway: the **Rail flow** (for verified workflows) and the **Program flow** (for dynamic workflows). They use the same underlying mechanics but differ in who controls issuance and how sequencing is enforced.

### Rail flow (system-driven)

1. **A Particle is created.** Some real-world thing enters the system — a lead is captured, a client signs, an asset enters maintenance, a project starts. The particle is given a Particle Type.
2. **The Particle's Type maps to one or more Rails.** The Type ↔ Rail relationship is 1-to-many. A Client particle in a construction company might run on a Delivery Rail, a Change-Order Rail, a Warranty Rail, and a Follow-Up Rail simultaneously.
3. **The Particle is placed at the first Terminal** of the chosen Rail (via the Trigger + Initialize node pair — manual start, webhook-automatic, scheduled, or cascade-from-prior-rail-completion).
4. **The first Cycle ticket appears in the assigned Post's My Actions inbox.** The system handles routing — no human pushes the particle here.
5. **The employee works the Cycle.** They complete the checklist, fill in required Manifest fields, leave comments, attach files, do the actual production work in whatever external tool the Cycle's SOP & Tools tab points to (Canva, QuickBooks, etc.).
6. **The employee clicks Complete Task.** This is the assembly-line conveyor moment — the particle physically advances to the next Terminal, and a new Cycle ticket appears in the next Post's My Actions inbox.
7. **If the employee discovers prior work was incomplete or incorrect**, they click Loop Back instead. The duplicate ticket lands in the previous post's inbox with a mandatory reason. The original cycle stays in the current employee's inbox until the loop back is resolved.
8. **Steps 5-7 repeat** until the particle reaches an End node, at which point the rail run completes and the particle is archived (still queryable, no longer active).

In parallel: **managers monitor** rail runs through Rail Activity (list view + Visual View), can drill into specific runs via Rail Run Detail, and can take actions like Cancel, Reassign, Force Advance, Nudge (sends a soft escalation to the assignee), Edit Manifest, and Migrate-to-another-rail.

### Program flow (manager-driven)

1. **A user creates a Program.** They click "New Program" (from My Actions top-right or My Programs). They give it an Objective, a Target Completion Date, and an optional Client/Entity reference.
2. **The Program opens in the Plan tab** of Program Detail. The user (now the Program Owner) builds out Action Items — discrete units of work, each with a name, description, recipient, and other fields. Recipients can be internal Posts, external Vendors, or external Clients. Items can be tagged with Phases for grouped issuance.
3. **The Program can be transferred** to another owner (typically a subordinate) at any point. The new owner is expected to expand the program before issuing — see the planning cascade in Principle 3.
4. **The owner switches to the Issue Orders tab** when they're ready to push work live. They choose an issuance mode: Issue All (everything at once), Issue Phase N (one phase at a time), or Issue Single (one item at a time, max control). They can also multi-select items for batch issuance.
5. **At issuance, each Action Item is converted into live work** appropriate to its recipient type:
   - **Internal:** A Cycle appears in the assigned Post's My Actions inbox, with the Program Objective at the top, the description, the checklist, and a Complete + forward button (or just Complete for personal items)
   - **External Vendor:** An email/SMS/link is sent to the vendor with a structured work packet — scope, materials, deliverables, response window. The vendor accesses a hosted web page to respond
   - **External Client:** A branded email/link is sent to the client with a warmer, guided request — project progress, what we need from you, action button. Same hosted-page mechanic, different tone
6. **Recipients work the items in their respective surfaces.** Internal employees use the standard My Actions cycle flow. External actors use the hosted page (V1: simple form; richer portal deferred).
7. **When a recipient completes an item, a Compliance notification fires upstream** to the issuer's bell icon. The Command View metrics update (Issued / Completed / In Progress / On Track For). Items with soft dependencies on the now-completed item flip from "Awaiting X" to "Ready to issue."
8. **The owner monitors via the Command View tab** — left column shows issued + active items, right column shows ready-to-issue items with inline "Issue now" links. The owner adds new Action Items dynamically as needs emerge, issues more items as capacity clears, nudges recipients who are slow, reassigns when needed.
9. **The owner explicitly closes the Program** when the work is done. If items remain uncompleted at close, the system prompts whether to mark them complete or preserve them as uncompleted in history (no auto-fabrication — see Principle 6).

### Where the two flows touch

- **Programs can be embedded inside Rails** via the Program Node. When a particle reaches a Program Node, the system spawns a fresh Program for the responsible manager. The rail particle pauses until the manager closes the embedded Program, then advances. This is how Pathway handles workflows that are mostly repeatable but have one or two genuinely dynamic stretches (the demolition example).
- **Rails can hand off to other Rails** via cascade-from-completion Triggers. When one rail's End node fires, it can trigger a new rail on the same particle (e.g., lead-to-sale completion → onboarding rail start).
- **Programs do NOT embed Rails.** If a verified workflow exists, you trigger it as a separate cascade — you don't add it as a step inside a Program. The reverse direction would mix verified and unverified work in confusing ways.

### My Actions is the main HUD inbox

`My Actions` is the convergence point. Whatever the source — Rail-issued cycles, Program-issued cycles, standalone Orders, Loop Backs, Stuck Initializers, Approval cycles — they all land in the same employee inbox surface. The employee doesn't need to know whether their next ticket came from a Rail or a Program; they just see what's in front of them and do the work. This is the "tickets, not lists" thesis in action.

---

## 4. Roles & Permissions Model

A user's actual capabilities in Pathway are computed from **three independent dimensions** that combine:

1. **Team Role** — the platform-level access tier (Owner / Admin / Member, plus optional Partner toggle). Set when a Team Account is created or invited.
2. **Org Chart Position** — derived automatically from which Posts the user holds via their Employee Particle. Determines manager-over-junior authority.
3. **Per-user permission checkboxes** — a fine-grained capability panel set per Team Member by an Admin. Allows custom configuration beyond the role baseline.

These three combine to produce the user's actual capabilities. You can be a Member at the Team level, a manager of 5 reports at the Org Chart level, AND have additional checkbox-granted permissions to build rails for your team — all simultaneously. The model is intentionally additive: Team Role gives you a baseline, Org Chart Position layers manager authority on top, and per-user checkboxes layer specific extras on top of that.

There is **no standalone Permissions screen** in V1. All permission configuration happens on the Team Member edit panel (see `01_organization.md` → Team screen).

---

### 4.1 Team Roles

| Role                                       | Description                                                                                                                                                                                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**                                  | Full control. Billing, transfer ownership, delete the org. One person at a time (transferable). All Admin capabilities included.                                                                                                                                           |
| **Admin**                                  | Full platform-config powers. Build rails, edit org structure, configure particle types, configure manifests, configure dashboards, invite team members, edit anyone's permissions. Cannot do Owner-only operations (billing, ownership transfer, org deletion).            |
| **Member**                                 | Operational user. Capabilities determined by Org Chart Position + per-user checkboxes. Cannot configure the platform (build rails, edit org structure, etc.) UNLESS specifically granted via checkbox.                                                                     |
| **Partner** _(toggle, orthogonal to role)_ | Non-operational stakeholder. Cannot hold Posts on the org chart. Cannot receive cycles, run rails, or issue orders. Has read-only access to dashboards and statistics. Use cases: investors, board members, external advisors, fractional executives, franchise overseers. |

**The Admin/Member line is exactly: configuring the platform vs using it.** Admins build the operational reality (rails, types, structure). Members operate within that reality. Per-user checkboxes can shift specific capabilities across the line — e.g., a Member can be granted "build rails for own area" without becoming a full Admin.

---

### 4.2 Org Chart Authority (automatic)

Manager-over-junior authority comes from the org chart structure itself. **There is no separate "John can manage Sarah's cycles" toggle.** If John holds a Post in any Container above Sarah's Post in the org chart, the system automatically grants John these capabilities for Sarah:

- See Sarah's cycles in oversight views (Rail Activity scoped to John's area)
- Open Sarah's Cycle Detail page in read mode
- Take action on Sarah's cycles via the **Manage as [Sarah]** toggle (complete checklist items, edit manifest, leave comments, force-complete)
- Issue orders to Sarah
- Reassign Sarah's cycles to other employees in the same area
- Nudge Sarah's cycles
- See Sarah's stats in the Statistics screen (TBD — full stats spec)
- Create dashboard tabs scoped to Sarah's Post

This authority is **transitive up the chart**: a Section lead has authority over everyone in their Section, a Department head over everyone in their Department, and so on up to the Owner who has authority over the entire org.

**Org Chart Position is derived from Employee Particle Posts.** When you assign John Lennox to the "Account Manager" post, you're updating John's Employee Particle's Assigned Posts field. The system reads that to determine the org chart, which determines authority.

A user with no operational Posts (e.g., an Admin who's purely a platform builder, or a founder who doesn't hold a day-to-day operational seat) has **zero org chart authority** — they have full Admin platform powers but cannot manage anyone's cycles, because they're not above anyone in the operational chart. Conversely, a Member who's the COO has full operational authority over the entire company below them, even though they can't reconfigure the platform.

---

### 4.3 Per-User Permission Checkboxes

On the Team Member edit panel, Admins can grant or revoke specific capabilities per user via checkboxes. This is the modular layer that makes the system work for both flat and hierarchical companies.

**Defaults:**

- **Admins:** every checkbox is on by default and cannot be unchecked (Admins have full capabilities by definition)
- **Members:** sensible operational baselines (described below); Admin adjusts as needed
- **Partners:** only the Visibility checkboxes are available; all Operational and Configuration checkboxes are hidden

**Edit and Delete are always separate.** Every "build/edit X" capability has a paired "delete X" capability that's checked separately. Default when granting an edit capability: **Edit ON, Delete OFF**. This protects against the "trusted to build, not trusted to destroy" pattern that's common in real organizations — a manager who can adjust their team's rail logic shouldn't necessarily be able to delete the rail's entire history.

#### Operational checkboxes (about doing work)

| Checkbox                                                     | Default for Member       | Notes                                                |
| ------------------------------------------------------------ | ------------------------ | ---------------------------------------------------- |
| Can run rails they're authorized to start                    | ON                       | Subject to per-rail "Who Can Start This Rail" config |
| Can issue rails outside their authorized list                | OFF                      | Allows running any rail in the org                   |
| Can create programs                                          | ON                       | Anyone can plan their own work                       |
| Can create programs and assign to subordinates               | (derived from org chart) | Automatic if they have direct reports                |
| Can issue standalone orders                                  | (derived from org chart) | Automatic if they have direct reports                |
| Can issue orders to people outside their direct reports      | OFF                      | Cross-team issuance                                  |
| Can take action on cycles outside their direct reports' work | OFF                      | Generally restricted to direct reports               |
| Can transfer Program ownership                               | ON for own programs      | OFF for others' programs unless granted              |

#### Visibility checkboxes (about seeing data)

| Checkbox                                                | Default for Member       | Notes                                          |
| ------------------------------------------------------- | ------------------------ | ---------------------------------------------- |
| Can see stats for own Post(s)                           | ON                       | Always — you can always see your own work      |
| Can see stats for direct reports                        | (derived from org chart) | Automatic if they have direct reports          |
| Can see stats for entire area of authority              | (derived from org chart) | Section / Department / Division based on chart |
| Can see stats for the entire org                        | OFF                      | Org-wide stat visibility                       |
| Can create new statistics for their area                | OFF                      | Building tracked stats                         |
| Can create new statistics for the entire org            | OFF                      | Org-wide stat creation                         |
| Can see all programs in the org                         | OFF                      | Eagle-eye Admin Programs view                  |
| Can see Rail Activity for areas outside their authority | OFF                      | Cross-area rail run visibility                 |

#### Limited Platform Configuration (the middle tier)

| Checkbox                                  | Default for Member | Notes                                                          |
| ----------------------------------------- | ------------------ | -------------------------------------------------------------- |
| Can build rails (for own area only)       | OFF                | Builds rails as **drafts**; publishing requires Admin approval |
| Can build rails (org-wide)                | OFF                | Effectively Admin tier                                         |
| Can build manifests                       | OFF                | Builds manifest templates                                      |
| Can build particle types                  | OFF                | Builds new particle type schemas                               |
| Can edit org structure (own area only)    | OFF                | Edit posts within their reporting tree                         |
| Can edit org structure (org-wide)         | OFF                | Effectively Admin tier                                         |
| Can promote particle types to sidebar nav | OFF                | Affects everyone's nav, normally Admin-only                    |

**Rail publishing for non-Admin builders:** A Member with "Build rails (for own area only)" can construct rails as **drafts**. Publishing the draft to active status requires **Admin approval** — the rail builder submits, an Admin reviews and clicks Publish. This is the same model GitHub uses for pull requests: anyone can write code, only some people can merge it.

Admins can publish their own rails directly without approval.

[TBD — exact approval flow UI: notification to Admin, review surface, approve/reject/request-changes actions. Defer to a follow-up session when needed.]

#### Sensitive checkboxes (destructive or audit-affecting)

| Checkbox                                    | Default for Member                    | Notes                                                 |
| ------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| Can force-cancel rail runs                  | (derived from org chart, in own area) | Cancellation is logged with reason                    |
| Can delete cancelled rail runs from history | OFF                                   | Permanent deletion of audit records                   |
| Can edit completed rail manifest data       | OFF                                   | Audit-affecting; always logged                        |
| Can delete particles                        | OFF                                   | Particle deletion is destructive and cascades         |
| Can delete programs                         | OFF for others' programs              | Own programs can be closed but not deleted by default |
| Can remove team members                     | OFF                                   | Admin/Owner only by default                           |
| Can override required fields on cycles      | OFF                                   | Bypasses VFP gating                                   |

These are the permissions that need the strictest defaults because they affect data integrity, audit trails, and the accountability infrastructure the system depends on.

---

### 4.4 Putting It All Together — Examples

**Example 1: A construction company COO**

- Team Role: Member
- Org Chart Position: top of the operations division, 50 reports underneath
- Per-user checkboxes: defaults
- **Effective capabilities:** Can manage cycles for any of the 50 reports (org chart auto-grant). Can issue orders to all of them. Can see all their stats. Can create programs and assign to anyone in operations. Cannot build rails or edit the platform (would need Admin role or specific checkboxes).

**Example 2: A platform-building consultant**

- Team Role: Admin
- Org Chart Position: holds no operational posts
- Per-user checkboxes: defaults (all on, can't be unchecked)
- **Effective capabilities:** Full platform configuration. Builds rails, edits the org structure, configures particle types, invites team members. Cannot manage anyone's cycles because they have no org chart authority. They're a builder, not a manager.

**Example 3: A sales team lead with rail-building responsibilities**

- Team Role: Member
- Org Chart Position: Section lead in Sales, 4 sales reps reporting up
- Per-user checkboxes: + "Can build rails (for own area only)", + "Can create new statistics for their area"
- **Effective capabilities:** Manages the 4 sales reps automatically (org chart). Can build sales rails as drafts that go to an Admin for approval. Can create custom stats for the sales team. Can issue programs and orders to the 4 reps. Cannot do anything outside the sales section or build org-wide platform changes.

**Example 4: An investor**

- Team Role: Member, Partner toggle ON
- Org Chart Position: none
- Per-user checkboxes: read-only visibility (Visibility checkboxes only — Operational and Configuration are hidden)
- **Effective capabilities:** Can view dashboards and statistics. Cannot hold posts, receive cycles, run rails, issue anything, or configure anything. Pure observer.

---

### 4.5 Future: V1.5 Enhancements

The current model is V1: Team Role + Org Chart + per-user checkboxes, all configured on the Team member edit panel. As customers use the system, the following enhancements may emerge:

- **Permission templates** — predefined checkbox sets ("Sales Manager", "HR Specialist", "Finance Lead") that an Admin can apply with one click instead of checking 15 boxes individually
- **Scoped Partner access** — limit a Partner to specific divisions or particle types instead of full read-only access
- **Per-rail authorization lists** — granular control over which Members can run which specific rails, beyond the rail's "Who Can Start This Rail" config
- **Time-limited permissions** — grant a capability that expires after a date (useful for contractors and temporary roles)
- **Permission audit log** — track who granted/revoked which capabilities, with timestamps
- **Standalone Permissions screen** — a dedicated nav item under Admin where all permissions across the org are visible at once (currently they're scattered across individual Team Member edit panels)

None of these are V1. They are deferred until the V1 model proves itself or breaks in real usage.

---

## 5. Data Relationships

[TBD — entity diagram once more screens are spec'd]

Known so far:

- `organizations` → contains `divisions` → `departments` → `sections` → `units` → `posts`
- `posts` ↔ `employees` (via `post_assignments`, many-to-many)
- `posts` are referenced by `rails` as Terminals (TBD: schema)
- `particles` belong to `particle_types`; each type can map to **one or many rails** depending on company need. A drop-shipping company may only run a Client particle through a Returns rail; a construction company runs the same Client particle through delivery, change-order, warranty, and follow-up rails. The Type ↔ Rail relationship is 1-to-many.
- **Particles are user-defined forms.** Particle types are built like custom data forms — companies decide what fields each particle type tracks, similar to how manifests are built. There is no fixed schema for "Client" or "Lead"; the company defines what data their Client particles carry.
- `programs` and `orders` are separate entities from particles

---

## 6. Cross-cutting Features

[TBD]

Known so far:

- Undo/Redo system in Org Structure edit mode (covers all edit actions)
- Confirmation modals on destructive actions (delete container requires typing "delete" Notion-style)

### Notifications System (Bell Icon)

A global notifications surface that surfaces new work and manager nudges to employees, accessed from anywhere in the app.

**Location:** Bell icon in the top-left of the sidebar, next to the Pathway logo. A red square badge with a count indicates how many unread notifications are waiting.

**Behavior:**

- Click the bell → opens a dropdown listing all unread notifications
- Each notification shows: title (e.g., "New cycle assigned", "Approval needed", "Manager nudge", "Cycle cancelled"), source (which rail / particle), timestamp
- Click a notification → jumps directly to the relevant cycle / page in the app
- Once clicked, the notification is removed from the bell (it's an indicator that _new_ things exist, not a permanent log)
- Persistent log of all past notifications is available somewhere [TBD — separate notifications page or just in audit logs]

**What triggers a notification:**

- New cycle issued to your inbox
- New approval cycle issued to your inbox
- Loop back received
- Manager nudge on a cycle assigned to you (see Nudge mechanism in `03_admin.md`)
- Cycle cancelled (with reason from the manager)
- Order issued to you
- @-mention in a cycle comment

**Why it matters:** the bell is the gentle "hey, something happened" channel — distinct from My Actions, which is the "here's everything you have to do" surface. You don't _need_ the bell to know your work; My Actions tells you that. The bell is for surfacing changes you might otherwise miss because you're not actively scanning your inbox.

### Org Switcher (top-left of sidebar)

A **global organization switcher** that lets a Team Account work across multiple Pathway organizations from a single login. Located in the top-left of the sidebar, above the nav groups.

**Why it exists:**

- Founders who own multiple companies and use Pathway to manage all of them
- Consultants working across several clients, each with their own Pathway org
- Investors monitoring portfolio companies as separate orgs
- Franchise operators with multiple locations as separate orgs
- Anyone with legitimate cross-org access needs

**Behavior:**

- Dropdown shows every organization the current Team Account is a member of, with the currently-active one highlighted
- Switching orgs swaps the entire Pathway context: different org chart, different rails, different particles, different dashboards, different team members, different bell notifications
- Each org is **fully isolated** — data does not cross org boundaries
- For users in only one organization, the switcher still appears but is functionally a static label

**Auto-creation of Employee Particle on invite:** When a Team Account is invited to an organization, the system automatically creates an associated Employee Particle in that org with the email pre-filled and Linked Team Member set. This keeps the Team Account ↔ Employee Particle pair in sync from day one. See `01_organization.md` Team screen and `05_particles.md` Section 9 for full mechanics.

[TBD — cross-org behavior: do bell notifications aggregate across orgs or only show the active one? Probably only the active one to avoid confusion. Defer to a follow-up session.]

---

### User Tile (bottom-left of sidebar)

At the bottom-left of the sidebar, every screen shows the currently-signed-in user's tile with:

- **Avatar / initials**
- **Name** (e.g., "Sage Epic")
- **Team Role badge** (e.g., "Owner", "Admin", "Member")

**Click behavior:** opens a small popover with two options:

- **Profile** — navigates to Settings → Profile tab
- **Log out** — signs out of Pathway (if currently in a multi-org session, logs out of all orgs on this device)

This tile is persistent across every screen. It is distinct from the Org Switcher (which is in the top-left of the sidebar and swaps organizations).

---

### Differential Sidebar (Admin vs non-Admin users)

**The sidebar is not the same for everyone.** Based on Team Role and per-user permission checkboxes, certain nav groups are hidden from users who don't have access to them.

**Baseline sidebar for every user:**

- **Workspace group** — Dashboard, My Actions, Calendar, **Statistics**
- **Organization group** — Structure (read), Team (read)
- **Particles group** — Types (read), plus any promoted particle types (Clients, Employees, Leads, etc., as configured)
- **User Tile** (bottom-left)
- **Org Switcher** (top-left, if user belongs to multiple orgs)

**Admin sidebar additions** (only shown to Admins and Owners):

- **Admin group** — Rail Management, Orders (admin tracking view), Manifest Management, **Settings**

**Permission-checkbox-granted additions** (for Members with specific checkboxes, see Section 4.3):

- A Member granted "Can build rails" sees Rail Management even though they're not an Admin
- A Member granted "Can build manifests" sees Manifest Management
- A Member granted "Can build particle types" sees the edit affordances on Types (but the nav item is shown to everyone)

**Employees without platform-config permissions** get the clean baseline sidebar — no Admin group, no Settings, no platform-building noise. They see only the operational surfaces they need to do their job.

This matches the principle that Pathway distinguishes **using the app** (operational, Member-level) from **configuring the platform** (Admin-level). The sidebar visually reinforces that boundary.

[TBD — sidebar behavior for Partners: likely Workspace-read + whatever Visibility checkboxes grant, no Organization/Particles/Admin groups.]

---

### God Mode — Development Only (NOT a customer feature)

The current implementation shows "God Mode" as a collapsible section above My Actions in the sidebar. **This is a developer-only feature and must not be shipped to customers.**

God Mode is used by the dev team (and Anthropic/Sage during design) to:

- View the app as if they were any Post in the org
- Bypass permissions to test edge cases
- Inspect data across all orgs from a single session

**For customer-shipped builds, God Mode must be hidden or stripped.** The equivalent for customers is the Admin role, which provides full platform access within a single org but does NOT allow impersonating arbitrary Posts or bypassing the permission model.

Any mention of God Mode in screenshots or implementation notes should be interpreted as dev tooling, not product spec.

---

## 7. Glossary

[TBD — alphabetical quick reference, populated at the end]
