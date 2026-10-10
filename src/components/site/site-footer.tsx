const LINKS = [
  { href: "#arbeid", label: "Arbeid" },
  { href: "#funksjoner", label: "Funksjoner" },
  { href: "#prosess", label: "Prosess" },
  { href: "#priser", label: "Priser" },
  { href: "#kontakt", label: "Kontakt" },
]

export function SiteFooter() {
  return (
    <footer className="bg-tile text-muted-foreground type-caption pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <p className="border-b pb-4">
          Nordlys er et fiktivt studio laget for demonstrasjon. Kunder, tall og omtaler er oppdiktet.
        </p>
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p translate="no">Nordlys Studio · Tromsø</p>
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
      </div>
    </footer>
  )
}
