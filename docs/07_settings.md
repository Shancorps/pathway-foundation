# Pathway — Settings

> Per-user and per-organization configuration surfaces. Profile, credentials, appearance, and platform governance.
> Read `00_overview.md` first for vocabulary and the Permissions Model.

---

## STATUS

**Complete:**

- Profile, Organization, Credentials, Appearance tabs (existing in current implementation)
- Notifications, Billing, Security, Integrations, Danger Zone tabs (V1 additions)

**Deferred:**

- Company color scheme + company logo customization (V1.5+)
- "Sign out everywhere" multi-session security (V1.5+)
- 2FA enforcement policies at the org level (V1.5+)
- Per-event notification fine-tuning (basic notifications in V1, granular config in V1.5)

---

## 1. Nav Placement and Access

**Sidebar nav group: Admin** (for Admins/Owners).

For **non-Admin users**, Settings is accessed via the **user tile bottom-left → Profile** popover click, which deep-links to Settings → Profile tab. Non-Admin users only see the tabs relevant to them (Profile, Organization read-only, Appearance, Notifications, Security). They do NOT see Credentials, Billing, Integrations, or Danger Zone.

**Route:** `/settings` (with tab anchor, e.g., `/settings/profile`, `/settings/credentials`)

**Access per tab:**

| Tab           | Member               | Admin           | Owner           |
| ------------- | -------------------- | --------------- | --------------- |
| Profile       | ✅                   | ✅              | ✅              |
| Organization  | ✅ (read-only)       | ✅              | ✅              |
| Credentials   | ✅ (user-level only) | ✅ (org + user) | ✅              |
| Appearance    | ✅                   | ✅              | ✅              |
| Notifications | ✅                   | ✅              | ✅              |
| Billing       | —                    | —               | ✅ (Owner only) |
| Security      | ✅                   | ✅              | ✅              |
| Integrations  | —                    | ✅              | ✅              |
| Danger Zone   | —                    | ✅ (partial)    | ✅ (full)       |

---

## 2. SCREEN: Settings

**Layout:**

- **Header:** Breadcrumb (`ADMIN > SETTINGS`), screen title "Settings", subtitle "Manage profile, organization, credentials, and appearance."
- **Tab navigation** — horizontal tab row at the top. With 9 tabs in V1, this will overflow on narrow viewports. **Recommendation: switch to a left-side vertical nav** for Settings once more than 5 tabs exist. Current implementation has 4 tabs horizontally which works; V1's 9 tabs needs a vertical side nav.
- **Main content area:** the selected tab's content

Tabs in order: **Profile | Organization | Credentials | Appearance | Notifications | Billing | Security | Integrations | Danger Zone**

(Tabs hidden based on role per the access table above.)

---

## 3. TAB: Profile

**PURPOSE:** Per-user account info. Editable by the current user; email is controlled by the admin.

### Layout

**Section: Profile**
Subtitle: "Manage your profile information and how others see you."

- **Avatar** — circle with current initials or photo
  - **Click the avatar to upload a new photo.** Opens file picker for image selection. Uploaded image is cropped/resized automatically.
  - **Remove photo** option reverts to initials
- **Full name** — editable text input
- **Email** — read-only input with helper: "Contact your administrator to change your email." Admins can change their own and others' emails via the Team screen (see `01_organization.md`).
- **Avatar URL** — editable text input for users who prefer linking an externally-hosted image instead of uploading. Helper: "Enter a URL to an image for your profile picture." Changes here override the uploaded photo.
- **Team Role badge** — displays the user's role (Owner / Admin / Member / Partner). Read-only. Helper: "Your role is managed by your organization's admin."
- **Save changes** button (orange)

**Section: Sign out**

- Subtitle: "Sign out of your account on this device."
- **Sign out** button (red)
- **V1 behavior:** signs out of the current device only. Other active sessions on other devices remain logged in. ([V1.5+: "Sign out everywhere" checkbox or secondary button for security-minded users or after a stolen device.])

---

## 4. TAB: Organization

**PURPOSE:** View and manage organization-level info. Behavior differs based on role.

### 4.1 Owner / Admin view (for the currently-active org)

**Section: Organization**
Subtitle: "Manage your organization settings and details."

Header metadata: "Created [date]" + "[N] members"

- **Organization name** — editable text input with per-field **Save** button
- **Organization slug** — editable text input with per-field **Save** button. Helper: "The slug is used in URLs. Use only lowercase letters, numbers, and hyphens."

**Below the active org section, if the user belongs to other orgs:**

- **Section: Your other organizations**
- Read-only list of other orgs the user belongs to (see Member view below for format)

### 4.2 Member view

**Section: Your organizations**
Subtitle: "Organizations you belong to."

List of every organization the current user is a member of. Each row shows:

- **Org name + slug**
- **Joined date**
- **Your Post(s) in this organization** — read directly from the user's Employee Particle in that org's Assigned Posts field. Example: "Account Manager, Senior Strategist"
- **Active indicator** — marker/highlight on the currently-active org
- **Click any row → switches to that org** (same effect as the Org Switcher in the sidebar)

No edit affordances for Members.

### 4.3 Data source for Post display

The "Your posts in [Org Name]" field reads from the user's Employee Particle in that organization. See `05_particles.md` Section 9 for the Employee Particle vs Team Account distinction. If the user has no Employee Particle in an org (edge case — e.g., a Partner), the display shows "No posts assigned."

---

## 5. TAB: Credentials

**PURPOSE:** Manage API keys, tokens, and secrets that rails reference at runtime. Used by Agent nodes, Integration nodes, and future API-pull statistics.

### 5.1 Scope — org-level AND user-level

Credentials exist at two scopes:

- **Org-level credentials** — owned by the organization, managed by Admins. Example: the company's Claude API key, Stripe secret key, Meta Ads API token. Shared across all rails in the org.
- **User-level credentials** — owned by individual Team Accounts. Example: an employee's personal Google Drive token, used for rails that write files to their personal Drive folder. The employee manages these directly; Admins don't see them (except through audit logs).

**Visibility:**

- Admins see org-level credentials and can add/edit/delete them. They do NOT see individual users' user-level credentials.
- Members see their own user-level credentials only. They do NOT see org-level credentials (but rails reference org-level credentials automatically — the user doesn't need visibility).

### 5.2 Layout

**Section: Credentials**
Subtitle: "Manage API keys and secrets for your flows."

**Top right:** **+ Add Credential** button

**Content:**

- **Tab split (if user is Admin):** "Organization" | "My credentials"
  - **Organization tab** — org-level credentials (Admin view)
  - **My credentials tab** — user-level credentials for the current user
- **Tab split (if user is Member):** just "My credentials" — the Organization tab is hidden
- **Empty state:** icon + "No credentials yet" + "Add a credential to get started."

### 5.3 Credential row (populated state)

Each credential in the list shows:

- **Name** (display label, e.g., "Claude Sonnet Production Key")
- **Provider / type** badge (Claude / OpenAI / Google / Meta / Stripe / Custom Webhook / etc.)
- **Masked value** (e.g., `sk-••••••••••••Y3nK`)
- **Added by** (for org-level: which Admin added it)
- **Added on** (date)
- **Last used** (date, if tracked by the system)
- **Status** indicator (Active / Disabled / Revoked)
- **`...` overflow menu:** Edit (name/description), Disable/Enable, Delete

### 5.4 Add Credential modal

**Triggered by:** + Add Credential button

**Fields:**

- **Scope** (Admin only, if both tabs visible) — radio: Organization / My credentials
- **Name** (required) — display label
- **Provider** dropdown — predefined list (Claude / OpenAI / Google / Meta / Stripe / Jobber / HubSpot / Custom Webhook / Other). Picking a provider applies provider-specific validation to the key format.
- **Key / Token** textarea — the actual secret value. **Entered once.** After saving, the field is masked and cannot be viewed again (only rotated).
- **Description** (optional) — freeform notes about what this credential is used for
- **Cancel** + **Add Credential** (orange) buttons

### 5.5 Security behavior

- **Keys are encrypted at rest.** The plaintext value is never displayed after save. To rotate, users delete the credential and add a new one.
- **Audit log** — every credential create / edit / delete is logged with acting user and timestamp. Admins can see the audit log for org-level credentials; users can see it for their own user-level credentials.
- **Deletion when in use** — if an org-level credential is referenced by a rail's Agent or Integration node, deletion prompts: "This credential is in use by [N] rails: [list]. Deleting it will break those rails. Continue?" Admin confirms explicitly.

### 5.6 Credential usage in rails

Rails reference credentials by name/ID, not by value. When a rail's Agent or Integration node fires, the system looks up the referenced credential and injects the value at runtime. The value never appears in rail logs or UI.

[TBD — exact credential-selection UX inside Agent / Integration node property panels. Deferred to those node spec sessions.]

---

## 6. TAB: Appearance

**PURPOSE:** Visual customization of the Pathway interface.

### Layout

**Section: Appearance**
Subtitle: "Customize how the application looks on your device."

- **Theme** — three-button selector:
  - **Light** (sun icon)
  - **Dark** (moon icon)
  - **System** (monitor icon) — follows OS preference
- Helper: "Select your preferred theme for the interface."

That's it for V1. Minimal by design.

### V1.5+ deferred

- **Company color scheme** — customize accent color from orange to match company branding. Pathway wordmark and structural UI remain consistent; only the accent color changes.
- **Company logo** — upload a small logo that appears alongside the Pathway wordmark in a branded configuration. The Pathway wordmark stays visible (not replaced) — this is co-branding, not white-labeling.
- **Font size** / **density** (compact vs comfortable) — possibly V1.5
- **Keyboard shortcut customization** — far future

---

## 7. TAB: Notifications

**PURPOSE:** Control how and when the user is notified about Pathway events.

### 7.1 Delivery channels

Each notification type can be toggled per delivery channel:

- **Bell (in-app)** — the bell icon at top-left of the sidebar. Always available.
- **Email** — via the user's registered email address. Requires opt-in per event type.
- **Desktop push** (browser notifications) — requires browser permission grant. Optional per user.

### 7.2 Notification event types

Each event has toggles per channel. V1 baseline events:

| Event                            | When it fires                                       | Bell default | Email default | Desktop default |
| -------------------------------- | --------------------------------------------------- | ------------ | ------------- | --------------- |
| New cycle arrives in my inbox    | Particle lands on one of my Posts                   | ✅           | —             | —               |
| Order issued to me               | Someone issues a standalone Order                   | ✅           | —             | —               |
| Loop back received               | A cycle loops back to me                            | ✅           | ✅            | —               |
| Cycle I issued completed         | Someone completes an Order or Program item I issued | ✅           | —             | —               |
| Nudge received                   | A manager nudges a cycle I own                      | ✅           | —             | —               |
| Mention in comment               | Someone @-mentions me on a cycle                    | ✅           | ✅            | —               |
| Manager force-completed my cycle | A manager force-advances past me                    | ✅           | —             | —               |
| Rail run cancelled               | A rail I own is cancelled                           | ✅           | —             | —               |
| Daily summary                    | Digest of pending work                              | —            | ✅ (daily)    | —               |

### 7.3 Layout

**Section: Notification Preferences**
Subtitle: "Choose how you want to be notified about activity in Pathway."

- **Table of event types × channels** with toggle switches per cell
- **Enable all in [channel]** / **Disable all in [channel]** quick actions per column
- **Save changes** button

[TBD — exact event catalog and per-event copy. V1 ships the baseline above; V1.5 expands with finer-grained events as customer feedback identifies noise-vs-signal problems.]

### 7.4 Do Not Disturb (future)

A V1.5 enhancement: set quiet hours (e.g., "no notifications 7pm-7am local time") or a DND toggle for focused work. Not V1.

---

## 8. TAB: Billing (Owner only)

**PURPOSE:** Subscription management, seat allocation, payment, invoices.

### Layout

**Section: Plan**

- Current plan name (e.g., "Business", "Enterprise")
- Monthly/annual price + billing cycle
- Next billing date
- **Change plan** / **Cancel subscription** buttons

**Section: Seats**

- Current seat count: [N used] / [M total]
- Breakdown by Team Role: Owners / Admins / Members / Partners
- **Add seats** / **Remove seats** actions

**Section: Payment method**

- Current card/ACH on file (masked)
- **Update payment method** button

**Section: Billing history**

- Table of past invoices: Date / Amount / Status / PDF link
- **Download invoice** per row

**Section: Tax / Billing details**

- Company name, tax ID, billing address (editable)

### Access

- **Only the Owner sees this tab.** Admins do NOT see Billing — ownership transfer required to access.
- Reflects the sensitivity of billing information and prevents Admins from making subscription changes the Owner didn't authorize.

[TBD — detailed billing flow. Deferred to billing integration session with the payment provider (Stripe likely).]

---

## 9. TAB: Security

**PURPOSE:** Account security settings.

### Layout

**Section: Password**

- **Change password** — opens a modal requiring current password + new password + confirmation
- **Last changed** timestamp

**Section: Two-factor authentication (2FA)**

- Status: Enabled / Not enabled
- **Enable 2FA** button — standard TOTP setup flow (QR code + backup codes)
- **Disable 2FA** (if enabled) — requires password confirmation

**Section: Active sessions**

- List of currently-logged-in sessions for this account:
  - Device / browser
  - Approximate location (based on IP)
  - Last active time
  - **Sign out** button per session (except the current one)
- **Sign out all other sessions** button at the bottom

**Section: Recent security events**

- Log of recent security-relevant events: sign-ins, password changes, 2FA changes, credential additions
- Last 30 events shown; full log downloadable

### V1.5+ deferred

- **SSO / SAML** for enterprise customers (Google Workspace, Microsoft, Okta)
- **Org-level 2FA enforcement policy** (Admin requires all Members to have 2FA)
- **IP allowlist** for enterprise
- **Session timeout policy** per org

---

## 10. TAB: Integrations

**PURPOSE:** Manage third-party app integrations at the organization level. Distinct from Credentials — Credentials are raw API keys; Integrations are pre-built OAuth connections to specific services.

### Layout

**Section: Available integrations**
Gallery of supported third-party integrations. For V1, the initial roster (all V1.5+ live, placeholder tiles in V1):

- **Google Workspace** (Drive, Calendar, Gmail)
- **Microsoft 365** (OneDrive, Outlook, Teams)
- **Slack**
- **Meta Ads**
- **Google Ads**
- **HubSpot**
- **Stripe**
- **Jobber**
- **QuickBooks**

Each integration tile shows: logo, name, short description, **Connect** / **Configure** / **Disconnect** button based on current state.

**Section: Connected integrations**
Integrations that have been OAuth'd by an Admin. Each shows:

- Logo + name
- Connected by (Admin name)
- Connected on (date)
- Status (Active / Error / Expired)
- **Configure** / **Disconnect** actions

### Access

- **Admin-only.** Members cannot add or remove integrations.
- Integrations are org-level; the Admin authorizes on behalf of the organization.

### V1 scope

For V1, this tab exists as a **placeholder** with the integration roster visible but "Coming soon" on each. No actual integrations ship in V1. V1.5 ships the first 2-3 (likely Google Workspace + Slack + Meta Ads based on common demand).

The tab exists in V1 to (a) communicate the roadmap to customers and (b) give the dev team a landing place when the first integration is wired up.

---

## 11. TAB: Danger Zone

**PURPOSE:** Destructive organization-level and account-level actions that are irreversible.

### Layout

**Section: Leave organization** (Member / Admin)

- Button: "Leave [Org Name]"
- Confirmation modal: "Are you sure? You will lose access to [Org Name] immediately. An admin will need to re-invite you to rejoin."
- For Owners: blocked. Owners must transfer ownership before leaving.

**Section: Transfer ownership** (Owner only)

- Button: "Transfer ownership of [Org Name]"
- Modal: pick a target Admin to transfer to, confirmation checkbox "I understand I will lose Owner privileges."
- Upon transfer: target becomes Owner, current user becomes Admin.

**Section: Delete organization** (Owner only)

- Button: "Delete [Org Name]" (red)
- Confirmation modal requires typing the organization's exact name to proceed (Notion-style confirmation)
- Helper text: "This action is permanent. All rails, particles, manifests, statistics, and data will be irreversibly deleted. Active subscriptions will be cancelled."
- Grace period: the org is **soft-deleted for 30 days** and can be restored by contacting support. After 30 days, hard-deletion is irreversible.

**Section: Delete my account** (any user)

- Button: "Delete my Pathway account" (red)
- Confirmation modal requires typing the user's email to proceed
- If the user is an Owner of any org, account deletion is blocked until ownership is transferred or those orgs are deleted
- Upon deletion: account becomes inactive, user is removed from all orgs, Employee Particles remain but Linked Team Member fields are nulled, login credentials are destroyed.

### Access

- Members / Admins see: Leave organization, Delete my account
- Owners see: Transfer ownership, Delete organization, Delete my account
- Every action requires explicit confirmation (typing the name/email for irreversibles)

---

## 12. OPEN QUESTIONS / DEFERRED

- **Tab overflow on narrow viewports** — 9 tabs horizontally will overflow. Recommended: left-side vertical nav within Settings. Defer final visual treatment to UX session.
- **Billing flow details** — full payment provider integration TBD
- **SSO / SAML integration** — V1.5+ for enterprise
- **Company color scheme and logo customization** — V1.5+
- **"Sign out everywhere"** — V1.5+ security feature
- **Notifications granularity** — V1 ships baseline event catalog; V1.5 adds per-event-type fine control
- **Integration OAuth flow** — each integration has its own OAuth dance; implementation per integration is its own session
- **Org-level 2FA enforcement** — V1.5 policy where Admins can require all Members to enable 2FA
- **Partner settings view** — what does a Partner see? Probably Profile + Appearance + Notifications only. Confirm when Partner UX is fleshed out.
- **Organization tab for Owners with multiple owned orgs** — if an Owner owns 3 orgs, do they see 3 editable sections? My recommendation: show the active org in edit mode, others in read-only. Switching orgs via Org Switcher makes that org active.
