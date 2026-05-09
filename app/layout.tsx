import type { Metadata } from "next"
import type { ReactNode } from "react"
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

// `display: "block"` holds render until fonts arrive. Without this, the page
// briefly renders in system fallbacks (Menlo, system-ui) which have very
// different metrics from IBM Plex — text gets visibly "smushed" until Plex
// loads and swaps in. Block trades a small first-paint delay for a consistent
// look on every refresh.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "block",
  preload: true,
})

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "block",
  preload: true,
})

export const metadata: Metadata = {
  title: "Pathway",
  description: "Process management for teams",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="bg-background text-foreground min-h-screen antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
