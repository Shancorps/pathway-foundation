import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import {
  getParticle,
  getParticleType,
  listParticlesWithTypeForOrg,
} from "@/modules/particles/queries"
import { ParticleForm } from "@/modules/particles/ui/particle-form"

export default async function EditParticlePage({
  params,
}: {
  params: Promise<{ typeId: string; id: string }>
}) {
  const { typeId, id } = await params
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const [type, particle, allParticles] = await Promise.all([
    getParticleType(orgId, typeId),
    getParticle(orgId, id),
    listParticlesWithTypeForOrg(orgId),
  ])
  if (!type || particle?.particleTypeId !== type.id) notFound()
  const parentCandidates = allParticles
    .filter((p) => p.id !== particle.id)
    .map((p) => ({ id: p.id, name: p.name, typeName: p.typeName }))

  return (
    <PageShell>
      <div className="mb-6">
        <Link
          href={`/particles/${type.id}`}
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
          Back
        </Link>
      </div>

      <TitleBlock
        coordinate={`03 / Particles · ${type.name}`}
        title={`Edit ${particle.name}`}
        subtitle={`Update this ${type.name} instance.`}
      />

      <div className="mt-10">
        <ParticleForm
          type={type}
          initial={{
            id: particle.id,
            name: particle.name,
            data: particle.data,
            parentParticleId: particle.parentParticleId,
          }}
          parentCandidates={parentCandidates}
        />
      </div>
    </PageShell>
  )
}
