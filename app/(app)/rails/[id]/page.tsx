import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageShell } from "@/components/ui/page-shell"
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
    <PageShell>
      <div className="mb-6">
        <Link
          href="/rails"
          className="inline-flex items-center gap-2 text-[#888] transition-colors hover:text-[#0F0F0F]"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <ArrowLeft className="size-3" strokeWidth={2} />
          Back to Rails
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
    </PageShell>
  )
}
