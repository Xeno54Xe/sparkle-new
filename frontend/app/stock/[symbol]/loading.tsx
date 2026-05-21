export default function StockLoading() {
  return (
    <div className="flex min-h-screen w-full relative bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-white/5 bg-background/95 h-screen fixed left-0 top-0 z-50 p-4 gap-4">
        <div className="h-8 w-32 rounded-lg bg-white/5 animate-pulse mt-2" />
        <div className="h-16 w-full rounded-xl bg-white/5 animate-pulse mt-4" />
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-10 w-full rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="flex flex-1 flex-col lg:pl-[260px] p-6 sm:p-8 gap-6">
        {/* Stock info card */}
        <div className="rounded-xl border border-white/5 bg-card p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-white/10" />
            <div className="space-y-2">
              <div className="h-6 w-24 rounded bg-white/10" />
              <div className="h-4 w-40 rounded bg-white/5" />
            </div>
          </div>
          <div className="h-16 rounded-lg bg-white/5" />
        </div>
        {/* Chart skeleton */}
        <div className="rounded-xl border border-white/5 bg-card h-64 animate-pulse" />
        {/* Metrics skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl border border-white/5 bg-card animate-pulse" />)}
        </div>
      </div>
    </div>
  )
}
