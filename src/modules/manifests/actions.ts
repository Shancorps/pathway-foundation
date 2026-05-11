"use server"

import { revalidatePath } from "next/cache"
import { and, eq, isNull, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { ActionError, orgAction } from "@/lib/safe-action"
import { audit } from "@/modules/audit/audit"
import { hasPermission } from "@/modules/auth/permissions"
import { railNodes, rails } from "@/modules/rails/schema"
import { railRuns } from "@/modules/rail-runs/schema"
import { manifests, railManifests, railRunManifests } from "./schema"
import { ensureRailRunManifestRows, getRailsUsingManifest } from "./queries"
import {
  attachManifestInput,
  createManifestInput,
  deleteManifestInput,
  detachManifestInput,
  reorderRailManifestsInput,
  setRequiredFieldsInput,
  updateManifestInput,
  updateRunManifestDataInput,
} from "./types"

export const createManifest = orgAction
  .metadata({ actionName: "manifests.create" })
  .inputSchema(createManifestInput)
  .action(async ({ parsedInput, ctx }) => {
    const allowed = await hasPermission(ctx.activeOrg.id, ctx.session.user.id, "canBuildManifests")
    if (!allowed) {
      throw new ActionError("FORBIDDEN", "You don't have permission to build manifests.")
    }
    const id = createId()
    await ctx.db.insert(manifests).values({
      id,
      organizationId: ctx.activeOrg.id,
      name: parsedInput.name,
      description: parsedInput.description,
      tags: parsedInput.tags,
      fields: [],
      createdBy: ctx.session.user.id,
      updatedBy: ctx.session.user.id,
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.created",
      { resourceType: "manifest", resourceId: id, metadata: { name: parsedInput.name } },
    )
    revalidatePath("/admin/manifest-management")
    return { id }
  })

export const updateManifest = orgAction
  .metadata({ actionName: "manifests.update" })
  .inputSchema(updateManifestInput)
  .action(async ({ parsedInput, ctx }) => {
    const allowed = await hasPermission(ctx.activeOrg.id, ctx.session.user.id, "canBuildManifests")
    if (!allowed) {
      throw new ActionError("FORBIDDEN", "You don't have permission to build manifests.")
    }
    const { id, fields, ...rest } = parsedInput

    let addedKeys: string[] = []
    let removedKeys: string[] = []

    // Field edits are allowed even while in-flight runs reference the manifest.
    // The narrower field-deletion-enforcement below catches the actually-dangerous
    // case: removing a slug that's referenced by a node's required list or a
    // statistic's manifestField. Removing an unreferenced slug just leaves its
    // value as orphan JSONB on existing runs — harmless (runtime silently skips
    // unknown slugs per spec §5.4). Adding fields or editing labels is always safe.
    if (fields !== undefined) {
      // Field-deletion enforcement: if a field is being removed (or its key
      // changed) and that key is referenced by a rail node's
      // requiredManifestFieldSlugs OR a statistic node's manifestField,
      // refuse with the list of referencing nodes.
      const [existing] = await ctx.db
        .select({ fields: manifests.fields })
        .from(manifests)
        .where(eq(manifests.id, id))
        .limit(1)
      const oldKeys = new Set((existing?.fields ?? []).map((f) => f.key))
      const newKeys = new Set(fields.map((f) => f.key))
      removedKeys = [...oldKeys].filter((k) => !newKeys.has(k))
      addedKeys = [...newKeys].filter((k) => !oldKeys.has(k))

      if (removedKeys.length > 0) {
        // Build a Postgres text[] array literal from removedKeys. Drizzle's
        // sql tagged template binds a single-element JS string array as a
        // scalar text, which Postgres then rejects with "malformed array
        // literal" when used inside any(...). Encoding to a literal and
        // casting with ::text[] sidesteps that ambiguity.
        const removedKeysArr = `{${removedKeys
          .map((k) => `"${k.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
          .join(",")}}`

        // Check rail_nodes.requiredManifestFieldSlugs (JSONB array of {manifestId, fieldSlug})
        // Use a JSONB containment query — Postgres can match on any element matching {manifestId: id, fieldSlug: <removed>}
        const requiringNodes = await ctx.db.execute<{
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
          where rn.organization_id = ${ctx.activeOrg.id}
            and rn.deleted_at is null
            and elem->>'manifestId' = ${id}
            and elem->>'fieldSlug' = any(${removedKeysArr}::text[])
        `)
        if (requiringNodes.rows.length > 0) {
          const slugs = [...new Set(requiringNodes.rows.map((r) => r.field_slug))].join(", ")
          throw new ActionError(
            "CONFLICT",
            `Cannot remove field(s) ${slugs}: referenced by ${String(requiringNodes.rows.length)} rail node(s) as required-to-advance.`,
          )
        }

        // Check rail_nodes.config for statistic nodes referencing this field
        const statNodes = await ctx.db.execute<{
          rail_node_id: string
          field_slug: string
        }>(sql`
          select
            rn.id as rail_node_id,
            rn.config->>'manifestField' as field_slug
          from rail_nodes rn
          where rn.organization_id = ${ctx.activeOrg.id}
            and rn.deleted_at is null
            and rn.type = 'statistic'
            and rn.config->>'manifestField' = any(${removedKeysArr}::text[])
        `)
        if (statNodes.rows.length > 0) {
          const slugs = [...new Set(statNodes.rows.map((r) => r.field_slug))].join(", ")
          throw new ActionError(
            "CONFLICT",
            `Cannot remove field(s) ${slugs}: referenced by ${String(statNodes.rows.length)} statistic node(s) as their value source.`,
          )
        }
      }
    }

    const setExpr: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.session.user.id,
    }
    if (rest.name !== undefined) setExpr.name = rest.name
    if (rest.description !== undefined) setExpr.description = rest.description
    if (rest.tags !== undefined) setExpr.tags = rest.tags
    if (fields !== undefined) setExpr.fields = fields

    const result = await ctx.db
      .update(manifests)
      .set(setExpr)
      .where(
        and(
          eq(manifests.id, id),
          eq(manifests.organizationId, ctx.activeOrg.id),
          isNull(manifests.deletedAt),
        ),
      )
      .returning({ id: manifests.id })

    if (result.length === 0) {
      throw new ActionError("NOT_FOUND", "Manifest not found")
    }

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.updated",
      {
        resourceType: "manifest",
        resourceId: id,
        metadata: {
          addedKeys: fields !== undefined ? addedKeys : undefined,
          removedKeys: fields !== undefined ? removedKeys : undefined,
          name: rest.name,
        },
      },
    )
    revalidatePath("/admin/manifest-management")
    revalidatePath(`/admin/manifest-management/${id}`)
    return { id }
  })

export const deleteManifest = orgAction
  .metadata({ actionName: "manifests.delete" })
  .inputSchema(deleteManifestInput)
  .action(async ({ parsedInput, ctx }) => {
    const allowed = await hasPermission(ctx.activeOrg.id, ctx.session.user.id, "canBuildManifests")
    if (!allowed) {
      throw new ActionError("FORBIDDEN", "You don't have permission to build manifests.")
    }
    // Hard-refusal if any rail uses this manifest. Action layer surfaces
    // the dependent rail names; the user must detach first.
    const inUse = await getRailsUsingManifest(ctx.activeOrg.id, parsedInput.id)
    if (inUse.length > 0) {
      throw new ActionError(
        "CONFLICT",
        `Cannot delete: in use by ${String(inUse.length)} rail(s): ${inUse.map((r) => r.name).join(", ")}. Detach from each rail before deleting.`,
      )
    }

    const result = await ctx.db
      .update(manifests)
      .set({ deletedAt: new Date(), deletedBy: ctx.session.user.id })
      .where(
        and(
          eq(manifests.id, parsedInput.id),
          eq(manifests.organizationId, ctx.activeOrg.id),
          isNull(manifests.deletedAt),
        ),
      )
      .returning({ id: manifests.id })

    if (result.length === 0) {
      throw new ActionError("NOT_FOUND", "Manifest not found or already deleted")
    }

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.deleted",
      { resourceType: "manifest", resourceId: parsedInput.id },
    )
    revalidatePath("/admin/manifest-management")
    return { id: parsedInput.id }
  })

export const attachManifestToRail = orgAction
  .metadata({ actionName: "manifests.attach_to_rail" })
  .inputSchema(attachManifestInput)
  .action(async ({ parsedInput, ctx }) => {
    // Org-scope verification: both the rail and the manifest must belong to
    // the active org. Don't disclose existence on mismatch — return NOT_FOUND.
    const [railRow] = await ctx.db
      .select({ id: rails.id })
      .from(rails)
      .where(
        and(
          eq(rails.id, parsedInput.railId),
          eq(rails.organizationId, ctx.activeOrg.id),
          isNull(rails.deletedAt),
        ),
      )
      .limit(1)
    if (!railRow) {
      throw new ActionError("NOT_FOUND", "Rail not found")
    }
    const [manifestRow] = await ctx.db
      .select({ id: manifests.id })
      .from(manifests)
      .where(
        and(
          eq(manifests.id, parsedInput.manifestId),
          eq(manifests.organizationId, ctx.activeOrg.id),
          isNull(manifests.deletedAt),
        ),
      )
      .limit(1)
    if (!manifestRow) {
      throw new ActionError("NOT_FOUND", "Manifest not found")
    }

    // Determine next position
    const [maxRow] = await ctx.db
      .select({ max: sql<number>`coalesce(max(${railManifests.position}), -1)::int` })
      .from(railManifests)
      .where(eq(railManifests.railId, parsedInput.railId))
    const nextPos = (maxRow?.max ?? -1) + 1

    const id = createId()
    await ctx.db
      .insert(railManifests)
      .values({
        id,
        railId: parsedInput.railId,
        manifestId: parsedInput.manifestId,
        position: nextPos,
      })
      .onConflictDoNothing({
        target: [railManifests.railId, railManifests.manifestId],
      })

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.attached_to_rail",
      {
        resourceType: "rail",
        resourceId: parsedInput.railId,
        metadata: { manifestId: parsedInput.manifestId },
      },
    )
    revalidatePath(`/admin/rail-management/${parsedInput.railId}`)
    return { id, railId: parsedInput.railId, manifestId: parsedInput.manifestId }
  })

export const detachManifestFromRail = orgAction
  .metadata({ actionName: "manifests.detach_from_rail" })
  .inputSchema(detachManifestInput)
  .action(async ({ parsedInput, ctx }) => {
    // Org-scope verification: both the rail and the manifest must belong to
    // the active org before we mutate the join row.
    const [railRow] = await ctx.db
      .select({ id: rails.id })
      .from(rails)
      .where(
        and(
          eq(rails.id, parsedInput.railId),
          eq(rails.organizationId, ctx.activeOrg.id),
          isNull(rails.deletedAt),
        ),
      )
      .limit(1)
    if (!railRow) {
      throw new ActionError("NOT_FOUND", "Rail not found")
    }
    const [manifestRow] = await ctx.db
      .select({ id: manifests.id })
      .from(manifests)
      .where(
        and(
          eq(manifests.id, parsedInput.manifestId),
          eq(manifests.organizationId, ctx.activeOrg.id),
          isNull(manifests.deletedAt),
        ),
      )
      .limit(1)
    if (!manifestRow) {
      throw new ActionError("NOT_FOUND", "Manifest not found")
    }

    await ctx.db
      .delete(railManifests)
      .where(
        and(
          eq(railManifests.railId, parsedInput.railId),
          eq(railManifests.manifestId, parsedInput.manifestId),
        ),
      )
    // Note: rail_run_manifests rows are intentionally preserved so in-flight
    // run data isn't lost. Reattaching the manifest to the rail later will
    // surface the existing data again.

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.detached_from_rail",
      {
        resourceType: "rail",
        resourceId: parsedInput.railId,
        metadata: { manifestId: parsedInput.manifestId },
      },
    )
    revalidatePath(`/admin/rail-management/${parsedInput.railId}`)
    return { railId: parsedInput.railId, manifestId: parsedInput.manifestId }
  })

export const reorderRailManifests = orgAction
  .metadata({ actionName: "manifests.reorder_rail_manifests" })
  .inputSchema(reorderRailManifestsInput)
  .action(async ({ parsedInput, ctx }) => {
    // Org-scope verification: confirm the rail belongs to the active org.
    // Once that's true, the rail_manifests rows under it are implicitly
    // org-scoped (rails.organization_id is the source of truth) — so the
    // transaction body only needs to filter on railId+manifestId.
    const [railRow] = await ctx.db
      .select({ id: rails.id })
      .from(rails)
      .where(
        and(
          eq(rails.id, parsedInput.railId),
          eq(rails.organizationId, ctx.activeOrg.id),
          isNull(rails.deletedAt),
        ),
      )
      .limit(1)
    if (!railRow) {
      throw new ActionError("NOT_FOUND", "Rail not found")
    }

    await ctx.db.transaction(async (tx) => {
      for (let i = 0; i < parsedInput.manifestIds.length; i++) {
        const manifestId = parsedInput.manifestIds[i]
        if (!manifestId) continue
        await tx
          .update(railManifests)
          .set({ position: i, updatedAt: new Date() })
          .where(
            and(
              eq(railManifests.railId, parsedInput.railId),
              eq(railManifests.manifestId, manifestId),
            ),
          )
      }
    })

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.reorder_rail_manifests",
      {
        resourceType: "rail",
        resourceId: parsedInput.railId,
        metadata: {
          railId: parsedInput.railId,
          manifestIds: parsedInput.manifestIds,
        },
      },
    )
    revalidatePath(`/admin/rail-management/${parsedInput.railId}`)
    return { railId: parsedInput.railId }
  })

export const updateRunManifestData = orgAction
  .metadata({ actionName: "manifests.update_run_data" })
  .inputSchema(updateRunManifestDataInput)
  .action(async ({ parsedInput, ctx }) => {
    // Org-scope verification: confirm the rail run belongs (via its rail) to
    // the active org, and the manifest does too. Without this, a user from
    // org A could pass a rail-run id from org B and ensureRailRunManifestRows
    // would happily create rows.
    const [runRow] = await ctx.db
      .select({ id: railRuns.id })
      .from(railRuns)
      .innerJoin(rails, eq(rails.id, railRuns.railId))
      .where(
        and(
          eq(railRuns.id, parsedInput.railRunId),
          eq(rails.organizationId, ctx.activeOrg.id),
          isNull(railRuns.deletedAt),
        ),
      )
      .limit(1)
    if (!runRow) {
      throw new ActionError("NOT_FOUND", "Rail run not found")
    }
    const [manifestRow] = await ctx.db
      .select({ id: manifests.id })
      .from(manifests)
      .where(
        and(
          eq(manifests.id, parsedInput.manifestId),
          eq(manifests.organizationId, ctx.activeOrg.id),
          isNull(manifests.deletedAt),
        ),
      )
      .limit(1)
    if (!manifestRow) {
      throw new ActionError("NOT_FOUND", "Manifest not found")
    }

    // Lazy-ensure the row exists (covers manifests attached after the run started).
    await ensureRailRunManifestRows(parsedInput.railRunId)

    // Read current data for the audit diff.
    const [existing] = await ctx.db
      .select()
      .from(railRunManifests)
      .where(
        and(
          eq(railRunManifests.railRunId, parsedInput.railRunId),
          eq(railRunManifests.manifestId, parsedInput.manifestId),
        ),
      )
      .limit(1)
    if (!existing) {
      throw new ActionError("NOT_FOUND", "Manifest is not attached to this rail run.")
    }

    const oldData = existing.data
    const newData = { ...oldData, ...parsedInput.data }

    await ctx.db
      .update(railRunManifests)
      .set({
        data: newData,
        updatedAt: new Date(),
        updatedBy: ctx.session.user.id,
      })
      .where(eq(railRunManifests.id, existing.id))

    // Diff: which slugs changed and to what.
    const changedSlugs = Object.keys(parsedInput.data).filter(
      (k) => JSON.stringify(oldData[k]) !== JSON.stringify(parsedInput.data[k]),
    )

    if (changedSlugs.length > 0) {
      await audit(
        {
          db: ctx.db,
          organizationId: ctx.activeOrg.id,
          actorUserId: ctx.session.user.id,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        "manifests.data_updated",
        {
          resourceType: "rail_run",
          resourceId: parsedInput.railRunId,
          metadata: {
            manifestId: parsedInput.manifestId,
            changedSlugs,
          },
        },
      )
    }

    revalidatePath(`/runs/${parsedInput.railRunId}`)
    return { ok: true }
  })

export const setNodeRequiredFields = orgAction
  .metadata({ actionName: "manifests.set_node_required_fields" })
  .inputSchema(setRequiredFieldsInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await ctx.db
      .update(railNodes)
      .set({
        requiredManifestFieldSlugs: parsedInput.required,
        updatedAt: new Date(),
        updatedBy: ctx.session.user.id,
      })
      .where(
        and(
          eq(railNodes.id, parsedInput.railNodeId),
          eq(railNodes.organizationId, ctx.activeOrg.id),
          isNull(railNodes.deletedAt),
        ),
      )
      .returning({ id: railNodes.id, railId: railNodes.railId })

    const updatedNode = result[0]
    if (!updatedNode) {
      throw new ActionError("NOT_FOUND", "Rail node not found")
    }

    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "manifests.set_node_required_fields",
      {
        resourceType: "rail_node",
        resourceId: parsedInput.railNodeId,
        metadata: {
          railNodeId: parsedInput.railNodeId,
          required: parsedInput.required,
        },
      },
    )
    revalidatePath(`/admin/rail-management/${updatedNode.railId}`)
    return { railNodeId: parsedInput.railNodeId }
  })
