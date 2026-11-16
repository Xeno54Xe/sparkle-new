// Base URL for SparkleAI backend calls made from the browser.
// Defaults to the Next.js proxy route (app/api/backend), which forwards to
// BACKEND_API_URL and serves bundled fallback data if the backend is down.
// Set NEXT_PUBLIC_API_URL to call a backend directly instead.
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/backend"
