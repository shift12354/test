"use client"

import { flushSync } from "react-dom"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark"
    const apply = () => {
      // Flip the class ourselves so the transition snapshots the new theme.
      document.documentElement.classList.toggle("dark", next === "dark")
      document.documentElement.style.colorScheme = next
      flushSync(() => setTheme(next))
    }
    if (!document.startViewTransition) return apply()
    document.startViewTransition(apply)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Bytt mellom lyst og mørkt tema"
      className="press text-foreground/70 hover:text-foreground hover:bg-foreground/10 focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-4"
    >
      {/* Both icons render; CSS picks one, so there is no hydration mismatch. */}
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
    </button>
  )
}
