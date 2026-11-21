import type { Opening, Vec, Wall } from "./types"

export const v = (x: number, y: number): Vec => ({ x, y })
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y })
export const mul = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s })
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y
export const cross = (a: Vec, b: Vec) => a.x * b.y - a.y * b.x
export const len = (a: Vec) => Math.hypot(a.x, a.y)
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
export const norm = (a: Vec): Vec => {
  const l = len(a)
  return l < 1e-9 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l }
}
export const perp = (a: Vec): Vec => ({ x: -a.y, y: a.x })
export const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
export const eq = (a: Vec, b: Vec, eps = 0.5) => dist(a, b) <= eps
export const round = (n: number, step: number) => Math.round(n / step) * step

export const wallLength = (w: Wall) => dist(w.a, w.b)
export const wallDir = (w: Wall) => norm(sub(w.b, w.a))
export const wallAngle = (w: Wall) => Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x)

/** Closest point on segment ab to p, with t in [0,1]. */
export function projectOnSegment(p: Vec, a: Vec, b: Vec) {
  const ab = sub(b, a)
  const l2 = dot(ab, ab)
  const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2))
  const point = lerp(a, b, t)
  return { t, point, distance: dist(p, point) }
}

export function polygonArea(points: Vec[]) {
  let s = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    s += a.x * b.y - b.x * a.y
  }
  return Math.abs(s) / 2
}

export function polygonCentroid(points: Vec[]): Vec {
  let cx = 0
  let cy = 0
  let a = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    const f = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * f
    cy += (p.y + q.y) * f
    a += f
  }
  if (Math.abs(a) < 1e-6) {
    const n = points.length || 1
    return { x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n }
  }
  return { x: cx / (3 * a), y: cy / (3 * a) }
}

export function pointInPolygon(p: Vec, poly: Vec[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function bounds(points: Vec[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

/** Corners of a rotated rectangle centred at c. Rotation in degrees, clockwise in plan. */
export function rectCorners(c: Vec, w: number, d: number, rotationDeg: number): Vec[] {
  const r = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  return [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ].map(([x, y]) => ({ x: c.x + x * cos - y * sin, y: c.y + x * sin + y * cos }))
}

/** Snap an angle (radians) to the nearest multiple of step degrees. */
export function snapAngle(from: Vec, to: Vec, stepDeg: number): Vec {
  const d = sub(to, from)
  const l = len(d)
  const a = Math.atan2(d.y, d.x)
  const s = (stepDeg * Math.PI) / 180
  const sa = Math.round(a / s) * s
  return { x: from.x + Math.cos(sa) * l, y: from.y + Math.sin(sa) * l }
}

/**
 * Wall outline as a polygon, extended at ends that meet other walls so corners close.
 * Returns the four corners: a-left, b-left, b-right, a-right.
 */
export function wallPolygon(w: Wall, extendA: number, extendB: number): Vec[] {
  const d = wallDir(w)
  const n = perp(d)
  const h = w.thickness / 2
  const a = sub(w.a, mul(d, extendA))
  const b = add(w.b, mul(d, extendB))
  return [add(a, mul(n, h)), add(b, mul(n, h)), sub(b, mul(n, h)), sub(a, mul(n, h))]
}

/** How far each end of a wall should be extended to close a joint with walls on the same level. */
export function wallJoints(w: Wall, walls: Wall[]) {
  let ea = 0
  let eb = 0
  for (const o of walls) {
    if (o.id === w.id || o.level !== w.level) continue
    const touches = (p: Vec) => eq(p, o.a, 1) || eq(p, o.b, 1) || projectOnSegment(p, o.a, o.b).distance < 1
    const ext = o.thickness / 2
    if (touches(w.a)) ea = Math.max(ea, ext)
    if (touches(w.b)) eb = Math.max(eb, ext)
  }
  return { ea, eb }
}

/** Solid wall pieces along the wall axis between openings: [start, end] in cm from a. */
export function wallSolidSpans(w: Wall, openings: Opening[], ea = 0, eb = 0) {
  const L = wallLength(w)
  const spans: { from: number; to: number; opening?: Opening }[] = []
  const sorted = openings.filter((o) => o.wallId === w.id).sort((p, q) => p.offset - q.offset)
  let cur = -ea
  for (const o of sorted) {
    const s = Math.max(cur, o.offset - o.width / 2)
    const e = Math.min(L + eb, o.offset + o.width / 2)
    if (s > cur) spans.push({ from: cur, to: s })
    spans.push({ from: s, to: e, opening: o })
    cur = Math.max(cur, e)
  }
  if (cur < L + eb) spans.push({ from: cur, to: L + eb })
  return spans
}

/** Parts of segment pq not already covered by collinear walls. Used when a room is drawn next to existing walls. */
export function uncoveredParts(p: Vec, q: Vec, walls: Wall[]): [Vec, Vec][] {
  const L = dist(p, q)
  if (L < 1) return []
  const d = norm(sub(q, p))
  const covered: [number, number][] = []
  for (const w of walls) {
    // collinear: both endpoints on the infinite line through p and q
    const offA = Math.abs(cross(d, sub(w.a, p)))
    const offB = Math.abs(cross(d, sub(w.b, p)))
    if (offA > 2 || offB > 2) continue
    const ta = dot(sub(w.a, p), d)
    const tb = dot(sub(w.b, p), d)
    const lo = Math.max(0, Math.min(ta, tb))
    const hi = Math.min(L, Math.max(ta, tb))
    if (hi - lo > 1) covered.push([lo, hi])
  }
  covered.sort((x, y) => x[0] - y[0])
  const out: [Vec, Vec][] = []
  let cur = 0
  for (const [lo, hi] of covered) {
    if (lo > cur + 1) out.push([add(p, mul(d, cur)), add(p, mul(d, lo))])
    cur = Math.max(cur, hi)
  }
  if (cur < L - 1) out.push([add(p, mul(d, cur)), q])
  return out
}

export function formatLength(cm: number) {
  return `${(cm / 100).toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`
}

export function formatArea(cm2: number) {
  return `${(cm2 / 10000).toLocaleString("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²`
}

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`
