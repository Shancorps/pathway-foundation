import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
            Workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold">My Actions</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            What&rsquo;s in front of you right now. The only way out is through.
          </p>
        </div>
        <Link href="/rails">
          <Button variant="outline">Start a Rail</Button>
        </Link>
      </div>

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
        }))}
        postsHeld={postsHeld.map((p) => ({ id: p.id, title: p.title }))}
      />
    </div>
  )
}
