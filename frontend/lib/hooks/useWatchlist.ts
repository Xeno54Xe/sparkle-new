"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export type WatchlistItem = {
  id: string
  symbol: string
  name: string
  created_at: string
}

// Used when there is no Supabase session (e.g. local auth bypass), so the
// watchlist still works on this device.
const LOCAL_KEY = "sparkle-watchlist"

function readLocal(): WatchlistItem[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLocal(items: WatchlistItem[]) {
  try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(items)) } catch {}
}

async function currentUser() {
  try {
    const { data } = await createClient().auth.getUser()
    return data.user
  } catch {
    return null
  }
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWatchlist = useCallback(async () => {
    setLoading(true)
    const user = await currentUser()
    if (!user) {
      setItems(readLocal())
      setLoading(false)
      return
    }
    const { data } = await createClient()
      .from("watchlist")
      .select("id, symbol, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  const addStock = async (symbol: string, name: string): Promise<boolean> => {
    const user = await currentUser()
    if (!user) {
      const current = readLocal()
      if (current.some(i => i.symbol === symbol)) return false
      const item = { id: `local-${symbol}`, symbol, name, created_at: new Date().toISOString() }
      const next = [...current, item]
      writeLocal(next)
      setItems(next)
      return true
    }
    const { data, error } = await createClient()
      .from("watchlist")
      .insert({ user_id: user.id, symbol, name })
      .select()
      .single()
    if (!error && data) {
      setItems(prev => [...prev, data])
      return true
    }
    return false
  }

  const removeStock = async (id: string) => {
    if (id.startsWith("local-")) {
      const next = readLocal().filter(i => i.id !== id)
      writeLocal(next)
      setItems(next)
      return
    }
    await createClient().from("watchlist").delete().eq("id", id)
    setItems(prev => prev.filter(item => item.id !== id))
  }

  return { items, loading, addStock, removeStock, refresh: fetchWatchlist }
}
