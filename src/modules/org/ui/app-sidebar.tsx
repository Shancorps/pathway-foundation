"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  Boxes,
  Calendar,
  CheckSquare,
  ChevronDown,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Network,
  Route,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Org {
  id: string
  name: string
  slug: string
}

interface SidebarUser {
  name: string
  email: string
  role: string | null
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/my-actions", label: "My Actions", icon: CheckSquare },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/stats", label: "Statistics", icon: TrendingUp },
    ],
  },
  {
    label: "Organisation",
    items: [
      { href: "/organization/structure", label: "Structure", icon: Network },
      { href: "/team", label: "Team", icon: Users },
    ],
  },
  {
    label: "Particles",
    items: [{ href: "/particles", label: "Types", icon: Boxes }],
  },
  {
    label: "Admin",
    items: [
      { href: "/rails", label: "Rail Management", icon: Route },
      { href: "/items", label: "Items", icon: ListChecks },
      { href: "/settings/account", label: "Settings", icon: Settings },
    ],
  },
]

export function AppSidebar({
  user,
  organizations,
  activeOrgId,
  className,
}: {
  user: SidebarUser
  organizations: Org[]
  activeOrgId: string
  className?: string
}) {
  return (
    <aside
      className={cn(
        "flex h-screen w-[200px] shrink-0 flex-col border-r border-[var(--bp-border-default)] bg-[var(--bp-surface-card)]",
        className,
      )}
    >
      <LogoArea />
      <OrgSwitcher organizations={organizations} activeOrgId={activeOrgId} />
      <NavSections />
      <UserBlock user={user} />
    </aside>
  )
}

function LogoArea() {
  // Placeholder mark — a small axonometric "particle on rail" mock.
  // Illustrator will replace with the final SVG.
  return (
    <div className="flex h-[64px] items-center gap-2.5 border-b border-[var(--bp-border-default)] px-4">
      <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
        {/* Rail (steel) */}
        <polygon
          points="2,16 18,16 22,12 6,12"
          fill="#3A5068"
          stroke="#1A1A1A"
          strokeOpacity={0.6}
          strokeWidth={0.6}
        />
        <polygon
          points="2,16 18,16 18,18 2,18"
          fill="#2A3D52"
          stroke="#1A1A1A"
          strokeOpacity={0.6}
          strokeWidth={0.6}
        />
        {/* Particle (orange) */}
        <polygon points="8,9 14,9 14,15 8,15" fill="#E8711A" stroke="#B85510" strokeWidth={0.6} />
        <polygon points="14,9 17,7 17,13 14,15" fill="#C05A10" stroke="#B85510" strokeWidth={0.6} />
        <polygon points="8,9 14,9 17,7 11,7" fill="#F4945A" stroke="#B85510" strokeWidth={0.6} />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.14em",
          color: "var(--bp-text-primary)",
        }}
      >
        PATHWAY
      </span>
    </div>
  )
}

function OrgSwitcher({
  organizations,
  activeOrgId,
}: {
  organizations: Org[]
  activeOrgId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const active = organizations.find((o) => o.id === activeOrgId)

  async function switchTo(orgId: string) {
    if (orgId === activeOrgId) return
    setBusy(true)
    await authClient.organization.setActive({ organizationId: orgId })
    setBusy(false)
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="border-b border-[var(--bp-border-default)] px-3 py-3">
      <p
        className="mb-1.5 px-1"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          letterSpacing: "0.18em",
          color: "var(--bp-text-disabled)",
          textTransform: "uppercase",
        }}
      >
        Organization
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={busy}
          className="flex w-full items-center justify-between gap-2 border border-[var(--bp-border-strong)] bg-[var(--bp-surface-card)] px-3 py-2 text-left transition-colors hover:bg-[var(--bp-surface-card-queued)]"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--bp-text-primary)",
          }}
        >
          <span className="truncate">{active?.name ?? "Select org"}</span>
          <ChevronDown className="size-3" style={{ color: "var(--bp-text-muted)" }} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[14rem]">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => {
                void switchTo(org.id)
              }}
            >
              {org.name}
              {org.id === activeOrgId && <span className="font-label ml-auto">ACTIVE</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/onboarding/create-organization">+ New organization</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function NavSections() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto py-4">
      {NAV_GROUPS.map((group, idx) => (
        <div key={group.label} className={cn(idx > 0 && "mt-6")}>
          {/* Group header with mono caps + small rule line */}
          <div className="flex items-center gap-2 px-4 pb-2">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                letterSpacing: "0.18em",
                fontWeight: 600,
                color: "var(--bp-text-disabled)",
                textTransform: "uppercase",
              }}
            >
              {group.label}
            </span>
            <span
              className="block h-px flex-1"
              style={{ backgroundColor: "var(--bp-border-default)" }}
              aria-hidden
            />
          </div>
          <ul>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href))
              return (
                <li key={item.href}>
                  <NavLink item={item} active={isActive} />
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 px-4 transition-colors",
        active ? "bg-[var(--bp-accent-orange-tint)]" : "hover:bg-[var(--bp-surface-card-queued)]",
      )}
      style={{
        height: 36,
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        color: active ? "var(--bp-text-primary)" : "var(--bp-text-secondary)",
      }}
    >
      {/* 3px Particle Orange left line for active — bold enough to read clearly */}
      {active && (
        <span
          aria-hidden
          className="absolute top-0 bottom-0 left-0"
          style={{ width: 3, backgroundColor: "var(--bp-accent-orange)" }}
        />
      )}
      <Icon
        className="shrink-0"
        size={15}
        strokeWidth={active ? 2 : 1.5}
        style={{
          color: active ? "var(--bp-accent-orange)" : "var(--bp-text-muted)",
          opacity: active ? 1 : 0.6,
        }}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function UserBlock({ user }: { user: SidebarUser }) {
  const router = useRouter()
  const initials = computeInitials(user.name, user.email)

  async function signOut() {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <div className="border-t border-[var(--bp-border-default)] p-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2 p-1 text-left hover:bg-[var(--bp-surface-card-queued)]">
          {/* Square steel-blue avatar with two-letter mono initials, per spec */}
          <div
            className="relative flex size-[26px] shrink-0 items-center justify-center bg-[var(--color-structure-steel)]"
            aria-hidden
          >
            <span
              className="text-[9px] font-semibold tracking-wider text-[#8BAABF]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {initials}
            </span>
            {/* 6x6 Particle Orange status dot — active session indicator */}
            <span className="absolute -top-0.5 -right-0.5 size-[6px] bg-[var(--color-particle-orange)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-[var(--color-graphite)]">
              {user.name}
            </p>
            {user.role && <p className="font-label truncate text-[#888888]">{user.role}</p>}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="min-w-[14rem]">
          <DropdownMenuLabel>
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-[var(--color-muted-foreground)]">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/account">Account</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings/organization">Organization</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              void signOut()
            }}
          >
            <LogOut className="mr-2 size-3" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function computeInitials(name: string, email: string): string {
  const source = name.trim() || email
  const parts = source
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
  if (parts.length === 0) return "??"
  if (parts.length === 1) {
    const p = parts[0] ?? ""
    return p.slice(0, 2).toUpperCase()
  }
  const first = parts[0]?.[0] ?? ""
  const last = parts[parts.length - 1]?.[0] ?? ""
  return `${first}${last}`.toUpperCase()
}
