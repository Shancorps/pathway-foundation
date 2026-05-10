import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { getParticleType, listParticlesWithTypeForOrg } from "@/modules/particles/queries"
import { ParticleForm } from "@/modules/particles/ui/particle-form"

export default async function NewParticlePage({ params }: { params: Promise<{ typeId: string }> }) {
  const { typeId } = await params
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const [type, parentCandidates] = await Promise.all([
    getParticleType(orgId, typeId),
    listParticlesWithTypeForOrg(orgId),
  ])
  if (!type) notFound()

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
        title={`New ${type.name}`}
        subtitle={`Create a new ${type.name} instance to flow through Rails.`}
      />

      <div className="mt-10">
        <ParticleForm
          type={type}
          parentCandidates={parentCandidates.map((p) => ({
            id: p.id,
            name: p.name,
            typeName: p.typeName,
          }))}
        />
      </div>
    </PageShell>
  )
}
