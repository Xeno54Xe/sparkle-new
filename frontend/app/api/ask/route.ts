// Ask Sparkle: runs the model with SparkleAI's tools and streams the answer.
//
// Request:  POST { messages: [{ role: "user" | "assistant", content }], symbol? }
// Response: newline-delimited JSON events:
//   { t: "status", text }            a tool started ("Reading TCS earnings call")
//   { t: "delta", text }             answer text, in order
//   { t: "reset" }                   drop text streamed so far (model went on to call tools)
//   { t: "sources", items: Source[] }
//   { t: "done" } | { t: "error", message, code? }
import { NextRequest } from "next/server"
import { llmConfig, LlmError, streamChat, type ChatMessage, type ToolCall } from "@/features/ask/server/llm"
import { runTool, TOOL_SPECS, TOOL_STATUS, type Source } from "@/features/ask/server/tools"
import { systemPrompt } from "@/features/ask/server/prompt"
import { getStockBySymbol } from "@/lib/stocks"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_ROUNDS = 5               // model turns that may call tools before it must answer
const MAX_HISTORY = 12             // earlier messages kept for context
const MAX_QUESTION_CHARS = 1500
const MAX_MESSAGE_CHARS = 6000
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 20              // questions per IP per window (per server instance)

const hits = new Map<string, number[]>()

function rateLimited(ip: string, now = Date.now()) {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return false
}

type Incoming = { role?: unknown; content?: unknown }

function cleanHistory(raw: unknown): ChatMessage[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return "Send at least one message."
  const msgs = (raw as Incoming[])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role as "user" | "assistant", content: (m.content as string).slice(0, MAX_MESSAGE_CHARS) }))
  const last = msgs[msgs.length - 1]
  if (!last || last.role !== "user") return "The last message must be a question."
  if (last.content.length > MAX_QUESTION_CHARS) return `Questions can be up to ${MAX_QUESTION_CHARS} characters.`
  return msgs.slice(-MAX_HISTORY)
}

export async function POST(request: NextRequest) {
  const config = llmConfig()
  if (!config) {
    return Response.json(
      { error: "Ask Sparkle isn't switched on yet: no AI key is configured on the server.", code: "not_configured" },
      { status: 503 }
    )
  }

  let body: { messages?: unknown; symbol?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 })
  }
  const history = cleanHistory(body.messages)
  if (typeof history === "string") return Response.json({ error: history }, { status: 400 })
  const symbol = typeof body.symbol === "string" && getStockBySymbol(body.symbol) ? body.symbol.toUpperCase() : null

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local"
  if (rateLimited(ip)) {
    return Response.json({ error: "That's a lot of questions in a short time. Please wait a few minutes.", code: "rate_limited" }, { status: 429 })
  }

  const encoder = new TextEncoder()
  const abort = new AbortController()
  request.signal.addEventListener("abort", () => abort.abort())

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
        } catch {
          // client went away
        }
      }
      const sources = new Map<string, Source>()
      const messages: ChatMessage[] = [{ role: "system", content: systemPrompt({ symbol }) }, ...history]

      try {
        for (let round = 0; round <= MAX_ROUNDS; round += 1) {
          const finalRound = round === MAX_ROUNDS
          let text = ""
          let calls: ToolCall[] = []

          for await (const ev of streamChat({ config, messages, tools: finalRound ? undefined : TOOL_SPECS, signal: abort.signal })) {
            if (ev.type === "text") {
              text += ev.text
              send({ t: "delta", text: ev.text })
            } else if (ev.type === "tool_calls") {
              calls = ev.calls
            }
          }

          if (!calls.length) {
            if (!text.trim()) send({ t: "delta", text: "I couldn't put an answer together for that. Could you rephrase it?" })
            break
          }

          // The model is going to look things up; anything it wrote so far was a preamble.
          if (text) send({ t: "reset" })
          messages.push({ role: "assistant", content: text || null, tool_calls: calls })
          for (const call of calls) send({ t: "status", text: statusFor(call.function.name, call.function.arguments) })
          const results = await Promise.all(calls.map((c) => runTool(c.function.name, c.function.arguments, abort.signal)))
          results.forEach((r, i) => {
            for (const s of r.sources) if (s?.url && !sources.has(s.url + (s.title ?? ""))) sources.set(s.url + (s.title ?? ""), s)
            messages.push({ role: "tool", tool_call_id: calls[i].id, content: r.content })
          })
        }
        if (sources.size) send({ t: "sources", items: [...sources.values()].slice(0, 12) })
        send({ t: "done" })
      } catch (e) {
        if (abort.signal.aborted) {
          // the person pressed stop or left
        } else if (e instanceof LlmError) {
          const friendly =
            e.status === 401 ? "The AI key on the server was rejected." :
            e.status === 429 ? "The AI service is busy or out of quota right now. Try again shortly." :
            e.status === 404 ? `The configured model (${config.model}) isn't available.` :
            "The AI service had a problem answering. Try again."
          console.error("[ask] model error", e.status, e.message)
          send({ t: "error", message: friendly, code: "model_error" })
        } else {
          console.error("[ask] failed", e)
          send({ t: "error", message: "Something went wrong while answering. Try again.", code: "internal" })
        }
      } finally {
        try {
          controller.close()
        } catch {}
      }
    },
    cancel() {
      abort.abort()
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  })
}

function statusFor(name: string, args: string) {
  try {
    const label = TOOL_STATUS[name]
    return label ? label(args ? JSON.parse(args) : {}) : name
  } catch {
    return name
  }
}
