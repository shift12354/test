import { FLOORS, RUN_SYSTEMS, catalogItem } from "./catalog"
import { OPENING_DEFAULTS } from "./build"
import { bounds, dist, polygonArea } from "./geometry"
import { PRODUCT_BY_ID } from "./products"
import type { Store } from "./products"
import type { Project } from "./types"

export const RUN_PRICE_PER_M: Record<string, number> = { kaldt: 60, varmt: 60, avlop: 150, gulvvarme: 40, el: 25, data: 15 }
export const OPENING_PRICE: Record<string, number> = { door: 4500, doubleDoor: 9000, slidingDoor: 7000, patioDoor: 18000, window: 9000 }

export type ListRow = {
  name: string
  qty: string
  unit?: number
  total?: number
  group: string
  store?: Store
  approx?: boolean
  url?: string
}

const ROOF_PRICE: Record<string, number> = { betong: 200, tegl: 350, shingel: 250, stal: 300, torv: 600 }
const CLADDING_PRICE = 400

/** Unit price from a chosen product when it has one, else the catalogue estimate. */
function priced(productId: string | undefined, estimate: number | undefined) {
  const p = productId ? PRODUCT_BY_ID[productId] : undefined
  return {
    unit: p?.price ?? estimate,
    store: p?.store,
    approx: p ? p.price == null || !!p.approx : true,
    url: p?.url,
    name: p?.name,
  }
}

export function runLength(points: { x: number; y: number }[]) {
  let s = 0
  for (let i = 0; i < points.length - 1; i++) s += dist(points[i], points[i + 1])
  return s
}

export function materialList(project: Project): ListRow[] {
  const rows: ListRow[] = []
  const nb = (n: number, d = 1) => n.toLocaleString("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d })
  const add = (group: string, name: string, qty: number, unitLabel: string, pr: ReturnType<typeof priced>, decimals = 0) =>
    rows.push({
      group,
      name: pr.name ?? name,
      qty: `${nb(qty, decimals)} ${unitLabel}`,
      unit: pr.unit,
      total: pr.unit != null ? Math.round(pr.unit * qty) : undefined,
      store: pr.store,
      approx: pr.approx,
      url: pr.url,
    })

  // Floors, per material and chosen product
  const floors = new Map<string, number>()
  for (const r of project.rooms) {
    const k = `${r.floor}|${r.floorProductId ?? ""}`
    floors.set(k, (floors.get(k) ?? 0) + polygonArea(r.points) / 10000)
  }
  for (const [k, a] of floors) {
    const [id, pid] = k.split("|")
    const f = FLOORS.find((x) => x.id === id)!
    add("Gulv", f.name, a, "m²", priced(pid || undefined, f.price), 1)
  }

  // Walls and facade
  const ext = project.walls.filter((w) => w.exterior)
  const int = project.walls.filter((w) => !w.exterior)
  const wallArea = (ws: typeof ext) =>
    ws.reduce((s, w) => {
      const holes = project.openings.filter((o) => o.wallId === w.id).reduce((h, o) => h + o.width * o.height, 0)
      return s + (dist(w.a, w.b) * w.height - holes) / 10000
    }, 0)
  if (ext.length) {
    const facade = project.facade
    const style = { staende: "stående", liggende: "liggende", puss: "puss", tegl: "tegl" }[facade?.style ?? "staende"]
    add("Vegger og fasade", `Kledning, ${style}`, wallArea(ext), "m²", priced(facade?.productId, CLADDING_PRICE), 1)
  }
  if (int.length) rows.push({ group: "Vegger og fasade", name: "Innervegg", qty: `${nb(int.reduce((s, w) => s + dist(w.a, w.b), 0) / 100)} m · ${nb(wallArea(int) * 2)} m² flate` })

  // Roof over the top level
  const roof = project.roof ?? { type: "saltak", pitch: 30, overhang: 50, material: "betong" as const, productId: undefined }
  const top = project.levels[project.levels.length - 1]
  const topWalls = project.walls.filter((w) => w.level === top.id && w.exterior)
  if (roof.type !== "ingen" && topWalls.length) {
    const b = bounds(topWalls.flatMap((w) => [w.a, w.b]))
    const o = roof.overhang
    const flat = ((b.w + 2 * o + 30) * (b.h + 2 * o + 30)) / 10000
    const area = roof.type === "flatt" ? flat : flat / Math.cos((roof.pitch * Math.PI) / 180)
    const mat = roof.type === "flatt" ? "Takpapp / folie" : { betong: "Betongtakstein", tegl: "Teglstein", shingel: "Takshingel", stal: "Takstål", torv: "Torvtak" }[roof.material]
    add("Tak", mat, area, "m²", priced(roof.productId, roof.type === "flatt" ? 250 : ROOF_PRICE[roof.material]), 1)
  }

  // Openings
  const ops = new Map<string, number>()
  for (const o of project.openings) {
    const k = `${o.kind}|${o.width}×${o.height}|${o.productId ?? ""}`
    ops.set(k, (ops.get(k) ?? 0) + 1)
  }
  for (const [k, n] of [...ops].sort()) {
    const [kind, size, pid] = k.split("|")
    const pr = priced(pid || undefined, OPENING_PRICE[kind])
    add("Dører og vinduer", `${OPENING_DEFAULTS[kind as keyof typeof OPENING_DEFAULTS].name} ${size}`, n, "stk", { ...pr, name: pr.name ? `${pr.name} (${size})` : undefined })
  }

  // Items
  const counts = new Map<string, number>()
  for (const i of project.items) {
    const k = `${i.catalogId}|${i.productId ?? ""}`
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const groupName = { interior: "Møbler og innredning", elektro: "Elektro", vvs: "Rør og vann" } as const
  for (const [k, n] of [...counts].sort((a, b) => catalogItem(a[0].split("|")[0]).name.localeCompare(catalogItem(b[0].split("|")[0]).name, "nb"))) {
    const [id, pid] = k.split("|")
    const c = catalogItem(id)
    add(groupName[c.layer], c.name, n, "stk", priced(pid || undefined, c.price))
  }

  // Runs
  for (const sys of RUN_SYSTEMS) {
    const len = project.runs.filter((r) => r.system === sys.id).reduce((s, r) => s + runLength(r.points), 0) / 100
    if (len > 0) {
      const unit = RUN_PRICE_PER_M[sys.id]
      rows.push({ group: sys.layer === "elektro" ? "Elektro" : "Rør og vann", name: sys.name, qty: `${nb(len)} m`, unit, total: Math.round(len * unit), approx: true })
    }
  }

  const order = ["Gulv", "Vegger og fasade", "Tak", "Dører og vinduer", "Møbler og innredning", "Elektro", "Rør og vann"]
  return rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group))
}

export function roomSummary(project: Project) {
  return project.levels.map((l) => {
    const rooms = project.rooms.filter((r) => r.level === l.id).map((r) => ({ room: r, area: polygonArea(r.points) / 10000 }))
    return { level: l, rooms, total: rooms.reduce((s, r) => s + r.area, 0) }
  })
}
