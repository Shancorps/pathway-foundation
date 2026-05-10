"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { RegCard } from "@/components/ui/reg-card"

interface Member {
  id: string
  role: string
  user: { id: string; name: string; email: string }
}

export function TeamMembersList({
  members,
  currentUserId,
  currentUserRole,
}: {
  members: Member[]
  currentUserId: string
  currentUserRole: string
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const canManage = currentUserRole === "owner" || currentUserRole === "admin"

  async function changeRole(memberId: string, role: "admin" | "member") {
    setBusyId(memberId)
    await authClient.organization.updateMemberRole({ memberId, role })
    setBusyId(null)
    router.refresh()
  }

  async function remove(memberId: string) {
    if (!confirm("Remove this member from the organization? They lose access immediately.")) return
    setBusyId(memberId)
    await authClient.organization.removeMember({ memberIdOrEmail: memberId })
    setBusyId(null)
    router.refresh()
  }

  return (
    <RegCard state="queued" className="!p-0">
      <ul>
        {members.map((m) => {
          const isSelf = m.user.id === currentUserId
          const isOwner = m.role === "owner"
          return (
            <li
              key={m.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
              style={{ borderBottom: "1px solid #E4E4E4" }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    fontWeight: 500,
                    color: "var(--bp-text-primary)",
                  }}
                >
                  {m.user.name}
                  {isSelf && (
                    <span
                      className="ml-2"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.18em",
                        color: "var(--bp-text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      You
                    </span>
                  )}
                </p>
                <p
                  className="mt-0.5 truncate"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: "var(--bp-text-muted)",
                  }}
                >
                  {m.user.email}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <RoleTag role={m.role} />
                {canManage && !isSelf && !isOwner && (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => {
                        void changeRole(m.id, e.target.value as "admin" | "member")
                      }}
                      disabled={busyId === m.id}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.14em",
                        color: "var(--bp-text-primary)",
                        border: "1px solid #D4D4D4",
                        backgroundColor: "var(--bp-surface-card)",
                        textTransform: "uppercase",
                        padding: "4px 8px",
                      }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        void remove(m.id)
                      }}
                      disabled={busyId === m.id}
                      className="px-2 py-1 transition-colors hover:text-[var(--bp-accent-orange)] disabled:opacity-50"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.18em",
                        color: "var(--bp-text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      {busyId === m.id ? "..." : "Remove"}
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </RegCard>
  )
}

function RoleTag({ role }: { role: string }) {
  const color =
    role === "owner"
      ? "var(--bp-accent-orange)"
      : role === "admin"
        ? "var(--bp-accent-steel)"
        : "var(--bp-text-muted)"
  const filled = role === "owner"
  return (
    <span
      className="px-2 py-1"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: filled ? "var(--bp-surface-card)" : color,
        backgroundColor: filled ? color : "transparent",
        border: `1px solid ${color}`,
      }}
    >
      {role}
    </span>
  )
}
