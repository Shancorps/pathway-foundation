"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { BlueprintButton } from "@/components/ui/blueprint-button"

const schema = z.object({
  email: z.email("Enter a valid email"),
  role: z.enum(["admin", "member"]),
})

type Values = z.infer<typeof schema>

const INPUT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: "var(--bp-text-primary)",
  border: "1px solid #D4D4D4",
  backgroundColor: "#fff",
  padding: "8px 12px",
  width: "100%",
}

export function TeamInviteForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { role: "member" },
  })

  async function onSubmit(values: Values) {
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const result = await authClient.organization.inviteMember({
      email: values.email,
      role: values.role,
    })
    setSubmitting(false)
    if (result.error) {
      setError(result.error.message ?? "Could not send invitation")
      return
    }
    setSuccess(`Invitation sent to ${values.email}`)
    reset({ role: values.role })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
        <div>
          <Label htmlFor="email">Email</Label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="teammate@example.com"
            {...register("email")}
            className="mt-2"
            style={INPUT_STYLE}
          />
          {errors.email && <FieldError>{errors.email.message}</FieldError>}
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            {...register("role")}
            className="mt-2"
            style={{ ...INPUT_STYLE, minWidth: 140 }}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <BlueprintButton type="submit" variant="primary" particle disabled={submitting}>
          <Plus className="size-3.5" />
          {submitting ? "Sending..." : "Send Invitation"}
        </BlueprintButton>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
    </form>
  )
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.18em",
        color: "var(--bp-text-primary)",
        textTransform: "uppercase",
      }}
    >
      {children}
    </label>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-1.5"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.12em",
        color: "var(--bp-accent-orange)",
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  )
}

function Alert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const color = tone === "error" ? "var(--bp-accent-orange)" : "var(--bp-accent-success)"
  return (
    <div
      className="px-3 py-2"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.1em",
        color,
        border: `1px solid ${color}`,
        backgroundColor: "transparent",
      }}
    >
      {children}
    </div>
  )
}
