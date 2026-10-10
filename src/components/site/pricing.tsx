import { CheckIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { MagicCard } from "@/components/ui/magic-card"
import { SectionHeading } from "@/components/site/section-heading"

const NOK = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
})

const PLANS = [
  {
    name: "Start",
    price: 0,
    blurb: "For hobbyprosjekter og første utkast.",
    features: ["1 nettside", "Eget domene", "SSL og CDN inkludert"],
    featured: false,
  },
  {
    name: "Pro",
    price: 290,
    blurb: "For små team som vil vokse raskt.",
    features: ["10 nettsider", "Analyse i sanntid", "Forhåndsvisning per endring", "Prioritert støtte"],
    featured: true,
  },
  {
    name: "Bedrift",
    price: 1490,
    blurb: "For organisasjoner med store krav.",
    features: ["Ubegrenset nettsider", "SSO og revisjonslogg", "99,99 % SLA", "Dedikert kontakt"],
    featured: false,
  },
]

export function Pricing() {
  return (
    <section aria-labelledby="priser" className="px-4 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading id="priser" eyebrow="Priser" title="Enkle priser som vokser med deg">
          Ingen bindingstid. Alle priser er per måned, eks. mva.
        </SectionHeading>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.name} className="relative rounded-3xl">
              <MagicCard
                gradientFrom="#34d399"
                gradientTo="#818cf8"
                gradientColor="color-mix(in oklch, var(--aurora-2) 12%, transparent)"
                className="h-full rounded-3xl"
              >
                <div className="flex h-full flex-col p-8">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {plan.featured ? (
                      <span className="bg-aurora-1/15 text-aurora-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        Mest populær
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">{plan.blurb}</p>
                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tighter tabular-nums">
                      {NOK.format(plan.price)}
                    </span>
                    <span className="text-muted-foreground text-sm">/mnd</span>
                  </p>
                  <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckIcon aria-hidden="true" className="text-aurora-1 size-4 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    size="lg"
                    variant={plan.featured ? "default" : "outline"}
                    className={cn("mt-8 w-full rounded-full")}
                  >
                    <a href="#kontakt">Velg {plan.name}</a>
                  </Button>
                </div>
              </MagicCard>
              {plan.featured ? (
                <BorderBeam
                  duration={10}
                  size={180}
                  colorFrom="#34d399"
                  colorTo="#818cf8"
                  borderWidth={1.5}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
