"use client"
import { SidebarProvider, useSidebar } from "@/lib/context/sidebar"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

function Inner({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const { collapsed } = useSidebar()
  const pathname = usePathname()
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ease-[var(--ease-out)]",
          collapsed ? "lg:pl-[var(--rail-collapsed)]" : "lg:pl-[var(--rail-width)]"
        )}
      >
        <TopBar />
        {header}
        <main key={pathname} className="page-enter mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * The one app frame: fixed navigation rail, sticky top bar, centred content.
 * `header` renders full-width between the top bar and the content (used by
 * stock pages for the stock header and tabs).
 */
export function DashboardShell({ children, header }: { children: ReactNode; header?: ReactNode; noTopBar?: boolean }) {
  return (
    <SidebarProvider>
      <Inner header={header}>{children}</Inner>
    </SidebarProvider>
  )
}

/** Standard page heading: title, one line of context, optional actions on the right. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="display text-[34px] text-foreground sm:text-[44px]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
