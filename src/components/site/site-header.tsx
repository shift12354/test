import { LogoMark } from "@/components/site/logo"
import { OpenSheetButton } from "@/components/site/contact-sheet"
import { ThemeToggle } from "@/components/site/theme-toggle"

const NAV_LINKS = [
  { href: "#arbeid", label: "Arbeid" },
  { href: "#funksjoner", label: "Funksjoner" },
  { href: "#prosess", label: "Prosess" },
  { href: "#priser", label: "Priser" },
]

export function SiteHeader() {
  return (
    <header className="material scroll-edge sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <a
          href="#top"
          translate="no"
          className="press focus-visible:ring-ring -mx-2 inline-flex items-center gap-2 rounded-full px-2 py-1 text-[0.9375rem] font-semibold tracking-[-0.01em] outline-none focus-visible:ring-4"
        >
          <LogoMark className="size-5 rounded-md" />
          Nordlys
        </a>

        <nav aria-label="Hovedmeny" className="hidden md:block">
          <ul className="flex items-center gap-7 text-[0.8125rem] tracking-[0.005em]">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-foreground/75 hover:text-foreground focus-visible:ring-ring rounded-sm transition-colors outline-none focus-visible:ring-4"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <OpenSheetButton size="sm">Kom i gang</OpenSheetButton>
        </div>
      </div>
    </header>
  )
}
