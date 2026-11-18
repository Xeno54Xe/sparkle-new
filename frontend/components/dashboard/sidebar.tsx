"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Star, FileText, Settings, PanelLeftClose, PanelLeftOpen, X, LogOut,
  LayoutGrid, GitCompare, SlidersHorizontal, BriefcaseBusiness, List, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useSidebar } from "@/lib/context/sidebar"
import { BrandMark, BrandWord } from "@/components/ui/brand"

// Grouped by what the user is doing: their own money, then exploring the market.
const navGroups = [
  {
    label: "You",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
      { icon: Sparkles, label: "Ask Sparkle", href: "/ask" },
      { icon: BriefcaseBusiness, label: "Portfolio", href: "/portfolio" },
      { icon: Star, label: "Watchlist", href: "/watchlist" },
    ],
  },
  {
    label: "Market",
    items: [
      { icon: List, label: "All stocks", href: "/search" },
      { icon: LayoutGrid, label: "Heatmap", href: "/heatmap" },
      { icon: SlidersHorizontal, label: "Screener", href: "/screener" },
      { icon: GitCompare, label: "Compare", href: "/compare" },
      { icon: FileText, label: "Reports", href: "/reports" },
    ],
  },
]

const LOCAL_AUTH_COOKIE = "sparkle-local-auth"
const LOCAL_AUTH_EMAIL = "sparkle-local-email"

export function Sidebar() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser()
      .then(({ data }) => setUserEmail(data.user?.email ?? window.localStorage.getItem(LOCAL_AUTH_EMAIL)))
      .catch(() => setUserEmail(window.localStorage.getItem(LOCAL_AUTH_EMAIL)))
  }, [])

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setMobileOpen(false) }, [pathname, setMobileOpen])

  const handleLogout = async () => {
    document.cookie = `${LOCAL_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    window.localStorage.removeItem(LOCAL_AUTH_EMAIL)
    void createClient().auth.signOut().catch(() => {})
    window.location.href = "/login"
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) ||
    (href === "/search" && pathname.startsWith("/stock/"))

  // The rail is only ever collapsed on desktop; the mobile drawer is always full width.
  const narrow = collapsed && !mobileOpen
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "··"

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-sidebar transition-[width,transform] duration-300 ease-[var(--ease-out)]",
          "w-[var(--rail-width)] lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-[var(--rail-collapsed)]"
        )}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className={cn("flex h-16 shrink-0 items-center", narrow ? "lg:justify-center px-3" : "justify-between px-5")}>
          <Link href="/dashboard" className="flex items-center gap-2.5 text-foreground">
            <BrandMark />
            <BrandWord className={cn(narrow && "lg:hidden")} />
          </Link>
          <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground lg:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2 custom-scrollbar">
          {navGroups.map((group, gi) => (
            <div key={group.label} className={cn(gi > 0 && "mt-6")}>
              <p className={cn("mb-2 px-3 text-[11px] font-medium tracking-wide text-faint-foreground", narrow && "lg:sr-only")}>{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={narrow ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group/nav relative flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors duration-150",
                          narrow && "lg:justify-center lg:px-0",
                          active
                            ? "bg-forest font-medium text-foreground"
                            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                        )}
                      >
                        {active && <span className="absolute inset-y-2.5 -left-3 w-[3px] rounded-r-full bg-primary shadow-[0_0_12px_rgba(197,255,74,0.6)]" aria-hidden="true" />}
                        <item.icon size={17} strokeWidth={active ? 2.1 : 1.8} className={cn("shrink-0 transition-colors", active ? "text-primary" : "group-hover/nav:text-foreground")} />
                        <span className={cn(narrow && "lg:hidden")}>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account */}
        <div className="shrink-0 border-t border-line p-3">
          <Link
            href="/settings"
            title={narrow ? "Settings" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-surface-2",
              isActive("/settings") && "bg-forest",
              narrow && "lg:justify-center"
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-forest text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
              {initials}
            </span>
            <span className={cn("min-w-0 flex-1", narrow && "lg:hidden")}>
              <span className="block truncate text-sm text-foreground">{userEmail ?? "Signed in"}</span>
              <span className="block text-xs text-muted-foreground">Account settings</span>
            </span>
            <Settings size={15} className={cn("shrink-0 text-muted-foreground", narrow && "lg:hidden")} />
          </Link>
          <div className={cn("mt-1 flex items-center gap-1", narrow && "lg:flex-col")}>
            <button
              onClick={handleLogout}
              title="Log out"
              className={cn(
                "flex h-8 flex-1 items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-down/10 hover:text-down",
                narrow && "lg:w-full lg:flex-none lg:justify-center lg:px-0"
              )}
            >
              <LogOut size={15} className="shrink-0" />
              <span className={cn(narrow && "lg:hidden")}>Log out</span>
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground lg:flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
