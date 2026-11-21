// Plain-language checks of the plan. They are rules of thumb drawn from TEK17,
// the fire-prevention regulations and common NEK 400 practice. They do not
// replace an electrician, plumber or the municipality.
import { CATALOG_BY_ID, ROOM_TYPES, catalogItem } from "./catalog"
import { dist, pointInPolygon, polygonArea, projectOnSegment } from "./geometry"
import type { Item, Project, Room, Selection, Vec } from "./types"

export type CheckLevel = "ok" | "info" | "warn"
export type Check = {
  id: string
  level: CheckLevel
  title: string
  detail: string
  levelId?: string
  target?: Selection
}

const roomOf = (p: Vec, rooms: Room[]) => rooms.find((r) => pointInPolygon(p, r.points))

function distanceToRun(p: Vec, pts: Vec[]) {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, projectOnSegment(p, pts[i], pts[i + 1]).distance)
  if (pts.length === 1) best = dist(p, pts[0])
  return best
}

export function itemPower(item: Item, project: Project) {
  const c = catalogItem(item.catalogId)
  if (c.model === "thermostat") {
    const r = roomOf(item, project.rooms.filter((x) => x.level === item.level))
    return r && r.underfloorHeating ? Math.round((polygonArea(r.points) / 10000) * 120) : 0
  }
  return c.power ?? 0
}

export function circuitLoads(project: Project) {
  return project.circuits.map((c) => {
    const items = project.items.filter((i) => i.circuitId === c.id)
    const watts = items.reduce((s, i) => s + itemPower(i, project), 0)
    const points = items.reduce((s, i) => s + (catalogItem(i.catalogId).model === "outletDouble" ? 2 : 1), 0)
    const capacity = c.amps * 230
    return { circuit: c, items, watts, points, capacity, ratio: watts / capacity }
  })
}

export function runChecks(project: Project): Check[] {
  const out: Check[] = []
  const push = (c: Omit<Check, "id">) => out.push({ id: `c${out.length}`, ...c })

  for (const level of project.levels) {
    const rooms = project.rooms.filter((r) => r.level === level.id)
    const items = project.items.filter((i) => i.level === level.id)
    const walls = project.walls.filter((w) => w.level === level.id)
    if (!rooms.length && !walls.length) continue
    const lvl = project.levels.length > 1 ? `${level.name}: ` : ""
    const smokes = items.filter((i) => catalogItem(i.catalogId).model === "smoke")

    if (smokes.length === 0) {
      push({
        level: "warn",
        title: `${lvl}Ingen røykvarsler`,
        detail: "Forskrift om brannforebygging krever minst én røykvarsler i hver etasje. Plasser den i taket i gang eller stue, gjerne utenfor soverommene.",
        levelId: level.id,
      })
    } else {
      push({ level: "ok", title: `${lvl}${smokes.length} røykvarsler`, detail: "Minst én røykvarsler i etasjen.", levelId: level.id })
    }

    for (const r of rooms) {
      const type = ROOM_TYPES.find((t) => t.id === r.type)
      const inRoom = items.filter((i) => pointInPolygon(i, r.points))
      const area = polygonArea(r.points) / 10000
      const target: Selection = { kind: "room", id: r.id }

      if (type?.living) {
        const hasWindow = project.openings.some((o) => {
          if (o.kind !== "window" && o.kind !== "patioDoor") return false
          const w = walls.find((x) => x.id === o.wallId)
          if (!w || !w.exterior) return false
          // the wall must border the room: a point just inside the room near the opening
          const t = o.offset / dist(w.a, w.b)
          const c = { x: w.a.x + (w.b.x - w.a.x) * t, y: w.a.y + (w.b.y - w.a.y) * t }
          return [-1, 1].some((s) => {
            const nx = -(w.b.y - w.a.y) / dist(w.a, w.b)
            const ny = (w.b.x - w.a.x) / dist(w.a, w.b)
            return pointInPolygon({ x: c.x + nx * s * (w.thickness / 2 + 10), y: c.y + ny * s * (w.thickness / 2 + 10) }, r.points)
          })
        })
        if (!hasWindow)
          push({
            level: "warn",
            title: `${r.name} mangler vindu`,
            detail: "Oppholdsrom og soverom skal ha tilfredsstillende dagslys og utsyn (TEK17 §13-7). Soverom trenger også et vindu som kan brukes til rømning.",
            levelId: level.id,
            target,
          })
      }

      if (type?.wet && r.type !== "wc") {
        const drains = inRoom.filter((i) => catalogItem(i.catalogId).model === "drain")
        const hasWater = inRoom.some((i) => catalogItem(i.catalogId).water)
        if (hasWater && drains.length === 0)
          push({
            level: "warn",
            title: `${r.name} har ikke sluk`,
            detail: "Rom med vanninstallasjoner bør ha sluk, og i bad skal gulvet ha fall mot sluket (TEK17 §13-15).",
            levelId: level.id,
            target,
          })
        if (r.underfloorHeating && !inRoom.some((i) => catalogItem(i.catalogId).model === "thermostat"))
          push({ level: "info", title: `${r.name}: termostat`, detail: "Rommet har gulvvarme, men ingen termostat er tegnet inn.", levelId: level.id, target })
      }

      // Outlets close to shower or bath
      const wetZones = inRoom.filter((i) => ["shower", "bathtub"].includes(catalogItem(i.catalogId).model))
      for (const o of inRoom.filter((i) => ["outlet", "outletDouble"].includes(catalogItem(i.catalogId).model))) {
        for (const z of wetZones) {
          const c = catalogItem(z.catalogId)
          const reach = Math.max(z.w ?? c.w, z.d ?? c.d) / 2 + 60
          if (dist(o, z) < reach)
            push({
              level: "warn",
              title: `Stikkontakt nær ${c.name.toLowerCase()}`,
              detail: "Stikkontakter skal ikke stå i sone 1 og 2 rundt dusj og badekar (60 cm fra kanten). Flytt den eller la elektrikeren vurdere.",
              levelId: level.id,
              target: { kind: "item", id: o.id },
            })
        }
      }

      // Outlet count rule of thumb for living rooms
      if (r.type === "stue" || r.type === "soverom" || r.type === "kontor") {
        const uttak = inRoom.reduce((s, i) => {
          const m = catalogItem(i.catalogId).model
          return s + (m === "outletDouble" ? 2 : m === "outlet" ? 1 : 0)
        }, 0)
        const anbefalt = Math.ceil(area / 4) * 2
        if (uttak < anbefalt)
          push({
            level: "info",
            title: `${r.name}: ${uttak} av ${anbefalt} uttak`,
            detail: `Vanlig praksis etter NEK 400 er rundt to uttak per påbegynte 4 m² gulv (${area.toFixed(1).replace(".", ",")} m² her). En dobbel stikkontakt teller som to. Avklar endelig antall med elektriker.`,
            levelId: level.id,
            target,
          })
      }
    }

    // Water connections
    const runs = project.runs.filter((r) => r.level === level.id)
    for (const it of items) {
      const c = catalogItem(it.catalogId)
      if (!c.water || c.model === "manifold" || c.model === "drain") continue
      const tol = Math.max(it.w ?? c.w, it.d ?? c.d) / 2 + 60
      const missing: string[] = []
      const near = (sys: string) => runs.some((r) => r.system === sys && distanceToRun(it, r.points) < tol)
      if (c.water.cold && !near("kaldt")) missing.push("kaldtvann")
      if (c.water.hot && !near("varmt")) missing.push("varmtvann")
      if (c.water.drain && !near("avlop") && !items.some((d) => catalogItem(d.catalogId).model === "drain" && dist(d, it) < tol)) missing.push("avløp")
      if (missing.length)
        push({
          level: "info",
          title: `${c.name} mangler ${missing.join(", ")}`,
          detail: "Tegn rør fram til punktet med rørverktøyet, eller sjekk at røret ender nær det.",
          levelId: level.id,
          target: { kind: "item", id: it.id },
        })
    }
  }

  // Circuits
  for (const l of circuitLoads(project)) {
    // one big appliance on its own circuit is expected to run close to the limit
    if (l.ratio > 1 || (l.ratio > 0.8 && l.items.length > 1))
      push({
        level: l.ratio > 1 ? "warn" : "info",
        title: `${l.circuit.name} er høyt belastet`,
        detail: `Fast tilkoblet utstyr på kursen trekker rundt ${(l.watts / 1000).toFixed(1).replace(".", ",")} kW av ${(l.capacity / 1000).toFixed(1).replace(".", ",")} kW (${l.circuit.amps} A). Vurder en egen kurs.`,
      })
  }
  const elItems = project.items.filter((i) => {
    const c = CATALOG_BY_ID[i.catalogId]
    return c?.electrical && !["svak", "sikkerhet", "tavle"].includes(c.electrical)
  })
  const unassigned = elItems.filter((i) => !i.circuitId)
  if (unassigned.length)
    push({
      level: "info",
      title: `${unassigned.length} elektriske punkt uten kurs`,
      detail: "Velg punktet og sett kurs i egenskapspanelet, så blir kurslisten og belastningen riktig.",
      target: { kind: "item", id: unassigned[0].id },
      levelId: unassigned[0].level,
    })
  for (const i of elItems) {
    const c = catalogItem(i.catalogId)
    if ((c.power ?? 0) >= 2000 && i.circuitId) {
      const shared = project.items.filter((x) => x.circuitId === i.circuitId && x.id !== i.id && (catalogItem(x.catalogId).power ?? 0) >= 1000)
      if (shared.length)
        push({
          level: "info",
          title: `${c.name} deler kurs`,
          detail: "Utstyr på 2 kW eller mer har vanligvis egen kurs.",
          target: { kind: "item", id: i.id },
          levelId: i.level,
        })
    }
  }
  if (elItems.length && !project.items.some((i) => catalogItem(i.catalogId).model === "panel"))
    push({ level: "info", title: "Sikringsskap mangler", detail: "Tegn inn sikringsskapet, så ser du hvor kablene skal gå." })

  const narrowDoors = project.openings.filter((o) => o.kind === "door" && o.width < 100)
  if (narrowDoors.length)
    push({
      level: "info",
      title: `${narrowDoors.length} dører under 10M bredde`,
      detail: "Dører med karmbredde under 100 cm gir vanligvis under 86 cm fri passasje. Det er kravet for tilgjengelig boenhet (TEK17 §12-15), som gjelder boliger med alle hovedfunksjoner på inngangsplanet.",
      target: { kind: "opening", id: narrowDoors[0].id },
    })

  const order: Record<CheckLevel, number> = { warn: 0, info: 1, ok: 2 }
  return out.sort((a, b) => order[a.level] - order[b.level])
}
