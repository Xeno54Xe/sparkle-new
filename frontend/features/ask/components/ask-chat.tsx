"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowUp, Check, Copy, FileText, Loader2, RotateCcw, Sparkles, Square, SquarePen } from "lucide-react"
import { getStockBySymbol } from "@/lib/stocks"

type Source = { title: string; url: string; pdf?: string }
type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  steps?: string[]
  sources?: Source[]
  error?: string
  pending?: boolean
}

const STORAGE_KEY = "sparkle-ask-v1"
const MAX_QUESTION = 1500

const GENERAL_SUGGESTIONS = [
  "What's moving the Indian market today?",
  "How did Infosys management sound in its latest earnings call?",
  "Compare HDFC Bank and ICICI Bank on valuation, technicals and their latest calls",
  "Which Nifty 50 stocks have a BUY signal and an RSI below 60?",
  "Which companies flagged greenwashing or weak ESG disclosure?",
  "What changed for TCS in its latest Sparkle Report?",
]

function stockSuggestions(symbol: string, name: string) {
  return [
    `Give me the full picture on ${name}: price, technicals, valuation and the latest reports`,
    `What did ${name}'s management say about guidance in the latest earnings call?`,
    `What are the biggest risks flagged for ${name}?`,
    `How has ${symbol} done over the past year against the Nifty 50, and how risky is it?`,
    `What's in the news for ${name} this week?`,
  ]
}

const uid = () => Math.random().toString(36).slice(2, 10)

function loadSaved(): Message[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Message[]) : []
    return Array.isArray(parsed) ? parsed.filter((m) => !m.pending).slice(-40) : []
  } catch {
    return []
  }
}

export function AskChat({ symbol, initialQuestion }: { symbol?: string | null; initialQuestion?: string | null }) {
  const stock = symbol ? getStockBySymbol(symbol) : undefined
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const started = useRef(false)

  // Restore the last conversation on this device (not when arriving with a new question).
  useEffect(() => {
    if (!initialQuestion) setMessages(loadSaved())
  }, [initialQuestion])

  useEffect(() => {
    if (busy) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)))
    } catch {}
  }, [messages, busy])

  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const patchLast = useCallback((fn: (m: Message) => Message) => {
    setMessages((current) => {
      const next = current.slice()
      const i = next.length - 1
      if (i >= 0 && next[i].role === "assistant") next[i] = fn(next[i])
      return next
    })
  }, [])

  const ask = useCallback(
    async (question: string, base?: Message[]) => {
      const q = question.trim()
      if (!q || busy) return
      const history = (base ?? messages).filter((m) => !m.error && m.content.trim())
      const userMsg: Message = { id: uid(), role: "user", content: q.slice(0, MAX_QUESTION) }
      const answer: Message = { id: uid(), role: "assistant", content: "", steps: [], pending: true }
      setMessages([...(base ?? messages), userMsg, answer])
      setInput("")
      setBusy(true)
      stickToBottom.current = true
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: [...history, userMsg].map((m) => ({ role: m.role, content: m.content })),
            symbol: stock?.symbol ?? null,
          }),
          signal: controller.signal,
        })
        const type = res.headers.get("content-type") || ""
        if (!res.ok || !type.includes("ndjson") || !res.body) {
          let message = "Ask Sparkle couldn't answer right now. Try again."
          if (type.includes("html")) message = "Your session has ended. Log in again to keep asking."
          try {
            const data = await res.json()
            if (data?.code === "not_configured") setNotConfigured(true)
            if (data?.error) message = data.error
          } catch {}
          patchLast((m) => ({ ...m, pending: false, error: message }))
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let nl: number
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim()
            buffer = buffer.slice(nl + 1)
            if (!line) continue
            let ev: { t: string; text?: string; items?: Source[]; message?: string }
            try {
              ev = JSON.parse(line)
            } catch {
              continue
            }
            if (ev.t === "delta" && ev.text) patchLast((m) => ({ ...m, content: m.content + ev.text }))
            else if (ev.t === "reset") patchLast((m) => ({ ...m, content: "" }))
            else if (ev.t === "status" && ev.text) patchLast((m) => ({ ...m, steps: [...(m.steps ?? []), ev.text!] }))
            else if (ev.t === "sources") patchLast((m) => ({ ...m, sources: ev.items ?? [] }))
            else if (ev.t === "error") patchLast((m) => ({ ...m, error: ev.message || "Something went wrong." }))
          }
        }
        patchLast((m) => ({ ...m, pending: false }))
      } catch {
        patchLast((m) =>
          controller.signal.aborted
            ? { ...m, pending: false, content: m.content || "_Stopped._" }
            : { ...m, pending: false, error: "Lost the connection while answering. Try again." }
        )
      } finally {
        setBusy(false)
        abortRef.current = null
        inputRef.current?.focus()
      }
    },
    [busy, messages, patchLast, stock?.symbol]
  )

  // Arriving from a stock page or a link with ?q= asks straight away, once.
  useEffect(() => {
    if (initialQuestion && !started.current) {
      started.current = true
      void ask(initialQuestion, [])
    }
  }, [initialQuestion, ask])

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    if (!lastUser) return
    const idx = messages.lastIndexOf(lastUser)
    void ask(lastUser.content, messages.slice(0, idx))
  }

  const newChat = () => {
    abortRef.current?.abort()
    setMessages([])
    setInput("")
    inputRef.current?.focus()
  }

  const suggestions = stock ? stockSuggestions(stock.symbol, stock.name) : GENERAL_SUGGESTIONS
  const empty = messages.length === 0

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[520px] flex-col lg:h-[calc(100dvh-9.5rem)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <Sparkles size={22} className="text-primary" aria-hidden /> Ask Sparkle
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stock
              ? `Asking about ${stock.name}. Answers draw on live data and SparkleAI's reports, with sources.`
              : "Questions about the Nifty 50, answered from live data and 280+ AI-read reports, with sources."}
          </p>
        </div>
        {!empty && (
          <button
            type="button"
            onClick={newChat}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <SquarePen size={15} /> New chat
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="panel custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6"
      >
        {notConfigured && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
            Ask Sparkle isn&apos;t switched on yet. The site owner needs to add an AI key on the server.
          </div>
        )}

        {empty ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles size={24} />
            </div>
            <p className="text-lg font-medium text-foreground">{stock ? `What would you like to know about ${stock.name}?` : "What would you like to know?"}</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Earnings-call and annual-report analyses, Sparkle Reports, prices, technicals, news and risk, all in one place.
            </p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  disabled={busy}
                  className="rounded-lg border border-border bg-background px-3.5 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6" aria-live="polite">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-surface-2 px-4 py-2.5 text-sm text-foreground">{m.content}</div>
                </div>
              ) : (
                <AssistantMessage key={m.id} message={m} onRetry={retry} canRetry={!busy && m === messages[messages.length - 1]} />
              )
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void ask(input)
        }}
        className="mt-3"
      >
        <div className="panel flex items-end gap-2 p-2 focus-within:border-primary/60">
          <label htmlFor="ask-input" className="sr-only">Ask a question</label>
          <textarea
            id="ask-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_QUESTION))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void ask(input)
              }
            }}
            rows={1}
            placeholder={stock ? `Ask about ${stock.name}…` : "Ask about any Nifty 50 company, report or the market…"}
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground outline-none placeholder:text-faint-foreground [field-sizing:content]"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:border-down/60"
              aria-label="Stop answering"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-xs text-faint-foreground">
          AI answers can be wrong; check the linked sources. Not investment advice.
          {input.length > MAX_QUESTION - 200 && <span className="float-right">{input.length}/{MAX_QUESTION}</span>}
        </p>
      </form>
    </div>
  )
}

function AssistantMessage({ message: m, onRetry, canRetry }: { message: Message; onRetry: () => void; canRetry: boolean }) {
  const [copied, setCopied] = useState(false)
  const thinking = m.pending && !m.content
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Sparkles size={15} />
      </div>
      <div className="min-w-0 flex-1">
        {(m.steps?.length ?? 0) > 0 && (
          <ul className="mb-2 space-y-1">
            {m.steps!.map((s, i) => {
              const active = m.pending && !m.content && i === m.steps!.length - 1
              return (
                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {active ? <Loader2 size={12} className="animate-spin text-primary" /> : <Check size={12} className="text-up" />}
                  <span className="truncate">{s}</span>
                </li>
              )
            })}
          </ul>
        )}
        {thinking && !(m.steps?.length) && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin text-primary" /> Thinking…
          </p>
        )}
        {m.content && (
          <div className="ask-markdown text-sm leading-relaxed text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN}>
              {m.content}
            </ReactMarkdown>
            {m.pending && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-text-bottom" />}
          </div>
        )}
        {m.error && (
          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-down/30 bg-down/10 px-3 py-2 text-sm text-foreground">
            <span>{m.error}</span>
            {canRetry && (
              <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <RotateCcw size={13} /> Try again
              </button>
            )}
          </div>
        )}
        {!m.pending && (m.sources?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {m.sources!.map((s) => (
              <SourceChip key={s.url + s.title} source={s} />
            ))}
          </div>
        )}
        {!m.pending && m.content && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(m.content).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              })
            }}
            className="mt-2 inline-flex items-center gap-1 text-xs text-faint-foreground hover:text-foreground"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  )
}

function SourceChip({ source }: { source: Source }) {
  const cls = "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <Link href={source.url} className={cls}>
        <span className="truncate">{source.title}</span>
      </Link>
      {source.pdf && (
        <a href={source.pdf} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`PDF of ${source.title}`}>
          <FileText size={12} /> PDF
        </a>
      )}
    </span>
  )
}

const MARKDOWN: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  a({ href = "", children }) {
    const internal = href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api/")
    if (internal) return <Link href={href} className="font-medium text-primary hover:underline">{children}</Link>
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
        {children}
      </a>
    )
  },
  table({ children }) {
    return (
      <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">{children}</table>
      </div>
    )
  },
}
