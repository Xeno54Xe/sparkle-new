import { Sidebar } from "@/components/dashboard/sidebar"
import { TopBar } from "@/components/dashboard/top-bar"
import { MarketOverview } from "@/components/dashboard/market-overview"
import { TrendingNews } from "@/components/dashboard/trending-news"
import { Watchlist } from "@/components/dashboard/watchlist"
import { MostActive } from "@/components/dashboard/most-active"

export default function Dashboard() {
  return (
    <div className="flex min-h-screen w-full relative">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-[72px] lg:pl-[260px] w-full">
        <TopBar />
        <main className="flex-1 p-6 sm:p-8">
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
        </main>
      </div>
    </div>
  )
}
