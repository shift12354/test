import { WorkCarousel } from "@/components/site/work-carousel"

export function Work() {
  return (
    <section aria-labelledby="arbeid" className="overflow-x-clip py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 id="arbeid" className="type-headline max-w-[18ch] text-balance">
            Noe av det vi har laget
          </h2>
          <p className="text-muted-foreground max-w-[40ch]">
            Det gule viser når på året nettsiden har mest å gjøre. Dra i kortene eller bruk
            piltastene.
          </p>
        </div>
        <WorkCarousel />
      </div>
    </section>
  )
}
