import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { MarketOverview } from "@/components/dashboard/market-overview"
import { TrendingNews } from "@/components/dashboard/trending-news"
import { Watchlist } from "@/components/dashboard/watchlist"
import { MostActive } from "@/components/dashboard/most-active"

export const metadata = { title: "Dashboard — SparkleAI" }

export default function Dashboard() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <MarketOverview />
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <TrendingNews />
          </div>
          <aside className="space-y-6 lg:col-span-4">
            <Watchlist />
            <MostActive />
          </aside>
        </div>
      </div>
    </DashboardShell>
  )
}
