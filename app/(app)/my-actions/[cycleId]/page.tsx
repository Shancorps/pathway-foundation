import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSession } from "@/modules/auth/session"
import { getCycleForUser } from "@/modules/rail-runs/queries"
import { CycleDetail } from "@/modules/rail-runs/ui/cycle-detail"

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ cycleId: string }>
}) {
  const { cycleId } = await params
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const row = await getCycleForUser(orgId, session.user.id, cycleId)
  if (!row) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/my-actions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Back to My Actions
          </Button>
        </Link>
      </div>

      <CycleDetail
        cycle={row.cycle}
        particleName={row.particleName}
        railName={row.railName}
        railRunId={row.cycle.railRunId}
        postTitle={row.postTitle}
      />
    </div>
  )
}
