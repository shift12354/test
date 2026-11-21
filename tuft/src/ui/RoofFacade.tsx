import { productsForFacade, productsForRoof } from "../model/products"
import type { CladdingStyle, Facade, Project, Roof, RoofMaterial, RoofType } from "../model/types"
import { useStore } from "../store/store"
import { DEFAULT_FACADE, DEFAULT_ROOF } from "../view3d/roof"
import { Field, NumField, Section, Seg, Swatches } from "./common"
import { ProductPicker } from "./Products"

const ROOF_COLORS: Record<RoofMaterial, { color: string; name: string }[]> = {
  betong: [
    { color: "#3a3b3f", name: "Antrasitt" },
    { color: "#5b5e62", name: "Grå" },
    { color: "#8e3b2a", name: "Teglrød" },
    { color: "#2a2b2d", name: "Sort" },
  ],
  tegl: [
    { color: "#9c4a2f", name: "Rød tegl" },
    { color: "#7a3a28", name: "Mørk tegl" },
    { color: "#3d3a38", name: "Sort tegl" },
  ],
  shingel: [
    { color: "#3c3d3f", name: "Sort" },
    { color: "#6b5a4a", name: "Brun" },
    { color: "#5f6b5d", name: "Grønn" },
  ],
  stal: [
    { color: "#2f3132", name: "Sort" },
    { color: "#7d8580", name: "Grå" },
    { color: "#8e2f25", name: "Rød" },
  ],
  torv: [{ color: "#6b7a4e", name: "Gress" }],
}
const CLADDING = [
  { color: "#ebe8e1", name: "Hvit" },
  { color: "#8e2f25", name: "Låverød" },
  { color: "#c9b48a", name: "Oker" },
  { color: "#7d8580", name: "Grå" },
  { color: "#2f3132", name: "Sort" },
  { color: "#a6845c", name: "Ubehandlet tre" },
  { color: "#b9583e", name: "Tegl" },
]
const TRIM = [
  { color: "#ffffff", name: "Hvit" },
  { color: "#2f3132", name: "Sort" },
  { color: "#7d8580", name: "Grå" },
  { color: "#ebe8e1", name: "Brukket hvit" },
]

export function RoofFacadeSection({ project }: { project: Project }) {
  const update = useStore((s) => s.update)
  const roof = project.roof ?? DEFAULT_ROOF
  const facade = project.facade ?? DEFAULT_FACADE
  const setRoof = (p: Partial<Roof>) => update((pr) => ({ ...pr, roof: { ...(pr.roof ?? DEFAULT_ROOF), ...p } }))
  const setFacade = (p: Partial<Facade>) => update((pr) => ({ ...pr, facade: { ...(pr.facade ?? DEFAULT_FACADE), ...p } }))
  return (
    <>
      <Section title="Tak">
        <Seg<RoofType>
          label="Taktype"
          value={roof.type}
          onChange={(type) => setRoof({ type })}
          options={[
            { value: "saltak", label: "Saltak" },
            { value: "valmtak", label: "Valm" },
            { value: "pulttak", label: "Pult" },
            { value: "flatt", label: "Flatt" },
            { value: "ingen", label: "Ingen" },
          ]}
        />
        {roof.type !== "ingen" && (
          <div className="fields">
            <div className="grid2">
              {roof.type !== "flatt" && (
                <Field label="Takvinkel">
                  <NumField value={roof.pitch} unit="°" min={3} max={60} onCommit={(v) => setRoof({ pitch: v })} />
                </Field>
              )}
              <Field label="Utstikk">
                <NumField value={roof.overhang} min={0} max={150} onCommit={(v) => setRoof({ overhang: v })} />
              </Field>
            </div>
            {(roof.type === "saltak" || roof.type === "valmtak" || roof.type === "pulttak") && (
              <Field label="Mønet går">
                <select value={roof.ridge} onChange={(e) => setRoof({ ridge: e.target.value as Roof["ridge"] })}>
                  <option value="auto">Langs den lengste siden</option>
                  <option value="x">Øst–vest</option>
                  <option value="y">Nord–sør</option>
                </select>
              </Field>
            )}
            {roof.type !== "flatt" && (
              <>
                <Field label="Taktekking">
                  <Seg<RoofMaterial>
                    label="Taktekking"
                    value={roof.material}
                    onChange={(material) => setRoof({ material, color: ROOF_COLORS[material][0].color, productId: undefined })}
                    options={[
                      { value: "betong", label: "Betong" },
                      { value: "tegl", label: "Tegl" },
                      { value: "shingel", label: "Shingel" },
                      { value: "stal", label: "Stål" },
                      { value: "torv", label: "Torv" },
                    ]}
                  />
                </Field>
                <Swatches value={roof.color} colors={ROOF_COLORS[roof.material]} onChange={(color) => setRoof({ color })} label="Takfarge" />
                <ProductPicker products={productsForRoof(roof.material)} value={roof.productId} onChange={(productId) => setRoof({ productId })} label="Taktekking fra butikk" />
              </>
            )}
          </div>
        )}
      </Section>
      <Section title="Fasade">
        <Seg<CladdingStyle>
          label="Kledning"
          value={facade.style}
          onChange={(style) => setFacade({ style, productId: undefined })}
          options={[
            { value: "staende", label: "Stående" },
            { value: "liggende", label: "Liggende" },
            { value: "puss", label: "Puss" },
            { value: "tegl", label: "Tegl" },
          ]}
        />
        <Field label="Farge">
          <Swatches value={project.cladding ?? "#ebe8e1"} colors={CLADDING} onChange={(c) => update((p) => ({ ...p, cladding: c }))} label="Fasadefarge" />
        </Field>
        <Field label="Vinduer og listverk">
          <Swatches value={facade.trim} colors={TRIM} onChange={(trim) => setFacade({ trim })} label="Farge på vinduer og listverk" />
        </Field>
        <Field label="Synlig grunnmur">
          <NumField value={facade.plinth} min={0} max={150} onCommit={(plinth) => setFacade({ plinth })} />
        </Field>
        <ProductPicker products={productsForFacade(facade.style)} value={facade.productId} onChange={(productId) => setFacade({ productId })} label="Kledning fra butikk" />
      </Section>
    </>
  )
}
