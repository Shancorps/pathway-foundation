import { z } from "zod"
import { orgContainerLevels } from "./schema"

export const orgContainerLevelSchema = z.enum(orgContainerLevels)

export const createOrgContainerInput = z.object({
  level: orgContainerLevelSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  vfp: z.string().max(2000).optional(),
  color: z.string().max(32).optional(),
  parentId: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const updateOrgContainerInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  vfp: z.string().max(2000).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  parentId: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const deleteOrgContainerInput = z.object({ id: z.string() })
export const restoreOrgContainerInput = z.object({ id: z.string() })

export const createPostInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  vfp: z.string().max(2000).optional(),
  parentContainerId: z.string().nullable().optional(),
  isSenior: z.boolean().optional(),
  isAreaManager: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const updatePostInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  vfp: z.string().max(2000).nullable().optional(),
  parentContainerId: z.string().nullable().optional(),
  isSenior: z.boolean().optional(),
  isAreaManager: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const deletePostInput = z.object({ id: z.string() })
export const restorePostInput = z.object({ id: z.string() })

export const assignPostInput = z.object({
  id: z.string(),
  userId: z.string(),
})
export const unassignPostInput = z.object({ id: z.string() })

export type CreateOrgContainerInput = z.infer<typeof createOrgContainerInput>
export type UpdateOrgContainerInput = z.infer<typeof updateOrgContainerInput>
export type CreatePostInput = z.infer<typeof createPostInput>
export type UpdatePostInput = z.infer<typeof updatePostInput>
