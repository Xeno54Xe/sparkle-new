"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export type WatchlistItem = {
  id: string
  symbol: string
  name: string
  created_at: string
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchWatchlist = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from("watchlist")
      .select("id, symbol, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    setItems(data ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  const addStock = async (symbol: string, name: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
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
    await supabase.from("watchlist").delete().eq("id", id)
    setItems(prev => prev.filter(item => item.id !== id))
  }

  return { items, loading, addStock, removeStock, refresh: fetchWatchlist }
}
