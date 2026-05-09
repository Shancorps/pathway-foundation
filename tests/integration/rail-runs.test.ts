import { describe, expect, it } from "vitest"
import { and, asc, eq, isNull } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { withTestDb } from "../helpers/db"
import { createOrganization, createUser } from "../helpers/factories"
import { postAssignments, posts } from "@/modules/org-structure/schema"
import { particleTypes, particles } from "@/modules/particles/schema"
import { railNodes, rails } from "@/modules/rails/schema"
import { cycles, railRuns, type CycleChecklistItem } from "@/modules/rail-runs/schema"

/**
 * These tests model the conveyor-belt logic at the schema level: starting a
 * rail creates a run + first cycle; completing a cycle issues the next
 * one at the next post; multi-holder posts route to all assigned users.
 * The action layer's auth/transition logic is exercised by the UI flow;
 * here we lock in the data invariants.
 */

async function setupCarWashScenario(
  db: Parameters<typeof withTestDb>[0] extends (db: infer D) => unknown ? D : never,
) {
  const owner = await createUser(db)
  const washerUser = await createUser(db, { name: "Mike Washer" })
  const cashierUser = await createUser(db, { name: "Jane Cashier" })
  const cashierUser2 = await createUser(db, { name: "Bob Cashier (night shift)" })
  const orgId = await createOrganization(db, owner)

  // Particle Type: Car
  const carTypeId = createId()
  await db.insert(particleTypes).values({ id: carTypeId, organizationId: orgId, name: "Car" })

  // Posts (Terminals)
  const washerPostId = createId()
  const cashierPostId = createId()
  await db.insert(posts).values([
    { id: washerPostId, organizationId: orgId, title: "Washer" },
    { id: cashierPostId, organizationId: orgId, title: "Cashier" },
  ])

  // Multi-holder: Cashier post is shared between Jane and Bob (day + night shift).
  await db.insert(postAssignments).values([
    { id: createId(), organizationId: orgId, postId: washerPostId, userId: washerUser },
    { id: createId(), organizationId: orgId, postId: cashierPostId, userId: cashierUser },
    {
      id: createId(),
      organizationId: orgId,
      postId: cashierPostId,
      userId: cashierUser2,
    },
  ])

  // Rail: Car Wash. Trigger → Wash → Pay
  const railId = createId()
  await db.insert(rails).values({
    id: railId,
    organizationId: orgId,
    particleTypeId: carTypeId,
    name: "Car Wash Rail",
    status: "published",
    publishedAt: new Date(),
  })
  const triggerId = createId()
  const washTaskId = createId()
  const payTaskId = createId()
  await db.insert(railNodes).values([
    {
      id: triggerId,
      organizationId: orgId,
      railId,
      type: "trigger",
      name: "Manual start",
      position: 0,
    },
    {
      id: washTaskId,
      organizationId: orgId,
      railId,
      type: "task",
      name: "Wash Car",
      postId: washerPostId,
      position: 1,
      checklistItems: [
        { id: "ck1", label: "Pre-rinse", required: true, position: 0 },
        { id: "ck2", label: "Soap", required: true, position: 1 },
        { id: "ck3", label: "Rinse", required: true, position: 2 },
        { id: "ck4", label: "Dry", required: false, position: 3 },
      ],
      idealMinutes: 15,
    },
    {
      id: payTaskId,
      organizationId: orgId,
      railId,
      type: "task",
      name: "Collect Payment",
      postId: cashierPostId,
      position: 2,
      checklistItems: [{ id: "p1", label: "Run card / cash", required: true, position: 0 }],
    },
  ])

  // Particle: Honda Civic
  const civicId = createId()
  await db.insert(particles).values({
    id: civicId,
    organizationId: orgId,
    particleTypeId: carTypeId,
    name: "Honda Civic",
  })

  return {
    owner,
    orgId,
    washerUser,
    cashierUser,
    cashierUser2,
    washerPostId,
    cashierPostId,
    railId,
    triggerId,
    washTaskId,
    payTaskId,
    civicId,
  }
}

describe("rail-runs module — the conveyor belt", () => {
  it("starting a rail creates a run + the first cycle (skipping the trigger)", async () => {
    await withTestDb(async (db) => {
      const s = await setupCarWashScenario(db)
      const runId = createId()
      const firstCycleId = createId()
      await db.insert(railRuns).values({
        id: runId,
        organizationId: s.orgId,
        railId: s.railId,
        particleId: s.civicId,
        startedBy: s.owner,
      })
      await db.insert(cycles).values({
        id: firstCycleId,
        organizationId: s.orgId,
        railRunId: runId,
        railNodeId: s.washTaskId,
        postId: s.washerPostId,
        title: "Wash Car",
        position: 1,
        checklistItems: [
          {
            id: "ck1",
            label: "Pre-rinse",
            required: true,
            position: 0,
            checked: false,
            checkedAt: null,
            checkedBy: null,
          },
        ],
      })

      // Mike (washer) sees it; Jane (cashier) does not.
      const mikeInbox = await db
        .select({ id: cycles.id, title: cycles.title })
        .from(cycles)
        .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
        .where(
          and(
            eq(cycles.organizationId, s.orgId),
            eq(postAssignments.userId, s.washerUser),
            isNull(cycles.completedAt),
            isNull(cycles.cancelledAt),
            isNull(cycles.deletedAt),
          ),
        )
      const janeInbox = await db
        .select({ id: cycles.id })
        .from(cycles)
        .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
        .where(
          and(
            eq(cycles.organizationId, s.orgId),
            eq(postAssignments.userId, s.cashierUser),
            isNull(cycles.completedAt),
            isNull(cycles.cancelledAt),
            isNull(cycles.deletedAt),
          ),
        )

      expect(mikeInbox).toHaveLength(1)
      expect(mikeInbox[0]?.title).toBe("Wash Car")
      expect(janeInbox).toHaveLength(0)
    })
  })

  it("completing a cycle issues the next at the next post; multi-holder routes to all", async () => {
    await withTestDb(async (db) => {
      const s = await setupCarWashScenario(db)
      const runId = createId()
      await db.insert(railRuns).values({
        id: runId,
        organizationId: s.orgId,
        railId: s.railId,
        particleId: s.civicId,
        startedBy: s.owner,
      })
      // Wash cycle is already issued and Mike completes it.
      const washCycleId = createId()
      await db.insert(cycles).values({
        id: washCycleId,
        organizationId: s.orgId,
        railRunId: runId,
        railNodeId: s.washTaskId,
        postId: s.washerPostId,
        title: "Wash Car",
        position: 1,
        checklistItems: [],
      })
      const now = new Date()
      await db
        .update(cycles)
        .set({ completedAt: now, completedBy: s.washerUser })
        .where(eq(cycles.id, washCycleId))

      // System issues the next cycle at the cashier post.
      const payCycleId = createId()
      await db.insert(cycles).values({
        id: payCycleId,
        organizationId: s.orgId,
        railRunId: runId,
        railNodeId: s.payTaskId,
        postId: s.cashierPostId,
        title: "Collect Payment",
        position: 2,
        checklistItems: [],
      })

      // Both Jane AND Bob (cashier holders) see the new cycle. Mike does not.
      async function inbox(userId: string) {
        return db
          .select({ id: cycles.id, title: cycles.title })
          .from(cycles)
          .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
          .where(
            and(
              eq(cycles.organizationId, s.orgId),
              eq(postAssignments.userId, userId),
              isNull(cycles.completedAt),
              isNull(cycles.cancelledAt),
              isNull(cycles.deletedAt),
            ),
          )
      }
      const janeOpen = await inbox(s.cashierUser)
      const bobOpen = await inbox(s.cashierUser2)
      const mikeOpen = await inbox(s.washerUser)

      expect(janeOpen.map((c) => c.title)).toEqual(["Collect Payment"])
      expect(bobOpen.map((c) => c.title)).toEqual(["Collect Payment"])
      expect(mikeOpen).toHaveLength(0) // Wash cycle is now completed
    })
  })

  it("cycles snapshot title/checklist/ideal_minutes from rail_node — editing the rail later is non-destructive", async () => {
    await withTestDb(async (db) => {
      const s = await setupCarWashScenario(db)
      const runId = createId()
      await db.insert(railRuns).values({
        id: runId,
        organizationId: s.orgId,
        railId: s.railId,
        particleId: s.civicId,
        startedBy: s.owner,
      })
      const cycleId = createId()
      const snapshotChecklist: CycleChecklistItem[] = [
        {
          id: "ck1",
          label: "Pre-rinse",
          required: true,
          position: 0,
          checked: false,
          checkedAt: null,
          checkedBy: null,
        },
        {
          id: "ck2",
          label: "Soap",
          required: true,
          position: 1,
          checked: false,
          checkedAt: null,
          checkedBy: null,
        },
      ]
      await db.insert(cycles).values({
        id: cycleId,
        organizationId: s.orgId,
        railRunId: runId,
        railNodeId: s.washTaskId,
        postId: s.washerPostId,
        title: "Wash Car",
        position: 1,
        checklistItems: snapshotChecklist,
        idealMinutes: 15,
      })

      // Now someone edits the rail node.
      await db
        .update(railNodes)
        .set({
          name: "Wash Car (UPDATED)",
          checklistItems: [
            { id: "ck1", label: "Pre-rinse (faster)", required: false, position: 0 },
          ],
          idealMinutes: 60,
        })
        .where(eq(railNodes.id, s.washTaskId))

      // The in-flight cycle is unaffected.
      const [c] = await db.select().from(cycles).where(eq(cycles.id, cycleId))
      expect(c?.title).toBe("Wash Car")
      expect(c?.idealMinutes).toBe(15)
      expect(c?.checklistItems).toEqual(snapshotChecklist)
    })
  })

  it("cancelling a run cancels its open cycles in lockstep", async () => {
    await withTestDb(async (db) => {
      const s = await setupCarWashScenario(db)
      const runId = createId()
      await db.insert(railRuns).values({
        id: runId,
        organizationId: s.orgId,
        railId: s.railId,
        particleId: s.civicId,
        startedBy: s.owner,
      })
      const c1 = createId()
      const c2 = createId()
      await db.insert(cycles).values([
        {
          id: c1,
          organizationId: s.orgId,
          railRunId: runId,
          railNodeId: s.washTaskId,
          postId: s.washerPostId,
          title: "Wash",
          position: 1,
          completedAt: new Date(), // already completed — should NOT be re-cancelled
        },
        {
          id: c2,
          organizationId: s.orgId,
          railRunId: runId,
          railNodeId: s.payTaskId,
          postId: s.cashierPostId,
          title: "Pay",
          position: 2,
        },
      ])

      const now = new Date()
      await db
        .update(railRuns)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancelledBy: s.owner,
          cancellationReason: "test",
        })
        .where(eq(railRuns.id, runId))
      await db
        .update(cycles)
        .set({ cancelledAt: now, cancelledBy: s.owner })
        .where(
          and(eq(cycles.railRunId, runId), isNull(cycles.completedAt), isNull(cycles.cancelledAt)),
        )

      const ordered = await db
        .select()
        .from(cycles)
        .where(eq(cycles.railRunId, runId))
        .orderBy(asc(cycles.position))
      expect(ordered[0]?.completedAt).not.toBeNull()
      expect(ordered[0]?.cancelledAt).toBeNull() // already-completed not touched
      expect(ordered[1]?.cancelledAt).not.toBeNull()
    })
  })

  it("FK on rail_runs.particle_id is RESTRICT (Principle 0)", async () => {
    await withTestDb(async (db) => {
      const s = await setupCarWashScenario(db)
      const runId = createId()
      await db.insert(railRuns).values({
        id: runId,
        organizationId: s.orgId,
        railId: s.railId,
        particleId: s.civicId,
        startedBy: s.owner,
      })
      await expect(db.delete(particles).where(eq(particles.id, s.civicId))).rejects.toThrow()
    })
  })
})
