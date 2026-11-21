import { ArrowLeftRight, Copy, RotateCw, Trash } from "lucide-react"

import { OPENING_DEFAULTS, reclassifyWalls } from "../model/build"
import { CATALOG, FLOORS, ROOM_TYPES, RUN_SYSTEMS, catalogItem, runSystem } from "../model/catalog"
import { itemPower } from "../model/checks"
import { add, dist, formatArea, formatLength, mul, norm, pointInPolygon, polygonArea, sub } from "../model/geometry"
import { roomSummary, runLength } from "../model/lists"
import type { Item, Opening, OpeningKind, Project, Room, Run, Wall } from "../model/types"
import { useStore } from "../store/store"
import { OPENING_PRICE } from "../model/lists"
import { productsForCatalog, productsForFloor, productsForOpening } from "../model/products"
import { Field, NumField, Section, Swatches, TextField, Toggle } from "./common"
import { ProductPicker } from "./Products"
import { RoofFacadeSection } from "./RoofFacade"
import { UnderlaySection } from "./Underlay"

const WALL_COLORS = [
  { color: "#f4f2ee", name: "Brukket hvit" },
  { color: "#ffffff", name: "Hvit" },
  { color: "#e9e4d8", name: "Lys sand" },
  { color: "#d9dfd6", name: "Salvie" },
  { color: "#dfe5ea", name: "Lys blågrå" },
  { color: "#cdbfae", name: "Leire" },
  { color: "#b9b4ab", name: "Grå" },
  { color: "#5d6b62", name: "Mørk grønn" },
]
const ITEM_COLORS = ["#7d8a8f", "#a3896b", "#c08a5a", "#3c3d40", "#e8e3da", "#5d6b62", "#9fb0b8", "#b08a5e", "#f2f0eb", "#8e2f25"]

export function Inspector() {
  const project = useStore((s) => s.project)
  const selection = useStore((s) => s.selection)
  if (selection.length === 0) return <ProjectInspector project={project} />
  if (selection.length > 1) return <MultiInspector />
  const sel = selection[0]
  switch (sel.kind) {
    case "wall": {
      const w = project.walls.find((x) => x.id === sel.id)
      return w ? <WallInspector wall={w} /> : null
    }
    case "opening": {
      const o = project.openings.find((x) => x.id === sel.id)
      return o ? <OpeningInspector opening={o} /> : null
    }
    case "room": {
      const r = project.rooms.find((x) => x.id === sel.id)
      return r ? <RoomInspector room={r} /> : null
    }
    case "item": {
      const i = project.items.find((x) => x.id === sel.id)
      return i ? <ItemInspector item={i} /> : null
    }
    case "run": {
      const r = project.runs.find((x) => x.id === sel.id)
      return r ? <RunInspector run={r} /> : null
    }
    case "dimension": {
      const d = project.dimensions.find((x) => x.id === sel.id)
      return d ? (
        <div className="inspector">
          <Head kind="Mål" title={formatLength(dist(d.a, d.b))} />
          <Actions />
        </div>
      ) : null
    }
  }
}

function Head({ kind, title }: { kind: string; title: string }) {
  return (
    <header className="insp-head">
      <span className="eyebrow">{kind}</span>
      <h2>{title}</h2>
    </header>
  )
}

function Actions({ rotate, duplicate }: { rotate?: boolean; duplicate?: boolean }) {
  const del = useStore((s) => s.deleteSelection)
  const dup = useStore((s) => s.duplicateSelection)
  const rot = useStore((s) => s.rotateSelection)
  return (
    <div className="insp-actions">
      {rotate && (
        <button className="btn ghost" onClick={() => rot(90)}>
          <RotateCw size={15} /> Roter 90°
        </button>
      )}
      {duplicate && (
        <button className="btn ghost" onClick={dup}>
          <Copy size={15} /> Dupliser
        </button>
      )}
      <button className="btn danger" onClick={del}>
        <Trash size={15} /> Slett
      </button>
    </div>
  )
}

const upd = (fn: (p: Project) => Project) => useStore.getState().update(fn)
const patchWall = (id: string, patch: Partial<Wall>) => upd((p) => ({ ...p, walls: p.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) }))
const patchOpening = (id: string, patch: Partial<Opening>) => upd((p) => ({ ...p, openings: p.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))
const patchRoom = (id: string, patch: Partial<Room>) => upd((p) => ({ ...p, rooms: p.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
const patchItem = (id: string, patch: Partial<Item>) => upd((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
const patchRun = (id: string, patch: Partial<Run>) => upd((p) => ({ ...p, runs: p.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))

function WallInspector({ wall }: { wall: Wall }) {
  const openings = useStore((s) => s.project.openings.filter((o) => o.wallId === wall.id))
  const L = dist(wall.a, wall.b)
  return (
    <div className="inspector">
      <Head kind={wall.exterior ? "Yttervegg" : "Innervegg"} title={formatLength(L)} />
      <div className="fields">
        <Field label="Lengde">
          <NumField
            value={L}
            min={10}
            onCommit={(v) => {
              const d = norm(sub(wall.b, wall.a))
              const b = add(wall.a, mul(d, v))
              upd((p) => ({
                ...p,
                walls: p.walls.map((w) => {
                  if (w.id === wall.id) return { ...w, b }
                  // walls joined at the moved end follow it
                  if (w.level !== wall.level) return w
                  return { ...w, a: dist(w.a, wall.b) < 1 ? b : w.a, b: dist(w.b, wall.b) < 1 ? b : w.b }
                }),
              }))
            }}
          />
        </Field>
        <Field label="Tykkelse">
          <NumField value={wall.thickness} min={5} max={60} onCommit={(v) => patchWall(wall.id, { thickness: v })} />
        </Field>
        <Field label="Høyde">
          <NumField value={wall.height} min={50} max={600} onCommit={(v) => patchWall(wall.id, { height: v })} />
        </Field>
        <Toggle label="Yttervegg (kledning utvendig)" checked={wall.exterior} onChange={(v) => patchWall(wall.id, { exterior: v })} />
      </div>
      {openings.length > 0 && (
        <Section title="Åpninger i veggen">
          <ul className="mini-list">
            {openings.map((o) => (
              <li key={o.id}>
                <button className="link" onClick={() => useStore.getState().setSelection([{ kind: "opening", id: o.id }])}>
                  {OPENING_DEFAULTS[o.kind].name}
                </button>
                <span className="mono">
                  {o.width}×{o.height}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Actions />
    </div>
  )
}

function OpeningInspector({ opening: o }: { opening: Opening }) {
  const wall = useStore((s) => s.project.walls.find((w) => w.id === o.wallId))
  const isDoor = o.kind !== "window"
  const L = wall ? dist(wall.a, wall.b) : 0
  return (
    <div className="inspector">
      <Head kind={isDoor ? "Dør" : "Vindu"} title={`${OPENING_DEFAULTS[o.kind].name} ${o.width} × ${o.height}`} />
      <div className="fields">
        <Field label="Type">
          <select value={o.kind} onChange={(e) => patchOpening(o.id, { kind: e.target.value as OpeningKind, productId: undefined, sill: e.target.value === "window" ? Math.max(o.sill, 60) : 0 })}>
            {(Object.keys(OPENING_DEFAULTS) as OpeningKind[]).map((k) => (
              <option key={k} value={k}>
                {OPENING_DEFAULTS[k].name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bredde" hint="karmmål">
          <NumField value={o.width} min={40} max={Math.max(60, L)} onCommit={(v) => patchOpening(o.id, { width: v, offset: Math.max(v / 2, Math.min(L - v / 2, o.offset)) })} />
        </Field>
        <Field label="Høyde">
          <NumField value={o.height} min={40} max={wall?.height ?? 300} onCommit={(v) => patchOpening(o.id, { height: v })} />
        </Field>
        {!isDoor && (
          <Field label="Brysthøyde">
            <NumField value={o.sill} min={0} max={250} onCommit={(v) => patchOpening(o.id, { sill: v })} />
          </Field>
        )}
        <Field label="Fra veggens start">
          <NumField value={o.offset - o.width / 2} min={0} max={L - o.width} onCommit={(v) => patchOpening(o.id, { offset: v + o.width / 2 })} />
        </Field>
        {isDoor && (
          <div className="row-btns">
            <button className="btn ghost" onClick={() => patchOpening(o.id, { flip: !o.flip })}>
              <ArrowLeftRight size={15} style={{ transform: "rotate(90deg)" }} /> Slå andre veien
            </button>
            <button className="btn ghost" onClick={() => patchOpening(o.id, { hingeEnd: !o.hingeEnd })}>
              <ArrowLeftRight size={15} /> Bytt hengsel
            </button>
          </div>
        )}
      </div>
      <ProductPicker products={productsForOpening(o.kind)} value={o.productId} onChange={(productId) => patchOpening(o.id, { productId })} estimate={{ price: OPENING_PRICE[o.kind], unit: "" }} />
      <Actions />
    </div>
  )
}

function RoomInspector({ room }: { room: Room }) {
  const project = useStore((s) => s.project)
  const area = polygonArea(room.points)
  let perim = 0
  for (let i = 0; i < room.points.length; i++) perim += dist(room.points[i], room.points[(i + 1) % room.points.length])
  const inRoom = project.items.filter((i) => i.level === room.level && pointInPolygon(i, room.points))
  const el = inRoom.filter((i) => catalogItem(i.catalogId).layer === "elektro").length
  const furn = inRoom.filter((i) => catalogItem(i.catalogId).layer === "interior").length
  return (
    <div className="inspector">
      <Head kind="Rom" title={room.name} />
      <div className="stats">
        <div>
          <span className="stat-val">{formatArea(area)}</span>
          <span className="stat-label">Areal</span>
        </div>
        <div>
          <span className="stat-val">{formatLength(perim)}</span>
          <span className="stat-label">Omkrets</span>
        </div>
        <div>
          <span className="stat-val">{furn}</span>
          <span className="stat-label">Møbler</span>
        </div>
        <div>
          <span className="stat-val">{el}</span>
          <span className="stat-label">El-punkt</span>
        </div>
      </div>
      <div className="fields">
        <Field label="Navn">
          <TextField value={room.name} onCommit={(v) => patchRoom(room.id, { name: v || "Rom" })} />
        </Field>
        <Field label="Romtype">
          <select
            value={room.type}
            onChange={(e) => {
              const type = e.target.value as Room["type"]
              const wet = ROOM_TYPES.find((t) => t.id === type)?.wet
              const def = ROOM_TYPES.find((t) => t.id === room.type)?.name
              patchRoom(room.id, {
                type,
                name: room.name.startsWith("Rom ") || room.name === def ? (ROOM_TYPES.find((t) => t.id === type)?.name ?? room.name) : room.name,
                floor: wet && !room.floor.startsWith("flis") ? "flis-lys" : room.floor,
                underfloorHeating: wet ? true : room.underfloorHeating,
              })
            }}
          >
            {ROOM_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Gulv">
          <div className="floor-swatches">
            {FLOORS.map((f) => (
              <button key={f.id} className={`floor-sw ${room.floor === f.id ? "on" : ""}`} onClick={() => patchRoom(room.id, { floor: f.id, floorProductId: undefined })} title={f.name} aria-label={f.name} aria-pressed={room.floor === f.id}>
                <span style={{ background: f.color }} />
              </button>
            ))}
          </div>
          <span className="sub">{FLOORS.find((f) => f.id === room.floor)?.name}</span>
        </Field>
        <Field label="Veggfarge">
          <Swatches value={room.wallColor} colors={WALL_COLORS} onChange={(c) => patchRoom(room.id, { wallColor: c })} label="Veggfarge" />
        </Field>
        <Toggle label="Gulvvarme" checked={room.underfloorHeating} onChange={(v) => patchRoom(room.id, { underfloorHeating: v })} />
        <ProductPicker
          products={productsForFloor(room.floor)}
          value={room.floorProductId}
          onChange={(floorProductId) => patchRoom(room.id, { floorProductId })}
          estimate={{ price: FLOORS.find((f) => f.id === room.floor)?.price ?? 0, unit: "/m²" }}
          label="Gulv fra butikk"
        />
      </div>
      <div className="insp-actions">
        <button
          className="btn danger"
          onClick={() => {
            useStore.getState().update((p) => {
              const rooms = p.rooms.filter((r) => r.id !== room.id)
              return { ...p, rooms, walls: reclassifyWalls(p.walls, rooms, room.level) }
            })
            useStore.getState().setSelection([])
          }}
        >
          <Trash size={15} /> Slett rommet
        </button>
      </div>
      <p className="note">Veggene blir stående når du sletter rommet. Velg dem og slett hver for seg om du vil.</p>
    </div>
  )
}

function ItemInspector({ item }: { item: Item }) {
  const project = useStore((s) => s.project)
  const c = catalogItem(item.catalogId)
  const w = item.w ?? c.w
  const d = item.d ?? c.d
  const h = item.h ?? c.h
  const elev = item.elevation ?? c.elevation
  const power = itemPower(item, project)
  const same = CATALOG.filter((x) => x.category === c.category)
  return (
    <div className="inspector">
      <Head kind={c.layer === "elektro" ? "Elektro" : c.layer === "vvs" ? "Rør og vann" : "Møbel"} title={c.name} />
      <div className="fields">
        <Field label="Bytt til">
          <select value={item.catalogId} onChange={(e) => patchItem(item.id, { catalogId: e.target.value, productId: undefined, w: undefined, d: undefined, h: undefined, elevation: undefined, color: undefined })}>
            {same.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        {c.layer === "interior" && (
          <div className="grid3">
            <Field label="Bredde">
              <NumField value={w} min={5} onCommit={(v) => patchItem(item.id, { w: v })} />
            </Field>
            <Field label="Dybde">
              <NumField value={d} min={1} onCommit={(v) => patchItem(item.id, { d: v })} />
            </Field>
            <Field label="Høyde">
              <NumField value={h} min={1} onCommit={(v) => patchItem(item.id, { h: v })} />
            </Field>
          </div>
        )}
        <div className="grid2">
          <Field label={c.mount === "ceiling" ? "Under tak" : "Over gulv"}>
            <NumField value={elev} min={c.mount === "floor" ? -50 : 0} max={400} onCommit={(v) => patchItem(item.id, { elevation: v })} />
          </Field>
          <Field label="Rotasjon">
            <NumField value={item.rotation} unit="°" step={15} onCommit={(v) => patchItem(item.id, { rotation: ((v % 360) + 360) % 360 })} />
          </Field>
        </div>
        {c.layer === "interior" && (
          <Field label="Farge">
            <Swatches value={item.color ?? c.color} colors={[c.color, ...ITEM_COLORS.filter((x) => x !== c.color)].map((x) => ({ color: x, name: x }))} onChange={(v) => patchItem(item.id, { color: v })} label="Farge" />
          </Field>
        )}
        {(c.electrical || c.power) && c.electrical !== "svak" && c.electrical !== "sikkerhet" && c.electrical !== "tavle" && (
          <Field label="Kurs" hint={power ? `${power.toLocaleString("nb-NO")} W` : undefined}>
            <select value={item.circuitId ?? ""} onChange={(e) => patchItem(item.id, { circuitId: e.target.value || undefined })}>
              <option value="">Ingen kurs valgt</option>
              {project.circuits.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({k.amps} A)
                </option>
              ))}
            </select>
          </Field>
        )}
        {c.water && (
          <p className="note">
            Trenger{" "}
            {[c.water.cold && "kaldtvann", c.water.hot && "varmtvann", c.water.drain && "avløp"]
              .filter(Boolean)
              .join(", ")
              .replace(/, ([^,]*)$/, " og $1")}
            . Tegn rørene fram hit med rørverktøyet.
          </p>
        )}
        <Field label="Notat">
          <TextField value={item.note ?? ""} placeholder="F.eks. «Ekstra uttak for lader»" onCommit={(v) => patchItem(item.id, { note: v || undefined })} />
        </Field>
      </div>
      <ProductPicker products={productsForCatalog(item.catalogId)} value={item.productId} onChange={(productId) => patchItem(item.id, { productId })} estimate={c.price ? { price: c.price, unit: "" } : undefined} />
      <Actions rotate duplicate />
    </div>
  )
}

function RunInspector({ run }: { run: Run }) {
  const project = useStore((s) => s.project)
  const sys = runSystem(run.system)
  return (
    <div className="inspector">
      <Head kind={sys.layer === "elektro" ? "Kabel" : "Rør"} title={`${sys.name}, ${formatLength(runLength(run.points))}`} />
      <div className="fields">
        <Field label="System">
          <select value={run.system} onChange={(e) => patchRun(run.id, { system: e.target.value as Run["system"] })}>
            {RUN_SYSTEMS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid2">
          <Field label="Høyde" hint="over gulv">
            <NumField value={run.elevation} min={-80} max={400} onCommit={(v) => patchRun(run.id, { elevation: v })} />
          </Field>
          <Field label="Diameter">
            <NumField value={run.diameter} unit="mm" min={4} max={200} onCommit={(v) => patchRun(run.id, { diameter: v })} />
          </Field>
        </div>
        {sys.layer === "elektro" && (
          <Field label="Kurs">
            <select value={run.circuitId ?? ""} onChange={(e) => patchRun(run.id, { circuitId: e.target.value || undefined })}>
              <option value="">Ingen</option>
              {project.circuits.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <p className="note">{run.points.length} knekkpunkt. Dra i punktene for å flytte dem. Negativ høyde betyr under gulvet.</p>
      </div>
      <Actions duplicate />
    </div>
  )
}

function MultiInspector() {
  const selection = useStore((s) => s.selection)
  return (
    <div className="inspector">
      <Head kind="Utvalg" title={`${selection.length} ting valgt`} />
      <p className="note">Dra for å flytte alt sammen. Slett fjerner alt som er valgt.</p>
      <Actions rotate duplicate />
    </div>
  )
}

function ProjectInspector({ project }: { project: Project }) {
  const levelId = useStore((s) => s.levelId)
  const summary = roomSummary(project)
  const total = summary.reduce((s, l) => s + l.total, 0)
  const level = project.levels.find((l) => l.id === levelId)!
  return (
    <div className="inspector">
      <Head kind="Prosjekt" title={project.name} />
      <div className="stats">
        <div>
          <span className="stat-val">{total.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} m²</span>
          <span className="stat-label">Romareal</span>
        </div>
        <div>
          <span className="stat-val">{project.rooms.length}</span>
          <span className="stat-label">Rom</span>
        </div>
        <div>
          <span className="stat-val">{project.levels.length}</span>
          <span className="stat-label">Etasjer</span>
        </div>
      </div>
      <Section title={level.name}>
        <div className="fields">
          <Field label="Navn">
            <TextField value={level.name} onCommit={(v) => upd((p) => ({ ...p, levels: p.levels.map((l) => (l.id === level.id ? { ...l, name: v || l.name } : l)) }))} />
          </Field>
          <div className="grid2">
            <Field label="Takhøyde">
              <NumField
                value={level.height}
                min={200}
                max={400}
                onCommit={(v) =>
                  upd((p) => ({
                    ...p,
                    levels: p.levels.map((l) => (l.id === level.id ? { ...l, height: v } : l)),
                    walls: p.walls.map((w) => (w.level === level.id && w.height === level.height ? { ...w, height: v } : w)),
                  }))
                }
              />
            </Field>
            <Field label="Gulvnivå">
              <NumField value={level.elevation} min={-400} max={2000} onCommit={(v) => upd((p) => ({ ...p, levels: p.levels.map((l) => (l.id === level.id ? { ...l, elevation: v } : l)) }))} />
            </Field>
          </div>
        </div>
        <ul className="room-list">
          {summary
            .find((s) => s.level.id === level.id)
            ?.rooms.map(({ room, area }) => (
              <li key={room.id}>
                <button className="link" onClick={() => useStore.getState().setSelection([{ kind: "room", id: room.id }])}>
                  <span className="dot" style={{ background: FLOORS.find((f) => f.id === room.floor)?.color }} />
                  {room.name}
                </button>
                <span className="mono">{area.toLocaleString("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²</span>
              </li>
            ))}
        </ul>
      </Section>
      <UnderlaySection />
      <RoofFacadeSection project={project} />
      <Section title="Kom i gang">
        <ol className="howto">
          <li>
            Tegn rom med <kbd>R</kbd>, eller vegger med <kbd>W</kbd>.
          </li>
          <li>Velg dører, vinduer, møbler og elektro i biblioteket til venstre.</li>
          <li>
            Trekk rør og kabler med rørverktøyet <kbd>P</kbd>.
          </li>
          <li>Se huset i 3D, og gå rundt inne med «Gå».</li>
        </ol>
      </Section>
    </div>
  )
}
