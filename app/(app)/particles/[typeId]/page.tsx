import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { BlueprintLink } from "@/components/ui/blueprint-button"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
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

  const previewKeys = type.fields
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(0, 3)
    .map((f) => ({ key: f.key, label: f.label }))

  return (
    <PageShell>
      <div className="mb-6">
        <Link
          href="/particles"
          className="inline-flex items-center gap-2 text-[var(--bp-text-muted)] transition-colors hover:text-[var(--bp-text-primary)]"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <ArrowLeft className="size-3" strokeWidth={2} />
          Back to Types
        </Link>
      </div>

      <TitleBlock
        coordinate={`03 / Particles · ${type.name}`}
        title={type.name}
        subtitle={type.description ?? undefined}
        meta={
          <div
            className="text-right"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              color: "var(--bp-text-secondary)",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--bp-text-disabled)" }}>Instances</span>{" "}
            <span style={{ color: "var(--bp-text-primary)" }}>·</span>{" "}
            <span style={{ color: "var(--bp-text-primary)", fontWeight: 600 }}>
              {String(instances.length)}
            </span>
          </div>
        }
        action={
          <div className="flex gap-2">
            <BlueprintLink href={`/particles/${type.id}/edit`} variant="outline">
              Edit Type
            </BlueprintLink>
            <BlueprintLink href={`/particles/${type.id}/new`} variant="primary" particle>
              New {type.name}
            </BlueprintLink>
          </div>
        }
      />

      <div className="mt-10">
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
    </PageShell>
  )
}
