import { createBrowserClient } from "@supabase/ssr"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** True when a Supabase project is configured for this deployment. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)

const notConfigured = () => new Error("Accounts aren't set up on this deployment.")

// Without Supabase settings (e.g. a demo deployment using the local sign-in
// bypass) createBrowserClient throws as soon as it is called. Hand back a
// small stand-in instead: nobody is signed in to Supabase, and account
// actions report a plain error rather than crashing the page.
function offlineClient() {
  const result = <T,>(data: T, error: Error | null = null) => Promise.resolve({ data, error })
  const query: Record<string, unknown> = {}
  for (const method of ["select", "insert", "update", "delete", "eq", "order", "single"]) {
    query[method] = () => query
  }
  query.then = (resolve: (value: { data: null; error: Error }) => unknown) =>
    Promise.resolve({ data: null, error: notConfigured() }).then(resolve)

  return {
    auth: {
      getUser: () => result({ user: null }),
      getSession: () => result({ session: null }),
      signInWithPassword: () => result({ user: null, session: null }, notConfigured()),
      signUp: () => result({ user: null, session: null }, notConfigured()),
      updateUser: () => result({ user: null }, notConfigured()),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => query,
  }
}

export function createClient(): ReturnType<typeof createBrowserClient> {
  if (!supabaseConfigured) {
    return offlineClient() as unknown as ReturnType<typeof createBrowserClient>
  }
  return createBrowserClient(SUPABASE_URL!, SUPABASE_KEY!)
}
