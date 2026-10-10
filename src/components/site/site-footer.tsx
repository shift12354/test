const LINKS = [
  { href: "#arbeid", label: "Arbeid" },
  { href: "#prosess", label: "Slik jobber vi" },
  { href: "#priser", label: "Priser" },
  { href: "#om-oss", label: "Om oss" },
  { href: "#kontakt", label: "Kontakt" },
]

export function SiteFooter() {
  return (
    <footer className="text-muted-foreground type-small border-t pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-8 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <p className="max-w-[52ch]">
          Nordlys er et oppdiktet studio laget som eksempel. Kundene og prosjektene finnes ikke.
        </p>
        <nav aria-label="Bunnmeny">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="hover:text-foreground focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-4">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
