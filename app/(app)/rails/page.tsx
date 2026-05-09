import { redirect } from "next/navigation"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { listParticlesForOrg, listParticleTypes } from "@/modules/particles/queries"
import { listRailsForOrg } from "@/modules/rails/queries"
import { RailsList } from "@/modules/rails/ui/rails-list"

export default async function RailsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const [rails, particleTypes, particles] = await Promise.all([
    listRailsForOrg(orgId),
    listParticleTypes(orgId),
    listParticlesForOrg(orgId),
  ])

  const publishedCount = rails.filter((r) => r.status === "published").length

  return (
    <PageShell>
      <TitleBlock
        coordinate="04 / Admin"
        title="Rails"
        subtitle="Define how Particles flow through Terminals."
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
              <span style={{ color: "#AAA" }}>Defined</span>{" "}
              <span style={{ color: "#0F0F0F" }}>·</span>{" "}
              <span style={{ color: "#0F0F0F", fontWeight: 600 }}>{String(rails.length)}</span>
            </div>
            <div>
              <span style={{ color: "#AAA" }}>Published</span>{" "}
              <span style={{ color: "#0F0F0F" }}>·</span>{" "}
              <span style={{ color: "#E8711A", fontWeight: 600 }}>{String(publishedCount)}</span>
            </div>
          </div>
        }
      />

      <div className="mt-10">
        <RailsList
          rails={rails.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            particleTypeId: r.particleTypeId,
            particleTypeName: r.particleTypeName,
            status: r.status,
          }))}
          particleTypes={particleTypes.map((pt) => ({ id: pt.id, name: pt.name }))}
          particles={particles.map((p) => ({
            id: p.id,
            name: p.name,
            particleTypeId: p.particleTypeId,
          }))}
        />
      </div>
    </PageShell>
  )
}
