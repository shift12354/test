// The catalogue of things you can put in the plan. Sizes are typical Norwegian/IKEA
// dimensions in cm (width along the wall × depth × height). Prices are rough material
// prices in NOK, only meant for a ballpark total.

export type CatalogLayer = "interior" | "elektro" | "vvs"
export type Mount = "floor" | "wall" | "ceiling"

export type CategoryId = "stue" | "spise" | "soverom" | "kjokken" | "bad" | "kontor" | "elektro" | "vvs"

export type ModelKey =
  | "sofa" | "sofaCorner" | "armchair" | "coffeeTable" | "tvBench" | "tv" | "shelf" | "rug" | "plant" | "floorLamp" | "stove"
  | "table" | "roundTable" | "chair" | "bench"
  | "bed" | "nightstand" | "wardrobe" | "dresser" | "crib"
  | "desk" | "officeChair"
  | "baseCabinet" | "wallCabinet" | "tallCabinet" | "fridge" | "range" | "dishwasher" | "kitchenSink" | "island" | "hood"
  | "toilet" | "vanity" | "shower" | "bathtub" | "washer" | "dryer" | "mirror" | "towelRail"
  | "outlet" | "outletDouble" | "switch" | "ceilingLamp" | "spot" | "wallLamp" | "smoke" | "panel" | "data" | "thermostat" | "evCharger" | "heatPump" | "panelHeater"
  | "drain" | "tap" | "waterHeater" | "manifold" | "stopValve" | "waterMeter"

export type CatalogItem = {
  id: string
  name: string
  category: CategoryId
  layer: CatalogLayer
  w: number
  d: number
  h: number
  mount: Mount
  /** Height of the bottom of the item above the floor, cm. */
  elevation: number
  color: string
  model: ModelKey
  /** Nominal power in watts, for circuit load estimates. */
  power?: number
  price?: number
  /** Electrical point: counts towards a circuit. */
  electrical?: "uttak" | "lys" | "bryter" | "fast" | "svak" | "tavle" | "sikkerhet"
  /** Water connections it needs. */
  water?: { cold?: boolean; hot?: boolean; drain?: boolean }
  keywords?: string
}

export const CATEGORIES: { id: CategoryId; name: string; layer: CatalogLayer }[] = [
  { id: "stue", name: "Stue", layer: "interior" },
  { id: "spise", name: "Spisestue", layer: "interior" },
  { id: "soverom", name: "Soverom", layer: "interior" },
  { id: "kjokken", name: "Kjøkken", layer: "interior" },
  { id: "bad", name: "Bad og vask", layer: "interior" },
  { id: "kontor", name: "Kontor", layer: "interior" },
  { id: "elektro", name: "Elektro", layer: "elektro" },
  { id: "vvs", name: "Rør og vann", layer: "vvs" },
]

const I = (
  id: string,
  name: string,
  category: CategoryId,
  model: ModelKey,
  [w, d, h]: [number, number, number],
  extra: Partial<CatalogItem> = {},
): CatalogItem => {
  const cat = CATEGORIES.find((c) => c.id === category)!
  return {
    id,
    name,
    category,
    layer: cat.layer,
    w,
    d,
    h,
    mount: "floor",
    elevation: 0,
    color: "#d9d4ca",
    model,
    ...extra,
  }
}

export const CATALOG: CatalogItem[] = [
  // Stue
  I("sofa3", "Sofa, 3-seter", "stue", "sofa", [220, 92, 82], { color: "#7d8a8f", price: 12000, keywords: "sofa sofaer" }),
  I("sofa2", "Sofa, 2-seter", "stue", "sofa", [170, 90, 82], { color: "#a3896b", price: 9000 }),
  I("sofaHjorne", "Hjørnesofa", "stue", "sofaCorner", [270, 190, 82], { color: "#8c8f86", price: 18000 }),
  I("lenestol", "Lenestol", "stue", "armchair", [82, 84, 90], { color: "#c08a5a", price: 5000 }),
  I("salongbord", "Salongbord", "stue", "coffeeTable", [120, 65, 42], { color: "#a57c52", price: 2500 }),
  I("tvbenk", "TV-benk", "stue", "tvBench", [180, 42, 50], { color: "#efece6", price: 2500 }),
  I("tv", "TV 65″", "stue", "tv", [146, 8, 84], { mount: "wall", elevation: 100, color: "#1b1c1e", power: 120, price: 9000 }),
  I("bokhylle", "Bokhylle", "stue", "shelf", [80, 30, 202], { color: "#f2efe9", price: 900 }),
  I("teppe", "Teppe 200×300", "stue", "rug", [300, 200, 1], { color: "#c9b79c", price: 2500 }),
  I("plante", "Potteplante", "stue", "plant", [45, 45, 130], { color: "#3f7f4f", price: 600 }),
  I("gulvlampe", "Gulvlampe", "stue", "floorLamp", [40, 40, 165], { color: "#e8e1d4", power: 10, price: 900 }),
  I("vedovn", "Vedovn", "stue", "stove", [55, 45, 110], { color: "#2a2b2e", price: 18000, keywords: "peis ildsted" }),

  // Spisestue
  I("spisebord6", "Spisebord, 6 pers.", "spise", "table", [180, 90, 75], { color: "#b08a5e", price: 6000 }),
  I("spisebord4", "Spisebord, 4 pers.", "spise", "table", [120, 80, 75], { color: "#b08a5e", price: 3500 }),
  I("rundtbord", "Rundt bord Ø110", "spise", "roundTable", [110, 110, 75], { color: "#e7e2d8", price: 4000 }),
  I("stol", "Spisestol", "spise", "chair", [45, 52, 82], { color: "#3c3d40", price: 900 }),
  I("benk", "Benk", "spise", "bench", [140, 38, 45], { color: "#b08a5e", price: 1500 }),

  // Soverom
  I("seng180", "Dobbeltseng 180×200", "soverom", "bed", [180, 210, 100], { color: "#e8e3da", price: 15000 }),
  I("seng160", "Dobbeltseng 160×200", "soverom", "bed", [160, 210, 100], { color: "#e8e3da", price: 12000 }),
  I("seng90", "Enkeltseng 90×200", "soverom", "bed", [90, 205, 90], { color: "#dfe6ea", price: 5000 }),
  I("barneseng", "Barneseng", "soverom", "crib", [66, 126, 90], { color: "#f3f0ea", price: 2000 }),
  I("nattbord", "Nattbord", "soverom", "nightstand", [45, 40, 50], { color: "#b08a5e", price: 800 }),
  I("garderobe100", "Garderobe 100 cm", "soverom", "wardrobe", [100, 60, 236], { color: "#f3f1ec", price: 4500 }),
  I("garderobe50", "Garderobe 50 cm", "soverom", "wardrobe", [50, 60, 236], { color: "#f3f1ec", price: 2500 }),
  I("kommode", "Kommode", "soverom", "dresser", [80, 48, 78], { color: "#f3f1ec", price: 2000 }),

  // Kontor
  I("skrivebord", "Skrivebord", "kontor", "desk", [140, 70, 74], { color: "#efece6", price: 2500 }),
  I("kontorstol", "Kontorstol", "kontor", "officeChair", [60, 60, 110], { color: "#2a2b2e", price: 2000 }),

  // Kjøkken
  I("benkeskap60", "Benkeskap 60", "kjokken", "baseCabinet", [60, 62, 90], { color: "#f2f0eb", price: 2500, keywords: "skap benk" }),
  I("benkeskap40", "Benkeskap 40", "kjokken", "baseCabinet", [40, 62, 90], { color: "#f2f0eb", price: 2000 }),
  I("overskap60", "Overskap 60", "kjokken", "wallCabinet", [60, 37, 80], { mount: "wall", elevation: 140, color: "#f2f0eb", price: 1600 }),
  I("hoyskap", "Høyskap 60", "kjokken", "tallCabinet", [60, 62, 220], { color: "#f2f0eb", price: 4500 }),
  I("kjoleskap", "Kjøleskap", "kjokken", "fridge", [60, 66, 200], { color: "#dfe1e3", power: 150, price: 12000, electrical: "uttak" }),
  I("komfyr", "Komfyr m/ induksjon", "kjokken", "range", [60, 62, 90], { color: "#2a2b2e", power: 7200, price: 10000, electrical: "fast", keywords: "stekeovn koketopp" }),
  I("oppvask", "Oppvaskmaskin", "kjokken", "dishwasher", [60, 62, 90], { color: "#f2f0eb", power: 2000, price: 7000, electrical: "uttak", water: { cold: true, drain: true } }),
  I("kjokkenvask", "Kjøkkenvask", "kjokken", "kitchenSink", [80, 62, 90], { color: "#f2f0eb", price: 5000, water: { cold: true, hot: true, drain: true } }),
  I("koloy", "Kjøkkenøy", "kjokken", "island", [220, 100, 90], { color: "#f2f0eb", price: 15000, keywords: "øy" }),
  I("ventilator", "Ventilator", "kjokken", "hood", [60, 50, 60], { mount: "wall", elevation: 150, color: "#c9cbce", power: 200, price: 5000, electrical: "fast" }),

  // Bad og vask
  I("wc", "Toalett, vegghengt", "bad", "toilet", [38, 56, 80], { color: "#ffffff", price: 6000, water: { cold: true, drain: true }, keywords: "wc do toalett" }),
  I("servant80", "Servant med skap 80", "bad", "vanity", [80, 46, 86], { color: "#f2f0eb", price: 7000, water: { cold: true, hot: true, drain: true } }),
  I("dusj90", "Dusjhjørne 90×90", "bad", "shower", [90, 90, 200], { color: "#d8e6ee", price: 7000, water: { cold: true, hot: true, drain: true } }),
  I("dusj120", "Dusj, walk-in 120×90", "bad", "shower", [120, 90, 200], { color: "#d8e6ee", price: 9000, water: { cold: true, hot: true, drain: true } }),
  I("badekar", "Badekar 170×75", "bad", "bathtub", [170, 75, 57], { color: "#ffffff", price: 10000, water: { cold: true, hot: true, drain: true } }),
  I("vaskemaskin", "Vaskemaskin", "bad", "washer", [60, 60, 85], { color: "#ffffff", power: 2000, price: 7000, electrical: "uttak", water: { cold: true, drain: true } }),
  I("torketrommel", "Tørketrommel", "bad", "dryer", [60, 60, 85], { color: "#ffffff", power: 2500, price: 7000, electrical: "uttak" }),
  I("speil", "Speil", "bad", "mirror", [80, 3, 70], { mount: "wall", elevation: 110, color: "#c7d3da", price: 1200 }),
  I("handkle", "Håndklevarmer", "bad", "towelRail", [50, 10, 90], { mount: "wall", elevation: 40, color: "#d0d2d4", power: 100, price: 2500, electrical: "fast" }),

  // Elektro
  I("stikk1", "Stikkontakt, enkel", "elektro", "outlet", [9, 4, 9], { mount: "wall", elevation: 30, color: "#ffffff", price: 150, electrical: "uttak", keywords: "kontakt uttak" }),
  I("stikk2", "Stikkontakt, dobbel", "elektro", "outletDouble", [16, 4, 9], { mount: "wall", elevation: 30, color: "#ffffff", price: 250, electrical: "uttak", keywords: "kontakt uttak" }),
  I("bryter", "Lysbryter", "elektro", "switch", [9, 4, 9], { mount: "wall", elevation: 110, color: "#ffffff", price: 200, electrical: "bryter" }),
  I("taklampe", "Taklampe", "elektro", "ceilingLamp", [45, 45, 20], { mount: "ceiling", elevation: 0, color: "#f4efe4", power: 40, price: 1500, electrical: "lys" }),
  I("spot", "Downlight / spot", "elektro", "spot", [9, 9, 6], { mount: "ceiling", elevation: 0, color: "#ffffff", power: 6, price: 450, electrical: "lys" }),
  I("vegglampe", "Vegglampe", "elektro", "wallLamp", [20, 15, 25], { mount: "wall", elevation: 180, color: "#e8e1d4", power: 10, price: 900, electrical: "lys" }),
  I("roykvarsler", "Røykvarsler", "elektro", "smoke", [11, 11, 4], { mount: "ceiling", elevation: 0, color: "#ffffff", price: 400, electrical: "sikkerhet" }),
  I("sikringsskap", "Sikringsskap", "elektro", "panel", [60, 15, 80], { mount: "wall", elevation: 110, color: "#ececea", price: 15000, electrical: "tavle", keywords: "tavle sikringer" }),
  I("data", "Datauttak / TV", "elektro", "data", [9, 4, 9], { mount: "wall", elevation: 30, color: "#ffffff", price: 300, electrical: "svak" }),
  I("termostat", "Termostat gulvvarme", "elektro", "thermostat", [9, 4, 9], { mount: "wall", elevation: 110, color: "#ffffff", price: 1200, electrical: "fast" }),
  I("panelovn", "Panelovn", "elektro", "panelHeater", [100, 8, 40], { mount: "wall", elevation: 15, color: "#ffffff", power: 1000, price: 2500, electrical: "fast" }),
  I("varmepumpe", "Varmepumpe, innedel", "elektro", "heatPump", [90, 25, 30], { mount: "wall", elevation: 200, color: "#f4f4f2", power: 1500, price: 20000, electrical: "fast" }),
  I("elbillader", "Elbillader", "elektro", "evCharger", [25, 12, 35], { mount: "wall", elevation: 110, color: "#2a2b2e", power: 7400, price: 12000, electrical: "fast" }),

  // VVS
  I("sluk", "Sluk", "vvs", "drain", [20, 20, 2], { color: "#9aa0a9", price: 1500, water: { drain: true } }),
  I("kran", "Vannuttak (kald/varm)", "vvs", "tap", [16, 6, 10], { mount: "wall", elevation: 60, color: "#c9cbce", price: 400, water: { cold: true, hot: true } }),
  I("vvb", "Varmtvannsbereder 200 l", "vvs", "waterHeater", [60, 60, 150], { color: "#f4f4f2", power: 2000, price: 12000, electrical: "fast", water: { cold: true, hot: true }, keywords: "bereder vvb" }),
  I("fordeler", "Fordelerskap rør-i-rør", "vvs", "manifold", [60, 15, 60], { mount: "wall", elevation: 20, color: "#f4f4f2", price: 4000, water: { cold: true, hot: true } }),
  I("stoppekran", "Stoppekran", "vvs", "stopValve", [12, 12, 12], { mount: "wall", elevation: 20, color: "#2f7ce0", price: 600, water: { cold: true } }),
  I("vannmaler", "Vannmåler", "vvs", "waterMeter", [20, 12, 15], { mount: "wall", elevation: 30, color: "#2f7ce0", price: 900, water: { cold: true } }),
]

export const CATALOG_BY_ID: Record<string, CatalogItem> = Object.fromEntries(CATALOG.map((c) => [c.id, c]))

export function catalogItem(id: string): CatalogItem {
  return CATALOG_BY_ID[id] ?? CATALOG[0]
}

export const ROOM_TYPES: { id: import("./types").RoomType; name: string; wet?: boolean; living?: boolean }[] = [
  { id: "stue", name: "Stue", living: true },
  { id: "kjokken", name: "Kjøkken", living: true },
  { id: "soverom", name: "Soverom", living: true },
  { id: "bad", name: "Bad", wet: true },
  { id: "wc", name: "WC", wet: true },
  { id: "vaskerom", name: "Vaskerom", wet: true },
  { id: "gang", name: "Gang / entré" },
  { id: "bod", name: "Bod" },
  { id: "kontor", name: "Kontor", living: true },
  { id: "teknisk", name: "Teknisk rom" },
  { id: "garasje", name: "Garasje" },
  { id: "annet", name: "Annet" },
]

export const FLOORS: { id: import("./types").FloorMaterial; name: string; color: string; price: number }[] = [
  { id: "eik", name: "Eikeparkett", color: "#c9a77c", price: 650 },
  { id: "ask", name: "Askeparkett", color: "#e2cfae", price: 600 },
  { id: "valnott", name: "Valnøtt", color: "#7a5638", price: 900 },
  { id: "flis-lys", name: "Flis, lys", color: "#e4e1db", price: 700 },
  { id: "flis-mork", name: "Flis, mørk", color: "#5b5d60", price: 700 },
  { id: "betong", name: "Slipt betong", color: "#a9a7a2", price: 800 },
  { id: "vinyl", name: "Vinyl", color: "#cfc6b8", price: 350 },
  { id: "teppe", name: "Teppegulv", color: "#9c9a93", price: 400 },
]

export const RUN_SYSTEMS: { id: import("./types").RunSystem; name: string; color: string; elevation: number; diameter: number; layer: "elektro" | "vann" | "avlop" }[] = [
  { id: "kaldt", name: "Kaldtvann", color: "#1f7ae0", elevation: 5, diameter: 15, layer: "vann" },
  { id: "varmt", name: "Varmtvann", color: "#e0483e", elevation: 5, diameter: 15, layer: "vann" },
  { id: "avlop", name: "Avløp", color: "#7b8089", elevation: -15, diameter: 110, layer: "avlop" },
  { id: "gulvvarme", name: "Vannbåren gulvvarme", color: "#e88b3a", elevation: 3, diameter: 16, layer: "vann" },
  { id: "el", name: "Elkabel", color: "#e8a100", elevation: 235, diameter: 10, layer: "elektro" },
  { id: "data", name: "Datakabel", color: "#8b6fd6", elevation: 235, diameter: 6, layer: "elektro" },
]

export const runSystem = (id: string) => RUN_SYSTEMS.find((r) => r.id === id) ?? RUN_SYSTEMS[0]
