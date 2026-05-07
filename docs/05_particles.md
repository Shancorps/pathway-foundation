# Pathway — Particles

> The custom data model layer. Where companies define what entities they care about and what data they track for each.
> Read `00_overview.md` first, especially the Particle vocabulary entry and Principle 5 (Pathway is workflow infrastructure, not production tooling).

---

## STATUS

**Particles index, type builder, list views, detail page, and creation/edit panels: complete.**

**Deferred:**

- Bulk import / export UX — concept locked in but exact UX deferred to a follow-up session
- Particle History view inside Particle Detail — concept locked in, full visual treatment deferred until rail run history surfaces are more developed
- Cross-system import (Salesforce, HubSpot, etc.) — explicitly deferred indefinitely

---

## 1. Conceptual Foundation

### What a Particle is (recap from overview)

A **Particle** is the identifier of a real-world thing being tracked and acted on by Pathway. Anything with identity that flows through workflows: clients, leads, employees, vendors, properties, equipment, vehicles, projects. Particles are NOT the entities themselves — they are the system's way of recording "this specific thing currently exists at this point in this workflow."

### Three layers of the Particle system

1. **Particle Type** (also called "Category" in some current UI labels, but **Particle Type is the canonical name** going forward) — the schema definition. What fields exist for this kind of thing, what types those fields are, what relationships they can have. Built once per company per type. Examples: Client schema, Lead schema, Employee schema, Property schema.

2. **Particle Instance** — a specific record of a Particle Type. ABC Corp is a Client. John Lennox is an Employee. 421 Oak St is a Property. Each instance carries the field data defined by its Type.

3. **Particle Field** — the individual data points captured per instance. Each field has a type (Text, Currency, Date, Related Particles, etc.) which determines its input UI and validation.

### Why Particles exist as a custom data layer

Different companies care about different data for different things. A drop-shipping company tracking Clients only cares about shipping address and order history. A construction company tracking Clients cares about properties owned, payment history, project preferences, primary contact, billing terms, change-order history. Forcing both into a fixed "Client" schema would either bloat one or starve the other.

Particles are **user-defined forms**. The company decides what fields each Particle Type tracks. There is no fixed schema for "Client" or "Lead" — the company defines what data their Client particles carry, the same way they define manifest fields.

### Particle Types vs Manifests — what's the difference?

Both are user-defined forms. The distinction is **scope and lifecycle**:

- **Particle Types** define data that _persists_ with an entity across many workflows over its entire existence in the system. A Client's company name, contact info, billing terms — these belong to the Client, not to any particular rail run. They live on the Particle.
- **Manifests** define data that's collected _during_ a specific workflow run. The notes from a particular site visit, the photos from a specific demolition, the inspection findings from a particular cycle — these belong to a rail run, not to the Client itself.

When a rail runs on a Client particle, the manifest fills up with run-specific data, but the Client's particle data stays unchanged (unless someone explicitly edits it). When the rail ends, the manifest is archived as part of the run history; the Client particle continues to exist for the next run.

In practice many fields could go either way and the company decides — but the rule of thumb is "data about the thing" goes on the Particle, "data about what was done to the thing on this run" goes on the Manifest.

---

## 2. Nav Placement

**Sidebar nav group: Particles** (under Organization, above Admin)

The Particles nav group always contains:

- **Types** — the index of all Particle Types (entry point)

Below "Types," any Particle Type that has been **promoted to the sidebar** (via the Show in Sidebar Navigation toggle in its settings) appears as its own direct nav item. In the screenshots: Clients, Employees, Leads.

**Why promotion exists:** convenience. Without it, accessing a specific Particle Type requires three clicks (Types → tile → list). With it, the type is one click from the sidebar. Companies promote the types they touch frequently and leave rarer ones accessible only via Types.

**No hard cap on promoted types**, but in practice 3-6 is the sweet spot. Beyond that the sidebar gets cluttered. [TBD — possible future enhancement: collapsible "More categories..." drawer if a company has many promoted types.]

---

## 3. SCREEN: Particles Index (`/particles` or `/particles/types`)

**PURPOSE:** Top-level index of every Particle Type defined by the company. Entry point for browsing, creating, and managing types.

**ROUTE:** `/particles`

**ACCESS:** All employees can view the index. Creating, editing, and deleting types requires the "Can build particle types" checkbox (default OFF for Members, ON for Admins). Deletion specifically requires the paired "Can delete particle types" checkbox (default OFF even when build is ON). See `00_overview.md` Section 4.3.

**PARENT NAV:** Sidebar → Particles → Types

### Layout

- **Header:** Breadcrumb (`PARTICLES > TYPES`), screen title "Particles", subtitle "Manage reusable entities and models"
- **Top right:** **"New Particle Type"** button (orange) — opens the New Particle Type modal. (Note: current UI label says "New Category" — this should be renamed to "New Particle Type" to align with canonical terminology.)
- **Search bar** below the header — filters the type tile grid by name
- **Main area:** Grid of Particle Type tiles

### Particle Type tile

Each tile shows:

- **Type name** (e.g., "Clients", "Leads", "Employees")
- **Description** (one-line explanation, e.g., "Active client accounts managed by Apex Media")
- **"Category" badge** (visual marker that this is a Particle Type tile — UI artifact, optional)
- **Item count** (e.g., "3 items", "No items yet")
- **`...` overflow menu** (top right of each tile) with actions:
  - **Edit Type** — opens the Particle Type editor
  - **Duplicate Type** — creates a copy as a new draft
  - **Delete Type** — confirmation modal required; cascades to delete all instances of this type (or refuse if any rails reference particles of this type — TBD)

### Tile click behavior

- **Clicking the body of a tile** → opens the **Particle List screen** for that type (e.g., clicking "Clients" → goes to `/particles/clients`)
- **Clicking the `...` menu** → opens the actions popover

### New Particle Type creation flow

1. User clicks **"New Particle Type"** top-right button
2. **New Particle Type modal** opens with:
   - Title: "New Particle Type"
   - Subtitle: "Name your particle type, then configure its fields on the next page."
   - **Name** input field (e.g., "Test", "Properties", "Vehicles")
   - **Cancel** + **Create & Configure** buttons
3. On click → creates the type as a draft and opens the **Particle Type Editor** (see Section 4)

---

## 4. SCREEN: Particle Type Editor

**PURPOSE:** Configure the schema for a Particle Type — what fields it has, what they're called, what types they are, and a few settings.

**ROUTE:** `/particles/types/[type-id]/edit`

**ACCESS:** Requires the "Can build particle types" checkbox (default OFF for Members, ON for Admins). Editing an existing type requires the same permission. See `00_overview.md` Section 4.3.

**ENTERED FROM:**

- New Particle Type modal → "Create & Configure"
- Particles Index tile → `...` menu → "Edit Type"

### Layout

- **Top-left:** Back arrow + type name (e.g., "Test")
- **Top right:** **Save** button (orange, disabled when no unsaved changes; "Unsaved changes" indicator appears when changes are pending)
- **Main column** (centered):
  - **Name** field (editable; same as the type name in the header)
  - **Description** field — "What does this category represent?"
  - **Fields section** — see below
  - **Settings section** — see below
- **Settings section:**
  - **Show in sidebar navigation** toggle
  - **Display name** (sub-field that appears when toggle is ON) — defaults to the type name; allows a different label for the sidebar
  - **Searchable fields** — see below

### Fields section

The fields section is the heart of the type editor. This is where the company defines what data each particle of this type will carry.

- **Header:** "Fields" + **"+ Add Field"** button
- **Empty state:** "No fields defined yet. Add fields to capture data for items in this category."
- **Field list:** each field rendered as a row containing:
  - **Drag handle** (left, vertical dots icon) — drag to reorder
  - **Field name** input — the label for this field (e.g., "Company Name", "Email", "Monthly Retainer")
  - **Field type dropdown** — see Field Types catalog below
  - **Delete icon** (right, trash) — removes the field

**Slash-command insertion (parallel to Add Field button):** As an enhancement matching the Manifest Builder, the Particle Type editor also supports Notion-style slash commands. Type `/` in the fields area to open a searchable picker of field types and insert by name. Faster for power users than clicking Add Field and selecting from the dropdown. See `03_admin.md` Manifest Builder for the canonical slash-command spec.

### Field types catalog

Available field types from the dropdown:

| Type                  | Use                              | Notes                                                                                                                                                     |
| --------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Text**              | Single-line text                 | Default for name-like fields                                                                                                                              |
| **Long Text**         | Multi-line textarea              | For notes, descriptions                                                                                                                                   |
| **Number**            | Numeric input                    | Integer or decimal                                                                                                                                        |
| **Currency**          | Numeric with currency formatting | Defaults to $ symbol; locale TBD                                                                                                                          |
| **Yes / No**          | Boolean toggle                   | Two-state                                                                                                                                                 |
| **Date**              | Date picker                      | No time component in V1                                                                                                                                   |
| **Email**             | Validated email input            | Auto-validates format                                                                                                                                     |
| **Phone**             | Phone number input               | Light formatting, no strict validation                                                                                                                    |
| **URL**               | Validated URL input              | Renders as clickable link in display                                                                                                                      |
| **File**              | File upload                      | Single file or multiple files; stored against the particle                                                                                                |
| **Tags**              | Free-form tag input              | Type a tag, press Enter, repeat                                                                                                                           |
| **Selection**         | Single-select dropdown           | Admin defines options at field-creation time                                                                                                              |
| **Multi-Selection**   | Checkbox list                    | Admin defines options at field-creation time                                                                                                              |
| **Address**           | Structured address               | Multi-part input (street, city, state, zip)                                                                                                               |
| **Related Particles** | Link to other particles          | See Section 5 for full mechanic                                                                                                                           |
| **Related Posts**     | Link to org chart posts          | Single or multi; useful for "responsible post"                                                                                                            |
| **Related Manifests** | Link to manifest templates       | (Currently labeled "Related Forms" in UI — should be renamed to "Related Manifests" to align with vocabulary. A Manifest is what we used to call a Form.) |

[TBD — additional field types as needed: Time, Datetime, Rich Text, Rating, Color picker, etc. Add to V1 if specific demand surfaces.]

### Field configuration depth

Most field types are simple — pick the type, name it, done. A few have additional configuration that opens when the field is selected:

- **Selection / Multi-Selection** — admin defines the list of options (add/remove/reorder values)
- **Currency** — admin picks the currency symbol/code
- **File** — admin picks single vs multiple files allowed
- **Related Particles** — see Section 5
- **Related Posts** — admin picks single vs multi-post

[TBD — exact configuration UI per field type. Most should be a small inline expansion under the field row when that field is selected. Defer detailed UX until per-field-type sessions if needed.]

### Searchable fields

Below the Settings section:

- **Header:** "Searchable fields"
- **Subtitle:** "Choose which fields the search bar searches across (name is always included)"
- **Checkbox list** of all configured fields. The admin checks which fields the search bar in the Particle List screen will search across. **Name is always searchable** and always checked (the checkbox for name is locked).

This avoids the search bar searching across every text field in every particle — which would be slow and noisy. The admin picks the fields that matter for finding particles fast.

### Save behavior

- **Save button** is disabled until there are unsaved changes
- **"Unsaved changes" indicator** appears next to the Save button when changes are pending
- Clicking Save persists the type definition. If existing particles of this type have data in fields that were renamed or deleted, [TBD — confirm migration behavior. Likely: rename is non-destructive; delete prompts a warning showing how many particles will lose data, requires confirmation.]
- **Unsaved changes warning** if the user navigates away with pending changes

---

## 5. Related Particles — How it Works

The Related Particles field is the mechanism by which particles reference each other. It's flexible by design — no fixed hierarchy, no strict parent-child enforcement, no admin-side category restrictions.

### Field configuration (in the Particle Type editor)

When an admin adds a Related Particles field to a type:

- They give it a label (e.g., "Properties", "Linked Account", "Parent Company")
- That's it. **No category restriction at field configuration time.** The field is generic — it accepts any particle from any type.

This is intentional. Admins shouldn't have to predetermine which categories can be linked — that's friction at config time for marginal benefit. The label is the convention; the user picks the actual particles when filling out the form.

### Particle creation / edit (in the new/edit panel)

When a user fills out a Related Particles field on a particle instance:

1. The field shows an **"+ Add Particle"** button (or current value(s) with an Add button if multi)
2. Clicking Add opens a **two-step picker**:
   - **Step 1: Pick a Particle Type.** A searchable dropdown of all Particle Types in the system. The user picks one (e.g., "Properties").
   - **Step 2: Pick the specific particle(s).** A searchable list of every particle within that type. The user picks one or more.
3. Selected particles appear as chips/tags in the field
4. Each chip can be removed individually
5. Each chip is clickable — clicks navigate to that related particle's Detail page

**Searchable everywhere.** Both the type picker and the particle picker have search inputs because the lists can get long fast (a company might have 800 properties; scrolling them is hostile).

### Bidirectional auto-sync

When particle A is linked to particle B via a Related Particles field, **the relationship is automatically reflected on B's side** in B's Detail page (under a "Referenced by" or "Related" section).

- If ABC Corp's "Properties" field links to 421 Oak St, then 421 Oak St automatically shows ABC Corp under its "Referenced by" section
- The reverse linkage doesn't require B to have a corresponding Related Particles field — the system auto-tracks it
- Removing the link from one side removes it from the other (atomic two-way operation)

This means hierarchies emerge from convention, not configuration. A construction company puts a "Properties" Related Particles field on their Client type. By naming it "Properties," they imply intent. But the system doesn't enforce it — they could theoretically link any other particle in there if they wanted. The field is generic; the label is the convention.

### Many-to-many by default

Related Particles is many-to-many by default. A property can be linked to multiple clients (co-ownership). A client can have multiple properties. A vehicle can be linked to multiple drivers. No constraints unless the admin specifically configures the field as single-value (single Related Particles field, not multi).

### Rail Initialize node integration

When a rail's Initialize node captures a primary particle (e.g., "Pick the Client this rail will run on"), it can also capture related particles via additional pickers. If the rail runs on Client + Property, the Initialize node has two particle pickers:

1. **Client picker** — searchable list of all Client particles
2. **Property picker** — initially empty, but as soon as a Client is selected, **the Property picker filters to show only properties related to that client**. The user picks the specific property to attach to this run.

This is the "smart cascade" behavior. The user doesn't have to wade through 800 properties — they pick the client first, the property picker narrows to that client's 4 properties, they pick one. Fast.

[TBD — exact UX of the Initialize node particle picker, see `03_admin.md` Node Property Panels section for Initialize node.]

### Why this model

Hierarchy is achievable through convention. Flexibility is preserved. Bidirectional visibility is automatic. Smart filtering at run time keeps the picker fast. No admin needs to predetermine relationship rules. Every tradeoff favors letting the user model their reality however makes sense to them, with the system providing infrastructure not constraints.

---

## 6. SCREEN: Particle List (e.g., `/particles/clients`)

**PURPOSE:** Browsable list of every particle instance of a given type. The "all my clients" or "all my properties" view.

**ROUTE:** `/particles/[type-slug]` (e.g., `/particles/clients`, `/particles/employees`)

**ACCESS:** All employees can view particle lists by default. Creating new particles is allowed for any Member by default. Editing existing particles is allowed for the linked team member (if any) and any user with org-chart authority over them; for non-Employee particles, editing is generally open unless an Admin restricts it via per-particle-type permissions in a future enhancement. Deleting particles requires the "Can delete particles" checkbox (default OFF). See `00_overview.md` Section 4.3.

**ENTERED FROM:**

- Sidebar nav (if the type is promoted)
- Particles Index → tile click
- Related Particles picker (when navigating from another particle's chip)

### Layout

- **Header:** Breadcrumb (`PARTICLES > CLIENTS`), screen title (the type name, e.g., "Clients"), subtitle "Search, filter, and manage items in this category."
- **Top right:** **"New [Type Name]"** button (orange) — e.g., "New Clients", "New Employees"
- **Search bar** — searches across the searchable fields configured on this type
- **Filter / sort controls** [TBD — exact filter UI; expected to support filtering by any selectable/categorizable field]
- **Main area:** Either the empty state or the particle list

### Empty state

When no particles of this type exist yet:

- Centered icon
- "No [type name] yet" headline
- "Create your first [type name] to start tracking data in this category."
- **"+ Add your first [type name]"** button (orange)

### Populated state — table view

When particles exist, they're rendered as a **table** with columns:

- **Name** (always first, always shown — the canonical particle name)
- **Configured fields as columns** — each text-friendly field becomes a column. Example from screenshots: Full Name, Work Email, Work Phone, Job Title, Department, Start Date, Skills, Notes
- **`...` overflow menu** column at the right with per-row actions: Edit, Delete, View Detail

Some field types render as inline values (Text, Email, Phone, Number, Date). Others render as badges/chips (Selection, Multi-Selection, Tags). File and Long Text fields render as truncated previews or icons.

[TBD — column visibility customization (let users hide/show columns), column reordering, sticky header for long lists, pagination/infinite scroll for thousands of rows.]

### Click behavior

- **Click anywhere on a row** → opens the **Particle Detail page** (full-page view, not a side panel — see Section 8)
- **Click the `...` menu** → opens action popover (Edit, Delete, View Detail)

### Bulk operations

V1 supports two bulk operations:

- **Bulk export** — select multiple particles via checkboxes (or "Select all"), click "Export selected" to download a CSV with all their field data. Uses the Particle Type schema to determine columns.
- **Bulk import** — upload a CSV that matches the Particle Type schema. The system validates, shows any errors (missing required fields, type mismatches), and either imports the valid rows or asks for fixes. AI-assisted column mapping is a future enhancement; V1 requires the CSV columns to match field names exactly (or close enough for automatic mapping).

[TBD — exact bulk operations UX. Deferred to a follow-up session. Bulk delete and bulk edit are explicitly NOT V1.]

---

## 7. SCREEN: New / Edit Particle (side panel)

**PURPOSE:** Create a new particle of this type, or edit an existing one's field data.

**TRIGGERED BY:**

- "New [Type]" button on the Particle List screen → New mode
- Edit button on the Particle Detail page → Edit mode
- Double-click a row in the Particle List → Edit mode (TBD — confirm if this is desired)

**FORMAT:** Right-side slide-in panel (side panel), NOT a separate page. Quick edit, doesn't require leaving the list view.

### Layout (New mode)

- **Header:** "New [Type Name]" title + subtitle ("Add a new [type] to your organization.")
- **Close (×)** button top-right
- **Form fields**, in order:
  - **Name** (required) — the canonical name of this particle. Has a small avatar/icon picker next to it for visual identification.
  - **Description (Optional)** — textarea
  - **Linked Team Member** dropdown (where applicable) — see Section 9
  - **Assigned Posts** (Employees only) — see Section 9
  - **Configured fields** — every field from the Particle Type schema, in the order defined, with type-appropriate inputs. Each field shows its label with its type in parentheses (e.g., "Company Name (Text)", "Monthly Retainer (Currency)") so the user knows what kind of data is expected.
- **Footer:** **Cancel** + **Create [Type]** (orange) buttons

### Layout (Edit mode)

Same structure, but:

- **Header:** "Edit [Type Name]" title + subtitle ("Update [type] details and fields.")
- **Pre-populated** with the existing particle's data
- **Footer:** **Cancel** + **Save Changes** (orange) buttons
- **Category** field at top showing which type this particle belongs to (read-only confirmation)

### Field rendering by type

Each field type renders its appropriate input:

- **Text / Long Text** — text input / textarea
- **Number / Currency** — numeric input with appropriate formatting
- **Yes / No** — toggle switch
- **Date** — date picker (defaults to today for new particles)
- **Email / Phone / URL** — formatted input with validation
- **File** — drag-drop upload zone or file picker button
- **Tags** — type-and-press-Enter input (existing tags shown as removable chips)
- **Selection** — dropdown menu
- **Multi-Selection** — checkbox list
- **Address** — structured multi-part input
- **Related Particles** — "+ Add Particle" button → two-step picker (see Section 5)
- **Related Posts** — single or multi-select dropdown of org chart posts
- **Related Manifests** — dropdown of manifest templates from Manifest Management

### Validation

Required fields are marked with a red asterisk. The Create / Save button is disabled until all required fields are filled.

### Save behavior

- New mode: clicking Create creates the particle and closes the panel. The new particle appears in the list view.
- Edit mode: clicking Save persists changes and closes the panel. Edits are captured in the particle's audit log.

---

## 8. SCREEN: Particle Detail (full page)

**PURPOSE:** The canonical view of a single particle. Where you go to see everything about it — its data, its history, what it's related to, what work has been done involving it.

**ROUTE:** `/particles/[type-slug]/[particle-id]`

**ACCESS:** All employees can view by default. Edit access follows the same rules as the Particle List: Members can edit particles in their own area of authority, Admins can edit anything. See `00_overview.md` Section 4.3.

**ENTERED FROM:**

- Click any row in a Particle List
- Click any chip in a Related Particles field on another particle
- Click any particle reference in a rail run, manifest, or audit log
- Direct URL navigation

**FORMAT:** Full-page view, NOT a side panel. The side panel is for quick edits only; the Detail page is the canonical view.

### Layout

- **Top-left:** Back arrow + particle name (e.g., "ABC Corp" or "John Lennox")
- **Top right:** **Edit** button — opens the side panel in Edit mode
- **Main area** organized into sections (likely tabs or scrolling sections):

#### Section 1: Profile / Fields

The configured field data for this particle. Every field defined on the Particle Type, with the values currently stored. Read-only display by default; Edit button opens the side panel for changes.

For Employees, the Profile section also shows:

- **Linked Team Member** (if any) — with a link to the Team Account screen
- **Assigned Posts** — list of posts this employee currently holds, with links to those posts on the org chart
- **Linked Manager** (derived from org chart structure) — who this employee reports to

#### Section 2: History (the travel log)

Chronological timeline of every workflow that has touched this particle. Each entry shows:

- **Date / time range** of the activity
- **Workflow name and type** (Rail name + run, Program name, Order title)
- **Status** (Active, Completed, Cancelled)
- **Cycles run on this particle** (which steps, who handled them, time spent, loop-backs)
- **Sub-particles involved** (e.g., for a construction client, which Property was the run attached to)
- **Manifest data captured during the run**
- **Files / photos** attached during the run
- **Outcome** (notes, deliverables)
- **Click any entry** → opens the full Rail Run Detail / Program Detail / Order Detail for that specific run

The History section is the **travel log**. The use case is: a new project manager taking over a client account can review the last year of work — every rail run, who handled which step, what came out of it, what photos were taken — without having to interview anyone. The data tells the story.

[TBD — full visual treatment of the History section. Deferred until rail run history surfaces are more developed in `03_admin.md`. The data model is locked in; the rendering is what needs UI work.]

#### Section 3: Related Particles

Bidirectional reference list. Two sub-sections:

- **Outgoing relations** (this particle's Related Particles fields, populated)
- **Incoming relations** ("Referenced by" — particles in other types that link to this one via their Related Particles fields)

Each relation shows the related particle's name, type, and a link to its own Detail page. Filterable and searchable when the list is long.

#### Section 4: Files / Documents

All files attached to this particle directly OR captured during workflow runs involving this particle. Aggregated for easy access.

**Optional Google Drive integration:** companies can configure Pathway to create a Google Drive folder (or other cloud storage folder) per particle, syncing files automatically. This avoids forcing companies to use Pathway as their file storage system. [TBD — exact integration UX, deferred to integrations session.]

#### Section 5: Activity Feed (optional)

Recent edits, comments, and changes to the particle itself. Different from History — History is workflow events; Activity Feed is direct edits to the particle's data ("Sage Epic updated Phone Number on Apr 5"). Useful for audit and seeing recent change.

[TBD — confirm if Activity Feed is V1 or deferred. May overlap enough with History to skip in V1.]

---

## 9. The Employee Particle — Special Case

The Employee Particle Type is special infrastructure, distinct from regular Particle Types in two important ways. **Employee data and Team account data are separate concerns.**

### Employee Particle (in Particles → Employees)

The Employee Particle is the **HR / data record** about a person. This is where:

- Personal information lives (full name, email, phone, job title, department, start date, skills, notes)
- Post assignments are made (which posts in the org chart this employee holds — multi-select)
- HR rails attach (training, disputes, monthly reviews, promotions, firings) when running rails about this employee
- The audit history of HR work involving this person accumulates

The Employee Particle is treated like any other particle in the system — it has a configurable schema (admins can add custom fields like "Skills", "Certifications", "Emergency Contact"), it appears in Particle Lists, it has a Detail page, etc.

### Team Account (in Organization → Team)

A Team Account is the **login credential and seat consumption** record. This is where:

- Email + password for app access lives
- Team Role (Owner / Admin / Member / Partner) is set
- Per-user permission checkboxes are configured (see `00_overview.md` Section 4.3 and `01_organization.md` Team screen)
- Bell notifications are routed
- "Currently online" status lives
- The user's session lives

The Team section is in the Organization nav group. It's a separate screen from Particles → Employees. See `01_organization.md` Team screen for the full Team Account spec.

### Why they're separate

Real organizational scenarios that motivate this split:

1. **Some employees don't have Pathway accounts.** A construction company has 50 site workers who never log in — they're given verbal direction by foremen, they don't need a seat, they consume no app capacity. But you still want to track them as Employees in HR for training records, post assignments, payroll integration, etc. They have Employee Particles but no Team Accounts.

2. **Some Team Accounts aren't operational employees.** A founder, board member, investor, or external consultant might have a Pathway login (because they want to see dashboards or specific reports), but they're not on the day-to-day org chart. They have Team Accounts but no Employee Particles, OR they have Employee Particles in a separate HR-irrelevant category. Either way, Pathway has to support "this person uses the app but isn't a normal employee."

3. **An employee might leave the company but their HR record persists.** When John Lennox is fired, his Team Account is deactivated (no more login), but his Employee Particle stays for audit history, payroll closeout, training records, etc. The two have different lifecycle requirements.

### Linkage between Employee Particle and Team Account

Both screens have a **Linked Team Member** field that connects them:

- On an Employee Particle: select which Team Account corresponds to this person (or "None" if they don't have an account)
- On a Team Account: select which Employee Particle corresponds (or "None" if they're not on the org chart)

The link is bidirectional and optional. Empty link is valid in both directions.

### Post assignment lives on the Employee Particle, not the Team Account

This is a critical implementation detail. **When you assign John Lennox to the "Account Manager" post on the org chart, you are updating his Employee Particle's "Assigned Posts" field**, not his Team Account.

This means: the Employee Particle is the authoritative record of "who holds which post." The Team Account is just a login. The Edit panel for an Employee Particle shows the Assigned Posts checkbox list as a primary field, with a footnote: "Check all posts this employee holds. Updates the org chart directly."

When the Org Structure screen shows "Account Manager: John Lennox," it's pulling that data from John's Employee Particle, not from any Team Account.

### Linked Team Member on other particle types

The "Linked Team Member" field can ALSO be added to non-Employee Particle Types — for example, a Client particle can have a Linked Team Member to track "which internal team member is the account owner for this client."

The semantics are different:

- **On an Employee Particle:** Linked Team Member = "this employee's app login account"
- **On a Client / other Particle:** Linked Team Member = "the internal person responsible for this entity"

Same field, two different meanings depending on context. The bidirectional visibility works the same way — the team member's profile shows which clients they're the linked owner of.

[TBD — should this be the SAME field type with context-dependent semantics, or two different field types ("My Account Login" vs "Responsible Team Member")? Probably the same field type with the meaning emerging from the type it's attached to. Defer if needed.]

---

## 10. Data Model Summary

Quick reference for the dev team:

```
particle_types
├── id
├── name
├── description
├── show_in_sidebar (bool)
├── sidebar_display_name (nullable)
├── searchable_fields (array of field IDs)
└── created_at, updated_at

particle_type_fields
├── id
├── particle_type_id (FK)
├── label
├── field_type (enum: text, long_text, number, currency, yes_no, date,
│                     email, phone, url, file, tags, selection,
│                     multi_selection, address, related_particles,
│                     related_posts, related_manifests)
├── config (JSON — type-specific options like selection values, currency code)
├── required (bool)
├── order (int)
└── created_at, updated_at

particles
├── id
├── particle_type_id (FK)
├── name
├── description
├── linked_team_account_id (nullable, FK to team_accounts — for any particle)
├── created_at, updated_at
└── audit_log (linked or embedded)

particle_field_values
├── id
├── particle_id (FK)
├── particle_type_field_id (FK)
├── value (typed by field_type)
└── updated_at

particle_relationships  (for Related Particles bidirectional sync)
├── id
├── source_particle_id (FK)
├── source_field_id (FK)
├── target_particle_id (FK)
└── created_at

employee_post_assignments  (for Employee Particles only — derived/special)
├── employee_particle_id (FK)
├── post_id (FK)
└── assigned_at
```

[TBD — exact schema is the dev team's call. The above is a conceptual sketch to communicate the relationships, not a prescription.]

---

## 11. Open Questions / Deferred

**Deferred to follow-up sessions:**

- **Bulk import / export UX** — concept locked (CSV-based, schema-mapped); exact UX TBD
- **Particle History view rendering** — concept locked (chronological travel log); visual treatment deferred until rail run history surfaces are more developed in `03_admin.md`
- **Activity Feed section** — V1 vs deferred TBD
- **Google Drive (or similar) integration** — file storage deferred to integrations session
- **AI-assisted bulk import column mapping** — future enhancement after V1 manual import works
- **Cross-system imports (Salesforce, HubSpot, etc.)** — explicitly deferred indefinitely
- **Per-field-type configuration UI** — most field types have minimal config (label + type), but Selection / Currency / File / Related Particles / Related Posts have additional config that needs detailed UX spec

**Permissions (resolved per `00_overview.md` Section 4):**

- **Create / edit Particle Types** — "Can build particle types" checkbox (default OFF for Members, ON for Admins)
- **Delete Particle Types** — "Can delete particle types" checkbox (default OFF even when build is ON, separate destructive permission)
- **Create / edit Particle instances** — open to Members by default within their area of authority; org-chart-derived
- **Delete Particle instances** — "Can delete particles" checkbox (default OFF)
- **Per-field permissions** (e.g., "only HR can edit Salary field on Employee Particles") — DEFERRED to V1.5 enhancement
- **Per-type visibility** (e.g., "only the Sales department can see Lead Particles") — DEFERRED to V1.5 enhancement

**Open architectural questions:**

- **Type renaming semantics** — when an admin renames a Particle Type, does the URL slug update? Does it break existing links? Probably need to keep old slugs as redirects.
- **Field type migration** — what happens when an admin changes a field's type after particles already have data in it? (e.g., Text → Number on a "Phone" field). Likely needs a migration prompt with destructive warning.
- **Required field added after particles exist** — what happens to existing particles missing the now-required field? Likely flagged as "needs attention" but not blocking.
- **Particle type deletion with active references** — if a Particle Type is used by an active rail's Initialize node, can it be deleted? Probably no — must be safely removed from all references first.
- **Linked Team Member as one field type or two?** — see Section 9.
- **Custom Particle Type icons** — can companies pick an icon per type for visual differentiation in the sidebar? Nice-to-have, not V1 critical.
