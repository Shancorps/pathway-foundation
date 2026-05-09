import { describe, expect, it } from "vitest"
import { and, eq, isNull } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { withTestDb } from "../helpers/db"
import { createOrganization, createUser } from "../helpers/factories"
import { dataPoints, statistics } from "@/modules/statistics/schema"

describe("statistics module — db-level invariants", () => {
  it("scopes statistics to a single organization", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgA = await createOrganization(db, userId)
      const orgB = await createOrganization(db, userId)

      await db.insert(statistics).values({
        id: createId(),
        organizationId: orgA,
        name: "Gross Sales",
        unit: "$",
        frequency: "weekly",
        dayOfWeek: 1,
        color: "orange",
      })
      await db.insert(statistics).values({
        id: createId(),
        organizationId: orgB,
        name: "Inspections Passed",
        frequency: "daily",
        color: "steel",
      })

      const inA = await db
        .select()
        .from(statistics)
        .where(and(eq(statistics.organizationId, orgA), isNull(statistics.deletedAt)))
      const inB = await db
        .select()
        .from(statistics)
        .where(and(eq(statistics.organizationId, orgB), isNull(statistics.deletedAt)))
      expect(inA.map((s) => s.name)).toEqual(["Gross Sales"])
      expect(inB.map((s) => s.name)).toEqual(["Inspections Passed"])
    })
  })

  it("data points cascade soft-delete with their parent statistic", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const statId = createId()
      await db.insert(statistics).values({
        id: statId,
        organizationId: orgId,
        name: "Leads Captured",
        frequency: "daily",
        color: "graphite",
      })
      const points = Array.from({ length: 3 }).map((_, i) => ({
        id: createId(),
        organizationId: orgId,
        statisticId: statId,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        value: 10 + i,
        source: "manual" as const,
      }))
      await db.insert(dataPoints).values(points)

      // Simulate the deleteStatistic action: mark stat + its points soft-deleted.
      const now = new Date()
      await db
        .update(statistics)
        .set({ deletedAt: now, deletedBy: userId })
        .where(eq(statistics.id, statId))
      await db
        .update(dataPoints)
        .set({ deletedAt: now, deletedBy: userId })
        .where(and(eq(dataPoints.statisticId, statId), isNull(dataPoints.deletedAt)))

      // Both queries should now exclude these rows when filtering on deletedAt.
      const liveStats = await db
        .select({ id: statistics.id })
        .from(statistics)
        .where(and(eq(statistics.organizationId, orgId), isNull(statistics.deletedAt)))
      const livePoints = await db
        .select({ id: dataPoints.id })
        .from(dataPoints)
        .where(and(eq(dataPoints.organizationId, orgId), isNull(dataPoints.deletedAt)))

      expect(liveStats).toHaveLength(0)
      expect(livePoints).toHaveLength(0)
    })
  })

  it("FK on data_points.statistic_id is RESTRICT — can't hard-delete a stat with points", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const statId = createId()
      await db.insert(statistics).values({
        id: statId,
        organizationId: orgId,
        name: "Defects Found",
        frequency: "daily",
        color: "wine",
        lowerIsBetter: true,
      })
      await db.insert(dataPoints).values({
        id: createId(),
        organizationId: orgId,
        statisticId: statId,
        date: new Date(),
        value: 3,
        source: "manual",
      })

      await expect(db.delete(statistics).where(eq(statistics.id, statId))).rejects.toThrow()
    })
  })

  it("storing 'last day of month' as 0 round-trips correctly", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const id = createId()
      await db.insert(statistics).values({
        id,
        organizationId: orgId,
        name: "Monthly Close",
        frequency: "monthly",
        dayOfMonth: 0, // sentinel for "last day of month"
        color: "ochre",
      })

      const [row] = await db.select().from(statistics).where(eq(statistics.id, id))
      expect(row?.frequency).toBe("monthly")
      expect(row?.dayOfMonth).toBe(0)
    })
  })
})
