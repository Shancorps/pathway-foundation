import { notFound, redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getRailManifests, listManifestsForOrg } from "@/modules/manifests/queries"
import { listContainersForOrg, listPostsForOrg } from "@/modules/org-structure/queries"
import { getParticleType } from "@/modules/particles/queries"
import { countRunningRunsForRail, getRailWithNodes, listRailsForOrg } from "@/modules/rails/queries"
import { RailEditor } from "@/modules/rails/ui/rail-editor"

export default async function RailEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const railWithNodes = await getRailWithNodes(orgId, id)
  if (!railWithNodes) notFound()

  const [
    posts,
    containers,
    particleType,
    runningRunCount,
    allRails,
    attachedManifests,
    allManifests,
  ] = await Promise.all([
    listPostsForOrg(orgId),
    listContainersForOrg(orgId),
    getParticleType(orgId, railWithNodes.rail.particleTypeId),
    countRunningRunsForRail(orgId, railWithNodes.rail.id),
    listRailsForOrg(orgId),
    getRailManifests(orgId, railWithNodes.rail.id),
    listManifestsForOrg(orgId),
  ])
  const containerById = new Map(containers.map((c) => [c.id, c.name]))
  const otherRails = allRails
    .filter((r) => r.id !== railWithNodes.rail.id)
    .map((r) => ({ id: r.id, name: r.name }))

  // No PageShell — the rail builder is a full-width n8n-style canvas surface
  // (top bar + palette + canvas) and owns its own viewport math.
  return (
    <RailEditor
      rail={railWithNodes.rail}
      nodes={railWithNodes.nodes}
      particleTypeName={particleType?.name ?? null}
      runningRunCount={runningRunCount}
      otherRails={otherRails}
      attachedManifests={attachedManifests}
      allManifests={allManifests}
      posts={posts.map((p) => ({
        id: p.id,
        title: p.title,
        containerLabel: p.parentContainerId
          ? (containerById.get(p.parentContainerId) ?? null)
          : null,
        vacant: p.assignedUsers.length === 0,
      }))}
      postsWithHolders={posts.map((p) => ({
        postId: p.id,
        postTitle: p.title,
        holders: p.assignedUsers.map((u) => ({ userId: u.id, userName: u.name })),
      }))}
    />
  )
}
