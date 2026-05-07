import { describe, expect, it } from "vitest"
import { and, eq, isNull } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { withTestDb } from "../helpers/db"
import { createOrganization, createUser } from "../helpers/factories"
import { orgContainers, posts } from "@/modules/org-structure/schema"

describe("org-structure module — db-level invariants", () => {
  it("scopes containers and posts to a single organization", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgA = await createOrganization(db, userId)
      const orgB = await createOrganization(db, userId)

      const divA = createId()
      const divB = createId()
      await db.insert(orgContainers).values([
        { id: divA, organizationId: orgA, level: "division", name: "Sales A" },
        { id: divB, organizationId: orgB, level: "division", name: "Sales B" },
      ])
      await db.insert(posts).values([
        { id: createId(), organizationId: orgA, title: "Director A", parentContainerId: divA },
        { id: createId(), organizationId: orgB, title: "Director B", parentContainerId: divB },
      ])

      const containersInA = await db
        .select()
        .from(orgContainers)
        .where(and(eq(orgContainers.organizationId, orgA), isNull(orgContainers.deletedAt)))
      const postsInA = await db
        .select()
        .from(posts)
        .where(and(eq(posts.organizationId, orgA), isNull(posts.deletedAt)))

      expect(containersInA).toHaveLength(1)
      expect(containersInA[0]?.name).toBe("Sales A")
      expect(postsInA).toHaveLength(1)
      expect(postsInA[0]?.title).toBe("Director A")
    })
  })

  it("supports nested containers via parent_id", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const division = createId()
      const department = createId()
      const section = createId()
      await db.insert(orgContainers).values([
        { id: division, organizationId: orgId, level: "division", name: "Operations" },
        {
          id: department,
          organizationId: orgId,
          level: "department",
          name: "Field Ops",
          parentId: division,
        },
        {
          id: section,
          organizationId: orgId,
          level: "section",
          name: "North Region",
          parentId: department,
        },
      ])

      const all = await db
        .select()
        .from(orgContainers)
        .where(eq(orgContainers.organizationId, orgId))
      const byParent = new Map(all.map((c) => [c.id, c.parentId]))

      expect(byParent.get(department)).toBe(division)
      expect(byParent.get(section)).toBe(department)
    })
  })

  it("listPostsHeldByUser-style query returns only that user's posts in this org", async () => {
    await withTestDb(async (db) => {
      const owner = await createUser(db)
      const alice = await createUser(db)
      const bob = await createUser(db)
      const orgId = await createOrganization(db, owner)
      const otherOrg = await createOrganization(db, owner)

      // Alice holds two posts in orgId, one in otherOrg. Bob holds one in orgId.
      await db.insert(posts).values([
        { id: createId(), organizationId: orgId, title: "Sales Director", userId: alice },
        { id: createId(), organizationId: orgId, title: "Account Manager", userId: alice },
        { id: createId(), organizationId: orgId, title: "Cashier", userId: bob },
        { id: createId(), organizationId: otherOrg, title: "Founder", userId: alice },
      ])

      const alicePostsInOrg = await db
        .select()
        .from(posts)
        .where(
          and(eq(posts.organizationId, orgId), eq(posts.userId, alice), isNull(posts.deletedAt)),
        )

      expect(alicePostsInOrg).toHaveLength(2)
      expect(alicePostsInOrg.map((p) => p.title).sort()).toEqual([
        "Account Manager",
        "Sales Director",
      ])
    })
  })

  it("deleting a container reparents direct children to the deleted container's parent", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const division = createId()
      const department = createId()
      const section = createId()
      const unit = createId()
      const sectionPost = createId()
      await db.insert(orgContainers).values([
        { id: division, organizationId: orgId, level: "division", name: "Ops" },
        {
          id: department,
          organizationId: orgId,
          level: "department",
          name: "Field",
          parentId: division,
        },
        {
          id: section,
          organizationId: orgId,
          level: "section",
          name: "North",
          parentId: department,
        },
        { id: unit, organizationId: orgId, level: "unit", name: "Crew A", parentId: section },
      ])
      await db.insert(posts).values({
        id: sectionPost,
        organizationId: orgId,
        title: "Section Lead",
        parentContainerId: section,
      })

      // Simulate the action's reparent step manually (the action itself is auth-guarded).
      const [target] = await db
        .select({ parentId: orgContainers.parentId })
        .from(orgContainers)
        .where(eq(orgContainers.id, section))
        .limit(1)
      await db
        .update(orgContainers)
        .set({ parentId: target!.parentId })
        .where(eq(orgContainers.parentId, section))
      await db
        .update(posts)
        .set({ parentContainerId: target!.parentId })
        .where(eq(posts.parentContainerId, section))
      await db
        .update(orgContainers)
        .set({ deletedAt: new Date(), deletedBy: userId })
        .where(eq(orgContainers.id, section))

      const [unitAfter] = await db.select().from(orgContainers).where(eq(orgContainers.id, unit))
      const [postAfter] = await db.select().from(posts).where(eq(posts.id, sectionPost))

      expect(unitAfter?.parentId).toBe(department)
      expect(postAfter?.parentContainerId).toBe(department)
    })
  })

  it("deleting a top-level container leaves children floating", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const division = createId()
      const department = createId()
      const divPost = createId()
      await db.insert(orgContainers).values([
        { id: division, organizationId: orgId, level: "division", name: "Sales" },
        {
          id: department,
          organizationId: orgId,
          level: "department",
          name: "Inside Sales",
          parentId: division,
        },
      ])
      await db.insert(posts).values({
        id: divPost,
        organizationId: orgId,
        title: "VP",
        parentContainerId: division,
      })

      // Top-level: target.parentId is null → children become floating.
      await db
        .update(orgContainers)
        .set({ parentId: null })
        .where(eq(orgContainers.parentId, division))
      await db
        .update(posts)
        .set({ parentContainerId: null })
        .where(eq(posts.parentContainerId, division))
      await db
        .update(orgContainers)
        .set({ deletedAt: new Date(), deletedBy: userId })
        .where(eq(orgContainers.id, division))

      const [deptAfter] = await db
        .select()
        .from(orgContainers)
        .where(eq(orgContainers.id, department))
      const [postAfter] = await db.select().from(posts).where(eq(posts.id, divPost))

      expect(deptAfter?.parentId).toBeNull()
      expect(postAfter?.parentContainerId).toBeNull()
    })
  })

  it("soft-deleted posts are filtered by default queries", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)
      const postId = createId()

      await db.insert(posts).values({
        id: postId,
        organizationId: orgId,
        title: "To delete",
      })
      await db
        .update(posts)
        .set({ deletedAt: new Date(), deletedBy: userId })
        .where(eq(posts.id, postId))

      const live = await db
        .select()
        .from(posts)
        .where(and(eq(posts.organizationId, orgId), isNull(posts.deletedAt)))
      const all = await db.select().from(posts).where(eq(posts.organizationId, orgId))

      expect(live).toHaveLength(0)
      expect(all).toHaveLength(1)
      expect(all[0]?.deletedAt).not.toBeNull()
    })
  })
})
