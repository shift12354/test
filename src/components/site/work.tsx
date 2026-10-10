import { Reveal } from "@/components/site/reveal"
import { SectionHeading } from "@/components/site/section-heading"
import { WorkCarousel } from "@/components/site/work-carousel"

export function Work() {
  return (
    <section aria-labelledby="arbeid" className="overflow-x-clip py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading id="arbeid" eyebrow="Arbeid" title="Sveip deg gjennom." align="start">
          Dra, kast eller bruk piltastene. Kortene følger fingeren, tar med seg farten
          og legger seg pent på plass.
        </SectionHeading>
        <Reveal delay={0.1}>
          <WorkCarousel />
        </Reveal>
      </div>
    </section>
  )
}
