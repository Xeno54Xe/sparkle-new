// Streaming chat client for any OpenAI-compatible API (OpenAI itself, or
// Google's Gemini OpenAI-compatible endpoint), plus a scripted stand-in used
// by tests. No SDK: plain fetch + server-sent events.

export type ToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
  /** Provider data that must be sent back unchanged, e.g. Gemini's thought_signature. */
  extra_content?: Record<string, unknown>
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string }

export type ToolSpec = {
  type: "function"
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "finish"; reason: string | null }

export type LlmConfig = {
  provider: "openai" | "gemini" | "mock"
  model: string
  baseUrl: string
  apiKey: string
}

/** Which model to use, from environment variables; null when none is configured. */
export function llmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig | null {
  if (env.ASK_MOCK === "1") return { provider: "mock", model: "mock", baseUrl: "", apiKey: "" }
  if (env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      baseUrl: (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
      apiKey: env.OPENAI_API_KEY,
    }
  }
  if (env.GEMINI_API_KEY) {
    return {
      provider: "gemini",
      model: env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: env.GEMINI_API_KEY,
    }
  }
  return null
}

export class LlmError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
  }
}

type StreamOptions = {
  config: LlmConfig
  messages: ChatMessage[]
  tools?: ToolSpec[]
  maxTokens?: number
  signal?: AbortSignal
}

export async function* streamChat(opts: StreamOptions): AsyncGenerator<StreamEvent> {
  if (opts.config.provider === "mock") {
    yield* mockStream(opts.messages, opts.tools)
    return
  }
  const body: Record<string, unknown> = {
    model: opts.config.model,
    messages: opts.messages,
    stream: true,
    temperature: 0.2,
    max_tokens: opts.maxTokens ?? 1200,
  }
  if (opts.tools?.length) {
    body.tools = opts.tools
    body.tool_choice = "auto"
  }
  const response = await fetch(`${opts.config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${opts.config.apiKey}` },
    body: JSON.stringify(body),
    signal: opts.signal,
  })
  if (!response.ok || !response.body) {
    let detail = ""
    try {
      const err = await response.json()
      detail = err?.error?.message || err?.[0]?.error?.message || ""
    } catch {}
    throw new LlmError(detail || `Model request failed (${response.status})`, response.status)
  }

  const calls = new Map<number, ToolCall>()
  const slots = new Map<number, number>()
  let finish: string | null = null
  const decoder = new TextDecoder()
  const reader = response.body.getReader()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newline: number
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (!line.startsWith("data:")) continue
      const data = line.slice(5).trim()
      if (data === "[DONE]") continue
      let chunk: { choices?: Array<{ delta?: { content?: string | null; tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string }; extra_content?: Record<string, unknown> }> }; finish_reason?: string | null }> }
      try {
        chunk = JSON.parse(data)
      } catch {
        continue
      }
      const choice = chunk.choices?.[0]
      if (!choice) continue
      const delta = choice.delta || {}
      if (delta.content) yield { type: "text", text: delta.content }
      for (const [n, tc] of (delta.tool_calls || []).entries()) {
        // Gemini streams parallel calls each as index 0, so a new id means a new call.
        const reported = tc.index ?? n
        let index = slots.get(reported) ?? reported
        const existing = calls.get(index)
        if (tc.id && existing?.id && existing.id !== tc.id) {
          index = Math.max(...calls.keys(), ...slots.values()) + 1
          slots.set(reported, index)
        }
        const current = calls.get(index) ?? { id: "", type: "function" as const, function: { name: "", arguments: "" } }
        if (tc.id) current.id = tc.id
        if (tc.function?.name) current.function.name += tc.function.name
        if (tc.function?.arguments) current.function.arguments += tc.function.arguments
        // Gemini 3 rejects the follow-up turn unless each call's signature comes back.
        if (tc.extra_content) current.extra_content = { ...current.extra_content, ...tc.extra_content }
        calls.set(index, current)
      }
      if (choice.finish_reason) finish = choice.finish_reason
    }
  }
  if (calls.size) {
    const list = [...calls.entries()].sort((a, b) => a[0] - b[0]).map(([i, c]) => ({ ...c, id: c.id || `call_${i}` }))
    yield { type: "tool_calls", calls: list }
  }
  yield { type: "finish", reason: finish }
}

// ── Scripted stand-in model (ASK_MOCK=1, tests only) ─────────────────────
// Turn 1: picks tools from the question. Turn 2: writes an answer that quotes
// what the tools returned. Lets the whole pipeline be tested without a key.

async function* mockStream(messages: ChatMessage[], tools?: ToolSpec[]): AsyncGenerator<StreamEvent> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? ""
  const toolResults = messages.filter((m): m is Extract<ChatMessage, { role: "tool" }> => m.role === "tool")
  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf("assistant")
  const answeredTools = lastAssistantIdx >= 0 && messages.slice(lastAssistantIdx).some((m) => m.role === "tool")

  if (!answeredTools && tools?.length) {
    const upper = lastUser.toUpperCase()
    const symbol = (upper.match(/\b(TCS|INFY|RELIANCE|HDFCBANK|ICICIBANK|ITC|SBIN|LT|WIPRO)\b/) || [])[1]
    const calls: ToolCall[] = []
    if (symbol) calls.push(mockCall("stock_snapshot", { symbol }))
    if (/market|today|nifty/i.test(lastUser)) calls.push(mockCall("market_overview", {}))
    if (/screen|signal|rsi/i.test(lastUser)) calls.push(mockCall("screen_stocks", { signal: "BUY", limit: 5 }))
    calls.push(mockCall("search_reports", { query: lastUser.slice(0, 120), ...(symbol ? { company: symbol } : {}) }))
    yield { type: "tool_calls", calls }
    yield { type: "finish", reason: "tool_calls" }
    return
  }

  const parts = ["**Stand-in answer** (test model).\n\n"]
  for (const r of toolResults.slice(-4)) {
    parts.push(`- ${r.content.replace(/\s+/g, " ").slice(0, 160)}\n`)
  }
  for (const piece of parts.join("").match(/[\s\S]{1,40}/g) || []) {
    yield { type: "text", text: piece }
  }
  yield { type: "finish", reason: "stop" }
}

let mockId = 0
function mockCall(name: string, args: Record<string, unknown>): ToolCall {
  mockId += 1
  return { id: `mock_${mockId}`, type: "function", function: { name, arguments: JSON.stringify(args) } }
}
