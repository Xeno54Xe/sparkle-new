"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Star, FileText, Settings, ChevronLeft, ChevronRight, Menu, X, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Star, label: "Watchlist", href: "/watchlist" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "?"

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-md shadow-sm text-white"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/5 glass transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:block bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
          {!collapsed && (
            <Link href="/dashboard" className="text-xl font-bold tracking-tight text-gradient-primary">
              SparkleAI
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1.5 px-3 py-6 custom-scrollbar overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground hover:translate-x-1"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-8 w-[4px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                )}
                <item.icon size={20} className={cn("transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-white/5 p-3 bg-black/20 mt-auto space-y-1">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-semibold text-primary border border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              {initials}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
            </div>
            {!collapsed && (
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">{userEmail ?? "Loading…"}</span>
                <span className="text-xs text-primary/80 font-medium">Free Plan</span>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200",
              collapsed && "justify-center"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
