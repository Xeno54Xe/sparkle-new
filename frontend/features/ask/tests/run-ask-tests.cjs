/* eslint-disable @typescript-eslint/no-require-imports */
// Ask Sparkle server pieces: the OpenAI-compatible stream parser (fed real
// OpenAI chunk shapes), provider selection, and the system prompt.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const test = require("node:test")
const ts = require("typescript")

const serverDir = path.resolve(__dirname, "..", "server")
const libDir = path.resolve(__dirname, "..", "..", "..", "lib")
const outDir = path.join(os.tmpdir(), "sparkle-ask-tests")

function transpile(from, to) {
  const source = fs.readFileSync(from, "utf8").replace(/@\/lib\//g, "../lib/")
  const out = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true },
  })
  fs.writeFileSync(to, out.outputText)
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(path.join(outDir, "server"), { recursive: true })
fs.mkdirSync(path.join(outDir, "lib"), { recursive: true })
fs.copyFileSync(path.join(libDir, "nifty50.json"), path.join(outDir, "lib", "nifty50.json"))
transpile(path.join(libDir, "stocks.ts"), path.join(outDir, "lib", "stocks.js"))
for (const f of ["llm.ts", "prompt.ts"]) transpile(path.join(serverDir, f), path.join(outDir, "server", f.replace(/\.ts$/, ".js")))

const { llmConfig, streamChat, LlmError } = require(path.join(outDir, "server", "llm.js"))
const { systemPrompt } = require(path.join(outDir, "server", "prompt.js"))

function sseResponse(chunks, { splitEvery = 7 } = {}) {
  const text = chunks.map((c) => `data: ${typeof c === "string" ? c : JSON.stringify(c)}\n\n`).join("")
  const bytes = new TextEncoder().encode(text)
  // deliver in awkward slices so lines are split across reads
  const stream = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += splitEvery) controller.enqueue(bytes.slice(i, i + splitEvery))
      controller.close()
    },
  })
  return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } })
}

async function collect(gen) {
  const events = []
  for await (const ev of gen) events.push(ev)
  return events
}

const config = { provider: "openai", model: "gpt-test", baseUrl: "https://example.test/v1", apiKey: "k" }

test("text deltas stream in order", async () => {
  const realFetch = global.fetch
  let sent
  global.fetch = async (url, init) => {
    sent = { url, body: JSON.parse(init.body), auth: init.headers.authorization }
    return sseResponse([
      { choices: [{ delta: { role: "assistant", content: "" } }] },
      { choices: [{ delta: { content: "Infosys " } }] },
      { choices: [{ delta: { content: "looks steady." } }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
      "[DONE]",
    ])
  }
  try {
    const events = await collect(streamChat({ config, messages: [{ role: "user", content: "hi" }] }))
    assert.equal(events.filter((e) => e.type === "text").map((e) => e.text).join(""), "Infosys looks steady.")
    assert.deepEqual(events.at(-1), { type: "finish", reason: "stop" })
    assert.equal(sent.url, "https://example.test/v1/chat/completions")
    assert.equal(sent.auth, "Bearer k")
    assert.equal(sent.body.stream, true)
    assert.equal(sent.body.tools, undefined)
  } finally {
    global.fetch = realFetch
  }
})

test("parallel tool calls are reassembled from fragments", async () => {
  const realFetch = global.fetch
  global.fetch = async () =>
    sseResponse([
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_a", type: "function", function: { name: "stock_snapshot", arguments: "" } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"sym' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 1, id: "call_b", type: "function", function: { name: "search_reports", arguments: '{"query":' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'bol":"INFY"}' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 1, function: { arguments: '"AI deals"}' } }] } }] },
      { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
      "[DONE]",
    ], { splitEvery: 5 })
  try {
    const events = await collect(streamChat({ config, messages: [{ role: "user", content: "x" }], tools: [{ type: "function", function: { name: "t", description: "", parameters: {} } }] }))
    const calls = events.find((e) => e.type === "tool_calls").calls
    assert.equal(calls.length, 2)
    assert.equal(calls[0].id, "call_a")
    assert.deepEqual(JSON.parse(calls[0].function.arguments), { symbol: "INFY" })
    assert.equal(calls[1].function.name, "search_reports")
    assert.deepEqual(JSON.parse(calls[1].function.arguments), { query: "AI deals" })
    assert.equal(events.at(-1).reason, "tool_calls")
  } finally {
    global.fetch = realFetch
  }
})

test("API errors surface with status and message", async () => {
  const realFetch = global.fetch
  global.fetch = async () => new Response(JSON.stringify({ error: { message: "Incorrect API key provided" } }), { status: 401 })
  try {
    await assert.rejects(collect(streamChat({ config, messages: [] })), (e) => e instanceof LlmError && e.status === 401 && /Incorrect API key/.test(e.message))
  } finally {
    global.fetch = realFetch
  }
})

test("provider is chosen from the environment", () => {
  assert.equal(llmConfig({}), null)
  assert.equal(llmConfig({ OPENAI_API_KEY: "a" }).model, "gpt-4o-mini")
  assert.equal(llmConfig({ OPENAI_API_KEY: "a", OPENAI_MODEL: "gpt-x" }).model, "gpt-x")
  assert.match(llmConfig({ GEMINI_API_KEY: "g" }).baseUrl, /generativelanguage/)
  assert.equal(llmConfig({ OPENAI_API_KEY: "a", GEMINI_API_KEY: "g" }).provider, "openai")
  assert.equal(llmConfig({ ASK_MOCK: "1", OPENAI_API_KEY: "a" }).provider, "mock")
})

test("the scripted stand-in calls tools, then answers from their results", async () => {
  const mock = { provider: "mock", model: "mock", baseUrl: "", apiKey: "" }
  const tools = [{ type: "function", function: { name: "x", description: "", parameters: {} } }]
  const first = await collect(streamChat({ config: mock, messages: [{ role: "user", content: "How is INFY doing?" }], tools }))
  const calls = first.find((e) => e.type === "tool_calls").calls
  assert(calls.some((c) => c.function.name === "stock_snapshot"))
  const second = await collect(streamChat({
    config: mock,
    tools,
    messages: [
      { role: "user", content: "How is INFY doing?" },
      { role: "assistant", content: null, tool_calls: calls },
      ...calls.map((c) => ({ role: "tool", tool_call_id: c.id, content: '{"price":1200}' })),
    ],
  }))
  assert.match(second.filter((e) => e.type === "text").map((e) => e.text).join(""), /price/)
})

test("system prompt carries the date, the stock in focus and the rules", () => {
  const p = systemPrompt({ symbol: "INFY", now: new Date("2026-11-16T05:00:00Z") })
  assert.match(p, /16 November 2026/)
  assert.match(p, /Infosys \(INFY\)/)
  assert.match(p, /Not investment advice/)
  assert.match(p, /HDFCBANK=HDFC Bank/)
  assert.doesNotMatch(systemPrompt({ symbol: "NOPE" }), /currently looking at/)
})
