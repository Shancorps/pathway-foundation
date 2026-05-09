import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PageShell } from "@/components/ui/page-shell"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import { TitleBlock } from "@/components/ui/title-block"
import { type AuditRange, listAuditActors, listAuditLog } from "@/modules/audit/queries"
import { AuditLogRow } from "@/modules/audit/ui/audit-row"
import { getSession } from "@/modules/auth/session"
import { getCurrentMember } from "@/modules/org/queries"

const PAGE_SIZE = 50
const VALID_RANGES = new Set<AuditRange>(["24h", "7d", "30d", "all"])
const RANGE_LABELS: Record<AuditRange, string> = {
  "24h": "Last 24h",
  "7d": "Last 7d",
  "30d": "Last 30d",
  all: "All time",
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const currentMember = await getCurrentMember(orgId, session.user.id)
  if (!currentMember) redirect("/dashboard")
  if (currentMember.role !== "owner" && currentMember.role !== "admin") {
    redirect("/settings/organization")
  }

  const sp = await searchParams
  const range = readRange(sp.range) ?? "7d"
  const actor = readSingle(sp.actor)
  const prefix = readSingle(sp.prefix)
  const page = Math.max(1, parseIntOr(readSingle(sp.page), 1))

  const [pageResult, actors] = await Promise.all([
    listAuditLog(orgId, {
      range,
      actorUserId: actor,
      actionPrefix: prefix,
      page,
      pageSize: PAGE_SIZE,
    }),
    listAuditActors(orgId, range),
  ])
  const totalPages = Math.max(1, Math.ceil(pageResult.total / PAGE_SIZE))
  const hasFilter = actor !== null || (prefix !== null && prefix.length > 0) || range !== "7d"

  function buildHref(next: {
    range?: AuditRange
    actor?: string | null
    prefix?: string | null
    page?: number
  }): string {
    const r = next.range ?? range
    const a = next.actor === undefined ? actor : next.actor
    const p = next.prefix === undefined ? prefix : next.prefix
    const pg = next.page ?? 1
    const params = new URLSearchParams()
    if (r !== "7d") params.set("range", r)
    if (a) params.set("actor", a)
    if (p) params.set("prefix", p)
    if (pg !== 1) params.set("page", String(pg))
    const qs = params.toString()
    return `/settings/organization/audit${qs ? `?${qs}` : ""}`
  }

  return (
    <PageShell>
      <TitleBlock
        coordinate="04 / Admin · Audit"
        title="Audit Log"
        subtitle="Every state-changing action in the org gets a row here. Use it to answer 'who did what, when, and from where.'"
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
              <span style={{ color: "#AAA" }}>Total in window</span>{" "}
              <span style={{ color: "#0F0F0F" }}>·</span>{" "}
              <span style={{ color: "#0F0F0F", fontWeight: 600 }}>{String(pageResult.total)}</span>
            </div>
            <div style={{ color: "#AAA" }}>{RANGE_LABELS[range]}</div>
          </div>
        }
      />

      {/* Filter strip */}
      <section className="mt-10 space-y-4">
        <SectionDivider label="Fig · 01 / Filter" />
        <RegCard state="queued" className="space-y-4 !px-5 !py-5">
          {/* Range chips */}
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(RANGE_LABELS) as AuditRange[]).map((r) => {
              const active = r === range
              return (
                <Link
                  key={r}
                  href={buildHref({ range: r })}
                  className={
                    active
                      ? "border border-[#E8711A] bg-[#E8711A] text-white"
                      : "border border-[#D4D4D4] bg-white text-[#0F0F0F] hover:border-[#0F0F0F]"
                  }
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    padding: "6px 12px",
                    transition: "border-color 120ms, background-color 120ms",
                  }}
                >
                  {RANGE_LABELS[r]}
                </Link>
              )
            })}
          </div>

          {/* Actor + action filters */}
          <form
            className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_2fr_auto] md:items-end"
            action="/settings/organization/audit"
          >
            {/* Persist range across the form-submitted filters */}
            <input type="hidden" name="range" value={range === "7d" ? "" : range} />
            <FilterField label="Actor">
              <select name="actor" defaultValue={actor ?? ""} style={INPUT_STYLE}>
                <option value="">All actors</option>
                {actors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.email}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Action prefix">
              <input
                type="text"
                name="prefix"
                defaultValue={prefix ?? ""}
                placeholder="e.g. items., rail_runs.cycle_completed"
                style={INPUT_STYLE}
              />
            </FilterField>
            <div className="flex gap-2">
              <button
                type="submit"
                className="border border-[#0F0F0F] bg-[#E8711A] px-4 py-2 text-white transition-colors hover:bg-[#D6610F]"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Apply
              </button>
              {hasFilter && (
                <Link
                  href="/settings/organization/audit"
                  className="border border-[#D4D4D4] bg-white px-4 py-2 transition-colors hover:border-[#0F0F0F]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    color: "#0F0F0F",
                    textTransform: "uppercase",
                  }}
                >
                  Reset
                </Link>
              )}
            </div>
          </form>
        </RegCard>
      </section>

      {/* Log */}
      <section className="mt-12 space-y-4">
        <SectionDivider
          label="Fig · 02 / Activity"
          count={`${String((page - 1) * PAGE_SIZE + 1)}–${String(
            Math.min(page * PAGE_SIZE, pageResult.total),
          )} / ${String(pageResult.total)}`}
        />
        {pageResult.rows.length === 0 ? (
          <RegCard state="new" className="px-12 py-10 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              No activity in this window
            </p>
          </RegCard>
        ) : (
          <RegCard state="queued" className="!p-0">
            <ul>
              {pageResult.rows.map((row) => (
                <AuditLogRow key={row.id} row={row} />
              ))}
            </ul>
          </RegCard>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.14em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              Page {String(page)} of {String(totalPages)}
            </p>
            <div className="flex items-center gap-2">
              <PaginatorLink
                disabled={page <= 1}
                href={buildHref({ page: page - 1 })}
                ariaLabel="Previous page"
              >
                <ChevronLeft className="size-3.5" strokeWidth={2} />
              </PaginatorLink>
              <PaginatorLink
                disabled={page >= totalPages}
                href={buildHref({ page: page + 1 })}
                ariaLabel="Next page"
              >
                <ChevronRight className="size-3.5" strokeWidth={2} />
              </PaginatorLink>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "#0F0F0F",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function PaginatorLink({
  disabled,
  href,
  ariaLabel,
  children,
}: {
  disabled: boolean
  href: string
  ariaLabel: string
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="inline-flex cursor-not-allowed items-center justify-center border border-[#D4D4D4] bg-white p-2 opacity-40"
        aria-label={ariaLabel}
      >
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center border border-[#0F0F0F] bg-white p-2 transition-colors hover:bg-[#FAFAFA]"
    >
      {children}
    </Link>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: "#0F0F0F",
  border: "1px solid #D4D4D4",
  backgroundColor: "#fff",
  padding: "8px 12px",
  width: "100%",
}

function readRange(v: string | string[] | undefined): AuditRange | null {
  const s = readSingle(v)
  return s !== null && VALID_RANGES.has(s as AuditRange) ? (s as AuditRange) : null
}

function readSingle(v: string | string[] | undefined): string | null {
  if (typeof v === "string" && v.length > 0) return v
  if (Array.isArray(v) && v[0]) return v[0]
  return null
}

function parseIntOr(v: string | null, fallback: number): number {
  if (v === null) return fallback
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}
