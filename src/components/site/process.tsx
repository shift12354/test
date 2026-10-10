import { Reveal } from "@/components/site/reveal"
import { SectionHeading } from "@/components/site/section-heading"

const STEPS = [
  { title: "Lytt", body: "Vi starter med hva du vil oppnå — ikke hvilke knapper du vil ha." },
  { title: "Form", body: "Prototyper du kan ta på, med ekte innhold. Du ser fremgang hver uke." },
  { title: "Lanser", body: "Én kommando, og siden er ute. Vi følger med og finjusterer etterpå." },
]

export function Process() {
  return (
    <section aria-labelledby="prosess" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading id="prosess" eyebrow="Prosess" title="Tre steg. Uker, ikke måneder." />
        <ol className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 0.08}>
                <span aria-hidden="true" className="type-headline text-muted-foreground/40 block tabular-nums">
                  {i + 1}
                </span>
                <h3 className="type-title mt-3">{step.title}</h3>
                <p className="text-muted-foreground mt-2 text-pretty">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
