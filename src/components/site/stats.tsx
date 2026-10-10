import { NumberTicker } from "@/components/ui/number-ticker"

const STATS = [
  { value: 99.99, decimals: 2, suffix: " %", label: "oppetid siste 12 måneder" },
  { value: 2400, decimals: 0, suffix: "+", label: "team som bruker Nordlys" },
  { value: 38, decimals: 0, suffix: " ms", label: "median svartid i Europa" },
  { value: 100, decimals: 0, suffix: "", label: "Lighthouse-score som standard" },
]

export function Stats() {
  return (
    <section aria-label="Nøkkeltall" className="px-4 pb-8">
      <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border md:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-background flex flex-col gap-2 p-6 sm:p-8">
            <dt className="text-muted-foreground order-2 text-sm text-pretty">
              {stat.label}
            </dt>
            <dd className="order-1 text-4xl font-semibold tracking-tighter sm:text-5xl">
              <NumberTicker
                value={stat.value}
                decimalPlaces={stat.decimals}
                locale="nb-NO"
                className="tracking-tighter"
              />
              <span className="text-muted-foreground">{stat.suffix}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
