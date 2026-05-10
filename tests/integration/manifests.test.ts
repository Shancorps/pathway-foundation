import { describe, expect, it } from "vitest"
import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { withTestDb } from "../helpers/db"
import { createOrganization, createUser } from "../helpers/factories"
import { auditLog } from "@/modules/audit/schema"
import { audit } from "@/modules/audit/audit"
import {
  manifests,
  railManifests,
  railRunManifests,
  type ManifestFieldDef,
} from "@/modules/manifests/schema"
import { posts } from "@/modules/org-structure/schema"
import { particleTypes, particles } from "@/modules/particles/schema"
import { railNodes, rails } from "@/modules/rails/schema"
import { cycles, railRuns } from "@/modules/rail-runs/schema"

/**
 * These tests model the manifest layer at the schema level — same convention
 * as items / rails / rail-runs integration suites. The full safe-action path
 * (auth + org middleware) is covered by E2E. Here we lock in the data
 * invariants the actions depend on: org scoping, FK refusal on in-use
 * manifests, JSONB-based field-deletion enforcement, and detach-preserves-data.
 */

async function setupOrgWithRailAndManifest(
  db: Parameters<typeof withTestDb>[0] extends (db: infer D) => unknown ? D : never,
) {
  const userId = await createUser(db)
  const orgId = await createOrganization(db, userId)

  // Particle Type + a Particle for run init
  const typeId = createId()
  await db.insert(particleTypes).values({ id: typeId, organizationId: orgId, name: "Project" })
  const particleId = createId()
  await db.insert(particles).values({
    id: particleId,
    organizationId: orgId,
    particleTypeId: typeId,
    name: "Project Alpha",
  })

  // Post (Terminal) for the Task node
  const postId = createId()
  await db.insert(posts).values({ id: postId, organizationId: orgId, title: "Engineer" })

  // Rail with Trigger → Task
  const railId = createId()
  await db.insert(rails).values({
    id: railId,
    organizationId: orgId,
    particleTypeId: typeId,
    name: "Build Pipeline",
    status: "published",
    publishedAt: new Date(),
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
      name: "Engineering Review",
      postId,
      position: 1,
    },
  ])

  return { userId, orgId, typeId, particleId, postId, railId, triggerId, taskId }
}

describe("manifests module — db-level invariants", () => {
  it("creates a manifest scoped to the org and lists it back", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const id = createId()
      await db.insert(manifests).values({
        id,
        organizationId: orgId,
        name: "Project Brief",
        description: "Top-of-rail project facts",
        tags: ["onboarding"],
        fields: [],
        createdBy: userId,
        updatedBy: userId,
      })

      const rows = await db
        .select()
        .from(manifests)
        .where(and(eq(manifests.organizationId, orgId), isNull(manifests.deletedAt)))
        .orderBy(asc(manifests.name))
      expect(rows).toHaveLength(1)
      expect(rows[0]?.id).toBe(id)
      expect(rows[0]?.name).toBe("Project Brief")
      expect(rows[0]?.tags).toEqual(["onboarding"])
    })
  })

  it("attaching a manifest to a rail seeds rail_run_manifests rows when a run starts", async () => {
    await withTestDb(async (db) => {
      const s = await setupOrgWithRailAndManifest(db)

      // Manifest attached to the rail
      const manifestId = createId()
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Project Brief",
        fields: [],
        createdBy: s.userId,
        updatedBy: s.userId,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })

      // Start a rail run — model the action: create the run, then create
      // rail_run_manifests rows for every currently-attached manifest.
      const runId = createId()
      await db.insert(railRuns).values({
        id: runId,
        organizationId: s.orgId,
        railId: s.railId,
        particleId: s.particleId,
        startedBy: s.userId,
      })
      const attached = await db
        .select({ manifestId: railManifests.manifestId })
        .from(railManifests)
        .where(eq(railManifests.railId, s.railId))
      await db.insert(railRunManifests).values(
        attached.map((a) => ({
          id: createId(),
          railRunId: runId,
          manifestId: a.manifestId,
          data: {},
        })),
      )

      const runRows = await db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.railRunId, runId))
      expect(runRows).toHaveLength(1)
      expect(runRows[0]?.manifestId).toBe(manifestId)
      expect(runRows[0]?.data).toEqual({})
    })
  })

  it("updating run manifest data persists and writes an audit row", async () => {
    await withTestDb(async (db) => {
      const s = await setupOrgWithRailAndManifest(db)

      const manifestId = createId()
      const fields: ManifestFieldDef[] = [
        {
          key: "client_name",
          label: "Client Name",
          type: "text",
          position: 0,
          required: true,
          readOnly: false,
        },
      ]
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Project Brief",
        fields,
        createdBy: s.userId,
        updatedBy: s.userId,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })

      const runId = createId()
      await db.insert(railRuns).values({
        id: runId,
        organizationId: s.orgId,
        railId: s.railId,
        particleId: s.particleId,
        startedBy: s.userId,
      })
      const runManifestId = createId()
      await db.insert(railRunManifests).values({
        id: runManifestId,
        railRunId: runId,
        manifestId,
        data: {},
      })

      // Model updateRunManifestData: merge new data, write audit
      const newData = { client_name: "Acme Inc." }
      await db
        .update(railRunManifests)
        .set({ data: newData, updatedAt: new Date(), updatedBy: s.userId })
        .where(eq(railRunManifests.id, runManifestId))

      await audit(
        {
          db,
          organizationId: s.orgId,
          actorUserId: s.userId,
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
        },
        "manifests.data_updated",
        {
          resourceType: "rail_run",
          resourceId: runId,
          metadata: { manifestId, changedSlugs: ["client_name"] },
        },
      )

      const [persisted] = await db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.id, runManifestId))
      expect(persisted?.data).toEqual({ client_name: "Acme Inc." })

      const auditRows = await db
        .select()
        .from(auditLog)
        .where(
          and(eq(auditLog.organizationId, s.orgId), eq(auditLog.action, "manifests.data_updated")),
        )
      expect(auditRows).toHaveLength(1)
      expect(auditRows[0]?.resourceId).toBe(runId)
      expect((auditRows[0]?.metadata as { manifestId: string }).manifestId).toBe(manifestId)
    })
  })

  it("cycle complete with required manifest field empty is rejected (data layer model)", async () => {
    await withTestDb(async (db) => {
      const s = await setupOrgWithRailAndManifest(db)

      // Manifest with one required field
      const manifestId = createId()
      const fields: ManifestFieldDef[] = [
        {
          key: "client_name",
          label: "Client Name",
          type: "text",
          position: 0,
          required: true,
          readOnly: false,
        },
      ]
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Project Brief",
        fields,
        createdBy: s.userId,
        updatedBy: s.userId,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })

      // Task node requires this manifest field to advance
      await db
        .update(railNodes)
        .set({
          requiredManifestFieldSlugs: [{ manifestId, fieldSlug: "client_name" }],
        })
        .where(eq(railNodes.id, s.taskId))

      // Issue a run + cycle for the task with empty manifest data
      const runId = createId()
      await db.insert(railRuns).values({
        id: runId,
        organizationId: s.orgId,
        railId: s.railId,
        particleId: s.particleId,
        startedBy: s.userId,
      })
      const cycleId = createId()
      await db.insert(cycles).values({
        id: cycleId,
        organizationId: s.orgId,
        railRunId: runId,
        railNodeId: s.taskId,
        postId: s.postId,
        title: "Engineering Review",
        position: 1,
      })
      await db.insert(railRunManifests).values({
        id: createId(),
        railRunId: runId,
        manifestId,
        data: {},
      })

      // Model completeCycle's required-fields check: load required slugs,
      // gather rail_run_manifests data, find any whose value is empty.
      const [node] = await db
        .select({ requiredManifestFieldSlugs: railNodes.requiredManifestFieldSlugs })
        .from(railNodes)
        .where(eq(railNodes.id, s.taskId))
      const requirements = node?.requiredManifestFieldSlugs ?? []
      const runRows = await db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.railRunId, runId))
      const dataByManifest = new Map(runRows.map((r) => [r.manifestId, r.data]))
      const missing = requirements.filter((req) => {
        const data = dataByManifest.get(req.manifestId)
        if (!data) return false
        const v = data[req.fieldSlug]
        return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
      })
      expect(missing).toHaveLength(1)
      expect(missing[0]?.fieldSlug).toBe("client_name")
    })
  })

  it("cycle complete with required manifest field filled succeeds (data layer model)", async () => {
    await withTestDb(async (db) => {
      const s = await setupOrgWithRailAndManifest(db)

      const manifestId = createId()
      const fields: ManifestFieldDef[] = [
        {
          key: "client_name",
          label: "Client Name",
          type: "text",
          position: 0,
          required: true,
          readOnly: false,
        },
      ]
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Project Brief",
        fields,
        createdBy: s.userId,
        updatedBy: s.userId,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })
      await db
        .update(railNodes)
        .set({
          requiredManifestFieldSlugs: [{ manifestId, fieldSlug: "client_name" }],
        })
        .where(eq(railNodes.id, s.taskId))

      const runId = createId()
      await db.insert(railRuns).values({
        id: runId,
        organizationId: s.orgId,
        railId: s.railId,
        particleId: s.particleId,
        startedBy: s.userId,
      })
      const cycleId = createId()
      await db.insert(cycles).values({
        id: cycleId,
        organizationId: s.orgId,
        railRunId: runId,
        railNodeId: s.taskId,
        postId: s.postId,
        title: "Engineering Review",
        position: 1,
      })
      // Field is filled in run data
      await db.insert(railRunManifests).values({
        id: createId(),
        railRunId: runId,
        manifestId,
        data: { client_name: "Acme Inc." },
      })

      const [node] = await db
        .select({ requiredManifestFieldSlugs: railNodes.requiredManifestFieldSlugs })
        .from(railNodes)
        .where(eq(railNodes.id, s.taskId))
      const requirements = node?.requiredManifestFieldSlugs ?? []
      const runRows = await db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.railRunId, runId))
      const dataByManifest = new Map(runRows.map((r) => [r.manifestId, r.data]))
      const missing = requirements.filter((req) => {
        const data = dataByManifest.get(req.manifestId)
        if (!data) return false
        const v = data[req.fieldSlug]
        return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
      })
      expect(missing).toHaveLength(0)

      // Now actually complete the cycle
      await db
        .update(cycles)
        .set({ completedAt: new Date(), completedBy: s.userId })
        .where(eq(cycles.id, cycleId))
      const [completed] = await db.select().from(cycles).where(eq(cycles.id, cycleId))
      expect(completed?.completedAt).not.toBeNull()
    })
  })

  it("deleting a manifest currently attached to a rail is refused with the dependent rail name", async () => {
    await withTestDb(async (db) => {
      const s = await setupOrgWithRailAndManifest(db)

      const manifestId = createId()
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Project Brief",
        fields: [],
        createdBy: s.userId,
        updatedBy: s.userId,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })

      // Model deleteManifest's pre-flight: getRailsUsingManifest returns
      // > 0 rows → refuse with a list of rail names.
      const inUse = await db
        .select({ id: rails.id, name: rails.name })
        .from(railManifests)
        .innerJoin(rails, eq(rails.id, railManifests.railId))
        .where(
          and(
            eq(railManifests.manifestId, manifestId),
            eq(rails.organizationId, s.orgId),
            isNull(rails.deletedAt),
          ),
        )
      expect(inUse).toHaveLength(1)
      expect(inUse[0]?.name).toBe("Build Pipeline")
      // The action would throw ActionError("CONFLICT", ...) at this point.

      // Backstop: even if the action layer were bypassed, the FK on
      // rail_manifests.manifest_id (RESTRICT) blocks a hard delete.
      await expect(db.delete(manifests).where(eq(manifests.id, manifestId))).rejects.toThrow()
    })
  })

  it("removing a manifest field referenced by a rail node's required-fields is refused", async () => {
    await withTestDb(async (db) => {
      const s = await setupOrgWithRailAndManifest(db)

      const manifestId = createId()
      const fields: ManifestFieldDef[] = [
        {
          key: "client_name",
          label: "Client Name",
          type: "text",
          position: 0,
          required: true,
          readOnly: false,
        },
        {
          key: "deal_size",
          label: "Deal Size",
          type: "currency",
          position: 1,
          required: false,
          readOnly: false,
          currency: "USD",
        },
      ]
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Project Brief",
        fields,
        createdBy: s.userId,
        updatedBy: s.userId,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })
      // Task node requires client_name — so removing client_name must be refused.
      await db
        .update(railNodes)
        .set({
          requiredManifestFieldSlugs: [{ manifestId, fieldSlug: "client_name" }],
        })
        .where(eq(railNodes.id, s.taskId))

      // Model updateManifest's removed-key enforcement: it computes
      // removedKeys = old - new, then runs the JSONB query.
      const newFields: ManifestFieldDef[] = [
        // client_name dropped, only deal_size left
        {
          key: "deal_size",
          label: "Deal Size",
          type: "currency",
          position: 0,
          required: false,
          readOnly: false,
          currency: "USD",
        },
      ]
      const oldKeys = new Set(fields.map((f) => f.key))
      const newKeys = new Set(newFields.map((f) => f.key))
      const removedKeys = [...oldKeys].filter((k) => !newKeys.has(k))
      expect(removedKeys).toEqual(["client_name"])

      // PG array literal: drizzle's sql template flattens single-element JS
      // arrays into a scalar param, so pass the array as text[] explicitly.
      const removedKeysLiteral = `{${removedKeys.map((k) => `"${k.replace(/"/g, '\\"')}"`).join(",")}}`
      const requiringNodes = await db.execute<{
        rail_node_id: string
        rail_id: string
        field_slug: string
      }>(sql`
        select
          rn.id as rail_node_id,
          rn.rail_id,
          elem->>'fieldSlug' as field_slug
        from rail_nodes rn,
          jsonb_array_elements(rn.required_manifest_field_slugs) elem
        where rn.organization_id = ${s.orgId}
          and rn.deleted_at is null
          and elem->>'manifestId' = ${manifestId}
          and elem->>'fieldSlug' = any(${removedKeysLiteral}::text[])
      `)
      expect(requiringNodes.rows).toHaveLength(1)
      expect(requiringNodes.rows[0]?.field_slug).toBe("client_name")
      // The action would throw ActionError("CONFLICT", ...) here.
    })
  })

  it("detaching a manifest with in-flight runs preserves rail_run_manifests rows", async () => {
    await withTestDb(async (db) => {
      const s = await setupOrgWithRailAndManifest(db)

      const manifestId = createId()
      await db.insert(manifests).values({
        id: manifestId,
        organizationId: s.orgId,
        name: "Project Brief",
        fields: [],
        createdBy: s.userId,
        updatedBy: s.userId,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: s.railId,
        manifestId,
        position: 0,
      })

      const runId = createId()
      await db.insert(railRuns).values({
        id: runId,
        organizationId: s.orgId,
        railId: s.railId,
        particleId: s.particleId,
        startedBy: s.userId,
      })
      const runManifestId = createId()
      await db.insert(railRunManifests).values({
        id: runManifestId,
        railRunId: runId,
        manifestId,
        data: { existing_field: "preserved value" },
      })

      // Detach: remove the rail_manifests join row only. Runtime data must survive.
      await db
        .delete(railManifests)
        .where(and(eq(railManifests.railId, s.railId), eq(railManifests.manifestId, manifestId)))

      const [runRow] = await db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.id, runManifestId))
      expect(runRow).toBeDefined()
      expect(runRow?.data).toEqual({ existing_field: "preserved value" })

      const stillAttached = await db
        .select()
        .from(railManifests)
        .where(eq(railManifests.railId, s.railId))
      expect(stillAttached).toHaveLength(0)
    })
  })

  it("cross-org isolation: org A cannot see, mutate, attach, or write to org B's manifests", async () => {
    await withTestDb(async (db) => {
      // Two distinct orgs, each with their own user.
      const userA = await createUser(db, { name: "User A" })
      const orgA = await createOrganization(db, userA, { name: "Org A" })
      const userB = await createUser(db, { name: "User B" })
      const orgB = await createOrganization(db, userB, { name: "Org B" })

      // Org B has a manifest, a rail, and a run with run-data.
      const typeB = createId()
      await db.insert(particleTypes).values({ id: typeB, organizationId: orgB, name: "Project" })
      const particleB = createId()
      await db.insert(particles).values({
        id: particleB,
        organizationId: orgB,
        particleTypeId: typeB,
        name: "B's Project",
      })
      const postB = createId()
      await db.insert(posts).values({ id: postB, organizationId: orgB, title: "Engineer" })
      const railB = createId()
      await db.insert(rails).values({
        id: railB,
        organizationId: orgB,
        particleTypeId: typeB,
        name: "B's Rail",
      })
      const manifestB = createId()
      await db.insert(manifests).values({
        id: manifestB,
        organizationId: orgB,
        name: "B's Manifest",
        fields: [],
        createdBy: userB,
        updatedBy: userB,
      })
      await db.insert(railManifests).values({
        id: createId(),
        railId: railB,
        manifestId: manifestB,
        position: 0,
      })
      const runB = createId()
      await db.insert(railRuns).values({
        id: runB,
        organizationId: orgB,
        railId: railB,
        particleId: particleB,
        startedBy: userB,
      })
      await db.insert(railRunManifests).values({
        id: createId(),
        railRunId: runB,
        manifestId: manifestB,
        data: { secret: "B's data" },
      })

      // 1) Org A's manifest list must not include Org B's manifest.
      const visibleToA = await db
        .select()
        .from(manifests)
        .where(and(eq(manifests.organizationId, orgA), isNull(manifests.deletedAt)))
      expect(visibleToA).toHaveLength(0)

      // 2) Org A trying to read Org B's manifest by id, scoped to orgA, returns null.
      const [crossRead] = await db
        .select()
        .from(manifests)
        .where(
          and(
            eq(manifests.id, manifestB),
            eq(manifests.organizationId, orgA),
            isNull(manifests.deletedAt),
          ),
        )
        .limit(1)
      expect(crossRead).toBeUndefined()

      // 3) Org A trying to "update" with org-scope filter affects 0 rows.
      const updateResult = await db
        .update(manifests)
        .set({ name: "Hijacked", updatedAt: new Date(), updatedBy: userA })
        .where(and(eq(manifests.id, manifestB), eq(manifests.organizationId, orgA)))
        .returning({ id: manifests.id })
      expect(updateResult).toHaveLength(0)
      const [stillB] = await db.select().from(manifests).where(eq(manifests.id, manifestB))
      expect(stillB?.name).toBe("B's Manifest")

      // 4) Org A's attach-to-rail action looks up the rail filtered by orgA.
      // The rail belongs to orgB so the lookup returns nothing — the action
      // would throw NOT_FOUND. We verify the lookup is empty.
      const [attachRailLookup] = await db
        .select({ id: rails.id })
        .from(rails)
        .where(and(eq(rails.id, railB), eq(rails.organizationId, orgA), isNull(rails.deletedAt)))
        .limit(1)
      expect(attachRailLookup).toBeUndefined()

      // 5) Org A trying to write to Org B's run-manifest row, scoped via the
      // run's rail's organizationId, must affect 0 rows.
      const writeResult = await db
        .update(railRunManifests)
        .set({ data: { secret: "stolen by A" }, updatedAt: new Date(), updatedBy: userA })
        .from(railRuns)
        .where(
          and(
            eq(railRunManifests.railRunId, runB),
            eq(railRunManifests.manifestId, manifestB),
            eq(railRuns.id, railRunManifests.railRunId),
            // Force orgA scope — won't match because the run is in orgB.
            eq(railRuns.organizationId, orgA),
          ),
        )
        .returning({ id: railRunManifests.id })
      expect(writeResult).toHaveLength(0)
      const [bData] = await db
        .select()
        .from(railRunManifests)
        .where(eq(railRunManifests.railRunId, runB))
      expect(bData?.data).toEqual({ secret: "B's data" })
    })
  })
})
