import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSession } from "@/modules/auth/session"
import { getParticle, getParticleType } from "@/modules/particles/queries"
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

  const [type, particle] = await Promise.all([
    getParticleType(orgId, typeId),
    getParticle(orgId, id),
  ])
  if (!type || particle?.particleTypeId !== type.id) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/particles/${type.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </Link>
      </div>
      <div>
        <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
          Particles &gt; {type.name} &gt; {particle.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Edit {particle.name}</h1>
      </div>
      <ParticleForm
        type={type}
        initial={{ id: particle.id, name: particle.name, data: particle.data }}
      />
    </div>
  )
}
