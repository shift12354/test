"use client"

import { useId, useState } from "react"
import { motion } from "motion/react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { OpenSheetButton } from "@/components/site/contact-sheet"
import { Reveal } from "@/components/site/reveal"
import { SectionHeading } from "@/components/site/section-heading"

const NOK = new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 })

type Billing = "monthly" | "yearly"
const BILLING: { value: Billing; label: string }[] = [
  { value: "monthly", label: "Månedlig" },
  { value: "yearly", label: "Årlig −20 %" },
]

const PLANS = [
  { name: "Start", monthly: 0, blurb: "For første utkast og hobbyprosjekter.", features: ["1 nettside", "Eget domene", "SSL og CDN"] },
  { name: "Pro", monthly: 290, blurb: "For små team som vil vokse.", features: ["10 nettsider", "Analyse i sanntid", "Forhåndsvisning per endring", "Prioritert støtte"], featured: true },
  { name: "Bedrift", monthly: 1490, blurb: "For organisasjoner med store krav.", features: ["Ubegrenset nettsider", "SSO og revisjonslogg", "99,99 % SLA", "Dedikert kontakt"] },
]

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly")

  return (
    <section aria-labelledby="priser" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading id="priser" eyebrow="Priser" title="Enkle priser.">
          Ingen bindingstid. Alle priser er per måned, eks. mva.
        </SectionHeading>

        <Reveal className="mb-10 flex justify-center">
          <SegmentedControl label="Fakturering" value={billing} options={BILLING} onChange={setBilling} />
        </Reveal>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => {
            const price = billing === "yearly" ? Math.round(plan.monthly * 0.8) : plan.monthly
            return (
              <Reveal
                key={plan.name}
                delay={i * 0.06}
                className={cn(
                  "bg-tile flex flex-col rounded-[1.75rem] p-8",
                  plan.featured && "ring-accent ring-2"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="type-tile">{plan.name}</h3>
                  {plan.featured ? (
                    <span className="text-accent dark:text-link type-caption font-semibold">Mest valgt</span>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-2">{plan.blurb}</p>
                <p className="mt-8 flex items-baseline gap-1.5">
                  <span className="type-title tabular-nums">{NOK.format(price)}</span>
                  <span className="text-muted-foreground">/mnd</span>
                </p>
                <p className="text-muted-foreground type-caption mt-1 min-h-4">
                  {billing === "yearly" && plan.monthly > 0 ? "Faktureres årlig" : ""}
                </p>
                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check aria-hidden="true" className="text-aurora-1 mt-1 size-4 shrink-0" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
                <OpenSheetButton
                  variant={plan.featured ? "filled" : "tinted"}
                  className={cn("mt-8 w-full", !plan.featured && "bg-background hover:bg-background/60")}
                >
                  Velg {plan.name}
                </OpenSheetButton>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const name = useId()
  return (
    <fieldset className="bg-tile relative inline-flex rounded-full p-1">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const checked = option.value === value
        return (
          <label
            key={option.value}
            className={cn(
              "press relative cursor-pointer rounded-full px-5 py-2 text-sm font-medium has-focus-visible:ring-4 has-focus-visible:ring-ring",
              checked ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {checked ? (
              // The thumb slides between segments on a critically damped spring.
              <motion.span
                layoutId={`${name}-thumb`}
                aria-hidden="true"
                className="bg-background absolute inset-0 rounded-full shadow-[0_1px_4px_rgb(0_0_0/0.12)] dark:bg-[#3a3a3c]"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
