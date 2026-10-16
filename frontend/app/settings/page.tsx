"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye, EyeOff, Loader2, RefreshCw } from "lucide-react"
import { DashboardShell, PageHeader } from "@/components/dashboard/dashboard-shell"
import { Panel, PanelHeader, PanelAction } from "@/components/ui/panel"
import { createClient } from "@/lib/supabase/client"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"

const LOCAL_AUTH_COOKIE = "sparkle-local-auth"
const LOCAL_AUTH_EMAIL = "sparkle-local-email"

type BackendState = { status: "checking" | "live" | "fallback" | "down"; ms?: number; detail?: string }

function PasswordField({ id, label, value, onChange, autoComplete }: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm text-foreground">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-full rounded-md border border-line bg-background px-3.5 pr-11 text-sm text-foreground focus:border-primary/60 focus:outline-none"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<boolean | null>(null)
  const [backend, setBackend] = useState<BackendState>({ status: "checking" })

  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMessage, setPwdMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    document.title = "Settings — SparkleAI"
    createClient().auth.getUser()
      .then(({ data }) => {
        setSupabaseUser(!!data.user)
        setEmail(data.user?.email ?? window.localStorage.getItem(LOCAL_AUTH_EMAIL))
      })
      .catch(() => {
        setSupabaseUser(false)
        setEmail(window.localStorage.getItem(LOCAL_AUTH_EMAIL))
      })
  }, [])

  const checkBackend = useCallback(async () => {
    setBackend({ status: "checking" })
    const started = performance.now()
    try {
      const res = await fetch(`${API_BASE}/`, { cache: "no-store" })
      const ms = Math.round(performance.now() - started)
      const source = res.headers.get("x-sparkle-data-source")
      const body = await res.json().catch(() => ({}))
      if (source === "local-fallback") setBackend({ status: "fallback", ms })
      else if (res.ok) setBackend({ status: "live", ms, detail: body.companies ? `${body.companies} companies, ${body.total_analyses} AI analyses` : undefined })
      else setBackend({ status: "down", ms })
    } catch {
      setBackend({ status: "down" })
    }
  }, [])

  useEffect(() => { checkBackend() }, [checkBackend])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdMessage(null)
    if (newPwd.length < 6) return setPwdMessage({ ok: false, text: "Use at least 6 characters for the new password." })
    if (newPwd !== confirmPwd) return setPwdMessage({ ok: false, text: "The new passwords don't match." })
    if (oldPwd === newPwd) return setPwdMessage({ ok: false, text: "The new password must be different from the current one." })

    setPwdLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email ?? "", password: oldPwd })
    if (signInError) {
      setPwdLoading(false)
      return setPwdMessage({ ok: false, text: "Your current password is incorrect." })
    }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdLoading(false)
    if (error) return setPwdMessage({ ok: false, text: error.message })
    setPwdMessage({ ok: true, text: "Password changed." })
    setOldPwd(""); setNewPwd(""); setConfirmPwd("")
  }

  const handleLogout = async () => {
    document.cookie = `${LOCAL_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    window.localStorage.removeItem(LOCAL_AUTH_EMAIL)
    await createClient().auth.signOut().catch(() => {})
    window.location.href = "/login"
  }

  const BACKEND_COPY: Record<BackendState["status"], { label: string; dot: string; text: string }> = {
    checking: { label: "Checking…", dot: "bg-faint-foreground", text: "Contacting the data service." },
    live: { label: "Connected", dot: "bg-up", text: "Prices, signals and reports are live." },
    fallback: { label: "Offline, using sample data", dot: "bg-primary", text: "The backend isn't reachable, so pages show bundled sample numbers. Start it with uvicorn on port 8000." },
    down: { label: "Not reachable", dot: "bg-down", text: "Neither the backend nor the fallback answered. Check that the frontend server is running." },
  }
  const b = BACKEND_COPY[backend.status]

  return (
    <DashboardShell>
      <PageHeader title="Settings" description="Your account and the data connection behind the app." />

      <div className="grid max-w-4xl grid-cols-1 gap-6">
        <Panel aria-label="Account">
          <PanelHeader title="Account" />
          <dl className="divide-y divide-line text-sm">
            <div className="flex items-center justify-between gap-4 px-5 py-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate text-foreground">{email ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-3">
              <dt className="text-muted-foreground">Signed in with</dt>
              <dd className="text-right text-foreground">
                {supabaseUser === null ? "—" : supabaseUser ? "Supabase account" : "This device only (local mode)"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-3">
              <dt className="text-muted-foreground">Watchlist stored</dt>
              <dd className="text-right text-foreground">{supabaseUser ? "In your account" : "In this browser"}</dd>
            </div>
          </dl>
          <div className="border-t border-line px-5 py-3">
            <button onClick={handleLogout} className="text-sm font-medium text-down hover:underline">Log out</button>
          </div>
        </Panel>

        <Panel aria-label="Data connection">
          <PanelHeader
            title="Data connection"
            actions={<PanelAction onClick={checkBackend} disabled={backend.status === "checking"}><RefreshCw size={12} className={cn(backend.status === "checking" && "animate-spin")} /> Check again</PanelAction>}
          />
          <div className="flex items-start gap-3 px-5 py-4">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", b.dot)} aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {b.label}
                {backend.ms != null && <span className="ml-2 font-normal tabular text-faint-foreground">{backend.ms} ms</span>}
              </p>
              <p className="mt-0.5 text-muted-foreground">{backend.detail ? `${b.text} ${backend.detail}.` : b.text}</p>
            </div>
          </div>
          <p className="border-t border-line px-5 py-3 text-xs text-faint-foreground">
            Market data comes from Yahoo Finance and Google News through the SparkleAI backend. Quotes can be delayed up to 15 minutes.
          </p>
        </Panel>

        {supabaseUser && (
          <Panel aria-label="Change password">
            <PanelHeader title="Change password" description="Enter your current password to confirm it's you." />
            <form onSubmit={handleChangePassword} className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-3">
              <PasswordField id="old" label="Current password" value={oldPwd} onChange={setOldPwd} autoComplete="current-password" />
              <PasswordField id="new" label="New password" value={newPwd} onChange={setNewPwd} autoComplete="new-password" />
              <PasswordField id="confirm" label="Confirm new password" value={confirmPwd} onChange={setConfirmPwd} autoComplete="new-password" />
              <div className="flex flex-wrap items-center gap-4 md:col-span-3">
                <button type="submit" disabled={pwdLoading} className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {pwdLoading && <Loader2 size={15} className="animate-spin" />} Change password
                </button>
                {pwdMessage && <p role="status" className={cn("text-sm", pwdMessage.ok ? "text-up" : "text-down")}>{pwdMessage.text}</p>}
              </div>
            </form>
          </Panel>
        )}
      </div>
    </DashboardShell>
  )
}
