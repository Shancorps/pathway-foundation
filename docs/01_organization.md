# Pathway — App Specification

> LLM-readable specification of Pathway's screens, elements, and behaviors.
> Format: screen → elements → behavior. Optimized for ingestion by Codex / GPT-class models.

---

## SCREEN: Organization Structure (View Mode)

**PURPOSE:** Visual organizational chart showing the company's hierarchy of divisions, departments, sections, units, and posts. Read-only canvas view; editing happens in Edit Mode.

**ROUTE:** `/organization/structure`

**ACCESS:** All authenticated employees can view.

**PARENT NAV:** Organization → Structure (sidebar)

**FORWARD REFERENCE:** The org structure is the foundation for Pathway's core functionality — **routing**. Rails (defined later) flow through posts and containers defined here. The structure is intentionally non-enforced at this layer; routing logic enforces meaning later.

---

### LAYOUT

- **Left sidebar (global nav):** Pathway nav — Workspace (Dashboard, My Actions, Calendar, Statistics), Organization (Structure, Team), Particles (Types, Clients, Employees, Leads), Admin (Rail Management, Orders, Manifest Management, Settings)
- **Header:** Breadcrumb (`ORGANIZATION > STRUCTURE`), screen title "Structure", subtitle "Map team relationships and ownership."
- **Top right:** "Edit Structure" button
- **Main canvas:** Pannable / zoomable org chart canvas
- **Bottom left of canvas:** Zoom controls (+, –, fit-to-screen)

---

### ORG CHART HIERARCHY (data model)

Five-level hierarchy. **Levels are optional** — any container level can be skipped. A Post can sit directly inside any container level.

1. **Division** — top-level org unit (e.g. Sales, Operations, Delivery)
2. **Department** — sub-unit of a division
3. **Section** — sub-unit of a department
4. **Unit** — sub-unit of a section
5. **Post** — an individual position/job; can sit inside any container level

**Naming note:** "Section" is larger than "Unit" in Pathway's nomenclature (Section contains Units). This is deliberate Pathway terminology.

**Skip-level rule:** A Post can be a direct child of a Division, Department, Section, or Unit. Intermediate container levels are not required. Use only the levels needed to express the org's structure.

**Seniority rendering rule:** Top-to-bottom, left-to-right.

- Senior posts (e.g. Executive / VP-level) render at the top
- Subordinate posts render adjacent to or below their parent
- Divisions and their children render below the senior layer

**Manager indicator:** Any post marked as "Area Manager" displays a **star icon** and is treated as the manager of its containing area.

**Multi-employee posts:** A single Post represents one tile for one employee. If four salespeople hold the role "Salesperson" in the Sales division, there are **four separate Post tiles**, each assigned to one employee. Posts are not shared tiles with multiple names inside.

**Floating posts:** A Post can exist above or outside any container — e.g. a VP who oversees multiple divisions can be placed as a standalone Post and connected via node lines to the divisions they manage.

---

### NODE TYPES (visual elements on canvas)

**Container node** (Division / Department / Section / Unit)

- Customizable name
- Customizable color (user-defined; outline minimum, optional opaque background; no enforced color scheme)
- Customizable description
- Customizable Valuable Final Product (VFP) field
- Contains child containers and/or posts
- Header label indicates which level it is

**Post node**

- Post title (e.g. "Owner / Director", "Sales Director")
- Assigned employee name displayed below the title (or "Vacant" if unassigned)
- Manager star icon if marked as Area Manager
- Linked to a real employee record in the Team / Employees particle list

**Node connection lines**

- Manually drawn by the user in edit mode
- Represent reporting / oversight relationships (top-to-bottom hierarchy)
- Not auto-generated from parent/child container nesting
- Allow flexible structures (e.g. one VP connected to multiple divisions)

---

### ELEMENTS

- **"Edit Structure" button** (top right, orange)
  - TRIGGER: click
  - ACTION: navigates to Edit Mode
  - ACCESS: Owner / Admin / users with edit permission (permission system TBD — see forward reference to Employees/Permissions screen)

- **Container node (click)**
  - TRIGGER: click
  - ACTION: opens a right-side panel showing the container's details
  - PANEL CONTENTS (read-only):
    - Container name and level (Division / Department / Section / Unit)
    - Description
    - Valuable Final Product
    - Manager (the post marked as Area Manager for this container)
    - List of posts and child containers inside it
    - List of employees assigned to posts within it

- **Post node (click)**
  - TRIGGER: click
  - ACTION: opens a right-side panel showing the post's details (read-only mirror of the edit-mode Post properties panel)

- **Canvas pan/drag**
  - TRIGGER: click-and-drag on empty canvas area
  - ACTION: pans the viewport

- **Zoom in (+) / Zoom out (–) / Fit-to-screen**
  - Standard canvas zoom controls

---

### DATA TOUCHED (read-only in view mode)

- `organizations` (current org context)
- `divisions`, `departments`, `sections`, `units` (container hierarchy)
- `posts` (with: title, parent container, color, is_area_manager, is_senior, vfp, description, assigned employee FK)
- `employees` (joined to posts via assignment)
- `node_connections` (manual user-drawn lines between nodes)

---

### EDGE CASES / BEHAVIOR RULES

- **Employee removal cascade:** When an employee is removed from the Team database, they are automatically unassigned from all posts they hold. Affected posts revert to "Vacant".
- **Multi-post employees:** A single employee can be assigned to multiple posts. Their name appears in each post tile they hold.

---

---

## SCREEN: Organization Structure — Edit Mode

**PURPOSE:** Modify the org chart — add/remove/edit containers and posts; assign employees; mark managers; configure properties; draw connection lines.

**ROUTE:** `/organization/structure/edit`

**ACCESS:** Owner / Admin / users with edit permission (permission system TBD).

**ENTERED FROM:** "Edit Structure" button on Structure view screen.

---

### LAYOUT

- **Header:** Back arrow + title "Organization Structure", "Unsaved changes" indicator, "Discard" button, "Save" button (top right, orange)
- **Left sidebar — NODES palette:** Draggable node types
  - **Division** — "Org unit — add depts, units..."
  - **Post** — "A position that can float..."
- **Main canvas:** Editable org chart with all containers and posts visible
- **Right sidebar — Properties panel:** Context-sensitive editor for the currently selected node
- **Bottom left:** "Auto Layout" button, zoom controls (+, –, fit-to-screen), lock button

---

### CANVAS BEHAVIOR

- All existing nodes render exactly as in view mode, but are now editable
- Each container node displays inline action buttons (see "Inline canvas buttons" below)
- New containers appear with placeholder labels ("New Division", "New Department", "New Post")
- Container nodes can be dragged to reposition on canvas
- Posts **cannot** be drag-and-dropped between containers — they are added inside the container they belong to via the "+ Add Post" button on that container
- Connection lines between nodes are user-drawn (not auto-generated)
- Clicking any node selects it and opens its properties in the right sidebar

---

### ELEMENTS — Top bar

- **Back arrow** (top left)
  - TRIGGER: click
  - ACTION: returns to view mode
  - EDGE CASE: if there are unsaved changes, prompts confirmation modal before leaving

- **"Unsaved changes" indicator**
  - TRIGGER: appears automatically when any edit is made
  - ACTION: visual only

- **"Discard" button**
  - TRIGGER: click
  - ACTION: prompts confirmation modal; on confirm, reverts all unsaved changes to last-saved state

- **"Save" button** (orange, top right)
  - TRIGGER: click
  - ACTION: persists all changes; returns user to view mode immediately
  - DATA TOUCHED: divisions, departments, sections, units, posts, post_assignments, node_connections
  - VALIDATION: none. The user is free to save any structure, even incomplete or non-functional. If it doesn't work for them, they return and edit.

---

### ELEMENTS — Left sidebar (NODES palette)

- **Division (draggable)**
  - TRIGGER: drag onto canvas
  - ACTION: creates a new Division container at drop location with default name "New Division"
  - POST-STATE: new division is selected; right sidebar shows Container properties

- **Post (draggable)**
  - TRIGGER: drag onto canvas
  - ACTION: creates a new floating Post node at drop location (no parent container)
  - POST-STATE: new post is selected; right sidebar opens Post properties panel

---

### ELEMENTS — Inline canvas buttons (per container)

The available "Add" buttons depend on the container type. The hierarchy is enforced _for the add buttons only_ — you can only add the next level down via these buttons (though skip-level posts can still exist via the Post palette or "+ Add Post").

| Container Type | Available Buttons                |
| -------------- | -------------------------------- |
| Division       | `+ Add Department`, `+ Add Post` |
| Department     | `+ Add Section`, `+ Add Post`    |
| Section        | `+ Add Unit`, `+ Add Post`       |
| Unit           | `+ Add Post`                     |

- **`+ Add [Child Container]` button**
  - TRIGGER: click
  - ACTION: creates a new empty child container of the appropriate type with default name (e.g. "New Department"), nested inside the parent

- **`+ Add Post` button** (available on every container type)
  - TRIGGER: click
  - ACTION: creates a new empty Post inside the container with default name "New Post"
  - POST-STATE: new post is selected; right sidebar opens Post properties panel

---

### ELEMENTS — Right sidebar (Post properties panel)

Opens when a Post node is selected.

- **Header:** "Post" title + close (×) button
- **Name field** (text input) — the post title
- **Description field** (textarea)
- **Valuable Final Product field** (textarea) — "What does this post produce? (optional)"
- **Assigned Employees (read-only display)**
  - Lists employees currently holding this post, with avatar + name (or email if unnamed)
  - **Post assignment is NOT edited here.** To assign or unassign an employee to a post, edit the Employee Particle's "Assigned Posts" field in Particles → Employees. This panel reads from the Employee Particle data as the source of truth. See `05_particles.md` Section 9 for the canonical post-assignment flow.
  - "Vacant" if no employees currently hold this post
- **Senior toggle**
  - LABEL: "Mark as a senior position"
  - ACTION: flags this post as senior-level; affects rendering position (top of hierarchy)
- **Area Manager toggle**
  - LABEL: "This post manages its area"
  - ACTION: marks this post as the manager of its containing area; renders the star icon on the post node
- **Delete Post button** (red, bottom)
  - TRIGGER: click
  - ACTION: prompts confirmation modal; on confirm, removes post from chart
  - The assigned employee remains in the Team list; only the post assignment is cleared
- **Close (×) button** (top right of panel)
  - TRIGGER: click
  - ACTION: closes properties panel, deselects post

---

### ELEMENTS — Right sidebar (Container properties panel)

Opens when a Division / Department / Section / Unit is selected.

- **Header:** Container type label + close (×) button
- **Name field** (text input)
- **Description field** (textarea)
- **Valuable Final Product field** (textarea)
- **Color picker**
  - User-defined color for the container outline (and optional opaque background)
  - No enforced color scheme
- **Manager (read-only display)** — the post inside this container marked as Area Manager
- **Delete Container button** (red, bottom)
  - TRIGGER: click
  - ACTION: prompts confirmation modal requiring the user to **type "delete"** to confirm (Notion-style)
  - On confirm, deletes the container AND all child containers and posts inside it (cascade delete)
  - Action is undoable via the undo system
- **Close (×) button** (top right of panel)

---

### ELEMENTS — Bottom controls

- **"Auto Layout" button**
  - TRIGGER: click (manual, one-shot — not automatic)
  - ACTION: rearranges all nodes on canvas into a clean standard tree format (top-to-bottom, left-to-right)
  - Overrides current manual positioning when triggered
  - User must explicitly click; never runs automatically

- **Zoom in (+) / Zoom out (–) / Fit-to-screen**
  - Standard canvas controls

- **Lock button**
  - TRIGGER: click (toggle)
  - ACTION: locks canvas pan/zoom to prevent accidental movement during editing

---

### ELEMENTS — Undo / Redo

- **Undo / Redo system** (UI buttons next to the zoom +/– controls in the bottom-left of the canvas, plus standard keyboard shortcuts Cmd+Z / Cmd+Shift+Z)
  - SCOPE: covers all edit actions (moves, additions, edits, deletions, connection line draws)
  - PRIMARY USE CASE: recovering from accidental deletions
  - Persists within the current edit session

---

### DATA TOUCHED (write operations on save)

- `divisions` (create / update / delete)
- `departments` (create / update / delete)
- `sections` (create / update / delete)
- `units` (create / update / delete)
- `posts` (create / update / delete; fields: name, description, vfp, color, is_senior, is_area_manager, parent_container_id, position_x, position_y)
- `post_assignments` (create / update / delete; links employees to posts)
- `node_connections` (create / update / delete; user-drawn lines between nodes)

---

### CONFIRMATION MODALS — SUMMARY

| Action                                              | Confirmation Type                       |
| --------------------------------------------------- | --------------------------------------- |
| Delete Post                                         | Standard confirm modal                  |
| Delete Container (Division / Dept / Section / Unit) | Type "delete" to confirm (Notion-style) |
| Discard unsaved changes                             | Standard confirm modal                  |
| Back arrow with unsaved changes                     | Standard confirm modal                  |

---

### FORWARD REFERENCES

- **Permissions:** Edit access is governed by the Permissions Model in `00_overview.md` Section 4. Admins and Owners can edit by default; Members can be granted the "Can edit org structure" checkbox (own area or org-wide). See the final FORWARD REFERENCES section at the bottom of this file for the consolidated cross-reference.
- **Routing:** The org structure is the foundation for Pathway's rail/routing system. Posts and containers defined here are referenced by rails in `03_admin.md`.

---

## SCREEN: Team

**PURPOSE:** Manage Team Accounts — the people who actually log into Pathway. This is where invitations are sent, roles are assigned, per-user permissions are configured, and members are removed.

**Critical reminder:** Team Accounts and Employee Particles are **two separate things**. See `05_particles.md` Section 9 for the full treatment. The short version:

- A **Team Account** is the login credential. It lives here on the Team screen.
- An **Employee Particle** is the HR data record. It lives in Particles → Employees.
- The two are linked but not identical. Some employees have no Team Account (no login). Some Team Accounts aren't normal employees (founders, board members, investors, consultants).

**ROUTE:** `/team`

**ACCESS:** All Team members can view (read-only). Inviting, editing roles, configuring permissions, and removing members requires Admin (or Owner) role.

**PARENT NAV:** Sidebar → Organization → Team

---

### LAYOUT

- **Header:** Breadcrumb (`ORGANIZATION > TEAM`), screen title "Team", subtitle "Access, members, and collaboration."
- **Top right:** **Invite Member** button (orange, Admin/Owner only)
- **Main area:** Grid of member tiles, one per Team Account
- Each member tile shows:
  - Avatar / initials
  - Name
  - Email
  - Joined date
  - Role badge (Owner / Admin / Member)
  - Partner indicator if applicable

### Member tile click

Clicking a member tile opens the **Member Detail side panel** with full configuration options.

---

### Invite Member modal

Triggered by the **Invite Member** button.

**Modal contents:**

- Title: "Invite Team Member"
- Subtitle: "Send an invitation to join your organization."
- **Email Address** input (required)
- **Role** dropdown — Member / Admin (Owner is not selectable here; ownership is transferred separately)
- **Helper text** below the role dropdown describing what the chosen role can do
- **Cancel** + **Send Invitation** button (orange, disabled until email is valid)

**On Send Invitation:**

1. An email invitation is sent to the address with a join link
2. **An Employee Particle is auto-created** with the email pre-filled and the Linked Team Member field pointing to the new account (see Auto-creation below)
3. The recipient clicks the link, sets their password, and lands in Pathway
4. The new account appears in the Team grid with their role

**Auto-creation of Employee Particle:**

When a Team Account is invited, the system automatically creates an associated Employee Particle to keep the two systems in sync from day one. The auto-created particle has:

- Email pre-filled
- Linked Team Member set to the new Team Account
- Name field initially set to the email address (the user can update it on first login)
- All other fields empty for the user (or an Admin) to fill in later

This avoids the failure mode where a Team Account exists but no corresponding Employee Particle, leaving the new user unable to be assigned to any Post.

[TBD — confirm: should the inviting Admin also be able to assign initial Posts during the invite flow? Current model: invite first, post-assign later. But for fast onboarding it might be useful to set posts immediately.]

---

### Member Detail side panel

Opens when a member tile is clicked. **All Admins can open this panel for any team member to view and edit their settings.**

**Panel contents:**

#### Header

- Avatar / initials
- Name
- Email
- Close (×) button top-right

#### Joined date

Read-only field showing when this account was created.

#### Role

Dropdown: **Member / Admin** (Owner is not editable here — ownership transfer is a separate flow).

Changing the role updates the user's baseline capabilities immediately. See Permissions Model section below.

#### Partner toggle

A toggle "Not a partner" / "Partner". When enabled, the member is flagged as a Partner — a non-operational stakeholder. Partners cannot hold Posts, cannot receive cycles, cannot run rails or issue orders. They have read-only access to dashboards and statistics. See Permissions Model for full Partner semantics.

#### Permissions checkbox panel

Below the role and partner controls, a panel of **per-user permission checkboxes** that allow Admins to fine-tune what this specific member can do beyond their role baseline. See the Permissions Model section in `00_overview.md` for the full checkbox catalog and default behaviors.

The panel is organized into groups:

- **Operational** (issue rails, create programs, issue orders, etc.)
- **Visibility** (see stats, see programs in other areas, see rail activity outside their authority)
- **Limited Platform Configuration** (build rails for own area, build manifests, build particle types, edit org structure for own area)
- **Sensitive** (force-cancel rail runs, delete cancelled rail runs, edit completed manifest data, transfer program ownership, remove team members)

For Admins, every checkbox is on by default and cannot be unchecked (Admins have full capabilities). For Members, defaults are sensible operational baselines and the inviting Admin adjusts as needed.

**Edit and Delete are always separate checkboxes.** Every "build/edit X" capability has a paired "delete X" capability that's checked separately. The default when granting an edit capability is: Edit ON, Delete OFF. This protects against the "trusted to build, not trusted to destroy" pattern that's common in real organizations.

#### Remove from organization

A **destructive button** at the bottom of the panel (red text "Remove from organization"). Confirmation modal required.

**On removal:**

- The Team Account is deactivated; the user can no longer log in
- The Employee Particle remains in Particles → Employees for audit history (it is NOT auto-deleted — the data is preserved)
- The Linked Team Member field on the Employee Particle is updated to "(removed)"
- Any Posts the employee held on the org chart are vacated; cycles assigned to those Posts go through the standard reassignment flow
- If the user was the Owner: removal is blocked; they must transfer ownership first

[TBD — confirm reassignment flow when a Team Account is removed mid-rail-run. Likely follows the same path as the existing manager-cancel-and-reassign mechanic from `02_workspace.md`.]

---

### Org Switcher (top-left, global feature)

**Note:** The "Apex Media" dropdown in the top-left of the sidebar is NOT specific to the Team screen. It is a **global organization switcher**, accessible from every screen in Pathway. It is documented here because it's most visible/relevant on the Team screen, but the behavior applies app-wide.

A single Team Account can belong to **multiple organizations**. Use cases:

- A founder who owns multiple companies and uses Pathway to manage all of them
- A consultant who works across several clients each with their own Pathway org
- An investor monitoring portfolio companies, each as a separate org
- A franchise operator with multiple locations as separate orgs

The Org Switcher dropdown shows every organization the current Team Account is a member of, with the currently-active one highlighted. Switching orgs swaps the entire Pathway context — different org chart, different rails, different particles, different dashboards, different team members. Each org is **fully isolated** from the others; data does not cross org boundaries.

For users who belong to only one organization, the Org Switcher still appears but is functionally a static label.

[TBD — handling edge cases: notifications across orgs (does the bell aggregate across orgs or only show the active one?), cross-org search (probably no), creating a new organization from the switcher.]

---

### EDGE CASES / OPEN QUESTIONS

- **Pending invitations** — what does the Team screen show for invitations that have been sent but not yet accepted? Probably a "pending" tile that an Admin can resend or cancel.
- **Two-factor authentication** — TBD whether Pathway requires/offers 2FA at the Team Account level. Likely yes for Owners and Admins, optional for Members.
- **Single sign-on (SSO)** — enterprise customers will want SSO integration (Google Workspace, Microsoft, Okta). Deferred to integrations session.
- **Seat counting and billing** — how Team Accounts map to billing seats. Owners and Admins always count; Members count; Partners may be a separate tier (cheaper or free). Deferred to billing session.
- **Bulk invite** — Admins inviting 30 employees at once would benefit from a CSV bulk-invite flow. Defer to V1.5.

---

## FORWARD REFERENCES (updated)

- **Permissions:** A **per-user permissions checkbox model** lives on the Team Member edit panel. There is no separate Permissions screen. See `00_overview.md` Section 4 (Permissions Model) for the full checkbox catalog, role baselines, and how Team Role + Org Chart Position + per-user checkboxes combine to determine actual capabilities.
- **Routing:** The org structure is the foundation for Pathway's rail/routing system. Posts and containers defined here are referenced by rails.
- **Particle linkage:** Team Accounts link to Employee Particles via the Linked Team Member field. See `05_particles.md` Section 9.
