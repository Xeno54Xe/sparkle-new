"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Newspaper, TrendingUp, Clock, ExternalLink, Loader2, RefreshCw } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL}"

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

  const fetchNews = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/news`)
      if (res.ok) {
        const data = await res.json()
        if (data.articles) setNews(data.articles)
      }
    } catch (e) {
      console.error("News fetch error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
    // Refresh every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const categoryColors: Record<string, string> = {
    Market: "bg-[#34D399]/20 text-[#34D399] border-[#34D399]/30",
    Earnings: "bg-[#34D399]/20 text-[#34D399] border-[#34D399]/30",
    Policy: "bg-[#FBBF24]/20 text-[#FBBF24] border-[#FBBF24]/30",
    Sector: "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30",
    Economy: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30",
    Global: "bg-[#F97316]/20 text-[#F97316] border-[#F97316]/30",
    Business: "bg-[#34D399]/20 text-[#34D399] border-[#34D399]/30",
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-[#34D399]" />
          <CardTitle className="text-lg font-semibold text-foreground">Trending News</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchNews} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && news.length === 0 ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Loading news...
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No news available</div>
        ) : (
          news.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-secondary/50 p-3 transition-all hover:border-[#34D399]/50 hover:bg-secondary"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex-1 text-sm font-medium leading-snug text-foreground group-hover:text-[#34D399] transition-colors">
                  {item.title}
                </h3>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{item.source}</span>
                  <span className="text-xs text-muted-foreground">|</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {item.time}
                  </div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${categoryColors[item.category] || categoryColors.Market}`}>
                  {item.category}
                </span>
              </div>
            </a>
          ))
        )}
      </CardContent>
    </Card>
  )
}
