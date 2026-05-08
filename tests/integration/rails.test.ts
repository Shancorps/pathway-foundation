import { describe, expect, it } from "vitest"
import { and, asc, eq, isNull } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { withTestDb } from "../helpers/db"
import { createOrganization, createUser } from "../helpers/factories"
import { posts } from "@/modules/org-structure/schema"
import { particleTypes } from "@/modules/particles/schema"
import { railNodes, rails } from "@/modules/rails/schema"

async function seedTypeAndPost(
  db: Parameters<typeof withTestDb>[0] extends (db: infer D) => unknown ? D : never,
  orgId: string,
) {
  const typeId = createId()
  await db.insert(particleTypes).values({ id: typeId, organizationId: orgId, name: "Client" })
  const postId = createId()
  await db.insert(posts).values({ id: postId, organizationId: orgId, title: "Sales Director" })
  return { typeId, postId }
}

describe("rails module — db-level invariants", () => {
  it("scopes rails and nodes to a single organization", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgA = await createOrganization(db, userId)
      const orgB = await createOrganization(db, userId)
      const seedA = await seedTypeAndPost(db, orgA)
      const seedB = await seedTypeAndPost(db, orgB)

      const railA = createId()
      const railB = createId()
      await db.insert(rails).values([
        { id: railA, organizationId: orgA, particleTypeId: seedA.typeId, name: "Sales Pipeline" },
        { id: railB, organizationId: orgB, particleTypeId: seedB.typeId, name: "Onboarding" },
      ])
      await db.insert(railNodes).values([
        {
          id: createId(),
          organizationId: orgA,
          railId: railA,
          type: "trigger",
          name: "Manual start",
          position: 0,
        },
        {
          id: createId(),
          organizationId: orgA,
          railId: railA,
          type: "task",
          name: "Discovery",
          postId: seedA.postId,
          position: 1,
        },
      ])

      const railsInA = await db
        .select()
        .from(rails)
        .where(and(eq(rails.organizationId, orgA), isNull(rails.deletedAt)))
      const nodesInA = await db
        .select()
        .from(railNodes)
        .where(and(eq(railNodes.organizationId, orgA), isNull(railNodes.deletedAt)))
      expect(railsInA).toHaveLength(1)
      expect(railsInA[0]?.name).toBe("Sales Pipeline")
      expect(nodesInA).toHaveLength(2)
    })
  })

  it("FK on rails.particle_type_id is RESTRICT (hard delete blocked while rails exist)", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)
      const { typeId } = await seedTypeAndPost(db, orgId)
      await db.insert(rails).values({
        id: createId(),
        organizationId: orgId,
        particleTypeId: typeId,
        name: "R",
      })
      await expect(db.delete(particleTypes).where(eq(particleTypes.id, typeId))).rejects.toThrow()
    })
  })

  it("FK on rail_nodes.post_id is RESTRICT (hard delete blocked while wired into rails)", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)
      const { typeId, postId } = await seedTypeAndPost(db, orgId)
      const railId = createId()
      await db.insert(rails).values({
        id: railId,
        organizationId: orgId,
        particleTypeId: typeId,
        name: "R",
      })
      await db.insert(railNodes).values({
        id: createId(),
        organizationId: orgId,
        railId,
        type: "task",
        name: "Step",
        postId,
        position: 0,
      })
      await expect(db.delete(posts).where(eq(posts.id, postId))).rejects.toThrow()
    })
  })

  it("nodes ordered by position", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)
      const { typeId, postId } = await seedTypeAndPost(db, orgId)
      const railId = createId()
      await db.insert(rails).values({
        id: railId,
        organizationId: orgId,
        particleTypeId: typeId,
        name: "R",
      })
      // Insert in scrambled order — query must still come back in position order.
      await db.insert(railNodes).values([
        {
          id: createId(),
          organizationId: orgId,
          railId,
          type: "task",
          name: "Third",
          postId,
          position: 2,
        },
        {
          id: createId(),
          organizationId: orgId,
          railId,
          type: "trigger",
          name: "Trigger",
          position: 0,
        },
        {
          id: createId(),
          organizationId: orgId,
          railId,
          type: "task",
          name: "Second",
          postId,
          position: 1,
        },
      ])
      const ordered = await db
        .select()
        .from(railNodes)
        .where(and(eq(railNodes.railId, railId), isNull(railNodes.deletedAt)))
        .orderBy(asc(railNodes.position))
      expect(ordered.map((n) => n.name)).toEqual(["Trigger", "Second", "Third"])
    })
  })

  it("cascades soft-delete from a rail to its nodes (modeling the action)", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)
      const { typeId, postId } = await seedTypeAndPost(db, orgId)
      const railId = createId()
      await db.insert(rails).values({
        id: railId,
        organizationId: orgId,
        particleTypeId: typeId,
        name: "R",
      })
      await db.insert(railNodes).values([
        { id: createId(), organizationId: orgId, railId, type: "trigger", name: "T", position: 0 },
        {
          id: createId(),
          organizationId: orgId,
          railId,
          type: "task",
          name: "S",
          postId,
          position: 1,
        },
      ])

      const now = new Date()
      await db
        .update(railNodes)
        .set({ deletedAt: now, deletedBy: userId })
        .where(eq(railNodes.railId, railId))
      await db.update(rails).set({ deletedAt: now, deletedBy: userId }).where(eq(rails.id, railId))

      const liveRails = await db
        .select()
        .from(rails)
        .where(and(eq(rails.organizationId, orgId), isNull(rails.deletedAt)))
      const liveNodes = await db
        .select()
        .from(railNodes)
        .where(and(eq(railNodes.organizationId, orgId), isNull(railNodes.deletedAt)))
      expect(liveRails).toHaveLength(0)
      expect(liveNodes).toHaveLength(0)
    })
  })
})
