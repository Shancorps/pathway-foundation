import { redirect } from "next/navigation"
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Rails</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Define how Particles flow through Terminals.
        </p>
      </div>

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
  )
}
