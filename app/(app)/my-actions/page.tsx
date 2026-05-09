import { redirect } from "next/navigation"
import { BlueprintLink } from "@/components/ui/blueprint-button"
import { IdleRailIllustration } from "@/components/ui/idle-rail-illustration"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { listPostsHeldByUser } from "@/modules/org-structure/queries"
import { listMyActionCycles } from "@/modules/rail-runs/queries"
import { MyActionsList } from "@/modules/rail-runs/ui/my-actions-list"

export default async function MyActionsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const [cycles, postsHeld] = await Promise.all([
    listMyActionCycles(orgId, session.user.id),
    listPostsHeldByUser(orgId, session.user.id),
  ])

  const revStamp = new Date()
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase()

  return (
    <PageShell>
      <TitleBlock
        coordinate="01 / Workspace"
        title="My Actions"
        subtitle="What's in front of you right now. The only way out is through."
        meta={
          <div
            className="space-y-1 text-right"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              color: "#666",
              textTransform: "uppercase",
            }}
          >
            <div>
              <span style={{ color: "#AAA" }}>Posts Held</span>{" "}
              <span style={{ color: "#0F0F0F" }}>·</span>{" "}
              <span style={{ color: "#0F0F0F", fontWeight: 600 }}>{String(postsHeld.length)}</span>
            </div>
            <div style={{ color: "#AAA" }}>Rev · {revStamp}</div>
          </div>
        }
        action={
          <BlueprintLink href="/rails" variant="outline" particle>
            Start a Rail
          </BlueprintLink>
        }
      />

      <div className="mt-10">
        <MyActionsList
          cycles={cycles.map((c) => ({
            id: c.id,
            postId: c.postId,
            title: c.title,
            particleName: c.particleName,
            railName: c.railName,
            postTitle: c.postTitle,
            position: c.position,
            issuedAt: c.issuedAt.toISOString(),
            idealMinutes: c.idealMinutes,
            timeSpentMinutes: c.timeSpentMinutes,
            timerStartedAt: c.timerStartedAt ? c.timerStartedAt.toISOString() : null,
            checklistItems: c.checklistItems,
            isLoopBackCycle: c.loopBackOfCycleId !== null,
            hasActiveLoopBack: c.hasActiveLoopBack,
          }))}
          postsHeld={postsHeld.map((p) => ({ id: p.id, title: p.title }))}
          IdleEmptyState={<IdleRailIllustration width={480} />}
        />
      </div>
    </PageShell>
  )
}
