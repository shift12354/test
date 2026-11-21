import { FLOORS, RUN_SYSTEMS, catalogItem } from "./catalog"
import { OPENING_DEFAULTS } from "./build"
import { dist, polygonArea } from "./geometry"
import type { Project } from "./types"

export const RUN_PRICE_PER_M: Record<string, number> = { kaldt: 60, varmt: 60, avlop: 150, gulvvarme: 40, el: 25, data: 15 }
const OPENING_PRICE: Record<string, number> = { door: 4500, doubleDoor: 9000, slidingDoor: 7000, patioDoor: 18000, window: 9000 }

export type ListRow = { name: string; qty: string; unit?: number; total?: number; group: string }

export function runLength(points: { x: number; y: number }[]) {
  let s = 0
  for (let i = 0; i < points.length - 1; i++) s += dist(points[i], points[i + 1])
  return s
}

export function materialList(project: Project): ListRow[] {
  const rows: ListRow[] = []
  const nb = (n: number, d = 1) => n.toLocaleString("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d })

  // Floors
  const floorAreas = new Map<string, number>()
  for (const r of project.rooms) floorAreas.set(r.floor, (floorAreas.get(r.floor) ?? 0) + polygonArea(r.points) / 10000)
  for (const [id, a] of floorAreas) {
    const f = FLOORS.find((x) => x.id === id)!
    rows.push({ group: "Gulv", name: f.name, qty: `${nb(a)} m²`, unit: f.price, total: Math.round(a * f.price) })
  }

  // Walls
  const ext = project.walls.filter((w) => w.exterior)
  const int = project.walls.filter((w) => !w.exterior)
  const wallArea = (ws: typeof ext) =>
    ws.reduce((s, w) => {
      const holes = project.openings.filter((o) => o.wallId === w.id).reduce((h, o) => h + o.width * o.height, 0)
      return s + (dist(w.a, w.b) * w.height - holes) / 10000
    }, 0)
  if (ext.length) rows.push({ group: "Vegger", name: "Yttervegg", qty: `${nb(ext.reduce((s, w) => s + dist(w.a, w.b), 0) / 100)} m · ${nb(wallArea(ext))} m²` })
  if (int.length) rows.push({ group: "Vegger", name: "Innervegg", qty: `${nb(int.reduce((s, w) => s + dist(w.a, w.b), 0) / 100)} m · ${nb(wallArea(int) * 2)} m² flate` })

  // Openings
  const ops = new Map<string, number>()
  for (const o of project.openings) {
    const k = `${o.kind}|${o.width}×${o.height}`
    ops.set(k, (ops.get(k) ?? 0) + 1)
  }
  for (const [k, n] of [...ops].sort()) {
    const [kind, size] = k.split("|")
    const unit = OPENING_PRICE[kind]
    rows.push({ group: "Dører og vinduer", name: `${OPENING_DEFAULTS[kind as keyof typeof OPENING_DEFAULTS].name} ${size}`, qty: `${n} stk`, unit, total: unit * n })
  }

  // Items
  const counts = new Map<string, number>()
  for (const i of project.items) counts.set(i.catalogId, (counts.get(i.catalogId) ?? 0) + 1)
  const groupName = { interior: "Møbler og innredning", elektro: "Elektro", vvs: "Rør og vann" } as const
  for (const [id, n] of [...counts].sort((a, b) => catalogItem(a[0]).name.localeCompare(catalogItem(b[0]).name, "nb"))) {
    const c = catalogItem(id)
    rows.push({ group: groupName[c.layer], name: c.name, qty: `${n} stk`, unit: c.price, total: c.price ? c.price * n : undefined })
  }

  // Runs
  for (const sys of RUN_SYSTEMS) {
    const len = project.runs.filter((r) => r.system === sys.id).reduce((s, r) => s + runLength(r.points), 0) / 100
    if (len > 0) {
      const unit = RUN_PRICE_PER_M[sys.id]
      rows.push({ group: sys.layer === "elektro" ? "Elektro" : "Rør og vann", name: sys.name, qty: `${nb(len)} m`, unit, total: Math.round(len * unit) })
    }
  }

  const order = ["Gulv", "Vegger", "Dører og vinduer", "Møbler og innredning", "Elektro", "Rør og vann"]
  return rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group))
}

export function roomSummary(project: Project) {
  return project.levels.map((l) => {
    const rooms = project.rooms.filter((r) => r.level === l.id).map((r) => ({ room: r, area: polygonArea(r.points) / 10000 }))
    return { level: l, rooms, total: rooms.reduce((s, r) => s + r.area, 0) }
  })
}
