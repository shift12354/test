import { ExternalLink } from "lucide-react"

import { PRICES_CHECKED, STORE_COLORS } from "../model/products"
import type { Product, Store } from "../model/products"

export const kr = (n: number) => `${Math.round(n).toLocaleString("nb-NO")} kr`

export function StoreChip({ store }: { store: Store }) {
  const c = STORE_COLORS[store]
  return (
    <span className="store-chip" style={{ background: c.bg, color: c.fg }}>
      {store}
    </span>
  )
}

/** Pick one of the store products for a thing in the plan, or keep the catalogue estimate. */
export function ProductPicker({
  products,
  value,
  onChange,
  estimate,
  label = "Velg produkt",
}: {
  products: Product[]
  value?: string
  onChange: (id: string | undefined) => void
  estimate?: { price: number; unit: string }
  label?: string
}) {
  if (!products.length) return null
  const name = `product-${products[0].id}`
  return (
    <fieldset className="products">
      <legend className="field-label">{label}</legend>
      {products.map((p) => (
        <label key={p.id} className={`product ${value === p.id ? "on" : ""}`}>
          <input type="radio" name={name} checked={value === p.id} onChange={() => onChange(p.id)} />
          <StoreChip store={p.store} />
          <span className="product-name">
            {p.name}
            {p.priceNote && <span className="product-note">{p.priceNote}</span>}
          </span>
          <span className="product-price">
            {p.price != null ? `${p.approx ? "ca. " : ""}${kr(p.price)}${p.unit === "m²" ? "/m²" : ""}` : ""}
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="product-link" onClick={(e) => e.stopPropagation()} aria-label={`Åpne ${p.name} hos ${p.store}`}>
              {p.price != null ? "" : "Se pris"} <ExternalLink size={12} />
            </a>
          </span>
        </label>
      ))}
      <label className={`product ${!value ? "on" : ""}`}>
        <input type="radio" name={name} checked={!value} onChange={() => onChange(undefined)} />
        <span className="store-chip neutral">Anslag</span>
        <span className="product-name">Ingen bestemt modell</span>
        <span className="product-price">{estimate ? `${kr(estimate.price)}${estimate.unit}` : ""}</span>
      </label>
      <p className="product-foot">Priser sjekket {PRICES_CHECKED}. «Se pris» åpner butikken i en ny fane.</p>
    </fieldset>
  )
}
