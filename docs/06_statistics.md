# Pathway — Statistics

> Numerical tracking of operational reality. The accountability layer that closes the loop between what people _say_ is happening and what actually _is_ happening.
> Read `00_overview.md` first for vocabulary and the Permissions Model. Read `03_admin.md` Rail Management for Rail Activity context (which is distinct from Rail History — see Section 5).

---

## STATUS

**Complete:**

- KPI Stats tab (list, tile, detail side panel, Add Graph modal, Add Data Point modal, edit data point)
- Rail Stats tab (KPI top-row, Rail Breakdown table, Loop Back Log with scoping)
- Rail History page (new retrospective screen)
- Data model, scope, compute methods, rail-tracked stat mechanics
- Permissions resolved per `00_overview.md` Section 4

**Deferred:**

- Bottleneck heatmap visual treatment (concept locked; exact rendering TBD)
- API integrations (Meta, Jobber, Google Ads, etc.) — V1.5+
- Threshold-triggered rails (stat drops >X% → initiate rail) — V1.5+ enhancement
- CSV/export formats for Loop Back Log and Rail History data

---

## 1. Nav Placement and Access

**Sidebar nav group: Workspace** (alongside Dashboard, My Actions, Calendar).

The current implementation places Statistics under Admin, but this is incorrect. **Statistics is a Workspace-level surface**, not an Admin screen. Every employee needs to see their own stats; managers need to see their juniors' stats; the data is scoped by org-chart authority, not by Admin-tier gating.

**Access:** All employees can access the Statistics page. What they see is scoped by their org-chart authority:

- **Employee** — sees their own Post-assigned stats + any container-cumulative stats for containers they're inside (their division's gross sales, their department's completion rate, etc.)
- **Manager** — sees everything above + all stats assigned to any Post or container within their area of authority (org-chart-derived)
- **Admin** — sees every stat in the org
- **Partner** — sees stats based on their Visibility checkboxes (see `00_overview.md` Section 4.3)

**Route:** `/stats` (moved from `/admin/statistics`). Breadcrumb: `WORKSPACE > STATISTICS`.

---

## 2. Core Data Model

A **Statistic** is a tracked numerical value tied to a name, unit, frequency, and scope. The data model separates _what_ is being tracked (the stat object), _how often_ it's tracked (frequency), _who's accountable_ (scope), and _where values come from_ (data source).

### 2.1 Statistic object

| Property            | Required           | Description                                                                                                                                            |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Name**            | Yes                | Display name (e.g., "Gross Sales", "Inspections Passed", "Leads Captured")                                                                             |
| **Unit**            | No                 | Freeform string (e.g., `$`, `%`, `#`, `leads`, `hours`). Displayed next to the value on the graph.                                                     |
| **Frequency**       | Yes                | `daily` / `weekly` / `monthly`. Controls graph scaling and expected entry cadence.                                                                     |
| **Day-of-week**     | If weekly          | Mo / Tu / We / Th / Fr / Sa / Su. Indicates when entries are "due" for weekly stats.                                                                   |
| **Day-of-month**    | If monthly         | Numeric day (1-31) or "last day of month" option. Same purpose for monthly stats.                                                                      |
| **Color**           | Yes                | Picker of 8 colors. Used for graph rendering and tile accent.                                                                                          |
| **Lower is better** | Bool               | When ON, graph inverts visually so improvement (a decreasing value) always looks like a rise. For stats like debt, bills, response time, defect count. |
| **Assigned scope**  | Yes                | One of: single Post, org-chart Container (Division/Department/Section/Unit), or org-wide.                                                              |
| **Data source**     | Yes                | How values arrive: Manual, Rail-Tracked, Computed from Children (container stats only), or API Pull (future). Multiple sources allowed simultaneously. |
| **Compute method**  | If container scope | Sum / Average / Count. Default Sum.                                                                                                                    |
| **Source stats**    | If computed        | The child stats that feed into this one.                                                                                                               |
| **Data points**     | —                  | Time-series values attached to this stat. See below.                                                                                                   |

### 2.2 Data source — all modes are compatible on the same stat

A statistic isn't locked to one data source. The same stat object can receive values from:

- **Manual entry** — a user adds a data point via the Add Data Point modal
- **Rail-tracked** — a Task node with "Track as Statistic" contributes values automatically
- **Computed from children** — if the scope is a container, values are derived by Sum/Average/Count of child stats at each time point
- **API pull (future)** — periodic fetch from external systems like Meta, Jobber, Google Ads

A real use case: "Gross Sales" might receive manual entries from the sales manager AND auto-increments from a Proposal Closed rail task AND pulls from HubSpot via API. All three feed the same stat object; data points carry their source provenance.

### 2.3 Data point object

Each data point is an entry on a stat:

| Property       | Description                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| **Date**       | Timestamp of the value                                                                               |
| **Value**      | Numeric                                                                                              |
| **Note**       | Optional freeform context                                                                            |
| **Source**     | `manual` / `rail:<rail-id>:<cycle-id>` / `computed` / `api:<source-name>` — for audit and provenance |
| **Created by** | Team Account ID (for manual entries)                                                                 |
| **Created at** | System timestamp                                                                                     |

Data points are the source of truth for the graph. Frequency determines how they aggregate visually but doesn't restrict entry rate — a weekly stat can receive multiple entries per week; they all roll up to the week's bucket.

---

## 3. Frequency and Graph-Scale Behavior

Frequency is primarily about **graph scaling**, not entry gating.

**Frequency determines the X-axis scale of the graph:**

- Daily → one tick per day
- Weekly → one tick per week, anchored to the chosen day-of-week
- Monthly → one tick per month, anchored to the chosen day-of-month

**Multiple entries within a period are allowed and aggregate.** A daily stat can receive multiple entries per day; a weekly stat can receive daily entries that all roll up to the week's bucket. Aggregation method matches the compute method (default Sum).

**View-scale cascade rule:** the graph can always be _rescaled coarser_, but not finer.

- Daily stat → viewable at daily, weekly, or monthly scale (data aggregates up)
- Weekly stat → viewable at weekly or monthly scale
- Monthly stat → viewable only at monthly scale (no finer-grained data exists)

A **scale toggle** on the graph lets the user zoom between allowed views.

**Entry reminders (deferred — V1.5 candidate):** frequency could also drive accountability nudges — a weekly stat with "Mondays" creates a Cycle in the assigned Post's My Actions every Monday asking them to enter the week's data. This is a powerful accountability mechanic but not V1. Flagged for later.

---

## 4. SCREEN: Statistics (KPI Stats tab)

**ROUTE:** `/stats` (default tab: KPI Stats)

**PARENT NAV:** Sidebar → Workspace → Statistics

### 4.1 Layout

- **Header:** Breadcrumb (`WORKSPACE > STATISTICS`), screen title "Statistics", subtitle implicit
- **Top tabs (2):** `KPI Stats` | `Rail Stats`
- **Below tabs, left:** Scope selector (see 4.2)
- **Below tabs, right:** **+ Add Graph** button (orange)
- **Search bar:** filters by stat name — positioned near the scope selector
- **Main area:** Grid of stat tiles scoped to the selected view

### 4.2 Scope Selector (tabs for containers)

A row of tabs above the tile grid lets the user scope the view to a specific container (Division, Department, Section, or Unit) or to all the stats they have authority over.

**Default tabs (auto-generated based on the user's authority):**

- **All** — every stat the user can see (default)
- One tab per Division in the user's area of authority
- One tab per Department in the user's area of authority
- [Sections/Units accessible via a deeper drill-down or dropdown, TBD]

**For an Admin / CEO:** all Divisions and Departments appear as tabs, plus **Org-wide**.

**For a Section lead:** tabs for their Section and the Departments above them show up only if the user has authority over those parents.

**The scope selector is not just a filter** — it affects what the user's Statistics page looks like by default. A sales manager lands on their Sales Department tab; an Admin lands on Org-wide. [TBD — confirm default-tab-per-user logic.]

### 4.3 Stat tile (KPI Stats tab)

Each tile in the grid shows:

- **Stat name** (large, e.g., "Gross Sales")
- **Assigned scope** (subtitle, e.g., "Account Executive" or "Sales Department")
- **Current value** with unit (e.g., "1.0k $", "12 #")
- **Percentage change pill** (e.g., `↑ 100%`, `↑ 71%`) — compares the current period to the immediately previous period of the same length (see 4.6)
- **Mini line graph** with date axis ticks
- **Color dot** in the corner matching the stat's color
- **Inverted flag** (subtle visual indicator) if "Lower is better" is ON

**Tile click → opens the stat detail side panel.**

At the end of the tile grid, an **empty "+ Add Graph" tile** also appears, clickable to open the Add Graph modal. (Redundant with the top-right button for discoverability.)

### 4.4 Stat detail side panel

Opens when a tile is clicked. Right-side slide-in panel (not a modal, not a new page).

**Panel contents:**

- **Header:** colored dot + stat name + **Edit** button + close (×) button
- **Assigned scope** subtitle
- **Current value** (large) with unit
- **Percentage change pill** (e.g., `↑ 100% vs prev`)
- **Full-size line graph** with axis labels and date markers. Includes a scale toggle (daily/weekly/monthly, respecting the cascade rule from Section 3).
- **Data Points (N) + Add Entry** section:
  - Header shows total data point count
  - **+ Add Entry** button (orange) — opens the Add Data Point modal
  - **List of data points**, most recent first. Each row shows:
    - Date
    - Value (with unit)
    - **Edit icon** — opens inline edit (see 4.7)
    - **Delete (×)** — removes the data point with confirmation

### 4.5 Add Graph modal (create a new statistic)

Triggered by the **+ Add Graph** button.

**Modal contents:**

- Title: "Add Graph"
- **Name\*** — required, placeholder "e.g., Gross Sales, New Leads..." Has a small person/scope icon next to it (secondary entry point for assignment)
- **Unit (optional)** — freeform, placeholder "e.g., $, %, leads". Helper: "Displayed next to values on the graph."
- **Frequency** — three-button toggle: Daily / Weekly / Monthly
- **Day of the week** (appears when Weekly is chosen) — seven buttons Su–Sa. Helper: "Entries for this stat will be recorded on Mondays."
- **Day of the month** (appears when Monthly is chosen) — numeric or "last day of month" toggle. [TBD — exact UI]
- **Color** — 8 color circles to pick from
- **Lower is better** toggle — helper: "Graph inverts so improvement always looks like a rise."
- **Assigned scope** dropdown — defaults to "None" (org-wide). Options:
  - A specific Post (picked from a searchable dropdown of all Posts)
  - A specific Container (Division/Department/Section/Unit — searchable dropdown)
  - Org-wide (None)
- **Compute method** dropdown (appears when Assigned scope is a Container) — Sum / Average / Count. Default Sum.
- **Source stats** multi-select (appears when Assigned scope is a Container) — searchable list of existing stats. Picks which child stats feed into this one. Helper: "The container stat will aggregate values from these child stats."
- **Cancel** + **Add Graph** (orange) buttons

**Permission:** Creating a stat for your own Post is allowed for any Member. Creating a stat for a subordinate's Post or for a container requires the "Can create new statistics for their area" checkbox. Creating an org-wide stat requires "Can create new statistics for the entire org." See `00_overview.md` Section 4.3.

### 4.6 Percentage change calculation

The "↑ X% vs prev" pill compares the current period's value to the immediately previous period of the same length:

- **Daily stat:** today vs yesterday
- **Weekly stat:** this week vs last week
- **Monthly stat:** this month vs last month

Aggregation method matches the stat's compute method (Sum by default). If the previous period has no data, the pill shows "—" instead of a percentage.

Direction (↑ / ↓) is based on whether the current value is higher or lower than the previous. **For "Lower is better" stats, a decrease still shows as ↑ in the pill** because the graph is inverted and visually an improvement always appears as a rise.

### 4.7 Editing a data point

**This was missing from the current implementation.** Add the ability to edit an existing data point:

- Click the edit icon on a data point row in the stat detail side panel
- **Edit Data Point modal** opens (same shape as Add Data Point, pre-populated with current values):
  - Date (editable)
  - Value (editable)
  - Note (editable)
  - Cancel / **Save** buttons
- Save persists the change; the change is logged in the data point's audit history with the acting user and timestamp

### 4.8 Add Data Point modal (add an entry to an existing stat)

Triggered by **+ Add Entry** in the stat detail side panel.

**Modal contents:**

- Title: "Add Data Point"
- Subtitle: "Adding to: [Stat Name]"
- **Date** — picker, defaults to today
- **Value** with unit in the label (e.g., "Value ($)") — numeric input
- **Note (optional)** — textarea, placeholder "Context for this entry..."
- **Cancel** + **Add Entry** (orange) buttons

### 4.9 Deletion rules

**Deleting a stat:**

- If the stat is NOT referenced by any rail's "Track as Statistic" toggle AND not used as a source stat by any container stat: allowed with standard confirmation modal
- If the stat IS referenced anywhere: **refused with a list of dependents** (same model as manifest deletion in `03_admin.md`). The admin must remove the references before deletion is allowed.

**Deleting a data point:** always allowed for users with edit authority on that stat. Confirmation prompt shown. Logged in the stat's audit history.

---

## 5. SCREEN: Statistics (Rail Stats tab)

**PURPOSE:** Track the operational health of rails themselves — how many are live, how many are completing, how often loop-backs are firing, and where bottlenecks are forming.

**Distinction from Rail Activity:** The **Rail Activity** tab in Rail Management (see `03_admin.md`) shows _currently live_ rail runs with their live positions. **Rail Stats** is the aggregate view — trailing metrics over time, completion rates, loop-back rates, cycle-time distributions. Two different surfaces for two different mental modes: Rail Activity is "what's happening right now," Rail Stats is "how are we doing overall."

### 5.1 Layout

- **Scope selector tabs** (same as KPI Stats — Division/Department/Section, or Org-wide). Rail Stats respects org-chart authority scoping.
- **Time-range picker** — Last 7 days / Last 30 days / Last 90 days / Cumulative / Custom. Defaults to Last 30 days.
- **Export** button — exports the current view's data as CSV (format TBD)
- **Top row — 4 KPI tiles** (see 5.2)
- **Rail Breakdown table** (see 5.3)
- **Overdue Cycles panel** (see 5.4) — NEW
- **Loop Back Log** (see 5.5)

### 5.2 Top-row KPI tiles

Four tiles across the top, each showing an aggregated metric for the selected scope + time range:

| Tile               | Value                                               | Subtitle                                                      |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------- |
| **Active Rails**   | Count of rails with at least one live particle      | "N total started" (context: total started in the time window) |
| **Completed**      | Count of rail runs completed                        | "N% completion rate"                                          |
| **Loop Backs**     | Count of loop-back events fired                     | (No subtitle in current impl; consider "in [time window]")    |
| **Avg Completion** | Average time from Trigger to End for completed runs | "across completed rails"                                      |

Each tile is clickable to drill into the underlying data. **Click Active Rails → opens a list view of every live rail run** (scoped to the selected scope + time range). Click Completed → similar list of completed runs. Click Loop Backs → scrolls to the Loop Back Log below. Click Avg Completion → opens a completion-time distribution histogram.

### 5.3 Rail Breakdown table

Table of every rail type with its run metrics for the selected scope + time range.

**Columns:**

- **Rail** (rail type name)
- **Started** (runs initiated in the window)
- **Active** (runs currently in progress)
- **Completed** (runs completed in the window)
- **Cancelled** (runs cancelled in the window)
- **Loop Backs** (total loop-back events in the window for this rail type)
- **Avg Time** (average completion time for completed runs in the window)

**Click a rail row → opens the Rail History page for that rail** (see Section 6). This is the drill-down into a specific rail's retrospective health.

**Color coding:** Loop Backs column shows red when count is high relative to started count. Avg Time shows yellow/red when longer than the rail's designed Ideal Time (see `00_overview.md` vocabulary — Ideal Time is the benchmark).

### 5.4 Overdue Cycles panel (NEW)

A panel showing **rail cycles currently running past their designated deadline** — cycles whose Ideal Time has elapsed but which haven't completed.

**Purpose:** immediate visibility into where things are stuck. This is the primary "where is the bottleneck" signal without needing a full heatmap.

**Contents:**

- **Counter** — "N overdue cycles"
- **Grouping toggle** — group by Rail / Post / Container
- **List of overdue cycles** (scoped to the selected scope + time range), each showing:
  - Particle name + rail name
  - Current step / Post / Assignee
  - Time over deadline (e.g., "3 days overdue")
  - Click to open the Cycle Detail page

Scope tab selection filters this panel the same way it filters everything else on the page.

### 5.5 Loop Back Log

Chronological log of every loop-back event within the selected scope + time range.

**Display:**

- Header: "Loop Back Log (N)"
- Each row shows:
  - Color dot matching the rail type
  - Rail name + particle name (e.g., "Client Upset Resolution Rail — ABC Corp")
  - Timestamp (date + time)
- **Click a row → opens Loop Back Detail** (see 5.6)

**Scoping and filtering:**

- Scope tabs (Division/Department/Section/Org-wide) filter the log to loop-backs originating from or returning to Posts within the selected scope
- Time-range picker scopes to the selected window
- **Export** button exports the log as CSV

### 5.6 Loop Back Detail

Opens when a loop-back row is clicked. Shows complete provenance data for the loop-back event.

**Contents:**

- **Rail name + particle name** (header)
- **Initiator (source):**
  - Who fired the loop-back (Team member name + Post)
  - Which cycle/step it fired from
- **Destination (target):**
  - Who it was sent back to (Team member name + Post)
  - Which cycle/step it was sent back to
- **Reason** (provided at initiation, mandatory per `02_workspace.md` Loop Back mechanics)
- **Initiated at** timestamp
- **Resolution state:**
  - Open (still in the destination's inbox)
  - Complete Loop Back fired (resolved) — shows timestamp + completion notes
  - Cancelled — shows cancellation reason
- **Link** to the full Cycle Detail page for the loop-back cycle

This is the data that was missing in the current implementation — loop-back events were recorded but clicking them showed nothing.

---

## 6. SCREEN: Rail History (new screen)

**PURPOSE:** Retrospective deep-dive into a single rail's operational health. Called from the Rail Breakdown table in Rail Stats. This is where managers and admins answer "is this rail running smoothly, and where are the problems?"

**ROUTE:** `/stats/rails/[rail-id]` (also accessible from `/admin/rail-management/[rail-id]/history` as a convenience link)

**ACCESS:** Same scope rules as Rail Stats — users see Rail History for any rail whose runs fall within their area of authority.

### 6.1 Layout

- **Header:** Back arrow + rail name (e.g., "Lead to Closed Deal Rail")
- **Time-range picker** (default: Last 30 days)
- **Scope selector** (if relevant — e.g., a specific division's runs of this rail)
- **Top summary cards** — Started / Completed / Cancelled / Loop Backs / Avg Completion (for the window)
- **Visual node-graph heatmap** (see 6.2)
- **Completion time distribution** — histogram of how long completed runs took
- **Loop Back Log scoped to this rail** — chronological list (same format as Section 5.5)
- **Runs list** — paginated list of every run in the window with status, particle, current position or completion time. Click a run → Cycle Detail.
- **Export** button — exports all window data as CSV

### 6.2 Node-graph heatmap (visual bottleneck view)

The rail's node graph (as designed in Rail Builder) is rendered with **each node shaded by volume or bottleneck severity** for the time window:

- **Cycle volume shading** — darker nodes = more cycles passed through this step in the window
- **Bottleneck shading** — redder nodes = cycles spent longer than Ideal Time at this step (on average)
- **Loop-back origination markers** — small markers or numbers indicating how many loop-backs originated from each step
- **Click a node** → filters the Loop Back Log and Runs list below to just that node's data

This is the "immediate visual of bottlenecks" you called out — managers can glance at a rail and see where things pile up without having to parse a table.

[TBD — exact visual treatment. Heatmap coloring, icon styles, interaction model. Defer to UX session when wireframes exist.]

---

## 7. Rail-Tracked Statistics (integration with Rail Builder)

The Task node property panel in the Rail Builder has a **"Track as Statistic"** toggle. When ON, completing that Task contributes a value to a chosen statistic.

### 7.1 Configuration in Rail Builder

On the Task node property panel, the Track as Statistic section shows:

- **Track as Statistic** toggle (OFF by default)
- When ON, the section expands to show:
  - **Statistic** — searchable dropdown of all statistics in the org (must be searchable because there will be 100-300+ stats at scale)
  - **Value mode** — radio buttons:
    - **Count** (default) — each completion contributes +1 to the stat
    - **Value from field** — the value comes from a specific manifest field
  - When "Value from field" is selected, a second picker appears:
    - **Manifest field** — searchable dropdown of all input fields on manifests attached to this rail. The selected field's value is the value contributed. Uses the Variable Slug system — the dev layer stores the slug, not the display label.

### 7.2 Completion behavior — where the value is captured

**For Count mode:** Nothing special at completion time. When the user clicks Complete, the cycle advances AND the statistic gets +1 with the timestamp and acting user recorded.

**For "Value from field" mode:** when the user clicks Complete on the cycle, a modal prompts:

> **Enter statistic for [Task Name]**
> [Stat name]: [numeric input pre-populated from the manifest field if already filled, or empty if not]
> Cancel / Save & Complete

The user enters or confirms the value. On Save & Complete, the cycle advances AND the statistic gets the entered value recorded.

**Why prompt at completion:** if the manifest field isn't filled yet (or if the value needs to be final-verified at the completion step specifically — like a negotiated final price that's different from the proposed price), gating it at completion forces the data to be real before the stat records it. Manifest values can change throughout a cycle; the completion-time value is the canonical one.

**If the manifest field IS already filled, the modal pre-populates with that value** — the user typically just clicks Save & Complete. Minimal friction when the data is already there.

### 7.3 Data point provenance

Data points created by rail-tracked stats are marked with `source: rail:<rail-id>:<cycle-id>` so the stat's audit trail can show where each value came from. The data point is attributable to:

- The rail and cycle that generated it
- The Team Account that clicked Complete
- The Post assigned to that cycle

Clicking a rail-sourced data point in the stat's data point list navigates to the source Cycle Detail page.

---

## 8. Permissions (resolved per `00_overview.md` Section 4)

**Visibility:**

- **Employee** sees stats assigned to their Post(s) + container-cumulative stats for containers they're inside (their Section, Department, Division)
- **Manager** sees stats for any Post or container within their area of authority (org-chart-derived)
- **Admin** sees all stats org-wide
- **Partner** visibility gated by checkbox panel

**Editing data points:**

- Employee can edit data points on stats assigned to their own Post
- Manager can edit data points on stats for any Post/container within their authority
- Admin can edit any data point
- All edits are logged with acting user + timestamp

**Creating stats:**

- Creating a stat for own Post — allowed for any Member by default
- Creating a stat for a subordinate's Post — requires org-chart authority over that Post
- Creating a container-cumulative stat — requires the "Can create new statistics for their area" checkbox (for own area) or "...for the entire org" (for org-wide)

**Deleting stats:**

- Delete is refused if the stat is referenced by a rail's Track as Statistic toggle OR by another stat as a source. Admin must clean up references first.
- Otherwise, users with edit authority over the stat can delete it.

---

## 9. Deferred Enhancements

### Threshold-triggered rails (V1.5+)

A configuration on a statistic: "If value drops by more than X% within a period, fire [Rail Name] for [scope]." Example: "If a sales rep's weekly Gross Sales drops >20%, fire the Sales Report Rail on that rep's Employee Particle." The dropping rep then receives a cycle asking what happened and why.

This couples Statistics to Rails via a new **stat-threshold Trigger type** in the Rail Builder — a rail can now be initiated not just by manual start or scheduled trigger, but by a statistic condition. Powerful accountability mechanic. Defer to V1.5 unless customers ask before then.

### API pull integrations (V1.5+)

Fetch stat values from external systems on a schedule. Targets: Meta Ads, Google Ads, Jobber, Hubspot, QuickBooks, Shopify, Stripe. Each integration is an adapter that maps remote metrics to Pathway stats. Needs a per-stat "API source" configuration with auth credentials (stored in Settings → Credentials as spec'd in the Settings screen).

### Entry reminders / weekly entry cycles (V1.5)

Frequency-based nudge cycles automatically created in the assigned user's My Actions. A weekly stat with "Mondays" fires a cycle every Monday in the assigned Post's inbox asking for the week's data entry. Powerful for enforcing discipline but adds complexity. Deferred.

### Bottleneck heatmap visual treatment

The concept of the rail node-graph heatmap is locked in (see 6.2), but the exact visual design — coloring scales, icon styles, interaction affordances — needs UX wireframes. Defer to a UX session.

### Comparison views

"Compare last 30 days vs previous 30 days." Side-by-side graph overlay or difference mode. Low priority for V1.

### Alerts / targets

Per-stat target values with alert thresholds ("alert me when Gross Sales falls below $10K"). Overlaps with threshold-triggered rails conceptually. Defer to same session.

---

## 10. Open Questions

- **Default scope tab per user** — Admin → Org-wide, Manager → their highest container, Employee → All (self-scoped). Confirm algorithmic default.
- **CSV export format** — column layout for Loop Back Log, Rail History, Runs list. Standard per-screen or configurable.
- **Rail History heatmap rendering** — visual treatment, deferred.
- **Container stats with mixed units** — can a container stat sum over child stats with different units (e.g., some in $, some in %)? Probably should refuse at config time with a warning.
- **Stat archiving vs deletion** — a V1.5 "archive stat" capability would let admins hide old stats from the main view without deleting them. Stats would persist for historical queries but not appear in picker dropdowns. Currently out of scope.
- **Statistics on Dashboard** — the Dashboard's KPI Stat tile (`02_workspace.md`) already references statistics. Confirm the tile pulls from this same stat object catalog and respects the same visibility rules.
- **Rail Stats Overdue Cycles panel** — does this duplicate Rail Activity in Rail Management? Overlap is intentional but worth documenting. Rail Activity is "what's live right now and where"; Overdue Cycles is "what's live AND past its deadline." Overdue is a subset with different framing.
