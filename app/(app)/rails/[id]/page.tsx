import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSession } from "@/modules/auth/session"
import { listContainersForOrg, listPostsForOrg } from "@/modules/org-structure/queries"
import { getParticleType } from "@/modules/particles/queries"
import { getRailWithNodes } from "@/modules/rails/queries"
import { RailEditor } from "@/modules/rails/ui/rail-editor"

export default async function RailEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const railWithNodes = await getRailWithNodes(orgId, id)
  if (!railWithNodes) notFound()

  const [posts, containers, particleType] = await Promise.all([
    listPostsForOrg(orgId),
    listContainersForOrg(orgId),
    getParticleType(orgId, railWithNodes.rail.particleTypeId),
  ])
  const containerById = new Map(containers.map((c) => [c.id, c.name]))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/rails">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Back to Rails
          </Button>
        </Link>
      </div>

      <RailEditor
        rail={railWithNodes.rail}
        nodes={railWithNodes.nodes}
        particleTypeName={particleType?.name ?? null}
        posts={posts.map((p) => ({
          id: p.id,
          title: p.title,
          containerLabel: p.parentContainerId
            ? (containerById.get(p.parentContainerId) ?? null)
            : null,
          vacant: p.assignedUsers.length === 0,
        }))}
      />
    </div>
  )
}
