"use client"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Settings, User, Bell, Shield, Palette } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-[72px] lg:pl-[260px]">
        <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Settings size={26} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your account preferences and configurations</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { icon: User, title: "Profile", desc: "Manage your account details", items: [{ l: "Name", v: "Vansh" }, { l: "Email", v: "vansh@sparkleai.com" }, { l: "Plan", v: "Free" }] },
              { icon: Bell, title: "Notifications", desc: "Configure alert preferences", items: [{ l: "Price Alerts", v: "Enabled" }, { l: "Signal Alerts", v: "Enabled" }, { l: "Report Ready", v: "Enabled" }] },
              { icon: Palette, title: "Appearance", desc: "Customize the interface", items: [{ l: "Theme", v: "Dark" }, { l: "Font Size", v: "Default" }, { l: "Compact Mode", v: "Off" }] },
              { icon: Shield, title: "Privacy", desc: "Data and privacy settings", items: [{ l: "Data Sharing", v: "Minimal" }, { l: "Analytics", v: "Enabled" }, { l: "Two-Factor Auth", v: "Disabled" }] },
            ].map(section => (
              <div key={section.title} className="glass-card rounded-2xl overflow-hidden transition-all hover:border-white/20">
                <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                  <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <section.icon size={18} />
                    </span>
                    {section.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5 ml-11">{section.desc}</p>
                </div>
                <div className="p-2">
                  {section.items.map(item => (
                    <div key={item.l} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                      <span className="text-sm font-medium text-slate-300">{item.l}</span>
                      <span className="text-sm font-bold text-foreground">{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
