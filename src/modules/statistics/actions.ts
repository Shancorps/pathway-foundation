"use server"

import { revalidatePath } from "next/cache"
import { and, eq, isNull } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { ActionError, orgAction } from "@/lib/safe-action"
import { audit } from "@/modules/audit/audit"
import { dataPoints, statistics } from "./schema"
import {
  addDataPointInput,
  createStatisticInput,
  deleteDataPointInput,
  deleteStatisticInput,
  updateDataPointInput,
  updateStatisticInput,
} from "./types"

const STATS_PATH = "/stats"

type Ctx = Parameters<Parameters<typeof orgAction.action>[0]>[0]["ctx"]

async function loadStatistic(ctx: Ctx, id: string) {
  const [row] = await ctx.db
    .select()
    .from(statistics)
    .where(
      and(
        eq(statistics.id, id),
        eq(statistics.organizationId, ctx.activeOrg.id),
        isNull(statistics.deletedAt),
      ),
    )
    .limit(1)
  if (!row) throw new ActionError("NOT_FOUND", "Statistic not found")
  return row
}

async function loadDataPoint(ctx: Ctx, id: string) {
  const [row] = await ctx.db
    .select()
    .from(dataPoints)
    .where(
      and(
        eq(dataPoints.id, id),
        eq(dataPoints.organizationId, ctx.activeOrg.id),
        isNull(dataPoints.deletedAt),
      ),
    )
    .limit(1)
  if (!row) throw new ActionError("NOT_FOUND", "Data point not found")
  return row
}

export const createStatistic = orgAction
  .metadata({ actionName: "statistics.created" })
  .inputSchema(createStatisticInput)
  .action(async ({ parsedInput, ctx }) => {
    const id = createId()
    await ctx.db.insert(statistics).values({
      id,
      organizationId: ctx.activeOrg.id,
      name: parsedInput.name,
      unit: parsedInput.unit ?? null,
      frequency: parsedInput.frequency,
      dayOfWeek: parsedInput.frequency === "weekly" ? (parsedInput.dayOfWeek ?? null) : null,
      dayOfMonth: parsedInput.frequency === "monthly" ? (parsedInput.dayOfMonth ?? null) : null,
      color: parsedInput.color,
      lowerIsBetter: parsedInput.lowerIsBetter,
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "statistics.created",
      {
        resourceType: "statistic",
        resourceId: id,
        metadata: { name: parsedInput.name, frequency: parsedInput.frequency },
      },
    )
    revalidatePath(STATS_PATH)
    return { id }
  })

export const updateStatistic = orgAction
  .metadata({ actionName: "statistics.updated" })
  .inputSchema(updateStatisticInput)
  .action(async ({ parsedInput, ctx }) => {
    const existing = await loadStatistic(ctx, parsedInput.id)
    await ctx.db
      .update(statistics)
      .set({
        name: parsedInput.name,
        unit: parsedInput.unit ?? null,
        frequency: parsedInput.frequency,
        dayOfWeek: parsedInput.frequency === "weekly" ? (parsedInput.dayOfWeek ?? null) : null,
        dayOfMonth: parsedInput.frequency === "monthly" ? (parsedInput.dayOfMonth ?? null) : null,
        color: parsedInput.color,
        lowerIsBetter: parsedInput.lowerIsBetter,
        updatedAt: new Date(),
      })
      .where(eq(statistics.id, existing.id))
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "statistics.updated",
      {
        resourceType: "statistic",
        resourceId: existing.id,
        metadata: { name: parsedInput.name },
      },
    )
    revalidatePath(STATS_PATH)
    return { id: existing.id }
  })

export const deleteStatistic = orgAction
  .metadata({ actionName: "statistics.deleted" })
  .inputSchema(deleteStatisticInput)
  .action(async ({ parsedInput, ctx }) => {
    const existing = await loadStatistic(ctx, parsedInput.id)
    const now = new Date()
    // Soft-delete the stat AND all its data points so the stat list and the
    // points list filters consistently on deletedAt.
    await ctx.db
      .update(statistics)
      .set({ deletedAt: now, deletedBy: ctx.session.user.id, updatedAt: now })
      .where(eq(statistics.id, existing.id))
    await ctx.db
      .update(dataPoints)
      .set({ deletedAt: now, deletedBy: ctx.session.user.id, updatedAt: now })
      .where(
        and(
          eq(dataPoints.statisticId, existing.id),
          eq(dataPoints.organizationId, ctx.activeOrg.id),
          isNull(dataPoints.deletedAt),
        ),
      )
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "statistics.deleted",
      {
        resourceType: "statistic",
        resourceId: existing.id,
        metadata: { name: existing.name },
      },
    )
    revalidatePath(STATS_PATH)
    return { id: existing.id }
  })

export const addDataPoint = orgAction
  .metadata({ actionName: "statistics.data_point_added" })
  .inputSchema(addDataPointInput)
  .action(async ({ parsedInput, ctx }) => {
    const stat = await loadStatistic(ctx, parsedInput.statisticId)
    const id = createId()
    await ctx.db.insert(dataPoints).values({
      id,
      organizationId: ctx.activeOrg.id,
      statisticId: stat.id,
      date: parsedInput.date,
      value: parsedInput.value,
      note: parsedInput.note ?? null,
      source: "manual",
      createdBy: ctx.session.user.id,
    })
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "statistics.data_point_added",
      {
        resourceType: "data_point",
        resourceId: id,
        metadata: { statisticId: stat.id, value: parsedInput.value },
      },
    )
    revalidatePath(STATS_PATH)
    return { id }
  })

export const updateDataPoint = orgAction
  .metadata({ actionName: "statistics.data_point_updated" })
  .inputSchema(updateDataPointInput)
  .action(async ({ parsedInput, ctx }) => {
    const point = await loadDataPoint(ctx, parsedInput.id)
    await ctx.db
      .update(dataPoints)
      .set({
        date: parsedInput.date,
        value: parsedInput.value,
        note: parsedInput.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(dataPoints.id, point.id))
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "statistics.data_point_updated",
      {
        resourceType: "data_point",
        resourceId: point.id,
        metadata: {
          statisticId: point.statisticId,
          previousValue: point.value,
          nextValue: parsedInput.value,
        },
      },
    )
    revalidatePath(STATS_PATH)
    return { id: point.id }
  })

export const deleteDataPoint = orgAction
  .metadata({ actionName: "statistics.data_point_deleted" })
  .inputSchema(deleteDataPointInput)
  .action(async ({ parsedInput, ctx }) => {
    const point = await loadDataPoint(ctx, parsedInput.id)
    const now = new Date()
    await ctx.db
      .update(dataPoints)
      .set({ deletedAt: now, deletedBy: ctx.session.user.id, updatedAt: now })
      .where(eq(dataPoints.id, point.id))
    await audit(
      {
        db: ctx.db,
        organizationId: ctx.activeOrg.id,
        actorUserId: ctx.session.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      "statistics.data_point_deleted",
      {
        resourceType: "data_point",
        resourceId: point.id,
        metadata: { statisticId: point.statisticId, value: point.value },
      },
    )
    revalidatePath(STATS_PATH)
    return { id: point.id }
  })
