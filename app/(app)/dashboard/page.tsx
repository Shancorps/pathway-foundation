import Link from "next/link"
import { redirect } from "next/navigation"
import { PageShell } from "@/components/ui/page-shell"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { listPostsHeldByUser } from "@/modules/org-structure/queries"
import { listParticleTypes } from "@/modules/particles/queries"
import { listRailsForOrg } from "@/modules/rails/queries"
import { countMyActionCycles } from "@/modules/rail-runs/queries"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const [openCycleCount, postsHeld, types, rails] = await Promise.all([
    countMyActionCycles(orgId, session.user.id),
    listPostsHeldByUser(orgId, session.user.id),
    listParticleTypes(orgId),
    listRailsForOrg(orgId),
  ])
  const publishedCount = rails.filter((r) => r.status === "published").length

  const revStamp = new Date()
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase()

  return (
    <PageShell>
      <TitleBlock
        coordinate="00 / Workspace"
        title={`Welcome, ${session.user.name.split(" ")[0] ?? "there"}`}
        subtitle="System status. Open work, structure, and configuration at a glance."
        meta={
          <div
            className="text-right"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              color: "#666",
              textTransform: "uppercase",
            }}
          >
            Rev · {revStamp}
          </div>
        }
      />

      <div className="mt-10 space-y-8">
        <section className="space-y-4">
          <SectionDivider label="Fig · 01 / Status" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StatusTile
              label="Open Cycles"
              value={openCycleCount}
              accent={openCycleCount > 0}
              href="/my-actions"
            />
            <StatusTile
              label="Posts Held"
              value={postsHeld.length}
              href="/organization/structure"
            />
            <StatusTile
              label="Published Rails"
              value={publishedCount}
              accent={publishedCount > 0}
              href="/rails"
            />
            <StatusTile label="Particle Types" value={types.length} href="/particles" />
          </div>
        </section>

        <section className="space-y-4">
          <SectionDivider label="Fig · 02 / Quick Routes" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <RouteCard
              coordinate="01"
              title="My Actions"
              description="Review your open cycles and complete work."
              href="/my-actions"
            />
            <RouteCard
              coordinate="02"
              title="Org Structure"
              description="Map containers and Posts. Posts become Terminals."
              href="/organization/structure"
            />
            <RouteCard
              coordinate="03"
              title="Particles"
              description="Define what entities your business tracks."
              href="/particles"
            />
            <RouteCard
              coordinate="04"
              title="Rails"
              description="Design how Particles flow through Terminals."
              href="/rails"
            />
          </div>
        </section>
      </div>
    </PageShell>
  )
}

function StatusTile({
  label,
  value,
  accent = false,
  href,
}: {
  label: string
  value: number
  accent?: boolean
  href: string
}) {
  return (
    <Link href={href} className="block">
      <RegCard state={accent ? "active" : "queued"} className="min-w-0">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.2em",
            color: "#888",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
        <p
          className="mt-3"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 36,
            fontWeight: 600,
            color: accent ? "#E8711A" : "#0F0F0F",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {String(value)}
        </p>
      </RegCard>
    </Link>
  )
}

function RouteCard({
  coordinate,
  title,
  description,
  href,
}: {
  coordinate: string
  title: string
  description: string
  href: string
}) {
  return (
    <Link href={href} className="block">
      <RegCard state="queued" className="transition-[background-color]">
        <div className="flex items-start justify-between">
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.2em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              {coordinate} · Section
            </p>
            <h3
              className="mt-2"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 18,
                fontWeight: 600,
                color: "#0F0F0F",
                lineHeight: 1.2,
              }}
            >
              {title}
            </h3>
            <p
              className="mt-2 max-w-[40ch]"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "#666",
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          </div>
          <span
            aria-hidden
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              color: "#AAA",
            }}
          >
            →
          </span>
        </div>
      </RegCard>
    </Link>
  )
}
