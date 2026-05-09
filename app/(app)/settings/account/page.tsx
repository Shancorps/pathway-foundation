import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { AccountSettingsForm } from "@/modules/auth/ui/account-settings-form"
import { ThemeRow } from "@/modules/org/ui/theme-row"

export default async function AccountSettingsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Update your name, email, password, and appearance.
      </p>
      <div className="mt-6 space-y-10">
        <AccountSettingsForm defaultName={session.user.name} defaultEmail={session.user.email} />

        <div className="border-t border-[var(--color-border)] pt-6">
          <ThemeRow />
        </div>
      </div>
    </main>
  )
}
