import { notFound, redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { listContainersForOrg, listPostsForOrg } from "@/modules/org-structure/queries"
import { getParticleType } from "@/modules/particles/queries"
import { countRunningRunsForRail, getRailWithNodes } from "@/modules/rails/queries"
import { RailEditor } from "@/modules/rails/ui/rail-editor"

export default async function RailEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const railWithNodes = await getRailWithNodes(orgId, id)
  if (!railWithNodes) notFound()

  const [posts, containers, particleType, runningRunCount] = await Promise.all([
    listPostsForOrg(orgId),
    listContainersForOrg(orgId),
    getParticleType(orgId, railWithNodes.rail.particleTypeId),
    countRunningRunsForRail(orgId, railWithNodes.rail.id),
  ])
  const containerById = new Map(containers.map((c) => [c.id, c.name]))

  // No PageShell — the rail builder is a full-width n8n-style canvas surface
  // (top bar + palette + canvas) and owns its own viewport math.
  return (
    <RailEditor
      rail={railWithNodes.rail}
      nodes={railWithNodes.nodes}
      particleTypeName={particleType?.name ?? null}
      runningRunCount={runningRunCount}
      posts={posts.map((p) => ({
        id: p.id,
        title: p.title,
        containerLabel: p.parentContainerId
          ? (containerById.get(p.parentContainerId) ?? null)
          : null,
        vacant: p.assignedUsers.length === 0,
      }))}
    />
  )
}
