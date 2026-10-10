import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"

import { Providers } from "@/components/site/providers"

import "./globals.css"

// SF Pro is used where the platform has it; Inter is the cross-platform fallback.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
})

export const metadata: Metadata = {
  title: "Nordlys — nettsider som føles levende",
  description:
    "Nordlys er et lite studio som bygger raske, rolige og tilgjengelige nettsider.",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nb"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
