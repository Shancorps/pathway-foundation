import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageShell } from "@/components/ui/page-shell"
import { getSession } from "@/modules/auth/session"
import { ensureRailRunManifestRows, getRailRunManifests } from "@/modules/manifests/queries"
import { CycleManifestPanel } from "@/modules/manifests/ui/cycle-manifest-panel"
import { getCycleForUser, listLoopBackTargetsForCycle } from "@/modules/rail-runs/queries"
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
  const loopBackTargets = await listLoopBackTargetsForCycle(orgId, session.user.id, cycleId)

  // Manifests: lazy-ensure run rows exist (covers manifests attached after
  // the run started), then load with templates joined for one-shot render.
  await ensureRailRunManifestRows(row.cycle.railRunId)
  const manifestRows = await getRailRunManifests(orgId, row.cycle.railRunId)
  const requiredForCycle = row.sourceNodeRequiredManifestFieldSlugs

  return (
    <PageShell>
      <div className="mb-6">
        <Link
          href="/my-actions"
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
          Back to My Actions
        </Link>
      </div>

      <CycleDetail
        cycle={row.cycle}
        particleName={row.particleName}
        railName={row.railName}
        railRunId={row.cycle.railRunId}
        postTitle={row.postTitle}
        loopBackInitiatorName={row.loopBackInitiatorName}
        loopBackTargets={loopBackTargets}
        activeLoopBack={row.activeLoopBack}
        sourceNodeType={row.sourceNodeType}
        approvalMode={row.sourceNodeConfig.kind === "approval" ? row.sourceNodeConfig.mode : null}
      />

      <div className="mt-6">
        <CycleManifestPanel
          railRunId={row.cycle.railRunId}
          rows={manifestRows}
          requiredForCycle={requiredForCycle}
        />
      </div>
    </PageShell>
  )
}
