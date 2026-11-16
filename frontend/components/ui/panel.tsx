import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Flat content surface. Use one per distinct block of information. */
export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={cn("panel overflow-hidden", className)} {...rest}>
      {children}
    </section>
  )
}

export function PanelHeader({ title, description, actions, className }: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line px-5 py-3", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{actions}</div>}
    </div>
  )
}

/** Small text button used in panel headers (Refresh, View all…). */
export function PanelAction({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40", className)}
      {...props}
    />
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
