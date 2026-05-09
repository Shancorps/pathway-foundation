import { z } from "zod"
import { dataPointSources, statisticColors, statisticFrequencies } from "./schema"

export const createStatisticInput = z
  .object({
    name: z.string().min(1).max(80),
    unit: z.string().max(20).optional(),
    frequency: z.enum(statisticFrequencies),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().int().min(0).max(31).nullable().optional(),
    color: z.enum(statisticColors),
    lowerIsBetter: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.frequency === "weekly" && (val.dayOfWeek == null || val.dayOfWeek < 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfWeek"],
        message: "Pick a day of week for weekly stats",
      })
    }
    if (val.frequency === "monthly" && (val.dayOfMonth == null || val.dayOfMonth < 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfMonth"],
        message: "Pick a day of month for monthly stats",
      })
    }
  })

export const updateStatisticInput = z
  .object({
    id: z.string(),
    name: z.string().min(1).max(80),
    unit: z.string().max(20).optional(),
    frequency: z.enum(statisticFrequencies),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().int().min(0).max(31).nullable().optional(),
    color: z.enum(statisticColors),
    lowerIsBetter: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.frequency === "weekly" && (val.dayOfWeek == null || val.dayOfWeek < 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfWeek"],
        message: "Pick a day of week for weekly stats",
      })
    }
    if (val.frequency === "monthly" && (val.dayOfMonth == null || val.dayOfMonth < 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfMonth"],
        message: "Pick a day of month for monthly stats",
      })
    }
  })

export const deleteStatisticInput = z.object({
  id: z.string(),
})

export const addDataPointInput = z.object({
  statisticId: z.string(),
  date: z.coerce.date(),
  value: z.number(),
  note: z.string().max(500).optional(),
})

export const updateDataPointInput = z.object({
  id: z.string(),
  date: z.coerce.date(),
  value: z.number(),
  note: z.string().max(500).optional(),
})

export const deleteDataPointInput = z.object({
  id: z.string(),
})

export type CreateStatisticInput = z.infer<typeof createStatisticInput>
export type UpdateStatisticInput = z.infer<typeof updateStatisticInput>
export type AddDataPointInput = z.infer<typeof addDataPointInput>

export const dataPointSourceEnum = z.enum(dataPointSources)
