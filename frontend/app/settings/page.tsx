"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Settings, User, Bell, Shield, Palette, KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function SettingsPage() {
  const supabase = createClient()

  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Change password state
  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState("")
  const [pwdSuccess, setPwdSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  const pwdStrength = newPwd.length === 0 ? 0 : newPwd.length < 6 ? 1 : newPwd.length < 10 ? 2 : 3
  const strengthColors = ["", "#EF4444", "#FBBF24", "#34D399"]
  const strengthLabels = ["", "Weak", "Fair", "Strong"]

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError("")
    setPwdSuccess(false)

    if (newPwd !== confirmPwd) { setPwdError("New passwords do not match"); return }
    if (newPwd.length < 6) { setPwdError("New password must be at least 6 characters"); return }
    if (oldPwd === newPwd) { setPwdError("New password must be different from current password"); return }

    setPwdLoading(true)

    // Verify old password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail ?? "",
      password: oldPwd,
    })

    if (signInError) {
      setPwdError("Current password is incorrect")
      setPwdLoading(false)
      return
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPwd })

    if (updateError) {
      setPwdError(updateError.message)
      setPwdLoading(false)
      return
    }

    setPwdSuccess(true)
    setPwdLoading(false)
    setOldPwd("")
    setNewPwd("")
    setConfirmPwd("")
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-[72px] lg:pl-[260px]">
        <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Settings size={26} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your account preferences and configurations</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Top row — Profile + Appearance */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Profile */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                  <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <User size={18} />
                    </span>
                    Profile
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5 ml-11">Your account information</p>
                </div>
                <div className="p-2">
                  {[
                    { l: "Email", v: userEmail ?? "Loading…" },
                    { l: "Plan", v: "Free" },
                    { l: "Member since", v: "2025" },
                  ].map(item => (
                    <div key={item.l} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                      <span className="text-sm font-medium text-slate-300">{item.l}</span>
                      <span className="text-sm font-bold text-foreground truncate max-w-[200px] text-right">{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Appearance */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                  <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Palette size={18} />
                    </span>
                    Appearance
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5 ml-11">Customize the interface</p>
                </div>
                <div className="p-2">
                  {[
                    { l: "Theme", v: "Dark" },
                    { l: "Font Size", v: "Default" },
                    { l: "Compact Mode", v: "Off" },
                  ].map(item => (
                    <div key={item.l} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                      <span className="text-sm font-medium text-slate-300">{item.l}</span>
                      <span className="text-sm font-bold text-foreground">{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Second row — Notifications + Privacy */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Notifications */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                  <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bell size={18} />
                    </span>
                    Notifications
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5 ml-11">Configure alert preferences</p>
                </div>
                <div className="p-2">
                  {[
                    { l: "Price Alerts", v: "Enabled" },
                    { l: "Signal Alerts", v: "Enabled" },
                    { l: "Report Ready", v: "Enabled" },
                  ].map(item => (
                    <div key={item.l} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                      <span className="text-sm font-medium text-slate-300">{item.l}</span>
                      <span className="text-sm font-bold text-primary">{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                  <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Shield size={18} />
                    </span>
                    Privacy
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5 ml-11">Data and privacy settings</p>
                </div>
                <div className="p-2">
                  {[
                    { l: "Data Sharing", v: "Minimal" },
                    { l: "Analytics", v: "Enabled" },
                    { l: "Two-Factor Auth", v: "Disabled" },
                  ].map(item => (
                    <div key={item.l} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                      <span className="text-sm font-medium text-slate-300">{item.l}</span>
                      <span className="text-sm font-bold text-foreground">{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Change Password — full width */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <KeyRound size={18} />
                  </span>
                  Change Password
                </h2>
                <p className="text-xs text-muted-foreground mt-1.5 ml-11">Update your password. You'll need to enter your current password first.</p>
              </div>

              <div className="p-6">
                {pwdSuccess ? (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-5 py-4 text-sm text-primary font-medium">
                    <CheckCircle2 size={18} className="shrink-0" />
                    Password updated successfully!
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="grid gap-5 sm:grid-cols-3">
                    {/* Current password */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Current password</label>
                      <div className="relative">
                        <input
                          type={showOld ? "text" : "password"}
                          required
                          value={oldPwd}
                          onChange={e => setOldPwd(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                        <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* New password */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">New password</label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : "password"}
                          required
                          value={newPwd}
                          onChange={e => setNewPwd(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {newPwd.length > 0 && (
                        <div className="space-y-1 pt-0.5">
                          <div className="flex gap-1">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ backgroundColor: i <= pwdStrength ? strengthColors[pwdStrength] : "rgba(255,255,255,0.1)" }} />
                            ))}
                          </div>
                          <p className="text-xs" style={{ color: strengthColors[pwdStrength] }}>{strengthLabels[pwdStrength]}</p>
                        </div>
                      )}
                    </div>

                    {/* Confirm new password */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Confirm new password</label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          required
                          value={confirmPwd}
                          onChange={e => setConfirmPwd(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {confirmPwd.length > 0 && newPwd !== confirmPwd && (
                        <p className="text-xs text-destructive">Passwords do not match</p>
                      )}
                    </div>

                    {/* Error */}
                    {pwdError && (
                      <div className="sm:col-span-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <AlertCircle size={16} className="shrink-0" />
                        {pwdError}
                      </div>
                    )}

                    {/* Submit */}
                    <div className="sm:col-span-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={pwdLoading}
                        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                      >
                        {pwdLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                        {pwdLoading ? "Updating…" : "Update Password"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
