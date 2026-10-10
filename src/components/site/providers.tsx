"use client"

import { useEffect } from "react"
import { MotionConfig } from "motion/react"
import { ThemeProvider } from "next-themes"

import { spring } from "@/lib/motion"
import { ContactSheetProvider } from "@/components/site/contact-sheet"

export function Providers({ children }: { children: React.ReactNode }) {
  // iOS Safari only applies :active styles once a touch listener exists.
  useEffect(() => {
    const noop = () => {}
    document.addEventListener("touchstart", noop, { passive: true })
    return () => document.removeEventListener("touchstart", noop)
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user" transition={spring.default}>
        <ContactSheetProvider>{children}</ContactSheetProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}
