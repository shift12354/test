// Helpers that turn rooms into walls and points into openings. Shared by the
// sample house and the room tool.
import { catalogItem } from "./catalog"
import { dist, pointInPolygon, projectOnSegment, uid, uncoveredParts, add, mul, norm, perp, sub } from "./geometry"
import type { Item, Opening, OpeningKind, Room, Vec, Wall } from "./types"

export const EXTERIOR_THICKNESS = 30
export const INTERIOR_THICKNESS = 12

/** Is the given side of a segment outside every room on the level? */
function isExteriorEdge(p: Vec, q: Vec, rooms: Room[]) {
  const mid = mul(add(p, q), 0.5)
  const n = perp(norm(sub(q, p)))
  const s1 = add(mid, mul(n, 8))
  const s2 = sub(mid, mul(n, 8))
  const in1 = rooms.some((r) => pointInPolygon(s1, r.points))
  const in2 = rooms.some((r) => pointInPolygon(s2, r.points))
  return !(in1 && in2)
}

/** Walls needed around a room, skipping parts already covered by existing walls. */
export function wallsForRoom(room: Room, existing: Wall[], allRooms: Room[], height: number): Wall[] {
  const levelWalls = existing.filter((w) => w.level === room.level)
  const out: Wall[] = []
  const pts = room.points
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    for (const [a, b] of uncoveredParts(p, q, [...levelWalls, ...out])) {
      const exterior = isExteriorEdge(a, b, allRooms.filter((r) => r.level === room.level))
      out.push({
        id: uid("w"),
        level: room.level,
        a,
        b,
        thickness: exterior ? EXTERIOR_THICKNESS : INTERIOR_THICKNESS,
        height,
        exterior,
      })
    }
  }
  return out
}

/** Re-evaluate which walls are exterior after rooms change (keeps custom thickness for interior). */
export function reclassifyWalls(walls: Wall[], rooms: Room[], level: string): Wall[] {
  const levelRooms = rooms.filter((r) => r.level === level)
  return walls.map((w) => {
    if (w.level !== level || levelRooms.length === 0) return w
    const exterior = isExteriorEdge(w.a, w.b, levelRooms)
    if (exterior === w.exterior) return w
    return { ...w, exterior, thickness: exterior ? EXTERIOR_THICKNESS : INTERIOR_THICKNESS }
  })
}

export function nearestWall(p: Vec, walls: Wall[], maxDistance = Infinity) {
  let best: { wall: Wall; t: number; point: Vec; distance: number } | null = null
  for (const w of walls) {
    const r = projectOnSegment(p, w.a, w.b)
    if (r.distance <= maxDistance && (!best || r.distance < best.distance)) best = { wall: w, ...r }
  }
  return best
}

export const OPENING_DEFAULTS: Record<OpeningKind, { width: number; height: number; sill: number; name: string }> = {
  door: { width: 90, height: 210, sill: 0, name: "Dør" },
  doubleDoor: { width: 150, height: 210, sill: 0, name: "Dobbeldør" },
  slidingDoor: { width: 120, height: 210, sill: 0, name: "Skyvedør" },
  patioDoor: { width: 180, height: 220, sill: 0, name: "Terrassedør" },
  window: { width: 120, height: 120, sill: 90, name: "Vindu" },
}

export function makeOpening(
  walls: Wall[],
  at: Vec,
  kind: OpeningKind,
  over: Partial<Opening> = {},
): Opening | null {
  const hit = nearestWall(at, walls, 40)
  if (!hit) return null
  const L = dist(hit.wall.a, hit.wall.b)
  const def = OPENING_DEFAULTS[kind]
  const width = over.width ?? def.width
  const offset = Math.max(width / 2, Math.min(L - width / 2, hit.t * L))
  return {
    id: uid("o"),
    wallId: hit.wall.id,
    kind,
    offset,
    width,
    height: def.height,
    sill: def.sill,
    flip: false,
    hingeEnd: false,
    ...over,
  }
}

/** Place a wall-mounted item flush against the nearest wall, facing into the room. */
export function snapItemToWall(p: Vec, catalogId: string, walls: Wall[], depthOverride?: number) {
  const c = catalogItem(catalogId)
  const hit = nearestWall(p, walls, 60)
  if (!hit) return null
  const w = hit.wall
  const d = norm(sub(w.b, w.a))
  let n = perp(d)
  // face the side the cursor is on
  if ((p.x - hit.point.x) * n.x + (p.y - hit.point.y) * n.y < 0) n = mul(n, -1)
  const depth = depthOverride ?? c.d
  const centre = add(hit.point, mul(n, w.thickness / 2 + depth / 2))
  // item local -y is the back; rotate so that -y points against n
  const rotation = (Math.atan2(n.y, n.x) * 180) / Math.PI - 90
  return { x: centre.x, y: centre.y, rotation: ((rotation % 360) + 360) % 360 }
}

export function makeItem(level: string, catalogId: string, x: number, y: number, rotation = 0, extra: Partial<Item> = {}): Item {
  return { id: uid("i"), level, catalogId, x, y, rotation, ...extra }
}
