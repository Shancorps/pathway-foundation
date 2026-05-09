import { redirect } from "next/navigation"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
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

  const totalPosts = posts.length
  const totalContainers = containers.length

  return (
    <PageShell>
      <TitleBlock
        coordinate="02 / Organisation"
        title="Structure"
        subtitle="Map team relationships and ownership. Posts on this chart become Terminals — work routes through them."
        meta={
          <div
            className="space-y-1 text-right"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              color: "#666",
              textTransform: "uppercase",
            }}
          >
            <div>
              <span style={{ color: "#AAA" }}>Containers</span>{" "}
              <span style={{ color: "#0F0F0F" }}>·</span>{" "}
              <span style={{ color: "#0F0F0F", fontWeight: 600 }}>{String(totalContainers)}</span>
            </div>
            <div>
              <span style={{ color: "#AAA" }}>Posts</span>{" "}
              <span style={{ color: "#0F0F0F" }}>·</span>{" "}
              <span style={{ color: "#0F0F0F", fontWeight: 600 }}>{String(totalPosts)}</span>
            </div>
          </div>
        }
      />

      <div className="mt-10">
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
    </PageShell>
  )
}
