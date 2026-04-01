import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return new NextResponse('Domain is required', { status: 400 });
  }

  try {
    // Server-side fetch bypasses client-side AdBlockers (like uBlock Origin or Brave Shields)
    // enabling us to reliably fetch crisp, high-resolution Clearbit logos
    const response = await fetch(`https://logo.clearbit.com/${domain}?size=128`, {
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'SparkleAI-Logo-Proxy/1.0',
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) {
      return new NextResponse('Logo not found', { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Logo Proxy Error:", error);
    return new NextResponse('Error fetching logo', { status: 500 });
  }
}
