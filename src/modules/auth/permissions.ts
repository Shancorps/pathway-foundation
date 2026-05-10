import "server-only"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { member } from "@/modules/auth/schema"

/**
 * Per-user permission flags.
 *
 * V1 implementation: gated on the member's organization role. Owners and Admins
 * get all "build / configure" capabilities; Members get none of them by default.
 *
 * TODO (per-user permissions feature): replace this with a real per-member
 * permission record so an Owner can grant individual Members capabilities like
 * `canBuildRails` / `canBuildManifests` without promoting them to Admin. Keep
 * the function signatures here stable so callers don't change.
 */

type Role = "owner" | "admin" | "member"

export type Permission =
  /** Can create / edit / publish rails (rail builder access). */
  | "canBuildRails"
  /** Can create / edit manifest templates (manifest builder access). */
  | "canBuildManifests"

/**
 * Default permission table per role. Owners always get every capability.
 *
 * Members default OFF — flip to ON via the (future) per-user override.
 */
const ROLE_DEFAULTS: Record<Role, Record<Permission, boolean>> = {
  owner: {
    canBuildRails: true,
    canBuildManifests: true,
  },
  admin: {
    canBuildRails: true,
    canBuildManifests: true,
  },
  member: {
    canBuildRails: false,
    canBuildManifests: false,
  },
}

/**
 * Returns true when the user has the given permission in the given org.
 *
 * Returns false when the user is not a member of the org or has no row.
 */
export async function hasPermission(
  orgId: string,
  userId: string,
  permission: Permission,
): Promise<boolean> {
  const [m] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, orgId), eq(member.userId, userId)))
    .limit(1)
  if (!m) return false
  const role = m.role as Role
  // TODO (per-user permissions feature): read a per-member override row first,
  // and only fall back to ROLE_DEFAULTS when no override is set.
  return ROLE_DEFAULTS[role][permission]
}
