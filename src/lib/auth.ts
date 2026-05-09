import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { sendEmail } from "@/lib/email"
import { audit } from "@/modules/audit/audit"
import { OrgInviteEmail } from "@/emails/org-invite"
import { ResetPasswordEmail } from "@/emails/reset-password"
import { VerifyEmail } from "@/emails/verify-email"

/**
 * Best-effort audit emit. Auth flows are critical-path so we never let an
 * audit failure break sign-in / sign-out / membership changes — log the
 * failure and swallow.
 */
async function tryAudit(
  organizationId: string,
  actorUserId: string | null,
  action: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string | null,
  userAgent?: string | null,
) {
  try {
    await audit({ db, organizationId, actorUserId, ipAddress, userAgent }, action, { metadata })
  } catch (e) {
    log.warn({ err: e, action }, "[auth-audit] write failed")
  }
}

/** Pull IP + user agent off Better Auth's endpoint context, when available. */
function extractClient(ctx: { request?: { headers?: Headers } } | null) {
  if (!ctx?.request) return { ipAddress: null, userAgent: null }
  const h = ctx.request.headers
  if (!h) return { ipAddress: null, userAgent: null }
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null
  const userAgent = h.get("user-agent") ?? null
  return { ipAddress, userAgent }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    // Required in real production. The PLAYWRIGHT_E2E escape hatch is set
    // only by `playwright.config.ts` so the e2e suite (which runs the prod
    // build via `pnpm build && pnpm start`) can complete sign-up without
    // an email round-trip. Vercel never sets PLAYWRIGHT_E2E, so this can't
    // be triggered in real deployments.
    requireEmailVerification: env.NODE_ENV === "production" && process.env.PLAYWRIGHT_E2E !== "1",
    minPasswordLength: 12,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Pathway password",
        react: ResetPasswordEmail({ url, userName: user.name }),
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Pathway email",
        react: VerifyEmail({ url, userName: user.name }),
      })
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  // Audit hooks for auth events. We only emit when the session is bound to an
  // org (audit_log requires a non-null organizationId) — first-time sign-ups
  // and pre-org sessions are skipped silently. Member-add / role-change /
  // member-remove are not in Better Auth's typed databaseHooks shape; track
  // those separately if/when we wrap the org-plugin endpoints.
  databaseHooks: {
    session: {
      create: {
        after: async (session, context) => {
          const orgId = (session as { activeOrganizationId?: string | null }).activeOrganizationId
          if (!orgId) return
          const { ipAddress, userAgent } = extractClient(context)
          await tryAudit(orgId, session.userId, "auth.signed_in", undefined, ipAddress, userAgent)
        },
      },
      delete: {
        after: async (session, context) => {
          const orgId = (session as { activeOrganizationId?: string | null }).activeOrganizationId
          if (!orgId) return
          const { ipAddress, userAgent } = extractClient(context)
          await tryAudit(orgId, session.userId, "auth.signed_out", undefined, ipAddress, userAgent)
        },
      },
    },
  },
  // Hash the token / OTP / identifier before storing it in `verification.value`.
  // The plaintext token is what's emailed to the user; we keep only its hash in
  // the database so a `verification` table leak no longer hands an attacker
  // live email-verification, password-reset, or invitation tokens. Better Auth
  // re-hashes the user-presented token to compare on lookup, so the flow
  // continues to work end-to-end.
  verification: {
    storeIdentifier: "hashed",
  },
  // Better Auth's built-in rate limiter. Enabled by default in production with
  // window=10s/max=100. Sensitive paths get stricter custom rules so credential
  // stuffing and password-reset spam are bounded. Storage is in-memory by
  // default — if you scale beyond one Vercel region, switch `storage` to a
  // shared store (Upstash) so limits apply across instances.
  rateLimit: {
    enabled: env.NODE_ENV === "production",
    window: 10,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/forget-password": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
      "/verify-email": { window: 60, max: 10 },
      "/send-verification-email": { window: 300, max: 3 },
      "/organization/invite-member": { window: 60, max: 10 },
      "/organization/accept-invitation": { window: 60, max: 10 },
    },
  },
  plugins: [
    organization({
      cancelPendingInvitationsOnReInvite: true,
      sendInvitationEmail: async (data) => {
        const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/accept-invite/${data.id}`
        await sendEmail({
          to: data.email,
          subject: `You've been invited to ${data.organization.name}`,
          react: OrgInviteEmail({
            url: inviteUrl,
            organizationName: data.organization.name,
            inviterName: data.inviter.user.name,
          }),
        })
      },
    }),
  ],
})

export type Auth = typeof auth
