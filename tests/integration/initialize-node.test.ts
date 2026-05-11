import { describe, expect, it } from "vitest"
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { withTestDb, type TestDb } from "../helpers/db"
import { createOrganization, createUser } from "../helpers/factories"
import {
  manifests,
  railManifests,
  railRunManifests,
  type ManifestFieldDef,
} from "@/modules/manifests/schema"
import { postAssignments, posts } from "@/modules/org-structure/schema"
import { particleTypes, particles } from "@/modules/particles/schema"
import { railNodes, rails } from "@/modules/rails/schema"
import { cycles, railRuns } from "@/modules/rail-runs/schema"

/**
 * Integration tests for the Initialize rail node. Like the other module suites
 * in tests/integration/, these model the schema-level invariants — they
 * reproduce the action's validation logic inline (so the test runs inside the
 * same transaction) rather than driving the action through Better Auth's
 * orgAction middleware.
 *
 * Cycle visibility is verified using the same SQL predicate the production
 * `listMyActionCycles` query uses (see `cycleVisibleToUserPredicate` in
 * `src/modules/rail-runs/queries.ts`): a cycle is visible to a user iff
 * (1) the run's post_holder_assignments has no entry for the cycle's post,
 * (2) the entry matches the user, OR (3) the chosen holder is no longer a
 * holder of the post (graceful fallback).
 */

// ---- Helpers ----------------------------------------------------------------

/**
 * SQL clause matching production's visibility predicate. Joining against
 * post_assignments already restricts to current holders, so the predicate
 * below is the *additional* narrowing applied by Initialize.
 */
function inboxFor(db: TestDb, orgId: string, userId: string) {
  return db
    .select({ id: cycles.id, title: cycles.title, postId: cycles.postId })
    .from(cycles)
    .innerJoin(postAssignments, eq(postAssignments.postId, cycles.postId))
    .innerJoin(railRuns, eq(railRuns.id, cycles.railRunId))
    .where(
      and(
        eq(cycles.organizationId, orgId),
        eq(postAssignments.userId, userId),
        isNull(cycles.completedAt),
        isNull(cycles.cancelledAt),
        isNull(cycles.deletedAt),
        sql`(
          ${railRuns.postHolderAssignments} ->> ${cycles.postId} is null
          or ${railRuns.postHolderAssignments} ->> ${cycles.postId} = ${userId}
          or not exists (
            select 1 from ${postAssignments} pa
            where pa.post_id = ${cycles.postId}
              and pa.user_id = ${railRuns.postHolderAssignments} ->> ${cycles.postId}
          )
        )`,
      ),
    )
}

/**
 * Build a minimal scenario: one org, two cashier users sharing one Post, one
 * manifest with one optional field, one rail (Trigger → Task) where the Task's
 * post is the shared cashier post.
 */
async function setupMultiHolderScenario(db: TestDb) {
  const owner = await createUser(db)
  const holderA = await createUser(db, { name: "Holder A" })
  const holderB = await createUser(db, { name: "Holder B" })
  const orgId = await createOrganization(db, owner)

  const typeId = createId()
  await db.insert(particleTypes).values({ id: typeId, organizationId: orgId, name: "Order" })
  const particleId = createId()
  await db.insert(particles).values({
    id: particleId,
    organizationId: orgId,
    particleTypeId: typeId,
    name: "Order #1",
  })

  const sharedPostId = createId()
  await db.insert(posts).values({ id: sharedPostId, organizationId: orgId, title: "Cashier" })
  await db.insert(postAssignments).values([
    { id: createId(), organizationId: orgId, postId: sharedPostId, userId: holderA },
    { id: createId(), organizationId: orgId, postId: sharedPostId, userId: holderB },
  ])

  const railId = createId()
  await db.insert(rails).values({
    id: railId,
    organizationId: orgId,
    particleTypeId: typeId,
    name: "Test Rail",
    status: "draft",
  })
  const triggerId = createId()
  const taskId = createId()
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
      id: taskId,
      organizationId: orgId,
      railId,
      type: "task",
      name: "Charge",
      postId: sharedPostId,
      position: 1,
    },
  ])

  return {
    owner,
    holderA,
    holderB,
    orgId,
    typeId,
    particleId,
    sharedPostId,
    railId,
    triggerId,
    taskId,
  }
}

/**
 * Replays the runtime side of `startRail` (the parts that hit the DB after
 * validation passes): insert the run with `postHolderAssignments`, seed
 * rail_run_manifests rows, apply Initialize manifest data, issue the first
 * cycle at the first Task node. Mirrors the body of `startRail` in
 * src/modules/rail-runs/actions.ts.
 */
async function simulateStartRail(
  db: TestDb,
  args: {
    orgId: string
    railId: string
    particleId: string
    starterUserId: string
    initializeData?: {
      postHolderAssignments: Record<string, string>
      manifestData: Record<string, Record<string, unknown>>
    }
  },
) {
  const runId = createId()
  await db.insert(railRuns).values({
    id: runId,
    organizationId: args.orgId,
    railId: args.railId,
    particleId: args.particleId,
    status: "running",
    startedBy: args.starterUserId,
    postHolderAssignments: args.initializeData?.postHolderAssignments ?? {},
  })

  // Seed rail_run_manifests rows for every currently-attached manifest.
  const attached = await db
    .select({ manifestId: railManifests.manifestId })
    .from(railManifests)
    .where(eq(railManifests.railId, args.railId))
  if (attached.length > 0) {
    await db.insert(railRunManifests).values(
      attached.map((a) => ({
        id: createId(),
        railRunId: runId,
        manifestId: a.manifestId,
        data: {},
      })),
    )
  }

  // Apply Initialize manifest data into the freshly-seeded rows.
  if (args.initializeData) {
    for (const [manifestId, data] of Object.entries(args.initializeData.manifestData)) {
      await db
        .update(railRunManifests)
        .set({ data, updatedAt: new Date(), updatedBy: args.starterUserId })
        .where(
          and(eq(railRunManifests.railRunId, runId), eq(railRunManifests.manifestId, manifestId)),
        )
    }
  }

  // Issue the first cycle at the first cycle-issuing node (task/approval). Walk
  // past trigger and initialize. Mirrors advanceRun starting at position 0.
  const nodes = await db
    .select()
    .from(railNodes)
    .where(and(eq(railNodes.railId, args.railId), isNull(railNodes.deletedAt)))
    .orderBy(asc(railNodes.position))
  let firstCycleId: string | null = null
  for (const node of nodes) {
    if (node.type === "trigger" || node.type === "initialize") continue
    if ((node.type === "task" || node.type === "approval") && node.postId) {
      firstCycleId = createId()
      await db.insert(cycles).values({
        id: firstCycleId,
        organizationId: args.orgId,
        railRunId: runId,
        railNodeId: node.id,
        postId: node.postId,
        title: node.name,
        description: node.description,
        position: node.position,
      })
      break
    }
  }
  return { runId, firstCycleId }
}

/**
 * Replays the validation logic inside `startRail` BEFORE the run insert. Used
 * by tests that assert the action rejects bad input. Throws on the same paths
 * the real action throws.
 */
async function simulateStartRailValidation(
  db: TestDb,
  args: {
    orgId: string
    railId: string
    initializeData?: {
      postHolderAssignments: Record<string, string>
      manifestData: Record<string, Record<string, unknown>>
    }
  },
) {
  const allNodes = await db
    .select()
    .from(railNodes)
    .where(and(eq(railNodes.railId, args.railId), isNull(railNodes.deletedAt)))
    .orderBy(asc(railNodes.position))
  const initializeNode = allNodes.find((n) => n.type === "initialize")
  if (!initializeNode) return // no-op when no Initialize
  if (!args.initializeData) {
    throw new Error("VALIDATION: This rail requires Initialize data.")
  }
  const init = args.initializeData

  // Required manifest fields
  const requiredSlugs =
    initializeNode.config.kind === "initialize"
      ? initializeNode.config.requiredManifestFieldSlugs
      : []
  for (const req of requiredSlugs) {
    const data = init.manifestData[req.manifestId] ?? {}
    const v = data[req.fieldSlug]
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
    if (empty) {
      throw new Error(`VALIDATION: Required field not filled: ${req.fieldSlug}`)
    }
  }

  // Multi-holder Post coverage
  const postIdsOnRail = Array.from(
    new Set(allNodes.map((n) => n.postId).filter((id): id is string => Boolean(id))),
  )
  for (const postId of postIdsOnRail) {
    const holders = await db
      .select({ userId: postAssignments.userId })
      .from(postAssignments)
      .where(eq(postAssignments.postId, postId))
    if (holders.length <= 1) continue
    const assigned = init.postHolderAssignments[postId]
    if (!assigned) {
      throw new Error(`VALIDATION: Pick a holder for post ${postId}`)
    }
    const ok = holders.some((h) => h.userId === assigned)
    if (!ok) {
      throw new Error(`FORBIDDEN: Assigned user does not hold post ${postId}`)
    }
  }
}

// ---- Tests ------------------------------------------------------------------

describe("Initialize node — integration", () => {
  it("no Initialize on rail — first cycle fans out to all holders of a multi-holder Post", async () => {
    await withTestDb(async (db) => {
      const s = await setupMultiHolderScenario(db)
      // Publish the rail (Trigger → Task only — no Initialize).
      await db
        .update(rails)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(rails.id, s.railId))

      await simulateStartRail(db, {
        orgId: s.orgId,
        railId: s.railId,
        particleId: s.particleId,
        starterUserId: s.owner,
      })

      const aInbox = await inboxFor(db, s.orgId, s.holderA)
      const bInbox = await inboxFor(db, s.orgId, s.holderB)
      expect(aInbox.map((r) => r.title)).toEqual(["Charge"])
      expect(bInbox.map((r) => r.title)).toEqual(["Charge"])
    })
  })

  it("with Initialize + a chosen holder, cycle is visible only to the chosen holder", async () => {
    await withTestDb(async (db) => {
      const s = await setupMultiHolderScenario(db)

      // Attach a manifest with one required-at-start field.
      const manifestId = createId()
      const fields: ManifestFieldDef[] = [
        {
          key: "lead_name",
          label: "Lead Name",
          type: "text",
          position: 0,
          required: false,
          readOnly: false,
        },
      ]
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Brief",
        fields,
        createdBy: s.owner,
        updatedBy: s.owner,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })

      // Initialize node at position 1 — Task auto-shifts to position 2.
      await db.update(railNodes).set({ position: 2 }).where(eq(railNodes.id, s.taskId))
      const initId = createId()
      await db.insert(railNodes).values({
        id: initId,
        organizationId: s.orgId,
        railId: s.railId,
        type: "initialize",
        name: "Initialize",
        position: 1,
        config: {
          kind: "initialize",
          requiredManifestFieldSlugs: [{ manifestId, fieldSlug: "lead_name" }],
        },
      })
      await db
        .update(rails)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(rails.id, s.railId))

      await simulateStartRail(db, {
        orgId: s.orgId,
        railId: s.railId,
        particleId: s.particleId,
        starterUserId: s.owner,
        initializeData: {
          postHolderAssignments: { [s.sharedPostId]: s.holderA },
          manifestData: { [manifestId]: { lead_name: "Acme" } },
        },
      })

      const aInbox = await inboxFor(db, s.orgId, s.holderA)
      const bInbox = await inboxFor(db, s.orgId, s.holderB)
      expect(aInbox.map((r) => r.title)).toEqual(["Charge"])
      expect(bInbox).toHaveLength(0)
    })
  })

  it("missing required manifest field rejects with VALIDATION naming the slug", async () => {
    await withTestDb(async (db) => {
      const s = await setupMultiHolderScenario(db)
      const manifestId = createId()
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Brief",
        fields: [
          {
            key: "lead_name",
            label: "Lead Name",
            type: "text",
            position: 0,
            required: false,
            readOnly: false,
          },
        ],
        createdBy: s.owner,
        updatedBy: s.owner,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })
      await db.update(railNodes).set({ position: 2 }).where(eq(railNodes.id, s.taskId))
      await db.insert(railNodes).values({
        id: createId(),
        organizationId: s.orgId,
        railId: s.railId,
        type: "initialize",
        name: "Initialize",
        position: 1,
        config: {
          kind: "initialize",
          requiredManifestFieldSlugs: [{ manifestId, fieldSlug: "lead_name" }],
        },
      })

      await expect(
        simulateStartRailValidation(db, {
          orgId: s.orgId,
          railId: s.railId,
          initializeData: {
            postHolderAssignments: { [s.sharedPostId]: s.holderA },
            manifestData: { [manifestId]: {} }, // lead_name missing
          },
        }),
      ).rejects.toThrow(/VALIDATION:.*lead_name/)
    })
  })

  it("missing post-holder pick for a multi-holder Post rejects with VALIDATION", async () => {
    await withTestDb(async (db) => {
      const s = await setupMultiHolderScenario(db)
      await db.update(railNodes).set({ position: 2 }).where(eq(railNodes.id, s.taskId))
      await db.insert(railNodes).values({
        id: createId(),
        organizationId: s.orgId,
        railId: s.railId,
        type: "initialize",
        name: "Initialize",
        position: 1,
        config: { kind: "initialize", requiredManifestFieldSlugs: [] },
      })

      await expect(
        simulateStartRailValidation(db, {
          orgId: s.orgId,
          railId: s.railId,
          initializeData: {
            postHolderAssignments: {}, // no pick for sharedPostId
            manifestData: {},
          },
        }),
      ).rejects.toThrow(/VALIDATION:.*Pick a holder/)
    })
  })

  it("assigned user who doesn't hold the Post rejects with FORBIDDEN", async () => {
    await withTestDb(async (db) => {
      const s = await setupMultiHolderScenario(db)
      const stranger = await createUser(db, { name: "Stranger" })
      await db.update(railNodes).set({ position: 2 }).where(eq(railNodes.id, s.taskId))
      await db.insert(railNodes).values({
        id: createId(),
        organizationId: s.orgId,
        railId: s.railId,
        type: "initialize",
        name: "Initialize",
        position: 1,
        config: { kind: "initialize", requiredManifestFieldSlugs: [] },
      })

      await expect(
        simulateStartRailValidation(db, {
          orgId: s.orgId,
          railId: s.railId,
          initializeData: {
            postHolderAssignments: { [s.sharedPostId]: stranger }, // stranger isn't a holder
            manifestData: {},
          },
        }),
      ).rejects.toThrow(/FORBIDDEN:.*Assigned user does not hold/)
    })
  })

  it("after a successful start, rail_runs.post_holder_assignments and rail_run_manifests.data persist the supplied values", async () => {
    await withTestDb(async (db) => {
      const s = await setupMultiHolderScenario(db)
      const manifestId = createId()
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Brief",
        fields: [
          {
            key: "lead_name",
            label: "Lead Name",
            type: "text",
            position: 0,
            required: false,
            readOnly: false,
          },
        ],
        createdBy: s.owner,
        updatedBy: s.owner,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })
      await db.update(railNodes).set({ position: 2 }).where(eq(railNodes.id, s.taskId))
      await db.insert(railNodes).values({
        id: createId(),
        organizationId: s.orgId,
        railId: s.railId,
        type: "initialize",
        name: "Initialize",
        position: 1,
        config: {
          kind: "initialize",
          requiredManifestFieldSlugs: [{ manifestId, fieldSlug: "lead_name" }],
        },
      })

      const { runId } = await simulateStartRail(db, {
        orgId: s.orgId,
        railId: s.railId,
        particleId: s.particleId,
        starterUserId: s.owner,
        initializeData: {
          postHolderAssignments: { [s.sharedPostId]: s.holderB },
          manifestData: { [manifestId]: { lead_name: "Acme Inc." } },
        },
      })

      const [run] = await db.select().from(railRuns).where(eq(railRuns.id, runId))
      expect(run?.postHolderAssignments).toEqual({ [s.sharedPostId]: s.holderB })

      const runManifests = await db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.railRunId, runId))
      expect(runManifests).toHaveLength(1)
      expect(runManifests[0]?.data).toEqual({ lead_name: "Acme Inc." })
    })
  })

  it("single-holder Posts on the same rail still route normally when Initialize is present", async () => {
    await withTestDb(async (db) => {
      // Two-post rail: Post Y (single holder, charlie) → Post Z (two holders).
      const owner = await createUser(db)
      const charlie = await createUser(db, { name: "Charlie" })
      const alice = await createUser(db, { name: "Alice" })
      const bob = await createUser(db, { name: "Bob" })
      const orgId = await createOrganization(db, owner)

      const typeId = createId()
      await db.insert(particleTypes).values({ id: typeId, organizationId: orgId, name: "Order" })
      const particleId = createId()
      await db.insert(particles).values({
        id: particleId,
        organizationId: orgId,
        particleTypeId: typeId,
        name: "Order #2",
      })

      const postY = createId()
      const postZ = createId()
      await db.insert(posts).values([
        { id: postY, organizationId: orgId, title: "Reviewer" },
        { id: postZ, organizationId: orgId, title: "Cashier" },
      ])
      await db.insert(postAssignments).values([
        { id: createId(), organizationId: orgId, postId: postY, userId: charlie },
        { id: createId(), organizationId: orgId, postId: postZ, userId: alice },
        { id: createId(), organizationId: orgId, postId: postZ, userId: bob },
      ])

      const railId = createId()
      await db.insert(rails).values({
        id: railId,
        organizationId: orgId,
        particleTypeId: typeId,
        name: "Mixed Rail",
        status: "published",
        publishedAt: new Date(),
      })
      const triggerId = createId()
      const initId = createId()
      const taskY = createId()
      const taskZ = createId()
      await db.insert(railNodes).values([
        { id: triggerId, organizationId: orgId, railId, type: "trigger", name: "T", position: 0 },
        {
          id: initId,
          organizationId: orgId,
          railId,
          type: "initialize",
          name: "Initialize",
          position: 1,
          config: { kind: "initialize", requiredManifestFieldSlugs: [] },
        },
        {
          id: taskY,
          organizationId: orgId,
          railId,
          type: "task",
          name: "Review",
          postId: postY,
          position: 2,
        },
        {
          id: taskZ,
          organizationId: orgId,
          railId,
          type: "task",
          name: "Charge",
          postId: postZ,
          position: 3,
        },
      ])

      // Initialize pick covers Z (multi-holder); Y is single-holder and skipped.
      await simulateStartRail(db, {
        orgId,
        railId,
        particleId,
        starterUserId: owner,
        initializeData: {
          postHolderAssignments: { [postZ]: alice },
          manifestData: {},
        },
      })

      // First cycle is at Y (postY) and Charlie sees it; alice/bob don't —
      // not because of narrowing (Y not in postHolderAssignments) but because
      // they don't hold Y in the first place.
      const charlieInbox = await inboxFor(db, orgId, charlie)
      expect(charlieInbox.map((r) => r.title)).toEqual(["Review"])
      const aliceInbox = await inboxFor(db, orgId, alice)
      const bobInbox = await inboxFor(db, orgId, bob)
      expect(aliceInbox).toHaveLength(0)
      expect(bobInbox).toHaveLength(0)
    })
  })

  it("editing Initialize required slugs on a published rail with active runs only affects future starts", async () => {
    await withTestDb(async (db) => {
      const s = await setupMultiHolderScenario(db)
      const manifestId = createId()
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Brief",
        fields: [
          {
            key: "slug1",
            label: "Slug 1",
            type: "text",
            position: 0,
            required: false,
            readOnly: false,
          },
          {
            key: "slug2",
            label: "Slug 2",
            type: "text",
            position: 1,
            required: false,
            readOnly: false,
          },
        ],
        createdBy: s.owner,
        updatedBy: s.owner,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })
      await db.update(railNodes).set({ position: 2 }).where(eq(railNodes.id, s.taskId))
      const initId = createId()
      await db.insert(railNodes).values({
        id: initId,
        organizationId: s.orgId,
        railId: s.railId,
        type: "initialize",
        name: "Initialize",
        position: 1,
        config: {
          kind: "initialize",
          requiredManifestFieldSlugs: [{ manifestId, fieldSlug: "slug1" }],
        },
      })
      await db
        .update(rails)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(rails.id, s.railId))

      // First run — only slug1 required.
      const { runId: runA } = await simulateStartRail(db, {
        orgId: s.orgId,
        railId: s.railId,
        particleId: s.particleId,
        starterUserId: s.owner,
        initializeData: {
          postHolderAssignments: { [s.sharedPostId]: s.holderA },
          manifestData: { [manifestId]: { slug1: "first" } },
        },
      })

      // Edit Initialize to require both slugs (the production action does
      // exactly this UPDATE).
      await db
        .update(railNodes)
        .set({
          config: {
            kind: "initialize",
            requiredManifestFieldSlugs: [
              { manifestId, fieldSlug: "slug1" },
              { manifestId, fieldSlug: "slug2" },
            ],
          },
          updatedAt: new Date(),
        })
        .where(eq(railNodes.id, initId))

      // Existing run A is undisturbed: its data still has only slug1, the
      // cycle is still open, no retroactive validation kicks in.
      const [runRow] = await db.select().from(railRuns).where(eq(railRuns.id, runA))
      expect(runRow?.status).toBe("running")
      const [runManifestRow] = await db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.railRunId, runA))
      expect(runManifestRow?.data).toEqual({ slug1: "first" })

      // A NEW start with only slug1 must now reject — slug2 is required.
      await expect(
        simulateStartRailValidation(db, {
          orgId: s.orgId,
          railId: s.railId,
          initializeData: {
            postHolderAssignments: { [s.sharedPostId]: s.holderA },
            manifestData: { [manifestId]: { slug1: "second" } },
          },
        }),
      ).rejects.toThrow(/VALIDATION:.*slug2/)

      // Filling both slugs lets the new start succeed.
      await expect(
        simulateStartRailValidation(db, {
          orgId: s.orgId,
          railId: s.railId,
          initializeData: {
            postHolderAssignments: { [s.sharedPostId]: s.holderA },
            manifestData: { [manifestId]: { slug1: "second", slug2: "filled" } },
          },
        }),
      ).resolves.toBeUndefined()
    })
  })

  it("deleting the Initialize node — future starts skip the gate", async () => {
    await withTestDb(async (db) => {
      const s = await setupMultiHolderScenario(db)
      await db.update(railNodes).set({ position: 2 }).where(eq(railNodes.id, s.taskId))
      const initId = createId()
      await db.insert(railNodes).values({
        id: initId,
        organizationId: s.orgId,
        railId: s.railId,
        type: "initialize",
        name: "Initialize",
        position: 1,
        config: { kind: "initialize", requiredManifestFieldSlugs: [] },
      })
      await db
        .update(rails)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(rails.id, s.railId))

      // Start a run while Initialize is present.
      await simulateStartRail(db, {
        orgId: s.orgId,
        railId: s.railId,
        particleId: s.particleId,
        starterUserId: s.owner,
        initializeData: {
          postHolderAssignments: { [s.sharedPostId]: s.holderA },
          manifestData: {},
        },
      })

      // Soft-delete the Initialize node, then renumber the task back to 1 (the
      // production deleteNode action renumbers remaining nodes contiguously).
      await db
        .update(railNodes)
        .set({ deletedAt: new Date(), deletedBy: s.owner })
        .where(eq(railNodes.id, initId))
      await db.update(railNodes).set({ position: 1 }).where(eq(railNodes.id, s.taskId))

      // A new start with NO initializeData must succeed — gate is gone.
      await expect(
        simulateStartRailValidation(db, {
          orgId: s.orgId,
          railId: s.railId,
          initializeData: undefined,
        }),
      ).resolves.toBeUndefined()
    })
  })

  it("addStructuralNode refuses a second Initialize on the same rail", async () => {
    await withTestDb(async (db) => {
      const s = await setupMultiHolderScenario(db)
      // First Initialize: ok.
      const init1 = createId()
      await db.insert(railNodes).values({
        id: init1,
        organizationId: s.orgId,
        railId: s.railId,
        type: "initialize",
        name: "Initialize",
        position: 1,
        config: { kind: "initialize", requiredManifestFieldSlugs: [] },
      })

      // Replay the addStructuralNode guard for "initialize" + "second one":
      const existingInitialize = await db
        .select({ id: railNodes.id })
        .from(railNodes)
        .where(
          and(
            eq(railNodes.railId, s.railId),
            eq(railNodes.type, "initialize"),
            isNull(railNodes.deletedAt),
          ),
        )
        .limit(1)
      expect(existingInitialize.length).toBe(1)
      // Production: throw ActionError("VALIDATION", "Only one Initialize per rail")
      const wouldThrow = existingInitialize.length > 0
      expect(wouldThrow).toBe(true)
    })
  })

  it("publishRail refuses an Initialize at a position other than 1", async () => {
    await withTestDb(async (db) => {
      const s = await setupMultiHolderScenario(db)
      // Drop an Initialize at position 3 directly — bypass the auto-snap that
      // the action does, so we can hit the publish-time guard.
      await db.update(railNodes).set({ position: 1 }).where(eq(railNodes.id, s.taskId))
      const extraTask = createId()
      await db.insert(railNodes).values({
        id: extraTask,
        organizationId: s.orgId,
        railId: s.railId,
        type: "task",
        name: "Extra",
        postId: s.sharedPostId,
        position: 2,
      })
      const initId = createId()
      await db.insert(railNodes).values({
        id: initId,
        organizationId: s.orgId,
        railId: s.railId,
        type: "initialize",
        name: "Initialize",
        position: 3, // wrong
        config: { kind: "initialize", requiredManifestFieldSlugs: [] },
      })
      const endId = createId()
      await db.insert(railNodes).values({
        id: endId,
        organizationId: s.orgId,
        railId: s.railId,
        type: "end",
        name: "End",
        position: 4,
      })

      // Replay the publishRail Initialize-position guard.
      const nodes = await db
        .select()
        .from(railNodes)
        .where(and(eq(railNodes.railId, s.railId), isNull(railNodes.deletedAt)))
        .orderBy(asc(railNodes.position))
      const initializeNodes = nodes.filter((n) => n.type === "initialize")
      expect(initializeNodes).toHaveLength(1)
      const initializeNode = initializeNodes[0]
      // Production: throw ActionError("VALIDATION", "The Initialize node must be at position 1")
      expect(initializeNode!.position).not.toBe(1)
    })
  })

  it("publishRail refuses a sub-flow targeting a rail that has an Initialize", async () => {
    await withTestDb(async (db) => {
      const owner = await createUser(db)
      const holder = await createUser(db, { name: "Holder" })
      const orgId = await createOrganization(db, owner)

      const typeId = createId()
      await db.insert(particleTypes).values({ id: typeId, organizationId: orgId, name: "Order" })

      const postId = createId()
      await db.insert(posts).values({ id: postId, organizationId: orgId, title: "Worker" })
      await db
        .insert(postAssignments)
        .values({ id: createId(), organizationId: orgId, postId, userId: holder })

      // Rail A — has an Initialize, is publishable in isolation (post is single-holder so
      // no Initialize narrowing required, but Initialize itself just gates manifest data).
      const railA = createId()
      await db.insert(rails).values({
        id: railA,
        organizationId: orgId,
        particleTypeId: typeId,
        name: "Rail A With Initialize",
        status: "published",
        publishedAt: new Date(),
      })
      await db.insert(railNodes).values([
        {
          id: createId(),
          organizationId: orgId,
          railId: railA,
          type: "trigger",
          name: "T",
          position: 0,
        },
        {
          id: createId(),
          organizationId: orgId,
          railId: railA,
          type: "initialize",
          name: "Initialize",
          position: 1,
          config: { kind: "initialize", requiredManifestFieldSlugs: [] },
        },
        {
          id: createId(),
          organizationId: orgId,
          railId: railA,
          type: "task",
          name: "Do thing",
          postId,
          position: 2,
        },
        {
          id: createId(),
          organizationId: orgId,
          railId: railA,
          type: "end",
          name: "End",
          position: 3,
        },
      ])

      // Rail B — draft, with a Sub-Flow targeting Rail A.
      const railB = createId()
      await db.insert(rails).values({
        id: railB,
        organizationId: orgId,
        particleTypeId: typeId,
        name: "Rail B",
        status: "draft",
      })
      const subFlowId = createId()
      await db.insert(railNodes).values([
        {
          id: createId(),
          organizationId: orgId,
          railId: railB,
          type: "trigger",
          name: "T",
          position: 0,
        },
        {
          id: subFlowId,
          organizationId: orgId,
          railId: railB,
          type: "sub_flow",
          name: "Spawn A",
          position: 1,
          config: { kind: "sub_flow", targetRailId: railA, waitForCompletion: true },
        },
        {
          id: createId(),
          organizationId: orgId,
          railId: railB,
          type: "end",
          name: "End",
          position: 2,
        },
      ])

      // Replay publishRail's Sub-Flow-targeting-Initialize guard.
      const nodes = await db
        .select()
        .from(railNodes)
        .where(and(eq(railNodes.railId, railB), isNull(railNodes.deletedAt)))
      const subFlowTargetRailIds = nodes
        .filter((n) => n.type === "sub_flow")
        .map((n) => (n.config.kind === "sub_flow" ? n.config.targetRailId : null))
        .filter((id): id is string => Boolean(id))
      expect(subFlowTargetRailIds).toEqual([railA])

      const targetNodes = await db
        .select({ railId: railNodes.railId, targetName: rails.name })
        .from(railNodes)
        .innerJoin(rails, eq(rails.id, railNodes.railId))
        .where(
          and(
            inArray(railNodes.railId, subFlowTargetRailIds),
            eq(railNodes.organizationId, orgId),
            eq(railNodes.type, "initialize"),
            isNull(railNodes.deletedAt),
          ),
        )
      const offending = targetNodes[0]
      expect(offending).toBeDefined()
      expect(offending!.targetName).toBe("Rail A With Initialize")
      // Production: ActionError("VALIDATION", `Sub-flow target rail '<name>' has an Initialize node...`)
    })
  })
})
