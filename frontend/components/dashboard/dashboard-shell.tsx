"use client"
import { SidebarProvider, useSidebar } from "@/lib/context/sidebar"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

function Inner({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ease-out",
          collapsed ? "lg:pl-[var(--rail-collapsed)]" : "lg:pl-[var(--rail-width)]"
        )}
      >
        <TopBar />
        {header}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
