import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

interface SectionData {
  title: string;
  score: number;
  label: string;
  bullets: string[];
}

export function IntelligenceCard({ data }: { data: SectionData }) {
  if (!data) return null;

  const isHigh = data.score > 70;
  const isMid = data.score > 40;

  return (
    <div className="group relative p-6 glass rounded-2xl border border-white/5 bg-black/20 transition-all hover:bg-white/5">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
            {data.title}
          </h3>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold mt-2 inline-block",
            isHigh ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" : 
            isMid ? "text-amber-400 border-amber-400/20 bg-amber-400/5" : 
            "text-rose-400 border-rose-400/20 bg-rose-400/5"
          )}>
            {data.label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            {Math.round(data.score)}%
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-tighter font-medium">Strength Score</p>
        </div>
      </div>

      <ul className="space-y-4">
        {data.bullets.map((bullet, i) => (
          <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
            <div className="mt-1 shrink-0">
              {isHigh ? <CheckCircle2 size={14} className="text-primary" /> : 
               isMid ? <Info size={14} className="text-amber-400" /> : 
               <AlertCircle size={14} className="text-rose-400" />}
            </div>
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}