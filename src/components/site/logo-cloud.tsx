import {
  Anchor,
  Mountain,
  Snowflake,
  Sun,
  Trees,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react"

import { Marquee } from "@/components/ui/marquee"

const BRANDS: { name: string; Icon: LucideIcon }[] = [
  { name: "Fjordline", Icon: Waves },
  { name: "Isbre", Icon: Snowflake },
  { name: "Midnattsol", Icon: Sun },
  { name: "Vidde", Icon: Mountain },
  { name: "Skjærgård", Icon: Anchor },
  { name: "Granskog", Icon: Trees },
  { name: "Kuling", Icon: Wind },
]

export function LogoCloud() {
  return (
    <section aria-label="Kunder" className="border-y py-10">
      <p className="text-muted-foreground mb-6 text-center text-sm">
        Over 2&nbsp;400 team lanserer med Nordlys
      </p>
      <div className="relative mx-auto max-w-5xl">
        <Marquee pauseOnHover className="[--duration:30s] [--gap:3.5rem]">
          {BRANDS.map(({ name, Icon }) => (
            <span
              key={name}
              translate="no"
              className="text-muted-foreground/80 hover:text-foreground flex items-center gap-2 text-xl font-semibold tracking-tight transition-colors"
            >
              <Icon aria-hidden="true" className="size-5" />
              {name}
            </span>
          ))}
        </Marquee>
        <div aria-hidden="true" className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-linear-to-r" />
        <div aria-hidden="true" className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/5 bg-linear-to-l" />
      </div>
    </section>
  )
}
