import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { PortfolioIntelligencePanel } from "@/features/portfolio-intelligence/components/portfolio-intelligence-panel"

export default function PortfolioPage() {
  return (
    <DashboardShell>
      <PortfolioIntelligencePanel />
    </DashboardShell>
  )
}
