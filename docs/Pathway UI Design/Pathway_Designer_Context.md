# Pathway — Designer Context Document

### For UI/UX Design Teams: Technical Architecture, User Flows & Emotional Relief by Role

---

## Purpose of This Document

This document is written specifically for a UI/UX designer who needs to understand Pathway at the level of _how it works_, _who it works for_, and _what emotional state each user arrives in and leaves with_. The goal is not just to make the software functional — it is to make the UI reinforce the feeling the software is designed to create. Every role in this system has a specific pain it carries. The UI should resolve that pain visibly and immediately.

---

## 1. What Pathway Actually Is

Pathway is a **workflow enforcement layer** that sits on top of a company's org structure. The single best metaphor is a **conveyor belt**.

A company has real-world things that need work done to them — a new client, a sales lead, a support request, a monthly deliverable, a hire. Pathway calls these things **Particles**. A Particle moves through a sequence of **Terminals** (positions on the company org chart held by real employees). At each Terminal, the assigned employee does their defined work, meets a completion standard, and the Particle automatically advances to the next Terminal.

This is different from every existing tool (Monday, Asana, ClickUp, Notion). Those tools are **databases of work that could be done**. Pathway is a **ticket queue of work that must be done now**. The distinction is total and structural.

---

## 2. Core Terminology — The Designer Must Know These Cold

| Term                             | Technical Definition                                                                                       | Simple Version                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Rail**                         | A defined sequence of Terminals a Particle must pass through                                               | The workflow blueprint                  |
| **Particle**                     | Any real-world entity being tracked through a Rail (client, lead, job, invoice)                            | The thing moving through the system     |
| **Terminal**                     | A Post on the org chart that receives and processes a Particle                                             | A workstation                           |
| **Cycle**                        | One Particle's complete pass through a single Terminal — open when it arrives, closed when work meets VFP  | One unit of work at one station         |
| **Step**                         | A system-defined, non-skippable stage within a Cycle                                                       | A required checkpoint                   |
| **Task**                         | An employee's personal scratchpad notes inside a Step                                                      | Personal working notes — not enforced   |
| **VFP (Valuable Final Product)** | The completion standard that must be met before a Particle advances                                        | The definition of "done"                |
| **Manifest**                     | A traveling data container carried by the Particle through the Rail                                        | The file that follows the work          |
| **Loop Back**                    | A structured push-back that sends a Particle back to the previous Terminal with a mandatory written reason | The formal "this isn't right" mechanism |
| **Ideal Time**                   | An optional expected duration set per Step by the Rail designer                                            | The clock                               |
| **Time Temperature**             | A visual heat state (cool → warm → hot → urgent) showing how close a Cycle is to its deadline              | The urgency indicator                   |

---

## 3. The Architecture in Plain Flow

```
RAIL (the complete workflow blueprint)
  └── TERMINAL 1 (a Post on the org chart)
        └── CYCLE (the Particle's pass through this Terminal)
              └── STEP 1 (enforced — system-defined)
                    └── TASK a (employee scratchpad — not enforced)
                    └── TASK b
              └── STEP 2
              └── STEP 3 → PRODUCT MEETS VFP → PARTICLE ADVANCES
  └── TERMINAL 2
        └── CYCLE
              └── STEPS...
  └── TERMINAL 3...
```

**The rule that governs everything:** A Particle sits at a Terminal. The Terminal processes a Cycle. The Cycle is complete only when all Steps are done and the product meets VFP. Only then does the Particle physically advance to the next Terminal. The system enforces this. There is no workaround.

Multiple Rails can run simultaneously on different Particles. Multiple Particles can be on the same Rail at different stages at the same time. The system tracks all of it.

---

## 4. The Four Roles — Pain, Relief, and UI Implication

---

### Role 1: The Employee (Individual Contributor)

#### The Pain They Arrive With

The average employee in a modern company is drowning in input noise with zero structural clarity. They have Slack messages from three managers, a shared board with 47 tasks in random priority order, emails with action items buried in paragraph five, and no reliable signal for what to actually work on right now. They get pulled off tasks mid-completion. They miss things not because they are lazy but because the system they work in has no enforcement backbone. They feel guilty, scattered, and perpetually behind.

When something goes wrong and they didn't do a task, they often genuinely didn't know they were supposed to. It was buried. It was unclear. No one confirmed ownership.

#### What Pathway Does for Them

Pathway hands the employee a **ticket queue**. Not a board. Not a list. A queue. Work shows up in their inbox when it has been issued to them. They did not browse for it. They did not pick it. The system assigned it. Their job is simply to clear it.

They open **My Actions** and they see exactly what has been given to them, in order, with all the information they need to do it. They cannot dismiss a Cycle. They cannot snooze it. The only way out is through. But because the scope is bounded — only what's been issued — they also cannot drown in future work they don't control yet. What isn't issued doesn't exist for them yet.

When they open a Cycle, they see:

- Where the Particle came from (previous Terminal)
- What they need to do (Steps, clearly listed)
- What data the previous person already collected (Manifest — the artifact tab)
- Where the Particle is going next (next Terminal)
- Their personal scratchpad (Tasks)

When they click **Complete & Forward**, the Particle leaves their desk. The next employee's inbox populates automatically. There is no Slack message required. No status update email. The system routes it.

If something arrives incomplete from the previous Terminal, they click **Loop Back** — a structured, named, written reason that returns the Particle upstream. No passive-aggressive Slack. No awkward chase. The system handles the accountability.

#### The Emotional State Pathway Creates for Them

**Clarity.** The employee knows exactly what to do. Not roughly. Exactly. They are not choosing between 47 tasks of ambiguous priority. They are reading one ticket and doing that work. When it's done, they look at the next ticket. The feeling is the same as clearing a customer support queue — there is a rightness to it, a completable-ness that scattered task boards never provide.

#### UI Design Implication

The employee's primary screen (My Actions) should feel like a clean, focused cockpit — not a project management tool. Minimal visual noise. The current ticket should dominate the viewport. The queue should be visible but not overwhelming. Time temperature should communicate urgency without anxiety — a warm color gradient is enough; don't alarm the employee, orient them. The Loop Back action should feel like a clear, legitimate choice — not an act of conflict. The Complete & Forward button should feel like a satisfying, structural moment: this work is done, it has moved, the belt advanced.

---

### Role 2: The Manager

#### The Pain They Arrive With

The manager's problem is the opposite of the employee's. The employee doesn't know what to do. The manager can't see what's being done. They spend their days in status-update meetings, chasing people on Slack, trying to triangulate who is working on what and how far along they are. They manage by asking, not by seeing.

When something goes wrong — a deliverable missed, a client dropped — they do a post-mortem that reveals the failure point, but they had no warning. No signal. No structural visibility. They managed relationships and hoped for the best.

They also face a second problem: their promoted managers (team leads, section heads) are often former individual contributors who are excellent at the work but structurally unprepared to manage it. These people default to doing everything themselves rather than enforcing accountability through their team.

#### What Pathway Does for Them

Pathway turns the manager's job from **chasing information** to **reading a dashboard**. Every Particle in their area of authority has a live position, a time temperature, and a full history. They do not need to ask anyone anything. They open the manager dashboard and they see:

- Which Particles are on track
- Which Particles are sitting too long at a Terminal (bottlenecks)
- Which Particles were Loop-Backed (process failure signals)
- Which Terminals are overloaded
- Average cycle time per Terminal compared to Ideal Time

When something is stuck, they can click into it, see exactly why, and take action — reassign, nudge, or force-advance. No meeting required.

They also have two planning tools that operate on top of the Rail system:

**Orders** — a one-off directive issued directly to a post. "I need you to do this specific thing, outside of any Rail." The recipient cannot dismiss it. It lives in their My Actions until it's resolved.

**Programs** — a planning surface for project-scoped, dynamic work. The manager builds a list of Action Items, assigns each to a post (internal), a vendor (external), or a client, and issues them in controlled phases. The Program Command View gives the manager a live monitoring dashboard for everything issued — what's been completed, what's outstanding, what's overdue.

The key distinction: the manager is not assigning tasks and hoping they get done. The system enforces completion. If something is overdue, the manager sees it. If something was rejected and Loop-Backed, the manager sees which step failed and why.

#### The Emotional State Pathway Creates for Them

**Control without micromanagement.** The manager stops asking "where are we on this?" because the answer is always visible. They also stop being the bottleneck — because the Rail handles routing, they only need to intervene for exceptions, not routine flow. Their job shifts from human router to exception handler and capacity manager. That is a fundamentally more satisfying job.

#### UI Design Implication

The manager's dashboard should feel like a **command center**, not a task list. They should be able to read the health of their entire operation at a glance — no drilling, no filtering, just the status of everything in one view. Color language matters here: green flows, amber warns, red demands attention. A bottleneck should look like a bottleneck — visually obvious, not hidden in a number. Loop-back rates should surface as a process health signal, not just a count. The manager should feel like they are watching a machine they built — and that when it breaks, the break is visible immediately.

---

### Role 3: The Owner / CEO / Executive

#### The Pain They Arrive With

The owner built the company. They are also, almost always, the biggest problem in it. Every decision routes through them. Every escalation lands on them. Every process gap becomes their emergency. They cannot take a vacation without their phone. They cannot delegate without anxiety that things will be done wrong. They work more hours than anyone else in the company despite theoretically having more resources than anyone else.

Their deepest operational problem is **invisible capacity**. They have no reliable way to see whether their company can handle more work or is already at its limit. They watch revenue come in but can't see whether production can absorb it. They see a client complaint but can't diagnose which step in which process failed. They make resourcing decisions based on gut feel and whoever complains loudest.

They also cannot systematically measure their own company. They know roughly how long things take. They don't have real numbers. They can't make hiring decisions with data. They can't optimize processes without evidence.

#### What Pathway Does for Them

Pathway gives the owner the first real aerial view of their own company. The **Executive Dashboard** shows every Rail running simultaneously, with live throughput data, bottleneck identification, capacity signals, and KPI tracking. Not what people said in a meeting. What the system measured as it happened.

Specific capabilities:

- See all active Particles across all Rails, their current stage, their time temperature
- Identify which Terminal is consistently creating delays (the bottleneck is structural, not personal)
- See the gap between sales rate and production capacity (before it becomes a crisis)
- Review Statistics — enforced KPIs tied to Rail events, not self-reported by employees
- See loop-back patterns — which steps in which Rails are consistently generating rejections (process design flaw signals)
- Make hiring decisions, process changes, and resourcing moves based on data, not instinct

The owner also fundamentally benefits from the fact that **Pathway breaks their dependency**. Because the Rail enforces process, the company does not need the owner to remember it, remind employees of it, or follow up on it. The system does that. The owner transitions from the company's only reliable enforcer to a strategic observer who only acts on structural exceptions.

#### The Emotional State Pathway Creates for Them

**Escape from the bottleneck.** The owner stops being indispensable to daily operations. They can watch the company run. They can see problems forming before they become emergencies. They can make decisions with actual data. The company starts to feel like a system they built and operate — not a chaos they are perpetually managing from inside.

#### UI Design Implication

The executive dashboard should feel like a **Bloomberg terminal or a military operations room** — it is a high-information, high-authority surface. The data should be dense but readable. Color is the primary communication medium: the executive doesn't click into every detail, they scan for anything that isn't green. Bottlenecks should glow. Throughput should be visible as a flow, not just a number. KPIs should be tracked against targets with clear directional indicators. This is not the place for soft UI — it should feel serious, capable, and commanding.

---

### Role 4: The Company Owner as Rail Designer (Admin Role)

This is the owner or a trusted operational lead in Admin mode — not observing the system but building and tuning it.

The Rail Builder is where Rails are designed as visual sequences of Terminals, with each Terminal configured for its assigned Post, Steps, VFP standards, Manifest requirements, Ideal Times, and conditional logic. This is the most technically sophisticated surface in Pathway.

The Admin also manages:

- **Org Structure** — the org chart that defines all Posts and Containers (Divisions, Departments, Sections, Units). This is the routing infrastructure. Posts become Terminals.
- **Particle Types** — custom data schemas defining what fields each Particle type carries
- **Manifests** — user-defined traveling data containers that collect information as a Particle moves through a Rail
- **Statistics** — custom tracked KPIs that can be tied to specific Rail events and automatically updated as Cycles complete

The key design principle for admin surfaces: **the builder should feel like constructing a real system, not filling out forms.** The Rail Builder especially should communicate the spatial, flowing nature of work — nodes connected by routes, Particles moving through them.

---

## 5. The Complete Interaction Flow — Tracing One Particle

To understand how the system connects from one role to another, trace a single Particle from creation to completion.

**Scenario:** A new inbound lead arrives at Apex Media, a digital marketing agency.

1. **Owner (Admin)** previously built a "Lead-to-Close Rail" with Terminals: Sales Desk → Proposal Terminal → Director Review → Contract Terminal → Onboarding.

2. **Employee at Sales Desk Terminal** receives an intake form. They fill in the lead's information. The system creates a new Particle. The Rail starts. A Cycle opens at the Sales Desk Terminal and lands in the sales employee's **My Actions** inbox.

3. **Sales Employee** opens the Cycle. They see the Steps they must complete: qualify the lead, log a discovery call, document pain points. They cannot mark the Cycle complete without working through all Steps. They fill in the required Manifest fields (where did this lead come from? what's their budget range?). When the Cycle is done, they click **Complete & Forward**. The Particle advances to the Proposal Terminal automatically.

4. **Proposal Writer** receives the Cycle in their My Actions. They open the Manifest tab and find everything the Sales employee collected — no Slack message needed, no email chain. They write the proposal, attach it to the Manifest, complete their Steps. Forward.

5. **Director** receives the review Cycle. They read the proposal, Manifest context, and make a decision. If the proposal is incomplete, they Loop Back to the Proposal Writer with a written reason. The Proposal Writer's inbox now shows a Loop Back tile — they fix it and re-forward.

6. **Manager** has been watching all of this on their dashboard the whole time. They see the lead has been at Director Review for 2 days — yellow time temperature. They haven't needed to ask anyone. They can see the whole chain.

7. **Owner** sees the Lead-to-Close Rail's throughput stat. Average time from intake to close: 9 days. They see one Particle is at 14 days — the system flags it amber. They click in, see the Loop Back happened at Proposal stage, and note that this is the third Loop Back this month at that stage. That's a process signal. They revise the Proposal Terminal's Steps.

---

## 6. Key Mechanics — What the UI Must Communicate

### The "No Dismissal" Rule

An employee cannot remove a Cycle from their inbox. There is no snooze. There is no "move to later." Work issued to you stays with you until it's completed, loop-backed, reassigned, or cancelled by a manager. The UI should communicate this without being punitive. The inbox is not a threat — it is a guarantee of clarity. The visual language should feel like a clean work surface, not a cage.

### Time Temperature

Every Cycle with an Ideal Time set moves through a temperature gradient: cool (on pace) → warm (approaching deadline) → hot (at deadline) → urgent (overdue). This should manifest as a **color shift on the Cycle tile itself** — a background or border gradient that shifts from neutral to amber to red. The employee doesn't need to check a clock. They scan the queue and the hottest things are visually obvious.

### Loop Back

Loop Back is a first-class action — equal in UI weight to Complete & Forward. It is not a complaint. It is a structured, accountable push-back. When an employee triggers a Loop Back, they write a mandatory reason. That reason is logged, named, and archived. The UI should make Loop Back feel like a professional, legitimate action — not a confrontational one. It is how quality is enforced without interpersonal friction.

### Manifest Tabs

Every Cycle Detail has two tabs:

- **Action Tab** — the Steps the employee must complete (the what and how)
- **Manifest Tab (Artifact Tab)** — all data collected by every previous Terminal on this Particle's journey

The Manifest tab is critical context. It means the employee never starts work blind. They see what was logged before them. The UI should make these tabs visually distinct — Action is forward-looking and task-oriented, Manifest is historical and informational.

### Complete & Forward

This button is the most important moment in the employee experience. It is the instant where work leaves this person's desk and structurally moves to the next. It should feel significant — a real moment of completion, not just a checkbox. A satisfying interaction. The Particle physically advances. The next person's inbox updates. The conveyor belt moved.

---

## 7. What Pathway is NOT — Critical for Design Framing

The UI must not accidentally pattern-match to these tools, because Pathway works on fundamentally different logic:

- **Not ClickUp / Monday / Asana** — those let users browse, choose, and self-assign work from a shared board. Pathway issues work structurally. The employee never browses a pool of available tasks.
- **Not a CRM** — Pathway tracks Particles _moving through processes_, not just records stored in a database. The motion is the product.
- **Not a task list** — Tasks in Pathway are a personal scratchpad inside a Step. They are not the unit of work. Cycles are.
- **Not optional** — Unlike tools that suggest process, Pathway enforces it. The VFP gate is real. The no-dismissal rule is real. The UI should not undermine this by making enforcement feel optional.

---

## 8. Emotional Design Summary — One Line Per Role

| Role                | Before Pathway                                                 | After Pathway                                           | UI Should Feel Like                                        |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| **Employee**        | Scattered, guilty, unclear on priorities                       | Focused, guided, moving through a clear queue           | A clean cockpit — one thing at a time, everything you need |
| **Manager**         | Chasing status, managing by Slack, guessing at bottlenecks     | Watching a live machine, intervening only on exceptions | A control room — everything visible, color-coded by health |
| **Owner / CEO**     | Indispensable bottleneck, flying blind on capacity and process | Strategic observer, decisions backed by real data       | A command center — the whole company visible at altitude   |
| **Admin / Builder** | Undocumented SOPs, processes in people's heads                 | Live, enforced, measurable operational logic            | A system architect's canvas — building something real      |

---

## 9. Navigation Structure (For Context)

```
WORKSPACE
  ├── Dashboard (personalized KPI tiles, configurable)
  ├── My Actions (ticket queue — Cycles, Orders, To Dos)
  ├── Calendar
  └── Statistics (KPI graphs, Rail health stats)

ORGANIZATION
  ├── Structure (org chart — the routing infrastructure)
  └── Team (members, roles, permissions)

PARTICLES
  ├── Types (custom Particle schemas)
  ├── Clients
  ├── Employees
  └── Leads

ADMIN
  ├── Rail Management (build, publish, monitor Rails)
  ├── Orders (issuer-side tracking for standalone Orders)
  ├── Manifest Management (build traveling data containers)
  └── Settings
```

The sidebar is the company's entire operational architecture in list form. The Workspace group is where all users live daily. The Admin group is where the system is built and tuned.

---

## 10. Design Principles to Carry Through All Surfaces

**1. Work is issued, not chosen.** The UI should never show an employee a wide menu of available work. Their scope is bounded to what's been given to them. Design confirms that boundary.

**2. The Particle is the protagonist.** Every screen is ultimately about where a Particle is and what needs to happen to it. The human is serving the Particle's journey through the system, not the other way around.

**3. Completion is structural, not social.** "Done" means the VFP standard was met and the Particle advanced — not that the manager said "good job." The UI reinforces this by making advancement visible as a system event, not a social approval.

**4. Bottlenecks should be unmissable.** When work is piling up somewhere, the visual language should make that obvious before anyone asks. Don't hide operational health in numbers. Surface it in color, density, and position.

**5. Authority mirrors the org chart.** What you see depends on where you sit. An employee sees their queue. A manager sees their territory. The CEO sees everything. The UI should make this feel natural — you have the right level of visibility for your role, no more, no less.

**6. The system remembers everything.** Every Cycle, every Loop Back, every Manifest entry is archived with the Particle. The historical record is always accessible. This should give every user a sense of permanence and accountability — nothing disappears, nothing is forgotten.

---

_Document compiled from Pathway Systems product specifications, nomenclature documents, pitch materials, and system architecture files. Intended for UI/UX design teams as primary context for interface design._
