import { redirect } from "next/navigation"
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
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
          Particles
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Types</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Define what entities your business tracks. Rails route Particles through Terminals.
        </p>
      </div>

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
  )
}
