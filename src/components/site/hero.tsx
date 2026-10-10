import { ChevronRight } from "lucide-react"

import { OpenSheetButton } from "@/components/site/contact-sheet"
import { HeroVisual } from "@/components/site/hero-visual"
import { PillLink } from "@/components/site/pill"
import { Reveal } from "@/components/site/reveal"

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="overflow-hidden pt-20 pb-24 sm:pt-28">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6">
        <Reveal>
          <h1 id="hero-title" translate="no" className="type-display">
            <span className="from-aurora-1 via-aurora-2 to-aurora-3 bg-linear-to-r bg-clip-text text-transparent">
              Nordlys
            </span>
          </h1>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="type-subhead mt-4 text-balance">Nettsider som føles levende.</p>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-pretty">
            Et lite studio i Tromsø som designer og bygger raske, rolige og
            tilgjengelige nettsider — med bevegelse som svarer når du tar på dem.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <OpenSheetButton>Start et prosjekt</OpenSheetButton>
            <PillLink href="#arbeid" variant="link" className="type-body">
              Se arbeidet vårt
              <ChevronRight aria-hidden="true" />
            </PillLink>
          </div>
        </Reveal>
      </div>
      <div className="mt-16 sm:mt-20">
        <HeroVisual />
      </div>
    </section>
  )
}
