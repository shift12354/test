"use client"

import { useEffect } from "react"
import { MotionConfig } from "motion/react"
import { ThemeProvider, useTheme } from "next-themes"

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
      <HostThemeSync />
      <MotionConfig reducedMotion="user" transition={spring.default}>
        <ContactSheetProvider>{children}</ContactSheetProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}

/**
 * Some hosts (such as the claude.ai artifact viewer) put the viewer's theme on
 * <html data-theme>. Follow it when it is set; otherwise the system setting rules.
 */
function HostThemeSync() {
  const { setTheme } = useTheme()
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const host = root.dataset.theme
      if (host === "light" || host === "dark") setTheme(host)
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [setTheme])
  return null
}
