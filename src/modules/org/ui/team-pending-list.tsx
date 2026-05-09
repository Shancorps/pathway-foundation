"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { RegCard } from "@/components/ui/reg-card"

export function TeamPendingList({
  invitations,
}: {
  invitations: { id: string; email: string; role: string }[]
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function cancel(id: string) {
    if (!confirm("Cancel this pending invitation?")) return
    setBusyId(id)
    await authClient.organization.cancelInvitation({ invitationId: id })
    setBusyId(null)
    router.refresh()
  }

  return (
    <RegCard state="new" className="!p-0">
      <ul>
        {invitations.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center justify-between gap-4 px-5 py-4"
            style={{ borderBottom: "1px solid #E4E4E4" }}
          >
            <div className="min-w-0 flex-1">
              <p
                className="truncate"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#0F0F0F",
                }}
              >
                {inv.email}
              </p>
              <p
                className="mt-0.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  color: "#888",
                  textTransform: "uppercase",
                }}
              >
                Pending · Invited as {inv.role}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void cancel(inv.id)
              }}
              disabled={busyId === inv.id}
              className="shrink-0 px-2 py-1 transition-colors hover:text-[#E8711A] disabled:opacity-50"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              {busyId === inv.id ? "Cancelling..." : "Cancel"}
            </button>
          </li>
        ))}
      </ul>
    </RegCard>
  )
}
