import { cn } from "@/lib/utils"
import { DotPattern } from "@/components/ui/dot-pattern"
import { Marquee } from "@/components/ui/marquee"
import { SectionHeading } from "@/components/site/section-heading"

// Fictional customers for the demo site.
const REVIEWS = [
  { name: "Ingrid H.", role: "Daglig leder, Fjordline", body: "Ny nettside på tre uker, og konverteringen gikk opp 40 %. Vi skulle gjort dette for lenge siden.", hue: 160 },
  { name: "Magnus E.", role: "CTO, Isbre", body: "Endelig et byrå som skjønner både design og ytelse. Lighthouse 100 fra dag én.", hue: 200 },
  { name: "Sofie L.", role: "Markedssjef, Midnattsol", body: "Vi oppdaterer innhold selv, uten å ringe noen. Det er gull verdt.", hue: 285 },
  { name: "Jonas B.", role: "Gründer, Vidde", body: "Mørk modus, animasjoner og alt — og den er fortsatt lynrask på mobil.", hue: 330 },
  { name: "Emma K.", role: "Produktleder, Skjærgård", body: "Prosessen var rolig og ryddig. Vi så fremgang hver eneste uke.", hue: 40 },
  { name: "Henrik S.", role: "Utvikler, Granskog", body: "Koden er ren og godt strukturert. Lett å bygge videre på.", hue: 120 },
]

const FIRST_ROW = REVIEWS.slice(0, REVIEWS.length / 2)
const SECOND_ROW = REVIEWS.slice(REVIEWS.length / 2)

function ReviewCard({ name, role, body, hue }: (typeof REVIEWS)[number]) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
  return (
    <figure
      className={cn(
        "bg-background/80 relative w-72 overflow-hidden rounded-2xl border p-5 backdrop-blur sm:w-80",
        "hover:border-foreground/20 transition-colors"
      )}
    >
      <blockquote className="text-pretty">“{body}”</blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, oklch(0.7 0.16 ${hue}), oklch(0.55 0.18 ${hue + 60}))`,
          }}
        >
          {initials}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="text-muted-foreground truncate text-xs">{role}</span>
        </span>
      </figcaption>
    </figure>
  )
}

export function Testimonials() {
  return (
    <section
      aria-labelledby="omtaler"
      className="relative isolate overflow-hidden px-4 py-28"
    >
      <DotPattern
        aria-hidden="true"
        className="-z-10 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)] text-neutral-400/60"
      />
      <SectionHeading
        id="omtaler"
        eyebrow="Omtaler"
        title="Team som allerede lyser"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-2">
        <Marquee pauseOnHover className="[--duration:45s]">
          {FIRST_ROW.map((review) => (
            <ReviewCard key={review.name} {...review} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:45s]">
          {SECOND_ROW.map((review) => (
            <ReviewCard key={review.name} {...review} />
          ))}
        </Marquee>
        <div aria-hidden="true" className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-linear-to-r" />
        <div aria-hidden="true" className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-linear-to-l" />
      </div>
    </section>
  )
}
