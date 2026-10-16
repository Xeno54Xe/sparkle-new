"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Panel, PanelHeader, PanelAction, EmptyState } from "@/components/ui/panel"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"

interface NewsItem {
  title: string
  link: string
  source: string
  time: string
  category: string
}

export function TrendingNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/news`)
      if (res.ok) {
        const data = await res.json()
        if (data.articles) setNews(data.articles)
      }
    } catch {
      // keep whatever was already shown
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNews])

  return (
    <Panel aria-label="Market news">
      <PanelHeader
        title="Market news"
        description="From the last 48 hours, refreshed every 5 minutes"
        actions={
          <PanelAction onClick={fetchNews} disabled={loading} aria-label="Refresh news">
            <RefreshCw size={12} className={cn(loading && "animate-spin")} /> Refresh
          </PanelAction>
        }
      />
      {loading && news.length === 0 ? (
        <ul className="divide-y divide-line">
          {[0, 1, 2, 3, 4].map(i => (
            <li key={i} className="animate-pulse space-y-2 px-5 py-4">
              <div className="h-3.5 w-11/12 rounded bg-surface-2" />
              <div className="h-3 w-40 rounded bg-surface-2" />
            </li>
          ))}
        </ul>
      ) : news.length === 0 ? (
        <EmptyState title="No recent headlines">The news feed returned nothing for the last 48 hours. Try refreshing in a few minutes.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {news.map((item, i) => (
            <li key={i}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block px-5 py-3.5 transition-colors hover:bg-surface-2/60"
              >
                <p className="text-[15px] leading-snug text-foreground group-hover:text-primary">{item.title}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  <span>{item.source}</span>
                  <span className="text-faint-foreground">{item.time}</span>
                  <span className="text-faint-foreground">{item.category}</span>
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
