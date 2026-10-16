export default function StockLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="panel h-[420px] animate-pulse" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="panel h-20 animate-pulse" />)}
      </div>
    </div>
  )
}
