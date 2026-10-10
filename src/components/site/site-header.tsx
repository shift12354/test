import { Button } from "@/components/ui/button"
import { Logo } from "@/components/site/logo"
import { ThemeToggle } from "@/components/site/theme-toggle"

const NAV_LINKS = [
  { href: "#funksjoner", label: "Funksjoner" },
  { href: "#prosess", label: "Prosess" },
  { href: "#omtaler", label: "Omtaler" },
  { href: "#priser", label: "Priser" },
]

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="bg-background/70 supports-[backdrop-filter]:bg-background/50 mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 rounded-full border px-3 pl-5 shadow-[0_8px_32px_-12px_rgb(0_0_0/0.25)] backdrop-blur-xl">
        <a
          href="#top"
          aria-label="Nordlys, til toppen"
          className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-[3px]"
        >
          <Logo />
        </a>

        <nav aria-label="Hovedmeny" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring/50 rounded-full px-3 py-2 transition-colors outline-none focus-visible:ring-[3px]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button asChild size="sm" className="rounded-full px-4">
            <a href="#kontakt">Kom i gang</a>
          </Button>
        </div>
      </div>
    </header>
  )
}
