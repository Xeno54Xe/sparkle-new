"use client"
import { SidebarProvider, useSidebar } from "@/lib/context/sidebar"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

function Inner({ children, noTopBar }: { children: ReactNode; noTopBar?: boolean }) {
  const { collapsed } = useSidebar()
  return (
    <div className="flex min-h-screen w-full relative bg-background">
      <Sidebar />
      <div className={cn(
        "flex flex-1 flex-col min-w-0 transition-[padding] duration-300 ease-in-out",
        "pl-0 lg:pl-[260px]",
        collapsed && "lg:pl-[72px]"
      )}>
        {!noTopBar && <TopBar />}
        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  )
}

export function DashboardShell({ children, noTopBar }: { children: ReactNode; noTopBar?: boolean }) {
  return (
    <SidebarProvider>
      <Inner noTopBar={noTopBar}>{children}</Inner>
    </SidebarProvider>
  )
}
