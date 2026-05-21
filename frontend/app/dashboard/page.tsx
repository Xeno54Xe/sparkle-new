import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { MarketOverview } from "@/components/dashboard/market-overview"
import { TrendingNews } from "@/components/dashboard/trending-news"
import { Watchlist } from "@/components/dashboard/watchlist"
import { MostActive } from "@/components/dashboard/most-active"

export default function Dashboard() {
  return (
    <DashboardShell>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 max-w-[1600px] mx-auto w-full">
        <div className="space-y-6 lg:col-span-8 flex flex-col">
          <MarketOverview />
          <TrendingNews />
        </div>
        <div className="space-y-6 lg:col-span-4 flex flex-col">
          <Watchlist />
          <MostActive />
        </div>
      </div>
    </DashboardShell>
  )
}
