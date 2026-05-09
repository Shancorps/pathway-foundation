import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Plus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSession } from "@/modules/auth/session"
import {
  getParticleType,
  listParticlesForType,
  listParticlesWithTypeForOrg,
} from "@/modules/particles/queries"
import { InstanceList } from "@/modules/particles/ui/instance-list"

export default async function ParticleInstanceListPage({
  params,
}: {
  params: Promise<{ typeId: string }>
}) {
  const { typeId } = await params
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const [type, instances, allOrgParticles] = await Promise.all([
    getParticleType(orgId, typeId),
    listParticlesForType(orgId, typeId),
    listParticlesWithTypeForOrg(orgId),
  ])
  if (!type) notFound()
  const parentMap = new Map(allOrgParticles.map((p) => [p.id, p.name]))

  // Show up to the first 3 fields as preview columns.
  const previewKeys = type.fields
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(0, 3)
    .map((f) => ({ key: f.key, label: f.label }))

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
            Particles &gt; {type.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{type.name}</h1>
          {type.description && (
            <p className="text-sm text-[var(--color-muted-foreground)]">{type.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/particles/${type.id}/edit`}>
            <Button variant="outline">
              <Settings className="size-4" />
              Edit Type
            </Button>
          </Link>
          <Link href={`/particles/${type.id}/new`}>
            <Button>
              <Plus className="size-4" />
              New {type.name}
            </Button>
          </Link>
        </div>
      </div>

      <InstanceList
        typeId={type.id}
        previewKeys={previewKeys}
        particles={instances.map((p) => ({
          id: p.id,
          name: p.name,
          data: p.data,
          createdAt: p.createdAt.toISOString(),
          parentName: p.parentParticleId ? (parentMap.get(p.parentParticleId) ?? null) : null,
        }))}
      />
    </div>
  )
}
