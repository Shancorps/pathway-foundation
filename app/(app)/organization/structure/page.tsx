import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getOrganizationMembers } from "@/modules/org/queries"
import { listContainersForOrg, listPostsForOrg } from "@/modules/org-structure/queries"
import { StructureTree } from "@/modules/org-structure/ui/structure-tree"

export default async function StructurePage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const [containers, posts, members] = await Promise.all([
    listContainersForOrg(orgId),
    listPostsForOrg(orgId),
    getOrganizationMembers(orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
          Organization
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Structure</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Map team relationships and ownership.
        </p>
      </div>

      <StructureTree
        containers={containers}
        posts={posts.map((p) => ({
          id: p.id,
          organizationId: p.organizationId,
          title: p.title,
          description: p.description,
          vfp: p.vfp,
          parentContainerId: p.parentContainerId,
          isSenior: p.isSenior,
          isAreaManager: p.isAreaManager,
          position: p.position,
          createdAt: p.createdAt.toISOString(),
          deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
          assignedUsers: p.assignedUsers,
        }))}
        members={members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
        }))}
      />
    </div>
  )
}
