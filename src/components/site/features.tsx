import {
  BellIcon,
  FileTextIcon,
  GlobeIcon,
  Share2Icon,
} from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { AnimatedList } from "@/components/ui/animated-list"
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
import { Marquee } from "@/components/ui/marquee"
import { IntegrationsBeam } from "@/components/site/integrations-beam"
import { LazyGlobe } from "@/components/site/lazy-globe"
import { SectionHeading } from "@/components/site/section-heading"

const FILES = [
  { name: "forside.mdx", body: "Velkommen til en ny tid for nettsider. Raskere, lysere og enklere å oppdatere." },
  { name: "priser.json", body: "Tre planer, ingen skjulte kostnader. Bytt eller avslutt når du vil." },
  { name: "logo.svg", body: "Vektorgrafikk som ser skarp ut på alle skjermer, fra klokke til kino." },
  { name: "blogg.md", body: "Fem ting vi lærte av å lansere 400 nettsider på ett år." },
  { name: "tema.css", body: "Fargetokens for lys og mørk modus, med kontrast som består WCAG AA." },
]

const NOTIFICATIONS = [
  { title: "Deploy fullført", detail: "nordlys.no · 38 s", icon: "🚀", color: "#34d399" },
  { title: "Ny bestilling", detail: "Pro-plan · Bergen", icon: "💸", color: "#22d3ee" },
  { title: "Lighthouse 100", detail: "Alle fire kategorier", icon: "⚡", color: "#818cf8" },
  { title: "Ny melding", detail: "«Kan vi lansere fredag?»", icon: "💬", color: "#e879f9" },
  { title: "Ny abonnent", detail: "Nyhetsbrev · Tromsø", icon: "✉️", color: "#fbbf24" },
]

function Notification({
  title,
  detail,
  icon,
  color,
}: (typeof NOTIFICATIONS)[number]) {
  return (
    <figure className="bg-background/80 relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border p-4 backdrop-blur transition-transform duration-200 ease-in-out hover:scale-[103%]">
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: color }}
        >
          <span aria-hidden="true" className="text-lg">
            {icon}
          </span>
        </div>
        <div className="flex min-w-0 flex-col">
          <figcaption className="truncate text-sm font-medium">{title}</figcaption>
          <p className="text-muted-foreground truncate text-sm">{detail}</p>
        </div>
      </div>
    </figure>
  )
}

const CARDS = [
  {
    Icon: FileTextIcon,
    name: "Innhold du eier",
    description: "Skriv i Markdown, publiser på sekunder.",
    href: "#kontakt",
    cta: "Les mer",
    className: "col-span-3 lg:col-span-1",
    background: (
      <Marquee
        pauseOnHover
        className="absolute top-10 [--duration:20s] [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)]"
      >
        {FILES.map((f) => (
          <figure
            key={f.name}
            className={cn(
              "relative w-32 cursor-pointer overflow-hidden rounded-xl border p-4",
              "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
              "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
              "transform-gpu blur-[1px] transition-[filter] duration-300 ease-out hover:blur-none"
            )}
          >
            <figcaption className="font-mono text-sm font-medium">{f.name}</figcaption>
            <p className="mt-2 text-xs">{f.body}</p>
          </figure>
        ))}
      </Marquee>
    ),
  },
  {
    Icon: BellIcon,
    name: "Alt skjer i sanntid",
    description: "Se bestillinger, meldinger og deploys idet de skjer.",
    href: "#kontakt",
    cta: "Les mer",
    className: "col-span-3 lg:col-span-2",
    background: (
      <AnimatedList
        delay={1600}
        className="absolute top-4 right-2 h-[300px] w-full scale-75 border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-transform duration-300 ease-out group-hover:scale-80"
      >
        {NOTIFICATIONS.map((n) => (
          <Notification key={n.title} {...n} />
        ))}
      </AnimatedList>
    ),
  },
  {
    Icon: Share2Icon,
    name: "Koblet til verktøyene dine",
    description: "GitHub, betaling, e-post og analyse — rett ut av boksen.",
    href: "#kontakt",
    cta: "Les mer",
    className: "col-span-3 lg:col-span-2",
    background: (
      <IntegrationsBeam className="absolute top-2 right-0 left-0 mx-auto h-[260px] border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-transform duration-300 ease-out group-hover:scale-105" />
    ),
  },
  {
    Icon: GlobeIcon,
    name: "Raskt overalt",
    description: "Servert fra over 100 byer, nær hver besøkende.",
    href: "#kontakt",
    cta: "Les mer",
    className: "col-span-3 lg:col-span-1",
    background: (
      <LazyGlobe className="top-0 h-[600px] w-[600px] transition-transform duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_30%,#000_100%)] group-hover:scale-105 sm:left-40 lg:left-0" />
    ),
  },
]

export function Features() {
  return (
    <section aria-labelledby="funksjoner" className="px-4 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="funksjoner"
          eyebrow="Funksjoner"
          title="Alt du trenger. Ingenting du ikke trenger."
        >
          Et lite, gjennomtenkt verktøysett som gjør nettsiden din rask,
          vakker og enkel å drive.
        </SectionHeading>
        <BentoGrid>
          {CARDS.map((card) => (
            <BentoCard key={card.name} {...card} />
          ))}
        </BentoGrid>
      </div>
    </section>
  )
}
