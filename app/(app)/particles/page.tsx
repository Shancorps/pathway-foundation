import { redirect } from "next/navigation"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { listParticleTypes, particleCountByType } from "@/modules/particles/queries"
import { TypesIndex } from "@/modules/particles/ui/types-index"

export default async function ParticlesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const [types, countsMap] = await Promise.all([
    listParticleTypes(orgId),
    particleCountByType(orgId),
  ])

  return (
    <PageShell>
      <TitleBlock
        coordinate="03 / Particles"
        title="Types"
        subtitle="Define what entities your business tracks. Rails route Particles through Terminals."
        meta={
          <div
            className="text-right"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              color: "#666",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "#AAA" }}>Defined</span>{" "}
            <span style={{ color: "#0F0F0F" }}>·</span>{" "}
            <span style={{ color: "#0F0F0F", fontWeight: 600 }}>{String(types.length)}</span>
          </div>
        }
      />

      <div className="mt-10">
        <TypesIndex
          types={types.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            fieldCount: t.fields.length,
            instanceCount: countsMap.get(t.id) ?? 0,
          }))}
        />
      </div>
    </PageShell>
  )
}
