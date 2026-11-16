"use client"
import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

interface SidebarCtx {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}
const SidebarContext = createContext<SidebarCtx>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
})
export const useSidebar = () => useContext(SidebarContext)

const STORAGE_KEY = "sparkle-rail-collapsed"

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Remember the rail state between pages and visits
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setCollapsedState(true)
    } catch {}
  }, [])

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    try { window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0") } catch {}
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}
