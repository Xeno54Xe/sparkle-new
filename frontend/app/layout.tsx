import type { Metadata } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex",
  axes: ["wdth"],
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
    <html lang="en" className={`dark ${plex.variable}`}>
      <body className="font-sans antialiased min-h-screen overflow-x-hidden custom-scrollbar">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
