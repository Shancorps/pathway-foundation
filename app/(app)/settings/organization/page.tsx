import Link from "next/link"
import { redirect } from "next/navigation"
import { Activity, Trash2 } from "lucide-react"
import { getSession } from "@/modules/auth/session"
import { getCurrentMember, getOrganizationById } from "@/modules/org/queries"
import { OrganizationSettingsForm } from "@/modules/org/ui/organization-settings-form"

export default async function OrganizationSettingsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const [org, currentMember] = await Promise.all([
    getOrganizationById(orgId),
    getCurrentMember(orgId, session.user.id),
  ])
  if (!org) redirect("/onboarding/create-organization")
  const isAdmin = currentMember?.role === "owner" || currentMember?.role === "admin"

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Organization</h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Update your organization details.
      </p>
      <div className="mt-6">
        <OrganizationSettingsForm orgId={org.id} defaultName={org.name} />
      </div>

      {isAdmin && (
        <section className="mt-10 space-y-2">
          <h2 className="text-sm font-medium tracking-widest text-[var(--color-muted-foreground)] uppercase">
            Admin tools
          </h2>
          <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
            <li>
              <Link
                href="/settings/organization/audit"
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bp-surface-card-queued)]"
              >
                <Activity
                  className="size-4 text-[var(--color-muted-foreground)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span className="flex-1 text-sm">
                  <span className="block font-medium">Audit log</span>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    Every state-changing action in this org
                  </span>
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)]">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/settings/organization/danger"
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bp-surface-card-queued)]"
              >
                <Trash2
                  className="size-4 text-[var(--color-muted-foreground)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span className="flex-1 text-sm">
                  <span className="block font-medium">Danger zone</span>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    Delete the organization and all its data
                  </span>
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)]">→</span>
              </Link>
            </li>
          </ul>
        </section>
      )}
    </main>
  )
}
