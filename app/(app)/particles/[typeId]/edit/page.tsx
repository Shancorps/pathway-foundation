import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <div className="space-y-6">
      <div>
        <Link href={`/particles/${type.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Back to {type.name}
          </Button>
        </Link>
      </div>
      <div>
        <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
          Particles &gt; {type.name} &gt; Edit
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Edit {type.name}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Configure this type&rsquo;s fields. Each field becomes part of the form for new instances.
        </p>
      </div>
      <TypeEditor type={type} />
    </div>
  )
}
