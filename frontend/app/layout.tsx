import type { Metadata } from 'next'
import { Bricolage_Grotesque, Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["wdth", "opsz"],
  display: "swap",
})

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
})

export const metadata: Metadata = {
  title: 'SparkleAI — Nifty 50 research',
  description: 'Live prices, technical signals and AI-read earnings calls for every Nifty 50 company.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${display.variable} ${geist.variable}`}>
      <body className="font-sans antialiased min-h-screen overflow-x-hidden custom-scrollbar">
        {children}
        {/* Needs Web Analytics switched on for the Vercel project, else its script 404s */}
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "true" && <Analytics />}
      </body>
    </html>
  )
}
