import Link from "next/link"
import { redirect } from "next/navigation"
import { Network } from "lucide-react"
import { PageShell } from "@/components/ui/page-shell"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import {
  getCurrentMember,
  getOrganizationMembers,
  getPendingInvitations,
} from "@/modules/org/queries"
import { TeamInviteForm } from "@/modules/org/ui/team-invite-form"
import { TeamMembersList } from "@/modules/org/ui/team-members-list"
import { TeamPendingList } from "@/modules/org/ui/team-pending-list"

export default async function TeamPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const currentMember = await getCurrentMember(orgId, session.user.id)
  if (!currentMember) redirect("/dashboard")

  const [members, pending] = await Promise.all([
    getOrganizationMembers(orgId),
    getPendingInvitations(orgId),
  ])
  const canManage = currentMember.role === "owner" || currentMember.role === "admin"

  const revStamp = new Date()
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase()

  return (
    <PageShell>
      <TitleBlock
        coordinate="02 / Organisation · Team"
        title="Team"
        subtitle="Team Accounts — the logins that can sign in to this organization. Distinct from Posts and Employee Particles, which model who holds what role on the org chart."
        meta={
          <div
            className="space-y-1 text-right"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              color: "var(--bp-text-secondary)",
              textTransform: "uppercase",
            }}
          >
            <div>
              <span style={{ color: "var(--bp-text-disabled)" }}>Active</span>{" "}
              <span style={{ color: "var(--bp-text-primary)" }}>·</span>{" "}
              <span style={{ color: "var(--bp-text-primary)", fontWeight: 600 }}>
                {String(members.length)}
              </span>
            </div>
            <div style={{ color: "var(--bp-text-disabled)" }}>Rev · {revStamp}</div>
          </div>
        }
      />

      {/* Conceptual framing card — what's a Team Account vs an Employee Particle */}
      <div className="mt-10">
        <RegCard state="new" className="!px-5 !py-4">
          <div className="flex items-start gap-4">
            <Network
              className="mt-1 size-4 shrink-0 text-[var(--bp-accent-steel-soft)]"
              strokeWidth={1.5}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: "var(--bp-accent-steel-soft)",
                  textTransform: "uppercase",
                }}
              >
                Team Account ≠ Employee Particle
              </p>
              <p
                className="mt-1.5 max-w-[68ch]"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--bp-text-secondary)",
                  lineHeight: 1.55,
                }}
              >
                A <strong>Team Account</strong> here is a login — someone who signs in to Pathway.
                An <strong>Employee Particle</strong> is the org-chart record of a role-holder. The
                two link via a Post assignment. Manage the seats here; manage who holds what Post in{" "}
                <Link
                  href="/organization/structure"
                  className="underline transition-colors hover:text-[var(--bp-text-primary)]"
                  style={{ color: "var(--bp-text-primary)" }}
                >
                  Structure
                </Link>
                .
              </p>
            </div>
          </div>
        </RegCard>
      </div>

      {/* Invite form */}
      {canManage && (
        <section className="mt-12 space-y-4">
          <SectionDivider label="Fig · 01 / Invite a Team Account" />
          <RegCard state="queued" className="!px-5 !py-5">
            <TeamInviteForm />
          </RegCard>
        </section>
      )}

      {/* Active members */}
      <section className="mt-12 space-y-4">
        <SectionDivider label="Fig · 02 / Active Team Accounts" count={members.length} />
        {members.length === 0 ? (
          <RegCard state="new" className="px-12 py-10 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "var(--bp-text-muted)",
                textTransform: "uppercase",
              }}
            >
              No active members yet
            </p>
          </RegCard>
        ) : (
          <TeamMembersList
            members={members.map((m) => ({
              id: m.id,
              role: m.role,
              user: { id: m.user.id, name: m.user.name, email: m.user.email },
            }))}
            currentUserId={session.user.id}
            currentUserRole={currentMember.role}
          />
        )}
      </section>

      {/* Pending invitations */}
      {pending.length > 0 && (
        <section className="mt-12 space-y-4">
          <SectionDivider
            label="Fig · 03 / Pending Invitations"
            count={pending.length}
            variant="accent"
          />
          <TeamPendingList
            invitations={pending.map((i) => ({
              id: i.id,
              email: i.email,
              role: i.role ?? "member",
            }))}
          />
        </section>
      )}
    </PageShell>
  )
}
