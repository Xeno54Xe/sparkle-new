import { Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AIIntelligence() {
  return (
    <div className="rounded-2xl border border-primary/30 glass-card p-6 relative overflow-hidden group">
      {/* Animated gradient background sweep */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sparkles size={18} className="text-primary animate-pulse" />
            </div>
            <span className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300">
              AI Intelligence
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-black/40 px-2 py-1 rounded-md">2 min ago</span>
        </div>

        {/* Content */}
        <div className="mt-5 rounded-xl bg-black/40 backdrop-blur-md border border-white/5 p-4 shadow-inner">
          <p className="text-[15px] leading-relaxed text-foreground/90 font-medium">
            Based on current market trends, <span className="text-primary font-bold">RELIANCE</span> shows strong momentum.
            Consider reviewing your position as the stock approaches resistance at <span className="text-foreground font-bold">₹1,406</span>.
          </p>
        </div>

        {/* Confidence Meter */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground font-medium uppercase tracking-wider">Confidence Level</span>
            <span className="font-bold text-primary">85%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/50 border border-white/5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary shadow-[0_0_10px_rgba(16,185,129,0.8)] relative"
              style={{ width: "85%" }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-4">
          <Button className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 transition-all duration-300">
            View Analysis
            <ArrowRight size={16} className="ml-2" />
          </Button>
          <button className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
