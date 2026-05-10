import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { getParticleType } from "@/modules/particles/queries"
import { TypeEditor } from "@/modules/particles/ui/type-editor"

export default async function ParticleTypeEditPage({
  params,
}: {
  params: Promise<{ typeId: string }>
}) {
  const { typeId } = await params
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const type = await getParticleType(orgId, typeId)
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
          Back to {type.name}
        </Link>
      </div>

      <TitleBlock
        coordinate={`03 / Particles · Edit Type`}
        title={`Edit ${type.name}`}
        subtitle="Configure this type's fields. Each field becomes part of the form for new instances."
      />

      <div className="mt-10">
        <TypeEditor type={type} />
      </div>
    </PageShell>
  )
}
