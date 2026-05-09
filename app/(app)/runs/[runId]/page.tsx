import { notFound, redirect } from "next/navigation"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { getRunTimeline } from "@/modules/rail-runs/queries"
import { BackToRailsLink, RunTimeline } from "@/modules/rail-runs/ui/run-timeline"

export default async function RunTimelinePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const timeline = await getRunTimeline(orgId, runId)
  if (!timeline) notFound()

  return (
    <PageShell>
      <div className="mb-6">
        <BackToRailsLink />
      </div>
      <TitleBlock
        coordinate="03 / Admin · Rail Activity"
        title="Run Audit"
        subtitle="The cycle-by-cycle history of this run — handler, timestamps, time spent, loop-backs. Reflects what actually happened end-to-end."
      />
      <div className="mt-10">
        <RunTimeline timeline={timeline} />
      </div>
    </PageShell>
  )
}
