import { Accessibility, Globe2, MoonStar, Hand } from "lucide-react"

import { cn } from "@/lib/utils"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Reveal } from "@/components/site/reveal"
import { SectionHeading } from "@/components/site/section-heading"

function Tile({
  className,
  delay = 0,
  children,
}: {
  className?: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <Reveal delay={delay} className={cn("bg-tile text-tile-foreground flex flex-col overflow-hidden rounded-[1.75rem] p-8 sm:p-10", className)}>
      {children}
    </Reveal>
  )
}

const RINGS = ["Ytelse", "Tilgjengelighet", "Beste praksis", "SEO"]

export function Highlights() {
  return (
    <section aria-labelledby="funksjoner" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading id="funksjoner" eyebrow="Funksjoner" title="Alt du trenger. Ingenting du ikke trenger." />
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          <Tile className="md:col-span-2">
            <p className="type-subhead text-muted-foreground font-semibold">Rask. Virkelig rask.</p>
            <p className="mt-auto pt-16">
              <span className="type-display block tabular-nums">
                <NumberTicker value={38} locale="nb-NO" className="tracking-[inherit] text-inherit" />
                <span className="text-muted-foreground"> ms</span>
              </span>
              <span className="text-muted-foreground mt-2 block">Median svartid i Europa.</span>
            </p>
          </Tile>

          <Tile delay={0.05}>
            <p className="type-subhead text-muted-foreground font-semibold">Lighthouse</p>
            <ul className="mt-auto grid grid-cols-2 gap-5 pt-10">
              {RINGS.map((label) => (
                <li key={label} className="flex flex-col items-center gap-2 text-center">
                  <span className="relative inline-flex size-16 items-center justify-center">
                    <svg viewBox="0 0 36 36" aria-hidden="true" className="absolute inset-0 -rotate-90">
                      <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3" className="stroke-aurora-1/20" />
                      <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-aurora-1" />
                    </svg>
                    <span className="text-aurora-1 text-lg font-semibold tabular-nums">100</span>
                  </span>
                  <span className="type-caption text-muted-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </Tile>

          <Tile delay={0.05}>
            <Hand aria-hidden="true" className="text-aurora-2 size-9" strokeWidth={1.75} />
            <p className="type-tile mt-auto pt-12">Bygget for berøring.</p>
            <p className="text-muted-foreground mt-2">
              Fjærer som kan avbrytes, momentum og myke kanter — bevegelse som svarer
              med en gang.
            </p>
          </Tile>

          <Tile delay={0.1}>
            <MoonStar aria-hidden="true" className="text-aurora-3 size-9" strokeWidth={1.75} />
            <p className="type-tile mt-auto pt-12">Lys og mørk. Automatisk.</p>
            <p className="text-muted-foreground mt-2">Følger systemet ditt, med kontrast som består WCAG AA.</p>
          </Tile>

          <Tile delay={0.15}>
            <Accessibility aria-hidden="true" className="text-aurora-4 size-9" strokeWidth={1.75} />
            <p className="type-tile mt-auto pt-12">For alle.</p>
            <p className="text-muted-foreground mt-2">
              Tastatur, skjermleser og redusert bevegelse er med fra første skisse.
            </p>
          </Tile>

          <Tile className="md:col-span-3 md:flex-row md:items-end md:justify-between md:gap-10">
            <div>
              <Globe2 aria-hidden="true" className="text-aurora-2 size-9" strokeWidth={1.75} />
              <p className="type-tile mt-10">Nær hver besøkende.</p>
              <p className="text-muted-foreground mt-2 max-w-md">
                Servert fra over 100 byer, så siden din lastes like raskt i Bodø som i Boston.
              </p>
            </div>
            <p className="type-display mt-10 shrink-0 tabular-nums md:mt-0">
              <NumberTicker value={112} locale="nb-NO" className="tracking-[inherit] text-inherit" />
              <span className="text-muted-foreground type-subhead ms-3 font-semibold">byer</span>
            </p>
          </Tile>
        </div>
      </div>
    </section>
  )
}
