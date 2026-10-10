import { Reveal } from "@/components/site/reveal"

export function Quote() {
  return (
    <section aria-label="Kundeomtale" className="py-24 sm:py-32">
      <Reveal className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <figure>
          <blockquote className="type-headline text-balance">
            «Ny nettside på tre uker, og konverteringen gikk opp 40&nbsp;%.»
          </blockquote>
          {/* Fictional customer for the demo. */}
          <figcaption className="text-muted-foreground mt-8">
            Ingrid H., daglig leder i <span translate="no">Fjordline</span>
          </figcaption>
        </figure>
      </Reveal>
    </section>
  )
}
