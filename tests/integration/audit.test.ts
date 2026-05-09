import { describe, expect, it } from "vitest"
import { and, desc, eq, gte, like } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { withTestDb } from "../helpers/db"
import { createOrganization, createUser } from "../helpers/factories"
import { auditLog } from "@/modules/audit/schema"

/**
 * Schema-level checks on audit_log: org scoping, action prefix filtering, and
 * the ON DELETE CASCADE / SET NULL FK behaviors that protect the table when
 * orgs / users get hard-deleted.
 */
describe("audit_log — query primitives", () => {
  it("scopes audit rows to a single organization", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgA = await createOrganization(db, userId)
      const orgB = await createOrganization(db, userId)

      await db.insert(auditLog).values([
        {
          id: createId(),
          organizationId: orgA,
          actorUserId: userId,
          action: "items.created",
        },
        {
          id: createId(),
          organizationId: orgB,
          actorUserId: userId,
          action: "rails.published",
        },
      ])

      const inA = await db.select().from(auditLog).where(eq(auditLog.organizationId, orgA))
      const inB = await db.select().from(auditLog).where(eq(auditLog.organizationId, orgB))
      expect(inA.map((r) => r.action)).toEqual(["items.created"])
      expect(inB.map((r) => r.action)).toEqual(["rails.published"])
    })
  })

  it("supports prefix filtering on the action column", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)
      await db.insert(auditLog).values([
        { id: createId(), organizationId: orgId, action: "items.created" },
        { id: createId(), organizationId: orgId, action: "items.updated" },
        { id: createId(), organizationId: orgId, action: "rails.published" },
        { id: createId(), organizationId: orgId, action: "rail_runs.cycle_completed" },
      ])

      const items = await db
        .select({ action: auditLog.action })
        .from(auditLog)
        .where(and(eq(auditLog.organizationId, orgId), like(auditLog.action, "items.%")))
      const railRuns = await db
        .select({ action: auditLog.action })
        .from(auditLog)
        .where(and(eq(auditLog.organizationId, orgId), like(auditLog.action, "rail_runs.%")))

      expect(items.map((r) => r.action).sort()).toEqual(["items.created", "items.updated"])
      expect(railRuns.map((r) => r.action)).toEqual(["rail_runs.cycle_completed"])
    })
  })

  it("orders by createdAt desc with a tight time window", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)
      const now = new Date()
      await db.insert(auditLog).values([
        {
          id: createId(),
          organizationId: orgId,
          actorUserId: userId,
          action: "old.event",
          createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30d ago
        },
        {
          id: createId(),
          organizationId: orgId,
          actorUserId: userId,
          action: "fresh.event",
          createdAt: new Date(now.getTime() - 60_000), // 1m ago
        },
      ])

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const recent = await db
        .select({ action: auditLog.action })
        .from(auditLog)
        .where(and(eq(auditLog.organizationId, orgId), gte(auditLog.createdAt, sevenDaysAgo)))
        .orderBy(desc(auditLog.createdAt))
      expect(recent.map((r) => r.action)).toEqual(["fresh.event"])
    })
  })

  it("audit row's actor_user_id is SET NULL when the user is hard-deleted", async () => {
    // Lets the audit trail survive even after a user purge — the row is kept
    // as "system / unknown actor" rather than orphaning a non-null FK.
    await withTestDb(async (db) => {
      const { user } = await import("@/modules/auth/schema")
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)
      const auditId = createId()
      await db.insert(auditLog).values({
        id: auditId,
        organizationId: orgId,
        actorUserId: userId,
        action: "items.created",
      })
      // Hard-delete the user (cleanup the membership FK first).
      const { member } = await import("@/modules/auth/schema")
      await db.delete(member).where(eq(member.userId, userId))
      await db.delete(user).where(eq(user.id, userId))
      const [row] = await db.select().from(auditLog).where(eq(auditLog.id, auditId))
      expect(row?.actorUserId).toBeNull()
      expect(row?.action).toBe("items.created")
    })
  })
})
