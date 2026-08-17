import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const localAuthAvailable = process.env.NEXT_PUBLIC_ENABLE_LOCAL_AUTH_BYPASS === "true"
  const localAuthBypass =
    localAuthAvailable &&
    request.cookies.get("sparkle-local-auth")?.value === "1"

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user: unknown = null
  if (!localAuthAvailable) {
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      user = null
    }
  }
  const { pathname } = request.nextUrl

  const publicPaths = ["/", "/login", "/signup"]
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/api/backend") ||
    pathname.startsWith("/api/options-strategies")

  // Authenticated users visiting login/signup → send to dashboard
  if ((user || localAuthBypass) && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Unauthenticated users visiting protected routes → send to login
  if (!user && !localAuthBypass && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
