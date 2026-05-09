import { redirect } from "next/navigation"
import { headers } from "next/headers"
import type { ReactNode } from "react"
import { auth } from "@/lib/auth"
import { getSession } from "@/modules/auth/session"
import { getCurrentMember, getUserOrganizations } from "@/modules/org/queries"
import { AppSidebar } from "@/modules/org/ui/app-sidebar"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const organizations = await getUserOrganizations(session.user.id)
  let activeOrgId = session.session.activeOrganizationId

  // After sign-out + sign-in, Better Auth doesn't restore the previous active
  // organization. If the user is a member of one, auto-set it so we don't
  // bounce them back to onboarding every login.
  if (!activeOrgId && organizations.length > 0) {
    const first = organizations[0]
    if (first) {
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: first.id },
      })
      activeOrgId = first.id
    }
  }

  if (!activeOrgId) {
    // No memberships — render shell-less so onboarding owns its UI.
    return <>{children}</>
  }

  // Pull the user's role in the active org so the sidebar can show "OWNER" / "ADMIN" etc.
  const member = await getCurrentMember(activeOrgId, session.user.id)

  return (
    <div className="flex h-screen">
      <AppSidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          role: member?.role ? member.role.toUpperCase() : null,
        }}
        organizations={organizations.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))}
        activeOrgId={activeOrgId}
      />
      <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
    </div>
  )
}
