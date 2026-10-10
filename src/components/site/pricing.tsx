import { OpenSheetButton } from "@/components/site/contact-sheet"
import { Section } from "@/components/site/section"

const NOK = new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 })

const PRICES = [
  { name: "Enkel nettside", what: "Opptil fem sider, kontaktskjema og kart.", price: `fra ${NOK.format(45000)}` },
  { name: "Nettside med booking", what: "Kalender, betaling og bekreftelse på e-post.", price: `fra ${NOK.format(90000)}` },
  { name: "Nettbutikk", what: "Produkter, frakt og betaling med Vipps og kort.", price: `fra ${NOK.format(120000)}` },
  { name: "Drift", what: "Hosting, sikkerhetsoppdateringer og en gjennomgang før hver sesong.", price: `${NOK.format(1500)} i måneden` },
]

export function Pricing() {
  return (
    <Section id="priser" title="Hva det koster" intro="Vi tar fastpris per prosjekt. Prisene er uten mva.">
      <dl>
        {PRICES.map((row) => (
          <div key={row.name} className="grid gap-x-8 gap-y-1 border-b py-5 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto]">
            <dt className="font-bold">{row.name}</dt>
            <dd className="font-bold tabular-nums sm:row-span-2 sm:text-right">{row.price}</dd>
            <dd className="text-muted-foreground">{row.what}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="max-w-[44ch]">Usikre på hva dere trenger? Ta en prat med oss, så finner vi ut av det.</p>
        <OpenSheetButton variant="tinted">Book en prat</OpenSheetButton>
      </div>
    </Section>
  )
}
