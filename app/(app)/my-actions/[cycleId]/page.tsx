import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageShell } from "@/components/ui/page-shell"
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
    <PageShell>
      <div className="mb-6">
        <Link
          href="/my-actions"
          className="inline-flex items-center gap-2 text-[#888] transition-colors hover:text-[#0F0F0F]"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <ArrowLeft className="size-3" strokeWidth={2} />
          Back to My Actions
        </Link>
      </div>

      <CycleDetail
        cycle={row.cycle}
        particleName={row.particleName}
        railName={row.railName}
        railRunId={row.cycle.railRunId}
        postTitle={row.postTitle}
      />
    </PageShell>
  )
}
