import type { Metadata, Viewport } from "next"
import { Schibsted_Grotesk } from "next/font/google"

import { Providers } from "@/components/site/providers"

import "./globals.css"

// Drawn in Norway for Schibsted's newspapers; æ, ø and å look at home in it.
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Nordlys: nettsider fra Tromsø",
  description:
    "Nordlys er et lite nettstudio i Tromsø. Vi lager nettsider for bedrifter i Nord-Norge.",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f4" },
    { media: "(prefers-color-scheme: dark)", color: "#172038" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nb"
      suppressHydrationWarning
      className={`${schibsted.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
