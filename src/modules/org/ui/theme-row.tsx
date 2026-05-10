"use client"

import { useEffect, useState } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

type Choice = "light" | "dark" | "system"

const CHOICES: { value: Choice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

/**
 * Three-way theme picker for /settings/account. Persistence is handled by
 * next-themes (localStorage `theme` key). The actual `<html class="dark">`
 * toggle happens via ThemeProvider mounted in the root layout.
 */
export function ThemeRow() {
  const { theme, setTheme } = useTheme()
  // next-themes hydrates only on the client — guard against SSR mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount gate
    setMounted(true)
  }, [])
  const current: Choice = mounted ? ((theme as Choice | undefined) ?? "system") : "system"
  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-base font-medium">Theme</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Light, dark, or follow the system. Saved per browser.
        </p>
      </div>
      <div className="inline-flex" role="radiogroup" aria-label="Theme">
        {CHOICES.map((c, i) => {
          const active = current === c.value
          const Icon = c.icon
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setTheme(c.value)
              }}
              className={
                active
                  ? "border border-[var(--bp-accent-orange)] bg-[var(--bp-accent-orange)] text-white"
                  : "border border-[var(--color-border-strong)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-foreground)]"
              }
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "8px 14px",
                marginLeft: i === 0 ? 0 : -1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "background-color 120ms, border-color 120ms",
              }}
            >
              <Icon className="size-3.5" strokeWidth={2} aria-hidden />
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
