import "server-only"
import { and, desc, eq, gte, like, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { user } from "@/modules/auth/schema"
import { auditLog } from "./schema"

export type AuditRange = "24h" | "7d" | "30d" | "all"

export interface AuditListOptions {
  /** Time window for createdAt. Default: 7d. */
  range?: AuditRange
  /** Optional exact actor user id. */
  actorUserId?: string | null
  /** Optional case-insensitive prefix on action (e.g. "items." or "rail_runs"). */
  actionPrefix?: string | null
  page: number
  pageSize: number
}

export interface AuditRow {
  id: string
  action: string
  resourceType: string | null
  resourceId: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  actorUserId: string | null
  actorName: string | null
  actorEmail: string | null
}

export interface AuditPage {
  rows: AuditRow[]
  total: number
  page: number
  pageSize: number
}

const RANGE_TO_DAYS: Record<AuditRange, number | null> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  all: null,
}

export async function listAuditLog(orgId: string, opts: AuditListOptions): Promise<AuditPage> {
  const range = opts.range ?? "7d"
  const days = RANGE_TO_DAYS[range]
  const conditions = [eq(auditLog.organizationId, orgId)]
  if (days !== null) {
    const lowerBound = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    conditions.push(gte(auditLog.createdAt, lowerBound))
  }
  if (opts.actorUserId) {
    conditions.push(eq(auditLog.actorUserId, opts.actorUserId))
  }
  if (opts.actionPrefix && opts.actionPrefix.trim().length > 0) {
    // Case-insensitive prefix match. Audit actions are namespaced
    // ("items.created", "rail_runs.cycle_completed", …) so prefix matching
    // gives a useful "type filter" without dragging in full-text infra.
    conditions.push(like(auditLog.action, `${opts.actionPrefix.trim().toLowerCase()}%`))
  }
  const where = and(...conditions)

  const offset = (opts.page - 1) * opts.pageSize
  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        resourceType: auditLog.resourceType,
        resourceId: auditLog.resourceId,
        metadata: auditLog.metadata,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        createdAt: auditLog.createdAt,
        actorUserId: auditLog.actorUserId,
        actorName: user.name,
        actorEmail: user.email,
      })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorUserId))
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(opts.pageSize)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(where),
  ])

  return {
    rows,
    total: totalRow[0]?.n ?? 0,
    page: opts.page,
    pageSize: opts.pageSize,
  }
}

/**
 * Build the actor dropdown — every user that has at least one audit row in
 * the requested time window. Cheap query (org-bounded, indexed) and bounds the
 * filter to "actually relevant" actors.
 */
export async function listAuditActors(
  orgId: string,
  range: AuditRange,
): Promise<{ id: string; name: string; email: string }[]> {
  const days = RANGE_TO_DAYS[range]
  const conditions = [eq(auditLog.organizationId, orgId)]
  if (days !== null) {
    const lowerBound = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    conditions.push(gte(auditLog.createdAt, lowerBound))
  }
  const where = and(...conditions)
  const rows = await db
    .selectDistinct({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(auditLog)
    .innerJoin(user, eq(user.id, auditLog.actorUserId))
    .where(where)
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}
