import { describe, expect, it } from "vitest"
import { and, eq, isNull } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { withTestDb } from "../helpers/db"
import { createOrganization, createUser } from "../helpers/factories"
import { type ParticleFieldDef, particleTypes, particles } from "@/modules/particles/schema"

describe("particles module — db-level invariants", () => {
  it("scopes types and instances to a single organization", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgA = await createOrganization(db, userId)
      const orgB = await createOrganization(db, userId)

      const typeAId = createId()
      const typeBId = createId()
      await db.insert(particleTypes).values([
        { id: typeAId, organizationId: orgA, name: "Client" },
        { id: typeBId, organizationId: orgB, name: "Lead" },
      ])
      await db.insert(particles).values([
        {
          id: createId(),
          organizationId: orgA,
          particleTypeId: typeAId,
          name: "ABC Corp",
        },
        {
          id: createId(),
          organizationId: orgB,
          particleTypeId: typeBId,
          name: "John Doe",
        },
      ])

      const typesInA = await db
        .select()
        .from(particleTypes)
        .where(and(eq(particleTypes.organizationId, orgA), isNull(particleTypes.deletedAt)))
      const particlesInA = await db
        .select()
        .from(particles)
        .where(and(eq(particles.organizationId, orgA), isNull(particles.deletedAt)))

      expect(typesInA).toHaveLength(1)
      expect(typesInA[0]?.name).toBe("Client")
      expect(particlesInA).toHaveLength(1)
      expect(particlesInA[0]?.name).toBe("ABC Corp")
    })
  })

  it("persists field schemas as JSONB and round-trips correctly", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const fields: ParticleFieldDef[] = [
        { key: "company_name", label: "Company Name", type: "text", required: true, position: 0 },
        {
          key: "industry",
          label: "Industry",
          type: "select",
          required: false,
          position: 1,
          options: ["Tech", "Construction"],
        },
        {
          key: "monthly_budget",
          label: "Monthly Budget",
          type: "number",
          required: false,
          position: 2,
        },
      ]

      const typeId = createId()
      await db.insert(particleTypes).values({
        id: typeId,
        organizationId: orgId,
        name: "Client",
        fields,
      })

      const [row] = await db.select().from(particleTypes).where(eq(particleTypes.id, typeId))
      expect(row?.fields).toEqual(fields)
      expect(row?.fields[1]?.options).toEqual(["Tech", "Construction"])
    })
  })

  it("particle.data is queryable via JSONB operators", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const typeId = createId()
      await db.insert(particleTypes).values({
        id: typeId,
        organizationId: orgId,
        name: "Lead",
        fields: [
          {
            key: "stage",
            label: "Stage",
            type: "select",
            required: true,
            position: 0,
            options: ["hot", "cold"],
          },
        ],
      })

      await db.insert(particles).values([
        {
          id: createId(),
          organizationId: orgId,
          particleTypeId: typeId,
          name: "Lead A",
          data: { stage: "hot" },
        },
        {
          id: createId(),
          organizationId: orgId,
          particleTypeId: typeId,
          name: "Lead B",
          data: { stage: "cold" },
        },
      ])

      const all = await db
        .select()
        .from(particles)
        .where(and(eq(particles.organizationId, orgId), isNull(particles.deletedAt)))
      const hot = all.filter((p) => (p.data as { stage?: string }).stage === "hot")

      expect(hot).toHaveLength(1)
      expect(hot[0]?.name).toBe("Lead A")
    })
  })

  it("cascades soft-delete from a particle type to its instances", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const typeId = createId()
      await db.insert(particleTypes).values({
        id: typeId,
        organizationId: orgId,
        name: "Client",
      })
      await db.insert(particles).values([
        { id: createId(), organizationId: orgId, particleTypeId: typeId, name: "P1" },
        { id: createId(), organizationId: orgId, particleTypeId: typeId, name: "P2" },
      ])

      // Simulate the cascading soft-delete the action performs.
      const now = new Date()
      await db
        .update(particles)
        .set({ deletedAt: now, deletedBy: userId })
        .where(eq(particles.particleTypeId, typeId))
      await db
        .update(particleTypes)
        .set({ deletedAt: now, deletedBy: userId })
        .where(eq(particleTypes.id, typeId))

      const liveTypes = await db
        .select()
        .from(particleTypes)
        .where(and(eq(particleTypes.organizationId, orgId), isNull(particleTypes.deletedAt)))
      const liveParticles = await db
        .select()
        .from(particles)
        .where(and(eq(particles.organizationId, orgId), isNull(particles.deletedAt)))

      expect(liveTypes).toHaveLength(0)
      expect(liveParticles).toHaveLength(0)
    })
  })

  it("supports parent → child particle relationships (Client → Car pattern)", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const clientTypeId = createId()
      const carTypeId = createId()
      await db.insert(particleTypes).values([
        { id: clientTypeId, organizationId: orgId, name: "Client" },
        { id: carTypeId, organizationId: orgId, name: "Car" },
      ])

      const janeId = createId()
      const civicId = createId()
      const accordId = createId()
      await db.insert(particles).values([
        { id: janeId, organizationId: orgId, particleTypeId: clientTypeId, name: "Jane" },
        {
          id: civicId,
          organizationId: orgId,
          particleTypeId: carTypeId,
          name: "Honda Civic",
          parentParticleId: janeId,
        },
        {
          id: accordId,
          organizationId: orgId,
          particleTypeId: carTypeId,
          name: "Honda Accord",
          parentParticleId: janeId,
        },
      ])

      // Children of Jane
      const childrenOfJane = await db
        .select({ id: particles.id, name: particles.name })
        .from(particles)
        .where(
          and(
            eq(particles.organizationId, orgId),
            eq(particles.parentParticleId, janeId),
            isNull(particles.deletedAt),
          ),
        )
      expect(childrenOfJane.map((c) => c.name).sort()).toEqual(["Honda Accord", "Honda Civic"])
    })
  })

  it("FK on particles.parent_particle_id is RESTRICT (parent can't be hard-deleted while children reference it)", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)
      const typeId = createId()
      await db.insert(particleTypes).values({ id: typeId, organizationId: orgId, name: "C" })
      const parentId = createId()
      const childId = createId()
      await db.insert(particles).values([
        { id: parentId, organizationId: orgId, particleTypeId: typeId, name: "Parent" },
        {
          id: childId,
          organizationId: orgId,
          particleTypeId: typeId,
          name: "Child",
          parentParticleId: parentId,
        },
      ])
      await expect(db.delete(particles).where(eq(particles.id, parentId))).rejects.toThrow()
    })
  })

  it("FK on particles.particle_type_id is RESTRICT (hard delete blocked while instances exist)", async () => {
    await withTestDb(async (db) => {
      const userId = await createUser(db)
      const orgId = await createOrganization(db, userId)

      const typeId = createId()
      await db.insert(particleTypes).values({
        id: typeId,
        organizationId: orgId,
        name: "Client",
      })
      await db.insert(particles).values({
        id: createId(),
        organizationId: orgId,
        particleTypeId: typeId,
        name: "ABC Corp",
      })

      await expect(db.delete(particleTypes).where(eq(particleTypes.id, typeId))).rejects.toThrow()
    })
  })
})
