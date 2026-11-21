// Real products from IKEA, Elkjøp and Byggmakker that can be chosen for things in the plan.
//
// Prices were looked up in November 2026 and only where a source gave a Norwegian price.
// Where we found none, the product has no price and the plan keeps using the catalogue's
// rough estimate; the link goes to the store so the current price can be checked there.
// `approx` marks prices taken from comparison sites, other dealers or quoted "new prices".
import type { CladdingStyle, FloorMaterial, OpeningKind, RoofMaterial } from "./types"

export type Store = "IKEA" | "Elkjøp" | "Byggmakker"
export type Unit = "stk" | "m²"

export type Product = {
  id: string
  store: Store
  name: string
  for: {
    catalog?: string[]
    floor?: FloorMaterial[]
    roof?: RoofMaterial[]
    facade?: CladdingStyle[]
    opening?: OpeningKind[]
  }
  price?: number
  unit: Unit
  approx?: boolean
  priceNote?: string
  url: string
}

export const PRICES_CHECKED = "november 2026"

export const STORE_COLORS: Record<Store, { bg: string; fg: string }> = {
  IKEA: { bg: "#0058a3", fg: "#ffda1a" },
  Elkjøp: { bg: "#041e50", fg: "#ffffff" },
  Byggmakker: { bg: "#e30613", fg: "#ffffff" },
}

const ikea = (q: string) => `https://www.ikea.com/no/no/search/?q=${encodeURIComponent(q)}`
const elkjop = (q: string) => `https://www.elkjop.no/search?q=${encodeURIComponent(q)}`
const bm = (q: string) => `https://www.byggmakker.no/sok?q=${encodeURIComponent(q)}`

const P = (id: string, store: Store, name: string, f: Product["for"], url: string, extra: Partial<Product> = {}): Product => ({
  id,
  store,
  name,
  for: f,
  url,
  unit: "stk",
  ...extra,
})

export const PRODUCTS: Product[] = [
  // ---------- IKEA ----------
  P("ikea-kivik-3", "IKEA", "KIVIK 3-seter", { catalog: ["sofa3"] }, ikea("KIVIK 3-seter")),
  P("ikea-soderhamn-3", "IKEA", "SÖDERHAMN 3-seter", { catalog: ["sofa3"] }, ikea("SÖDERHAMN 3-seter")),
  P("ikea-kivik-2", "IKEA", "KIVIK 2-seter", { catalog: ["sofa2"] }, ikea("KIVIK 2-seter")),
  P("ikea-kivik-hjorne", "IKEA", "KIVIK hjørnesofa", { catalog: ["sofaHjorne"] }, ikea("KIVIK hjørnesofa")),
  P("ikea-poang", "IKEA", "POÄNG lenestol", { catalog: ["lenestol"] }, ikea("POÄNG")),
  P("ikea-strandmon", "IKEA", "STRANDMON øreklaffstol", { catalog: ["lenestol"] }, ikea("STRANDMON")),
  P("ikea-lack", "IKEA", "LACK salongbord", { catalog: ["salongbord"] }, ikea("LACK salongbord")),
  P("ikea-besta", "IKEA", "BESTÅ TV-benk", { catalog: ["tvbenk"] }, ikea("BESTÅ TV-benk")),
  P("ikea-billy", "IKEA", "BILLY bokhylle 80×28×202, hvit", { catalog: ["bokhylle"] }, "https://www.ikea.com/no/no/p/billy-bokhylle-hvit-00263850/", { price: 895 }),
  P("ikea-stoense", "IKEA", "STOENSE teppe 200×300", { catalog: ["teppe"] }, ikea("STOENSE")),
  P("ikea-ekedalen", "IKEA", "EKEDALEN uttrekksbord", { catalog: ["spisebord6", "spisebord4"] }, ikea("EKEDALEN")),
  P("ikea-lisabo-bord", "IKEA", "LISABO bord", { catalog: ["spisebord4", "rundtbord"] }, ikea("LISABO bord")),
  P("ikea-odger", "IKEA", "ODGER stol", { catalog: ["stol"] }, ikea("ODGER")),
  P("ikea-lisabo-stol", "IKEA", "LISABO stol", { catalog: ["stol"] }, ikea("LISABO stol")),
  P("ikea-malm-seng", "IKEA", "MALM seng, høy, med 2 oppbevaringsbokser", { catalog: ["seng180", "seng160"] }, "https://www.ikea.com/no/en/p/malm-bed-frame-high-w-2-storage-boxes-white-s19175957/", {
    price: 3595,
    approx: true,
    priceNote: "Uten bunn og madrass",
  }),
  P("ikea-malm-enkel", "IKEA", "MALM seng 90×200", { catalog: ["seng90"] }, ikea("MALM seng 90x200")),
  P("ikea-sundvik", "IKEA", "SUNDVIK barneseng", { catalog: ["barneseng"] }, ikea("SUNDVIK")),
  P("ikea-hemnes-natt", "IKEA", "HEMNES nattbord", { catalog: ["nattbord"] }, ikea("HEMNES nattbord")),
  P("ikea-malm-kommode", "IKEA", "MALM kommode", { catalog: ["kommode"] }, ikea("MALM kommode")),
  P("ikea-pax", "IKEA", "PAX garderobestamme", { catalog: ["garderobe100", "garderobe50"] }, ikea("PAX"), {
    price: 1900,
    approx: true,
    priceNote: "Bare stammen, uten dører og innredning (prissjekk oktober 2025)",
  }),
  P("ikea-lagkapten", "IKEA", "LAGKAPTEN/ALEX skrivebord", { catalog: ["skrivebord"] }, ikea("LAGKAPTEN ALEX")),
  P("ikea-markus", "IKEA", "MARKUS kontorstol", { catalog: ["kontorstol"] }, ikea("MARKUS")),
  P("ikea-metod-benk", "IKEA", "METOD benkeskap", { catalog: ["benkeskap60", "benkeskap40", "kjokkenvask", "koloy"] }, ikea("METOD benkeskap")),
  P("ikea-metod-over", "IKEA", "METOD overskap", { catalog: ["overskap60"] }, ikea("METOD overskap")),
  P("ikea-metod-hoy", "IKEA", "METOD høyskap", { catalog: ["hoyskap"] }, ikea("METOD høyskap")),
  P("ikea-godmorgon", "IKEA", "GODMORGON servantskap", { catalog: ["servant80"] }, ikea("GODMORGON")),
  P("ikea-speil", "IKEA", "Speil", { catalog: ["speil"] }, ikea("speil bad")),
  P("ikea-gulvlampe", "IKEA", "Gulvlampe", { catalog: ["gulvlampe"] }, ikea("gulvlampe")),

  // ---------- Elkjøp ----------
  P(
    "elk-lki64406nw",
    "Elkjøp",
    "Electrolux 500 induksjonskomfyr LKI64406NW, 60 cm",
    { catalog: ["komfyr"] },
    "https://www.elkjop.no/product/hvitevarer/komfyr-stekeovn/komfyr/electrolux-500-induksjonskomfyr-lki64406nw-60cm/804403",
    { price: 7995 },
  ),
  P("elk-sn65zx00ae", "Elkjøp", "Siemens helintegrert oppvaskmaskin SN65ZX00AE", { catalog: ["oppvask"] }, "https://www.elkjop.no/product/hvitevarer/oppvaskmaskin/siemens-oppvaskmaskin-sn65zx00ae-helintegrert/206046", {
    price: 9350,
    approx: true,
    priceNote: "Tilbudspris, var ikke på lager da vi sjekket",
  }),
  P("elk-bosch-s2", "Elkjøp", "Bosch Serie 2 integrert oppvaskmaskin", { catalog: ["oppvask"] }, "https://www.elkjop.no/hvitevarer/oppvaskmaskin/integrert-oppvaskmaskin", {
    price: 4999,
    approx: true,
    priceNote: "«Fra»-pris fra prissammenligning",
  }),
  P("elk-kjoleskap", "Elkjøp", "Kjøleskap 185 cm", { catalog: ["kjoleskap"] }, elkjop("kjøleskap 185 cm")),
  P("elk-vask", "Elkjøp", "Vaskemaskin 8 kg", { catalog: ["vaskemaskin"] }, elkjop("vaskemaskin 8 kg")),
  P("elk-torke", "Elkjøp", "Tørketrommel med varmepumpe", { catalog: ["torketrommel"] }, elkjop("tørketrommel varmepumpe")),
  P("elk-tv65", "Elkjøp", "TV 65″", { catalog: ["tv"] }, elkjop("65 tommer TV")),
  P("elk-vent", "Elkjøp", "Kjøkkenventilator 60 cm", { catalog: ["ventilator"] }, elkjop("kjøkkenventilator 60 cm")),
  P("elk-panelovn", "Elkjøp", "Panelovn 1000 W", { catalog: ["panelovn"] }, elkjop("panelovn 1000W")),
  P("elk-varmepumpe", "Elkjøp", "Luft-til-luft varmepumpe", { catalog: ["varmepumpe"] }, elkjop("varmepumpe")),
  P("elk-lader", "Elkjøp", "Elbillader 7,4 kW", { catalog: ["elbillader"] }, elkjop("elbillader")),
  P("elk-royk", "Elkjøp", "Røykvarsler", { catalog: ["roykvarsler"] }, elkjop("røykvarsler")),

  // ---------- Byggmakker ----------
  P("bm-goodiy-rustikk", "Byggmakker", "Parkett 3-stav rustikk eik, Goodiy", { floor: ["eik"] }, "https://www.byggmakker.no/produkt/parkett-3-stav-rustikk-eik-goodiy/5906737961148", { price: 399, unit: "m²" }),
  P("bm-kahrs-abetone", "Byggmakker", "Parkett 3-stav eik Abetone, Kährs", { floor: ["eik"] }, "https://www.byggmakker.no/produkt/parkett-3-stav-eik-abetone-kahrs/7393969034142", { price: 699, unit: "m²" }),
  P("bm-kahrs-vigo", "Byggmakker", "Parkett 1-stav eik Vigo, Kährs", { floor: ["eik", "valnott"] }, "https://www.byggmakker.no/produkt/parkett-eik-vigo-kahrs/7393969042949", { price: 1599, unit: "m²" }),
  P("bm-parkett", "Byggmakker", "Parkett, alle typer", { floor: ["ask", "valnott", "eik"] }, "https://www.byggmakker.no/kategori/gulv/parkett", { unit: "m²" }),
  P("bm-flis", "Byggmakker", "Gulvflis 30×60", { floor: ["flis-lys", "flis-mork"] }, bm("gulvflis 30x60"), { unit: "m²" }),
  P("bm-vinyl", "Byggmakker", "Vinylgulv", { floor: ["vinyl"] }, bm("vinylgulv"), { unit: "m²" }),
  P("bm-takstein", "Byggmakker", "Betongtakstein", { roof: ["betong"] }, "https://www.byggmakker.no/rad-og-guider/tak/hvilket-tak-skal-jeg-velge-til-huset-mitt", {
    price: 200,
    unit: "m²",
    approx: true,
    priceNote: "Bare materiale, vanlig spenn 150–250 kr/m²",
  }),
  P("bm-tegl", "Byggmakker", "Teglstein, tak", { roof: ["tegl"] }, bm("teglstein tak"), { unit: "m²" }),
  P("bm-shingel", "Byggmakker", "Takshingel", { roof: ["shingel"] }, bm("takshingel"), { unit: "m²" }),
  P("bm-stal", "Byggmakker", "Takstål / plater", { roof: ["stal"] }, bm("takplater stål"), { unit: "m²" }),
  P("bm-kledning", "Byggmakker", "Kledning 19×148, grunnet", { facade: ["staende", "liggende"] }, bm("kledning 19x148"), {
    price: 370,
    unit: "m²",
    approx: true,
    priceNote: "Ca. 45 kr per løpemeter × 8,2 lm per m², priser fra andre trelastforhandlere",
  }),
  P("bm-puss", "Byggmakker", "Puss og fasadeplater", { facade: ["puss"] }, bm("fasadepuss")),
  P("bm-teglfasade", "Byggmakker", "Teglstein, fasade", { facade: ["tegl"] }, bm("teglstein fasade")),
  P("bm-vindu", "Byggmakker", "NorDan toppsving 3-lag, 120×120", { opening: ["window"] }, bm("NorDan vindu"), {
    price: 7000,
    approx: true,
    priceNote: "Andre forhandlere: 5 500–8 660 kr for 120×120",
  }),
  P("bm-innerdor", "Byggmakker", "Swedoor innerdør", { opening: ["door", "doubleDoor", "slidingDoor"] }, bm("Swedoor innerdør")),
  P("bm-terrassedor", "Byggmakker", "Terrassedør", { opening: ["patioDoor"] }, bm("terrassedør")),
  P("bm-sluk", "Byggmakker", "Purus sluk", { catalog: ["sluk"] }, bm("Purus sluk")),
  P("bm-wc", "Byggmakker", "Vegghengt toalett", { catalog: ["wc"] }, bm("vegghengt toalett")),
  P("bm-dusj", "Byggmakker", "Dusjhjørne 90×90", { catalog: ["dusj90"] }, bm("dusjhjørne 90x90")),
  P("bm-dusjvegg", "Byggmakker", "Dusjvegg walk-in", { catalog: ["dusj120"] }, bm("dusjvegg walk-in")),
  P("bm-badekar", "Byggmakker", "Badekar 170×75", { catalog: ["badekar"] }, bm("badekar 170x75")),
  P("bm-stikk", "Byggmakker", "Elko RS16 stikkontakt", { catalog: ["stikk1", "stikk2"] }, bm("Elko RS16 stikkontakt")),
  P("bm-bryter", "Byggmakker", "Elko RS16 bryter", { catalog: ["bryter"] }, bm("Elko RS16 bryter")),
  P("bm-royk", "Byggmakker", "Røykvarsler", { catalog: ["roykvarsler"] }, bm("røykvarsler")),
  P("bm-vvb", "Byggmakker", "Varmtvannsbereder 200 l", { catalog: ["vvb"] }, bm("varmtvannsbereder 200 liter")),
  P("bm-fordeler", "Byggmakker", "Rør-i-rør fordelerskap", { catalog: ["fordeler"] }, bm("fordelerskap rør i rør")),
  P("bm-stoppekran", "Byggmakker", "Stoppekran", { catalog: ["stoppekran"] }, bm("stoppekran")),
  P("bm-blandebatteri", "Byggmakker", "Blandebatteri", { catalog: ["kran"] }, bm("blandebatteri")),
  P("bm-handkle", "Byggmakker", "Håndklevarmer", { catalog: ["handkle"] }, bm("håndklevarmer")),
  P("bm-vedovn", "Byggmakker", "Vedovn", { catalog: ["vedovn"] }, bm("vedovn")),
]

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]))

export const productsFor = (f: (p: Product) => boolean) => PRODUCTS.filter(f)
export const productsForCatalog = (id: string) => productsFor((p) => !!p.for.catalog?.includes(id))
export const productsForFloor = (id: FloorMaterial) => productsFor((p) => !!p.for.floor?.includes(id))
export const productsForRoof = (id: RoofMaterial) => productsFor((p) => !!p.for.roof?.includes(id))
export const productsForFacade = (id: CladdingStyle) => productsFor((p) => !!p.for.facade?.includes(id))
export const productsForOpening = (id: OpeningKind) => productsFor((p) => !!p.for.opening?.includes(id))
