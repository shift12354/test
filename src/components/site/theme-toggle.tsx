"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

const subscribe = () => () => {}

// next-themes reads the stored theme on the client only, so render the
// server's guess until hydration is done to keep the icon in sync.
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const hydrated = useHydrated()
  const theme = hydrated && resolvedTheme === "light" ? "light" : "dark"

  return (
    <AnimatedThemeToggler
      theme={theme}
      onThemeChange={setTheme}
      aria-label="Bytt mellom lyst og mørkt tema"
      className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring/50 inline-flex size-9 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-[3px] [&_svg]:size-4"
    />
  )
}
