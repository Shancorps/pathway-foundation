import Link from "next/link"
import { redirect } from "next/navigation"
import { BlueprintLink } from "@/components/ui/blueprint-button"
import { PageShell } from "@/components/ui/page-shell"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { listItemsForOrg } from "@/modules/items/queries"

export default async function ItemsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const items = await listItemsForOrg(orgId)

  return (
    <PageShell>
      <TitleBlock
        coordinate="04 / Admin · Items (template)"
        title="Items"
        subtitle="Worked-example feature. Copy this module's pattern to add new features."
        action={
          <BlueprintLink href="/items/new" variant="primary" particle>
            New Item
          </BlueprintLink>
        }
      />

      <div className="mt-10 space-y-4">
        <SectionDivider label="Fig · 01 / Items" count={items.length} />
        {items.length === 0 ? (
          <RegCard state="new" className="px-10 py-12 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "var(--bp-text-muted)",
                textTransform: "uppercase",
              }}
            >
              No items yet
            </p>
            <p
              className="mx-auto mt-3 max-w-[42ch]"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--bp-text-secondary)",
                lineHeight: 1.55,
              }}
            >
              The items module is a worked example for new features. Create one to see the pattern.
            </p>
          </RegCard>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={`/items/${item.id}`} className="block">
                  <RegCard state="queued" className="px-4 py-3 transition-[background-color]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--bp-text-primary)",
                          }}
                        >
                          {item.name}
                        </p>
                        <p
                          className="mt-0.5"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            fontWeight: 500,
                            letterSpacing: "0.18em",
                            color: "var(--bp-text-muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.status}
                        </p>
                      </div>
                      <span
                        className="shrink-0"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--bp-text-disabled)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {item.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </RegCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
