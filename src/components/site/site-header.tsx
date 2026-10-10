import { LogoMark } from "@/components/site/logo"
import { OpenSheetButton } from "@/components/site/contact-sheet"
import { ThemeToggle } from "@/components/site/theme-toggle"

const NAV_LINKS = [
  { href: "#arbeid", label: "Arbeid" },
  { href: "#priser", label: "Priser" },
  { href: "#om-oss", label: "Om oss" },
]

export function SiteHeader() {
  return (
    <header className="material scroll-edge sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <a
          href="#top"
          translate="no"
          className="press focus-visible:ring-ring -mx-2 inline-flex items-center gap-2 rounded-full px-2 py-1 text-lg font-extrabold tracking-[-0.02em] outline-none focus-visible:ring-4"
        >
          <LogoMark />
          Nordlys
        </a>

        <div className="flex items-center gap-1 sm:gap-6">
          <nav aria-label="Hovedmeny" className="hidden md:block">
            <ul className="type-small flex items-center gap-6 font-medium">
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
          <ThemeToggle />
          <OpenSheetButton size="sm">Book en prat</OpenSheetButton>
        </div>
      </div>
    </header>
  )
}
