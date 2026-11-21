import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { PointerEvent as RPointerEvent, ReactNode } from "react"

import { OPENING_DEFAULTS, makeItem, makeOpening, reclassifyWalls, snapItemToWall, wallsForRoom } from "../model/build"
import { CATALOG_BY_ID, FLOORS, catalogItem, runSystem } from "../model/catalog"
import {
  add,
  bounds,
  dist,
  eq,
  formatArea,
  formatLength,
  mul,
  norm,
  perp,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  projectOnSegment,
  rectCorners,
  round,
  snapAngle,
  sub,
  uid,
  wallAngle,
  wallJoints,
  wallLength,
  wallSolidSpans,
} from "../model/geometry"
import type { Item, Opening, Project, Room, Run, Selection, Vec, Wall } from "../model/types"
import { isSelected, useCursor, useStore } from "../store/store"
import { ItemSymbol } from "./symbols"

type ViewT = { x: number; y: number; s: number }

type Draft =
  | { type: "wall"; points: Vec[] }
  | { type: "room"; a: Vec; b: Vec }
  | { type: "roompoly"; points: Vec[] }
  | { type: "run"; points: Vec[] }
  | { type: "measure"; a: Vec }
  | { type: "marquee"; a: Vec; b: Vec; additive: boolean }
  | { type: "calib"; a: Vec; b?: Vec }

type Drag =
  | { type: "pan"; sx: number; sy: number; view: ViewT }
  | { type: "move"; start: Vec; project: Project; ids: Set<string>; moved: boolean }
  | { type: "wall-end"; wallId: string; end: "a" | "b"; linked: { id: string; end: "a" | "b" }[]; project: Project }
  | { type: "room-vertex"; roomId: string; index: number }
  | { type: "run-vertex"; runId: string; index: number }
  | { type: "rotate"; itemId: string }
  | { type: "opening"; openingId: string }
  | { type: "room-rect" }
  | { type: "marquee" }
  | { type: "underlay"; start: Vec; x: number; y: number }

/** Lets the app-level key handler give drafting keys (Enter, Esc, digits) to the plan first. */
export const planKeys: { handle: ((e: KeyboardEvent) => boolean) | null } = { handle: null }

const HINTS: Record<string, string> = {
  select: "Klikk for å velge, dra for å flytte. Shift legger til i utvalget. Dra i tomt område for å velge flere.",
  pan: "Dra for å flytte visningen. Rull for å zoome.",
  wall: "Klikk for hvert hjørne. Skriv lengden i cm og trykk Enter for nøyaktig mål. Dobbeltklikk eller Esc avslutter.",
  room: "Dra et rektangel, eller klikk punkt for punkt for et rom med flere hjørner. Veggene kommer automatisk.",
  opening: "Pek på en vegg og klikk for å sette inn. Etterpå kan du dra den langs veggen.",
  item: "Klikk for å plassere, eller dra fra biblioteket. Q roterer 90°, Shift+Q 15°. Veggpunkter fester seg til nærmeste vegg.",
  run: "Klikk for hvert knekkpunkt. Rørene låses til 45°. Dobbeltklikk eller Enter avslutter.",
  measure: "Klikk på to punkter for å lage et mål.",
  calibrate: "Klikk på to punkter på tegningen med kjent avstand, for eksempel endene av en yttervegg. Skriv så den virkelige lengden.",
}

export function Plan2D() {
  const project = useStore((s) => s.project)
  const levelId = useStore((s) => s.levelId)
  const selection = useStore((s) => s.selection)
  const tool = useStore((s) => s.tool)
  const layers = useStore((s) => s.layers)
  const settings = useStore((s) => s.settings)
  const fitToken = useStore((s) => s.fitToken)
  const setCursor = useCursor((s) => s.set)

  const svgRef = useRef<SVGSVGElement>(null)
  const viewMode = useStore((s) => s.view)
  /** True once the user pans or zooms; until then the plan keeps fitting its container. */
  const userMoved = useRef(false)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState<ViewT>({ x: 80, y: 80, s: 0.6 })
  const viewRef = useRef(view)
  viewRef.current = view
  const [cursor, setLocalCursor] = useState<Vec | null>(null)
  const [snapHint, setSnapHint] = useState<"endpoint" | "wall" | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const [lengthInput, setLengthInput] = useState("")
  const lengthInputRef = useRef(lengthInput)
  lengthInputRef.current = lengthInput
  const cursorRef = useRef<Vec | null>(null)
  cursorRef.current = cursor
  const [ghostRotation, setGhostRotation] = useState(0)
  const drag = useRef<Drag | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d: number; view: ViewT; mid: { x: number; y: number } } | null>(null)
  const spaceDown = useRef(false)
  const shiftDown = useRef(false)

  const level = project.levels.find((l) => l.id === levelId) ?? project.levels[0]
  const levelIdx = project.levels.indexOf(level)
  const below = levelIdx > 0 ? project.levels[levelIdx - 1] : null

  const walls = useMemo(() => project.walls.filter((w) => w.level === level.id), [project.walls, level.id])
  const rooms = useMemo(() => project.rooms.filter((r) => r.level === level.id), [project.rooms, level.id])
  const items = useMemo(() => project.items.filter((i) => i.level === level.id), [project.items, level.id])
  const runs = useMemo(() => project.runs.filter((r) => r.level === level.id), [project.runs, level.id])
  const dims = useMemo(() => project.dimensions.filter((d) => d.level === level.id), [project.dimensions, level.id])
  const underlay = project.underlays?.[level.id]

  // ---------- view fitting ----------
  useLayoutEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height })
      if (!userMoved.current) requestAnimationFrame(() => fitRef.current())
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fitView = useCallback(() => {
    userMoved.current = false
    const st = useStore.getState()
    const lv = st.levelId
    const pts = [
      ...st.project.walls.filter((w) => w.level === lv).flatMap((w) => [w.a, w.b]),
      ...st.project.rooms.filter((r) => r.level === lv).flatMap((r) => r.points),
    ]
    const el = svgRef.current
    if (!el) return
    const W = el.clientWidth || 800
    const H = el.clientHeight || 600
    if (!pts.length) {
      setView({ x: W / 2 - 500 * 0.5, y: H / 2 - 400 * 0.5, s: 0.5 })
      return
    }
    const b = bounds(pts)
    const pad = Math.min(140, Math.max(48, W * 0.08))
    const s = Math.min((W - pad * 2) / Math.max(b.w, 100), (H - pad * 2) / Math.max(b.h, 100), 3)
    setView({ s, x: W / 2 - (b.minX + b.w / 2) * s, y: H / 2 - (b.minY + b.h / 2) * s })
  }, [])

  const fitRef = useRef(fitView)
  fitRef.current = fitView
  useEffect(() => {
    const id = requestAnimationFrame(fitView)
    return () => cancelAnimationFrame(id)
  }, [fitToken, levelId, viewMode, fitView])

  // ---------- coordinate helpers ----------
  const toWorld = useCallback((clientX: number, clientY: number): Vec => {
    const r = svgRef.current!.getBoundingClientRect()
    const v = viewRef.current
    return { x: (clientX - r.left - v.x) / v.s, y: (clientY - r.top - v.y) / v.s }
  }, [])

  const snap = useCallback(
    (p: Vec, opts: { from?: Vec; angleStep?: number; targets?: Vec[]; onWalls?: boolean } = {}): { p: Vec; hint: "endpoint" | "wall" | null } => {
      if (shiftDown.current) return { p, hint: null }
      const s = viewRef.current.s
      const st = useStore.getState()
      const lv = st.levelId
      const tol = 12 / s
      const candidates: Vec[] = [
        ...st.project.walls.filter((w) => w.level === lv).flatMap((w) => [w.a, w.b]),
        ...st.project.rooms.filter((r) => r.level === lv).flatMap((r) => r.points),
        ...(opts.targets ?? []),
      ]
      let best: Vec | null = null
      let bd = tol
      for (const c of candidates) {
        const d = dist(c, p)
        if (d < bd) {
          bd = d
          best = c
        }
      }
      if (best) return { p: { ...best }, hint: "endpoint" }
      const grid = st.settings.snapGrid
      if (opts.from && st.settings.angleSnap) {
        const a = snapAngle(opts.from, p, opts.angleStep ?? 15)
        const d = sub(a, opts.from)
        const l = Math.hypot(d.x, d.y)
        const lr = round(l, grid)
        const q = l > 0 ? add(opts.from, mul(d, lr / l)) : a
        return { p: q, hint: null }
      }
      if (opts.onWalls) {
        for (const w of st.project.walls.filter((x) => x.level === lv)) {
          const r = projectOnSegment(p, w.a, w.b)
          if (r.distance < 8 / s) return { p: r.point, hint: "wall" }
        }
      }
      return { p: { x: round(p.x, grid), y: round(p.y, grid) }, hint: null }
    },
    [],
  )

  // ---------- commits ----------
  const update = useStore((s) => s.update)
  const setSelection = useStore((s) => s.setSelection)

  const commitWall = useCallback(
    (a: Vec, b: Vec) => {
      if (dist(a, b) < 5) return
      const st = useStore.getState()
      const lvl = st.project.levels.find((l) => l.id === st.levelId)!
      const w: Wall = { id: uid("w"), level: lvl.id, a, b, thickness: st.settings.wallThickness, height: lvl.height, exterior: st.settings.wallThickness >= 20 }
      update((p) => ({ ...p, walls: [...p.walls, w] }))
    },
    [update],
  )

  const commitRoom = useCallback(
    (points: Vec[]) => {
      if (points.length < 3 || polygonArea(points) < 2500) return
      const st = useStore.getState()
      const lvl = st.project.levels.find((l) => l.id === st.levelId)!
      const n = st.project.rooms.filter((r) => r.level === lvl.id).length + 1
      const room: Room = { id: uid("r"), level: lvl.id, name: `Rom ${n}`, type: "annet", points, floor: "eik", wallColor: "#f4f2ee", underfloorHeating: false }
      update((p) => {
        const allRooms = [...p.rooms, room]
        const newWalls = wallsForRoom(room, p.walls, allRooms, lvl.height)
        return { ...p, rooms: allRooms, walls: reclassifyWalls([...p.walls, ...newWalls], allRooms, lvl.id) }
      })
      setSelection([{ kind: "room", id: room.id }])
    },
    [update, setSelection],
  )

  const commitRun = useCallback(
    (points: Vec[]) => {
      const clean = points.filter((p, i) => i === 0 || !eq(p, points[i - 1], 1))
      if (clean.length < 2) return
      const st = useStore.getState()
      if (st.tool.type !== "run") return
      const sys = runSystem(st.tool.system)
      const run: Run = { id: uid("p"), level: st.levelId, system: sys.id, points: clean, elevation: sys.elevation, diameter: sys.diameter }
      update((p) => ({ ...p, runs: [...p.runs, run] }))
    },
    [update],
  )

  const finishDraft = useCallback(() => {
    const d = draftRef.current
    if (!d) return
    if (d.type === "run") commitRun(d.points)
    if (d.type === "roompoly") commitRoom(d.points)
    setDraft(null)
    setLengthInput("")
  }, [commitRun, commitRoom])

  // Cancel drafts when the tool changes.
  useEffect(() => {
    setDraft(null)
    setLengthInput("")
    setGhostRotation(0)
  }, [tool])

  // ---------- keyboard ----------
  useEffect(() => {
    planKeys.handle = (e: KeyboardEvent) => {
      const d = draftRef.current
      const t = useStore.getState().tool
      if (e.key === "Shift") shiftDown.current = true
      if (e.key === " ") {
        spaceDown.current = true
        return false
      }
      if (d && (d.type === "wall" || d.type === "run")) {
        if (/^[0-9]$/.test(e.key) || ((e.key === "," || e.key === ".") && !lengthInputRef.current.includes(","))) {
          setLengthInput((s) => s + (e.key === "." ? "," : e.key))
          return true
        }
        if (e.key === "Backspace") {
          if (lengthInputRef.current) setLengthInput((s) => s.slice(0, -1))
          else if (d.points.length > 1) setDraft({ ...d, points: d.points.slice(0, -1) })
          return true
        }
        if (e.key === "Enter") {
          const val = parseFloat(lengthInputRef.current.replace(",", "."))
          const c = cursorRef.current
          const last = d.points[d.points.length - 1]
          if (val > 0 && c) {
            const dir = norm(sub(c, last))
            const next = add(last, mul(dir.x || dir.y ? dir : { x: 1, y: 0 }, val))
            if (d.type === "wall") commitWall(last, next)
            setDraft({ ...d, points: [...d.points, next] })
            setLengthInput("")
          } else finishDraft()
          return true
        }
      }
      if (d && e.key === "Enter") {
        finishDraft()
        return true
      }
      if (e.key === "Escape") {
        if (d) {
          if (d.type === "run" || d.type === "roompoly") finishDraft()
          else setDraft(null)
          setLengthInput("")
          return true
        }
        return false
      }
      if ((e.key === "q" || e.key === "Q") && t.type === "item" && !e.ctrlKey && !e.metaKey) {
        setGhostRotation((r) => (r + (e.shiftKey ? 15 : 90)) % 360)
        return true
      }
      return false
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") spaceDown.current = false
      if (e.key === "Shift") shiftDown.current = false
    }
    window.addEventListener("keyup", up)
    return () => {
      planKeys.handle = null
      window.removeEventListener("keyup", up)
    }
  }, [commitWall, finishDraft])

  // ---------- wheel zoom ----------
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      userMoved.current = true
      const r = el.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      const v = viewRef.current
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5 && e.deltaMode === 0 && Math.abs(e.deltaY) < 40) {
        // trackpad two-finger scroll pans
        setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY })
        return
      }
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))
      const s = Math.min(8, Math.max(0.05, v.s * factor))
      const wx = (mx - v.x) / v.s
      const wy = (my - v.y) / v.s
      setView({ s, x: mx - wx * s, y: my - wy * s })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  // ---------- ghosts ----------
  const itemGhost = useMemo(() => {
    if (tool.type !== "item" || !cursor) return null
    const c = catalogItem(tool.catalogId)
    if (c.mount === "wall") {
      const s = snapItemToWall(cursor, c.id, walls)
      if (s) return { ...s, onWall: true }
    }
    return { x: cursor.x, y: cursor.y, rotation: ghostRotation, onWall: false }
  }, [tool, cursor, walls, ghostRotation])

  const openingGhost = useMemo(() => {
    if (tool.type !== "opening" || !cursor) return null
    return makeOpening(walls, cursor, tool.kind)
  }, [tool, cursor, walls])

  // ---------- pointer handlers ----------
  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!
    svg.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    shiftDown.current = e.shiftKey
    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), view: viewRef.current, mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } }
      drag.current = null
      setDraft((d) => (d?.type === "marquee" || d?.type === "room" ? null : d))
      return
    }
    const st = useStore.getState()
    const t = st.tool
    if (e.button === 1 || e.button === 2 || t.type === "pan" || spaceDown.current) {
      drag.current = { type: "pan", sx: e.clientX, sy: e.clientY, view: viewRef.current }
      return
    }
    if (e.button !== 0) return
    const raw = toWorld(e.clientX, e.clientY)
    const target = (e.target as Element).closest("[data-kind]") as SVGElement | null

    switch (t.type) {
      case "select": {
        const handle = (e.target as Element).closest("[data-handle]") as SVGElement | null
        if (handle) {
          const [kind, id, extra] = (handle.dataset.handle ?? "").split(":")
          st.checkpoint()
          if (kind === "wall-a" || kind === "wall-b") {
            const w = st.project.walls.find((x) => x.id === id)!
            const end = kind === "wall-a" ? "a" : "b"
            const pt = w[end]
            const linked = st.project.walls
              .filter((o) => o.id !== id && o.level === w.level)
              .flatMap((o) => [eq(o.a, pt, 1) ? { id: o.id, end: "a" as const } : null, eq(o.b, pt, 1) ? { id: o.id, end: "b" as const } : null])
              .filter((x): x is { id: string; end: "a" | "b" } => !!x)
            drag.current = { type: "wall-end", wallId: id, end, linked, project: st.project }
          } else if (kind === "room-v") drag.current = { type: "room-vertex", roomId: id, index: Number(extra) }
          else if (kind === "run-v") drag.current = { type: "run-vertex", runId: id, index: Number(extra) }
          else if (kind === "rotate") drag.current = { type: "rotate", itemId: id }
          return
        }
        if (target) {
          const kind = target.dataset.kind as Selection["kind"]
          const id = target.dataset.id!
          let sel = st.selection
          if (e.shiftKey) sel = isSelected(sel, id) ? sel.filter((s) => s.id !== id) : [...sel, { kind, id }]
          else if (!isSelected(sel, id)) sel = [{ kind, id }]
          setSelection(sel)
          st.checkpoint()
          if (kind === "opening" && sel.length === 1) {
            drag.current = { type: "opening", openingId: id }
            return
          }
          drag.current = { type: "move", start: raw, project: st.project, ids: new Set(sel.map((s) => s.id)), moved: false }
          return
        }
        const und = st.project.underlays?.[st.levelId]
        if ((e.target as Element).closest("[data-underlay]") && und && !und.locked) {
          st.checkpoint()
          drag.current = { type: "underlay", start: raw, x: und.x, y: und.y }
          return
        }
        if (!e.shiftKey) setSelection([])
        drag.current = { type: "marquee" }
        setDraft({ type: "marquee", a: raw, b: raw, additive: e.shiftKey })
        return
      }
      case "wall": {
        const d = draftRef.current
        const from = d?.type === "wall" ? d.points[d.points.length - 1] : undefined
        const { p } = snap(raw, { from, onWalls: true })
        if (d?.type === "wall" && from) {
          if (eq(p, from, 2)) {
            setDraft(null)
            return
          }
          commitWall(from, p)
          if (eq(p, d.points[0], 2) && d.points.length > 1) {
            setDraft(null)
            return
          }
          setDraft({ type: "wall", points: [...d.points, p] })
        } else setDraft({ type: "wall", points: [p] })
        setLengthInput("")
        return
      }
      case "room": {
        const d = draftRef.current
        if (d?.type === "roompoly") {
          const from = d.points[d.points.length - 1]
          const { p } = snap(raw, { from, angleStep: 15 })
          if (d.points.length >= 3 && dist(p, d.points[0]) < 14 / viewRef.current.s) {
            commitRoom(d.points)
            setDraft(null)
            return
          }
          setDraft({ type: "roompoly", points: [...d.points, p] })
          return
        }
        const { p } = snap(raw)
        drag.current = { type: "room-rect" }
        setDraft({ type: "room", a: p, b: p })
        return
      }
      case "opening": {
        const o = makeOpening(walls, raw, t.kind)
        if (o) {
          update((p) => ({ ...p, openings: [...p.openings, o] }))
          setSelection([{ kind: "opening", id: o.id }])
        }
        return
      }
      case "item": {
        const c = catalogItem(t.catalogId)
        let pose = { x: round(raw.x, st.settings.snapGrid), y: round(raw.y, st.settings.snapGrid), rotation: ghostRotation }
        if (c.mount === "wall") {
          const s = snapItemToWall(raw, c.id, walls)
          if (s) pose = s
        }
        const it = makeItem(st.levelId, c.id, pose.x, pose.y, pose.rotation)
        update((p) => ({ ...p, items: [...p.items, it] }))
        setSelection([{ kind: "item", id: it.id }])
        return
      }
      case "run": {
        const d = draftRef.current
        const from = d?.type === "run" ? d.points[d.points.length - 1] : undefined
        const targets = [...items.filter((i) => catalogItem(i.catalogId).layer !== "interior").map((i) => ({ x: i.x, y: i.y })), ...runs.flatMap((r) => r.points)]
        const { p } = snap(raw, { from, angleStep: 45, targets })
        if (d?.type === "run") {
          if (from && eq(p, from, 2)) {
            finishDraft()
            return
          }
          setDraft({ type: "run", points: [...d.points, p] })
        } else setDraft({ type: "run", points: [p] })
        setLengthInput("")
        return
      }
      case "calibrate": {
        const d = draftRef.current
        const p = shiftDown.current ? raw : snapAngle(d?.type === "calib" && !d.b ? d.a : raw, raw, 15)
        if (d?.type === "calib" && !d.b) {
          if (dist(d.a, p) * viewRef.current.s > 8) setDraft({ ...d, b: p })
        } else setDraft({ type: "calib", a: raw })
        return
      }
      case "measure": {
        const d = draftRef.current
        const { p } = snap(raw, { from: d?.type === "measure" ? d.a : undefined })
        if (d?.type === "measure") {
          if (dist(d.a, p) > 1) update((pr) => ({ ...pr, dimensions: [...pr.dimensions, { id: uid("d"), level: st.levelId, a: d.a, b: p }] }))
          setDraft(null)
        } else setDraft({ type: "measure", a: p })
        return
      }
    }
  }

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    shiftDown.current = e.shiftKey
    if (pinch.current && pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()]
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y)
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
      const pv = pinch.current.view
      userMoved.current = true
      const s = Math.min(8, Math.max(0.05, (pv.s * d) / pinch.current.d))
      const r = svgRef.current!.getBoundingClientRect()
      const wx = (pinch.current.mid.x - r.left - pv.x) / pv.s
      const wy = (pinch.current.mid.y - r.top - pv.y) / pv.s
      setView({ s, x: mid.x - r.left - wx * s, y: mid.y - r.top - wy * s })
      return
    }
    const raw = toWorld(e.clientX, e.clientY)
    const st = useStore.getState()
    const t = st.tool
    const d = draftRef.current
    // cursor (snapped for drawing tools)
    let c = raw
    let hint: "endpoint" | "wall" | null = null
    if (t.type === "wall") {
      const r = snap(raw, { from: d?.type === "wall" ? d.points[d.points.length - 1] : undefined, onWalls: true })
      c = r.p
      hint = r.hint
    } else if (t.type === "room") {
      const r = snap(raw, { from: d?.type === "roompoly" ? d.points[d.points.length - 1] : undefined, angleStep: 15 })
      c = r.p
      hint = r.hint
    } else if (t.type === "run") {
      const targets = [...items.filter((i) => catalogItem(i.catalogId).layer !== "interior").map((i) => ({ x: i.x, y: i.y })), ...runs.flatMap((r) => r.points)]
      const r = snap(raw, { from: d?.type === "run" ? d.points[d.points.length - 1] : undefined, angleStep: 45, targets })
      c = r.p
      hint = r.hint
    } else if (t.type === "measure") {
      const r = snap(raw, { from: d?.type === "measure" ? d.a : undefined })
      c = r.p
      hint = r.hint
    } else if (t.type === "item") {
      c = { x: round(raw.x, st.settings.snapGrid), y: round(raw.y, st.settings.snapGrid) }
    } else if (t.type === "calibrate" && d?.type === "calib" && !d.b && !e.shiftKey) {
      c = snapAngle(d.a, raw, 15)
    }
    setLocalCursor(c)
    setSnapHint(hint)
    setCursor(c)

    const g = drag.current
    if (!g) return
    if (g.type === "pan") {
      userMoved.current = true
      setView({ ...g.view, x: g.view.x + e.clientX - g.sx, y: g.view.y + e.clientY - g.sy })
      return
    }
    if (g.type === "room-rect" && d?.type === "room") {
      setDraft({ ...d, b: snap(raw).p })
      return
    }
    if (g.type === "marquee" && d?.type === "marquee") {
      setDraft({ ...d, b: raw })
      return
    }
    if (g.type === "move") {
      const grid = st.settings.snapGrid
      let delta = sub(raw, g.start)
      if (!e.shiftKey) delta = { x: round(delta.x, grid), y: round(delta.y, grid) }
      if (!g.moved && Math.hypot(delta.x, delta.y) * viewRef.current.s < 3) return
      g.moved = true
      const base = g.project
      const mv = (p: Vec) => add(p, delta)
      // wall endpoints shared with walls outside the selection follow along
      const movedWalls = base.walls.filter((w) => g.ids.has(w.id))
      const followers = (pt: Vec) => movedWalls.some((w) => eq(w.a, pt, 1) || eq(w.b, pt, 1))
      const singleWallItem =
        g.ids.size === 1 ? base.items.find((i) => g.ids.has(i.id) && catalogItem(i.catalogId).mount === "wall") : undefined
      update(
        () => ({
          ...base,
          walls: base.walls.map((w) =>
            g.ids.has(w.id)
              ? { ...w, a: mv(w.a), b: mv(w.b) }
              : movedWalls.length && w.level === level.id
                ? { ...w, a: followers(w.a) ? mv(w.a) : w.a, b: followers(w.b) ? mv(w.b) : w.b }
                : w,
          ),
          rooms: base.rooms.map((r) => (g.ids.has(r.id) ? { ...r, points: r.points.map(mv) } : r)),
          items: base.items.map((i) => {
            if (!g.ids.has(i.id)) return i
            if (singleWallItem && i.id === singleWallItem.id) {
              const s = snapItemToWall(mv(i), i.catalogId, walls, i.d)
              if (s) return { ...i, ...s }
            }
            return { ...i, ...mv(i) }
          }),
          runs: base.runs.map((r) => (g.ids.has(r.id) ? { ...r, points: r.points.map(mv) } : r)),
          dimensions: base.dimensions.map((dm) => (g.ids.has(dm.id) ? { ...dm, a: mv(dm.a), b: mv(dm.b) } : dm)),
        }),
        false,
      )
      return
    }
    if (g.type === "underlay") {
      const lv = st.levelId
      const und = st.project.underlays?.[lv]
      if (!und) return
      const x = g.x + raw.x - g.start.x
      const y = g.y + raw.y - g.start.y
      update((p) => ({ ...p, underlays: { ...p.underlays, [lv]: { ...und, x, y } } }), false)
      return
    }
    if (g.type === "opening") {
      const o = st.project.openings.find((x) => x.id === g.openingId)
      const w = o && st.project.walls.find((x) => x.id === o.wallId)
      if (!o || !w) return
      const L = wallLength(w)
      const r = projectOnSegment(raw, w.a, w.b)
      const offset = Math.max(o.width / 2, Math.min(L - o.width / 2, e.shiftKey ? r.t * L : round(r.t * L, st.settings.snapGrid)))
      update((p) => ({ ...p, openings: p.openings.map((x) => (x.id === o.id ? { ...x, offset } : x)) }), false)
      return
    }
    if (g.type === "wall-end") {
      const w = g.project.walls.find((x) => x.id === g.wallId)!
      const other = g.end === "a" ? w.b : w.a
      const excluded = new Set([g.wallId, ...g.linked.map((l) => l.id)])
      const st2 = useStore.getState()
      const targets = st2.project.walls.filter((x) => x.level === w.level && !excluded.has(x.id)).flatMap((x) => [x.a, x.b])
      let p = raw
      if (!e.shiftKey) {
        let best: Vec | null = null
        let bd = 12 / viewRef.current.s
        for (const tp of targets) {
          const dd = dist(tp, raw)
          if (dd < bd) {
            bd = dd
            best = tp
          }
        }
        p = best ?? snap(raw, { from: other }).p
      }
      update(
        () => ({
          ...g.project,
          walls: g.project.walls.map((x) => {
            if (x.id === g.wallId) return { ...x, [g.end]: p }
            const l = g.linked.filter((k) => k.id === x.id)
            if (!l.length) return x
            let n = x
            for (const k of l) n = { ...n, [k.end]: p }
            return n
          }),
        }),
        false,
      )
      return
    }
    if (g.type === "room-vertex") {
      const p = snap(raw).p
      update((pr) => ({ ...pr, rooms: pr.rooms.map((r) => (r.id === g.roomId ? { ...r, points: r.points.map((q, i) => (i === g.index ? p : q)) } : r)) }), false)
      return
    }
    if (g.type === "run-vertex") {
      const run = st.project.runs.find((r) => r.id === g.runId)!
      const prev = run.points[g.index - 1] ?? run.points[g.index + 1]
      const p = snap(raw, { from: prev, angleStep: 45 }).p
      update((pr) => ({ ...pr, runs: pr.runs.map((r) => (r.id === g.runId ? { ...r, points: r.points.map((q, i) => (i === g.index ? p : q)) } : r)) }), false)
      return
    }
    if (g.type === "rotate") {
      const it = st.project.items.find((i) => i.id === g.itemId)!
      let a = (Math.atan2(raw.y - it.y, raw.x - it.x) * 180) / Math.PI - 90
      if (!e.shiftKey) a = round(a, 15)
      a = ((a % 360) + 360) % 360
      update((pr) => ({ ...pr, items: pr.items.map((i) => (i.id === g.itemId ? { ...i, rotation: a } : i)) }), false)
    }
  }

  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const g = drag.current
    drag.current = null
    const d = draftRef.current
    if (g?.type === "room-rect" && d?.type === "room") {
      const b = bounds([d.a, d.b])
      if (b.w >= 50 && b.h >= 50) {
        commitRoom([
          { x: b.minX, y: b.minY },
          { x: b.maxX, y: b.minY },
          { x: b.maxX, y: b.maxY },
          { x: b.minX, y: b.maxY },
        ])
        setDraft(null)
      } else {
        // a click without dragging starts a polygon room
        setDraft({ type: "roompoly", points: [d.a] })
      }
    }
    if (g?.type === "marquee" && d?.type === "marquee") {
      const b = bounds([d.a, d.b])
      if (b.w * viewRef.current.s > 4 || b.h * viewRef.current.s > 4) {
        const inside = (p: Vec) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY
        const lay = useStore.getState().layers
        const sel: Selection[] = [
          ...(lay.konstruksjon ? walls.filter((w) => inside(w.a) && inside(w.b)).map((w) => ({ kind: "wall" as const, id: w.id })) : []),
          ...items.filter((i) => inside(i) && layerVisible(i, lay)).map((i) => ({ kind: "item" as const, id: i.id })),
          ...runs.filter((r) => r.points.every(inside)).map((r) => ({ kind: "run" as const, id: r.id })),
        ]
        setSelection(d.additive ? [...useStore.getState().selection, ...sel] : sel)
      }
      setDraft(null)
    }
    if (g?.type === "move" && !g.moved) {
      // a click without moving: drop the checkpoint we took
      const st = useStore.getState()
      useStore.setState({ past: st.past.slice(0, -1) })
    }
  }

  const onDoubleClick = () => {
    const d = draftRef.current
    if (d?.type === "wall") setDraft(null)
    else if (d?.type === "run" || d?.type === "roompoly") finishDraft()
  }

  // ---------- render ----------
  const s = view.s
  const px = (n: number) => n / s
  const selectedIds = new Set(selection.map((x) => x.id))
  const showEl = layers.elektro
  const minor = s > 1.2 ? 10 : s > 0.35 ? 50 : 100
  const major = s > 0.12 ? 100 : 500

  const roomLabels: ReactNode[] = []

  return (
    <div
      className="plan-wrap"
      data-tool={tool.type}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-tuft-item")) e.preventDefault()
      }}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("application/x-tuft-item")
        if (!id || !CATALOG_BY_ID[id]) return
        e.preventDefault()
        const raw = toWorld(e.clientX, e.clientY)
        const st = useStore.getState()
        let pose = { x: round(raw.x, st.settings.snapGrid), y: round(raw.y, st.settings.snapGrid), rotation: 0 }
        if (CATALOG_BY_ID[id].mount === "wall") {
          const sn = snapItemToWall(raw, id, walls)
          if (sn) pose = sn
        }
        const it = makeItem(st.levelId, id, pose.x, pose.y, pose.rotation)
        update((p) => ({ ...p, items: [...p.items, it] }))
        st.setTool({ type: "select" })
        setSelection([{ kind: "item", id: it.id }])
      }}
    >
      <svg
        ref={svgRef}
        className="plan"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          setLocalCursor(null)
          setCursor(null)
        }}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        role="application"
        aria-label="Plantegning"
      >
        <defs>
          <pattern id="grid-minor" width={minor} height={minor} patternUnits="userSpaceOnUse">
            <path d={`M ${minor} 0 L 0 0 0 ${minor}`} fill="none" className="grid-minor" strokeWidth={px(1)} />
          </pattern>
          <pattern id="grid-major" width={major} height={major} patternUnits="userSpaceOnUse">
            <rect width={major} height={major} fill="url(#grid-minor)" />
            <path d={`M ${major} 0 L 0 0 0 ${major}`} fill="none" className="grid-major" strokeWidth={px(1)} />
          </pattern>
          <pattern id="hatch" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={8} className="hatch-line" strokeWidth={2} />
          </pattern>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${s})`}>
          <rect x={-100000} y={-100000} width={200000} height={200000} fill="url(#grid-major)" />
          {underlay?.visible && (
            <image
              href={underlay.src}
              x={underlay.x}
              y={underlay.y}
              width={underlay.width}
              height={underlay.height}
              opacity={underlay.opacity}
              preserveAspectRatio="none"
              className={`underlay-img ${!underlay.locked && tool.type === "select" ? "is-movable" : ""}`}
              data-underlay={underlay.locked ? undefined : "1"}
            />
          )}

          {/* level below, as a faint reference */}
          {below &&
            project.walls
              .filter((w) => w.level === below.id)
              .map((w) => <line key={w.id} x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y} className="below-wall" strokeWidth={px(Math.max(2, w.thickness * s * 0.6))} />)}

          {/* rooms */}
          {rooms.map((r) => {
            const sel = selectedIds.has(r.id)
            const floor = FLOORS.find((f) => f.id === r.floor)
            const c = polygonCentroid(r.points)
            roomLabels.push(
              <g key={r.id} transform={`translate(${c.x} ${c.y})`} className="room-label">
                <text y={px(-4)} fontSize={px(13)} textAnchor="middle" className="room-name">
                  {r.name}
                </text>
                <text y={px(12)} fontSize={px(11)} textAnchor="middle" className="room-area">
                  {formatArea(polygonArea(r.points))}
                </text>
              </g>,
            )
            return (
              <g key={r.id}>
                <polygon
                  points={r.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  className={`room ${sel ? "is-selected" : ""}`}
                  style={{ ["--floor" as string]: floor?.color }}
                  data-kind="room"
                  data-id={r.id}
                />
                {r.underfloorHeating && layers.elektro && <polygon points={r.points.map((p) => `${p.x},${p.y}`).join(" ")} className="heating" />}
              </g>
            )
          })}

          {/* interior items */}
          {layers.interior &&
            [...items]
              .filter((i) => catalogItem(i.catalogId).layer === "interior")
              .sort((a, b) => (catalogItem(a.catalogId).model === "rug" ? -1 : 0) - (catalogItem(b.catalogId).model === "rug" ? -1 : 0))
              .map((i) => <ItemNode key={i.id} item={i} selected={selectedIds.has(i.id)} />)}

          {/* drains under the floor */}
          {layers.avlop && runs.filter((r) => r.system === "avlop").map((r) => <RunNode key={r.id} run={r} selected={selectedIds.has(r.id)} s={s} />)}

          {/* walls */}
          {layers.konstruksjon &&
            walls.map((w) => (
              <WallNode key={w.id} wall={w} walls={walls} openings={project.openings} selected={selectedIds.has(w.id)} selectedIds={selectedIds} />
            ))}
          {!layers.konstruksjon &&
            walls.map((w) => <line key={w.id} x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y} className="below-wall" strokeWidth={px(2)} />)}

          {/* runs */}
          {runs
            .filter((r) => r.system !== "avlop" && ((r.system === "el" || r.system === "data") ? showEl : layers.vann))
            .map((r) => (
              <RunNode key={r.id} run={r} selected={selectedIds.has(r.id)} s={s} />
            ))}

          {/* technical items */}
          {items
            .filter((i) => {
              const c = catalogItem(i.catalogId)
              return c.layer === "elektro" ? showEl : c.layer === "vvs" ? layers.vann || layers.avlop : false
            })
            .map((i) => (
              <ItemNode key={i.id} item={i} selected={selectedIds.has(i.id)} />
            ))}

          {/* labels and dimensions */}
          {roomLabels}
          {layers.mal && settings.showDimensions && <WallDimensions walls={walls} rooms={rooms} s={s} />}
          {layers.mal &&
            dims.map((d) => (
              <g key={d.id} data-kind="dimension" data-id={d.id} className={selectedIds.has(d.id) ? "is-selected" : ""}>
                <DimLine a={d.a} b={d.b} s={s} offset={0} />
              </g>
            ))}

          {/* selection handles */}
          <SelectionOverlay project={project} selection={selection} s={s} />

          {/* drafts and ghosts */}
          {draft?.type === "wall" && cursor && (
            <g className="draft">
              {draft.points.length > 0 && (
                <>
                  <line
                    x1={draft.points[draft.points.length - 1].x}
                    y1={draft.points[draft.points.length - 1].y}
                    x2={cursor.x}
                    y2={cursor.y}
                    className="draft-wall"
                    strokeWidth={Math.max(px(2), settings.wallThickness)}
                  />
                  <DimLine a={draft.points[draft.points.length - 1]} b={cursor} s={s} offset={px(-22)} live />
                </>
              )}
            </g>
          )}
          {draft?.type === "room" && (
            <g className="draft">
              <rect
                x={Math.min(draft.a.x, draft.b.x)}
                y={Math.min(draft.a.y, draft.b.y)}
                width={Math.abs(draft.b.x - draft.a.x)}
                height={Math.abs(draft.b.y - draft.a.y)}
                className="draft-room"
              />
              <DimLine a={{ x: Math.min(draft.a.x, draft.b.x), y: Math.min(draft.a.y, draft.b.y) }} b={{ x: Math.max(draft.a.x, draft.b.x), y: Math.min(draft.a.y, draft.b.y) }} s={s} offset={px(-18)} live />
              <DimLine a={{ x: Math.max(draft.a.x, draft.b.x), y: Math.min(draft.a.y, draft.b.y) }} b={{ x: Math.max(draft.a.x, draft.b.x), y: Math.max(draft.a.y, draft.b.y) }} s={s} offset={px(-18)} live />
            </g>
          )}
          {draft?.type === "roompoly" && (
            <g className="draft">
              <polyline points={[...draft.points, ...(cursor ? [cursor] : [])].map((p) => `${p.x},${p.y}`).join(" ")} className="draft-room" />
              {draft.points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={px(i === 0 ? 6 : 3.5)} className="draft-dot" />
              ))}
              {cursor && <DimLine a={draft.points[draft.points.length - 1]} b={cursor} s={s} offset={px(-18)} live />}
            </g>
          )}
          {draft?.type === "run" && (
            <g className="draft">
              <polyline
                points={[...draft.points, ...(cursor ? [cursor] : [])].map((p) => `${p.x},${p.y}`).join(" ")}
                className="draft-run"
                style={{ stroke: tool.type === "run" ? runSystem(tool.system).color : undefined }}
              />
              {cursor && <DimLine a={draft.points[draft.points.length - 1]} b={cursor} s={s} offset={px(-16)} live />}
            </g>
          )}
          {draft?.type === "measure" && cursor && (
            <g className="draft">
              <DimLine a={draft.a} b={cursor} s={s} offset={0} live />
            </g>
          )}
          {draft?.type === "calib" && (
            <g className="draft calib">
              <DimLine a={draft.a} b={draft.b ?? cursor ?? draft.a} s={s} offset={0} live />
              {[draft.a, draft.b ?? cursor].filter(Boolean).map((p, i) => (
                <circle key={i} cx={p!.x} cy={p!.y} r={px(5)} className="draft-dot" />
              ))}
            </g>
          )}
          {draft?.type === "marquee" && (
            <rect
              x={Math.min(draft.a.x, draft.b.x)}
              y={Math.min(draft.a.y, draft.b.y)}
              width={Math.abs(draft.b.x - draft.a.x)}
              height={Math.abs(draft.b.y - draft.a.y)}
              className="marquee"
            />
          )}
          {itemGhost && tool.type === "item" && (
            <g transform={`translate(${itemGhost.x} ${itemGhost.y}) rotate(${itemGhost.rotation})`} className="plan-ghost">
              <ItemSymbol c={CATALOG_BY_ID[tool.catalogId]} w={CATALOG_BY_ID[tool.catalogId].w} d={CATALOG_BY_ID[tool.catalogId].d} />
            </g>
          )}
          {openingGhost && (
            <OpeningGhost opening={openingGhost} wall={walls.find((w) => w.id === openingGhost.wallId)!} s={s} />
          )}
          {cursor && (tool.type === "wall" || tool.type === "room" || tool.type === "run" || tool.type === "measure") && (
            <g className={`crosshair ${snapHint ? "is-snapped" : ""}`}>
              <circle cx={cursor.x} cy={cursor.y} r={px(snapHint ? 6 : 3)} />
            </g>
          )}
        </g>
      </svg>

      {HINTS[tool.type] && (
        <div className="plan-hint">
          <span>{HINTS[tool.type]}</span>
          {tool.type === "wall" && (
            <span className="seg seg-sm" role="group" aria-label="Veggtykkelse">
              {[10, 12, 15, 20, 30].map((t) => (
                <button key={t} className={settings.wallThickness === t ? "on" : ""} onClick={() => useStore.getState().setSettings({ wallThickness: t })}>
                  {t}
                </button>
              ))}
              <span className="unit">cm</span>
            </span>
          )}
        </div>
      )}
      {draft?.type === "calib" && draft.b && (
        <CalibrateBox
          left={((draft.a.x + draft.b.x) / 2) * s + view.x}
          top={((draft.a.y + draft.b.y) / 2) * s + view.y}
          measured={dist(draft.a, draft.b)}
          onCancel={() => setDraft(null)}
          onApply={(real) => {
            if (!draft.b) return
            const st = useStore.getState()
            const lv = st.levelId
            const und = st.project.underlays?.[lv]
            const k = real / dist(draft.a, draft.b)
            if (und && Number.isFinite(k) && k > 0) {
              const a = draft.a
              update((p) => ({
                ...p,
                underlays: { ...p.underlays, [lv]: { ...und, x: a.x + (und.x - a.x) * k, y: a.y + (und.y - a.y) * k, width: und.width * k, height: und.height * k, locked: true } },
              }))
            }
            setDraft(null)
            st.setTool({ type: "select" })
            requestAnimationFrame(fitView)
          }}
        />
      )}
      {lengthInput && cursor && (
        <div className="length-input" style={{ left: cursor.x * s + view.x + 16, top: cursor.y * s + view.y + 16 }}>
          {lengthInput} cm <kbd>Enter</kbd>
        </div>
      )}
      <div className="zoom-ctl">
        <button onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom ut">−</button>
        <button onClick={fitView} className="pct" aria-label="Tilpass visningen">
          {Math.round(s * 100)} %
        </button>
        <button onClick={() => zoomBy(1.25)} aria-label="Zoom inn">+</button>
      </div>
    </div>
  )

  function zoomBy(f: number) {
    userMoved.current = true
    const v = viewRef.current
    const cx = size.w / 2
    const cy = size.h / 2
    const ns = Math.min(8, Math.max(0.05, v.s * f))
    setView({ s: ns, x: cx - ((cx - v.x) / v.s) * ns, y: cy - ((cy - v.y) / v.s) * ns })
  }
}

function layerVisible(i: Item, lay: Record<string, boolean>) {
  const c = catalogItem(i.catalogId)
  return c.layer === "interior" ? lay.interior : c.layer === "elektro" ? lay.elektro : lay.vann || lay.avlop
}

// ---------- pieces ----------

function ItemNode({ item, selected }: { item: Item; selected: boolean }) {
  const c = catalogItem(item.catalogId)
  const w = item.w ?? c.w
  const d = item.d ?? c.d
  const technical = c.layer !== "interior"
  return (
    <g
      transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
      className={`item ${selected ? "is-selected" : ""} ${c.mount === "wall" && c.layer === "interior" ? "is-wallmounted" : ""}`}
      data-kind="item"
      data-id={item.id}
      style={item.color ? { ["--item" as string]: item.color } : undefined}
    >
      {technical ? <rect x={-15} y={-15} width={30} height={30} className="hit" /> : <rect x={-w / 2} y={-d / 2} width={w} height={d} className="hit" />}
      <ItemSymbol c={c} w={w} d={d} />
    </g>
  )
}

function RunNode({ run, selected, s }: { run: Run; selected: boolean; s: number }) {
  const sys = runSystem(run.system)
  const pts = run.points.map((p) => `${p.x},${p.y}`).join(" ")
  return (
    <g data-kind="run" data-id={run.id} className={`run run-${run.system} ${selected ? "is-selected" : ""}`}>
      <polyline points={pts} className="run-hit" />
      {selected && <polyline points={pts} className="run-halo" />}
      <polyline points={pts} className="run-line" style={{ stroke: sys.color }} />
      {run.points.length > 0 && (
        <circle cx={run.points[run.points.length - 1].x} cy={run.points[run.points.length - 1].y} r={3 / s} style={{ fill: sys.color }} className="run-end" />
      )}
    </g>
  )
}

function WallNode({ wall, walls, openings, selected, selectedIds }: { wall: Wall; walls: Wall[]; openings: Opening[]; selected: boolean; selectedIds: Set<string> }) {
  const { ea, eb } = wallJoints(wall, walls)
  const ops = openings.filter((o) => o.wallId === wall.id)
  const spans = wallSolidSpans(wall, ops, ea, eb)
  const ang = (wallAngle(wall) * 180) / Math.PI
  const t = wall.thickness
  return (
    <g transform={`translate(${wall.a.x} ${wall.a.y}) rotate(${ang})`} className={`wall ${wall.exterior ? "is-exterior" : ""} ${selected ? "is-selected" : ""}`}>
      {spans
        .filter((sp) => !sp.opening)
        .map((sp, i) => (
          <rect key={i} x={sp.from} y={-t / 2} width={sp.to - sp.from} height={t} className="wall-fill" data-kind="wall" data-id={wall.id} />
        ))}
      {ops.map((o) => (
        <OpeningShape key={o.id} o={o} t={t} selected={selectedIds.has(o.id)} />
      ))}
    </g>
  )
}

function OpeningShape({ o, t, selected, ghost }: { o: Opening; t: number; selected?: boolean; ghost?: boolean }) {
  const x0 = o.offset - o.width / 2
  const x1 = o.offset + o.width / 2
  const side = o.flip ? -1 : 1
  const leaf = (hx: number, sx: number, w: number) => {
    const sweep = sx * side > 0 ? 0 : 1
    return (
      <>
        <line x1={hx} y1={(side * t) / 2} x2={hx} y2={side * (t / 2 + w)} className="door-leaf" />
        <path d={`M ${hx} ${side * (t / 2 + w)} A ${w} ${w} 0 0 ${sweep} ${hx + sx * w} ${(side * t) / 2}`} className="door-arc" />
      </>
    )
  }
  let body: ReactNode = null
  if (o.kind === "door") body = o.hingeEnd ? leaf(x1, -1, o.width) : leaf(x0, 1, o.width)
  else if (o.kind === "doubleDoor")
    body = (
      <>
        {leaf(x0, 1, o.width / 2)}
        {leaf(x1, -1, o.width / 2)}
      </>
    )
  else if (o.kind === "slidingDoor")
    body = (
      <>
        <rect x={x0} y={-4} width={o.width * 0.55} height={3} className="door-slide" />
        <rect x={x1 - o.width * 0.55} y={1} width={o.width * 0.55} height={3} className="door-slide" />
      </>
    )
  else
    body = (
      <>
        <line x1={x0} y1={-t / 2} x2={x1} y2={-t / 2} className="window-frame" />
        <line x1={x0} y1={t / 2} x2={x1} y2={t / 2} className="window-frame" />
        <line x1={x0} y1={-1.5} x2={x1} y2={-1.5} className="window-glass" />
        <line x1={x0} y1={1.5} x2={x1} y2={1.5} className="window-glass" />
        {o.kind === "patioDoor" && leaf(o.hingeEnd ? x1 : x0, o.hingeEnd ? -1 : 1, o.width / 2)}
      </>
    )
  return (
    <g className={`opening ${selected ? "is-selected" : ""} ${ghost ? "is-ghost" : ""}`} data-kind={ghost ? undefined : "opening"} data-id={ghost ? undefined : o.id}>
      <rect x={x0} y={-t / 2} width={o.width} height={t} className="opening-gap" />
      <line x1={x0} y1={-t / 2} x2={x0} y2={t / 2} className="jamb" />
      <line x1={x1} y1={-t / 2} x2={x1} y2={t / 2} className="jamb" />
      {body}
    </g>
  )
}

function OpeningGhost({ opening, wall, s }: { opening: Opening; wall: Wall; s: number }) {
  if (!wall) return null
  const ang = (wallAngle(wall) * 180) / Math.PI
  const d = norm(sub(wall.b, wall.a))
  const c = add(wall.a, mul(d, opening.offset))
  return (
    <>
      <g transform={`translate(${wall.a.x} ${wall.a.y}) rotate(${ang})`} className="plan-ghost">
        <OpeningShape o={opening} t={wall.thickness} ghost />
      </g>
      <text x={c.x} y={c.y - wall.thickness / 2 - 10 / s} fontSize={11 / s} textAnchor="middle" className="ghost-label">
        {OPENING_DEFAULTS[opening.kind].name} {opening.width} cm
      </text>
    </>
  )
}

function DimLine({ a, b, s, offset, live }: { a: Vec; b: Vec; s: number; offset: number; live?: boolean }) {
  const L = dist(a, b)
  if (L < 1) return null
  const d = norm(sub(b, a))
  const n = perp(d)
  const A = add(a, mul(n, offset))
  const B = add(b, mul(n, offset))
  const mid = mul(add(A, B), 0.5)
  let ang = (Math.atan2(d.y, d.x) * 180) / Math.PI
  if (ang > 90 || ang < -90) ang += 180
  const tick = 5 / s
  return (
    <g className={`dim ${live ? "is-live" : ""}`}>
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} />
      {[A, B].map((p, i) => (
        <line key={i} x1={p.x - (d.x + n.x) * tick} y1={p.y - (d.y + n.y) * tick} x2={p.x + (d.x + n.x) * tick} y2={p.y + (d.y + n.y) * tick} />
      ))}
      <g transform={`translate(${mid.x} ${mid.y}) rotate(${ang})`}>
        <rect x={-30 / s} y={-9 / s} width={60 / s} height={14 / s} rx={3 / s} className="dim-bg" />
        <text y={2 / s} fontSize={11 / s} textAnchor="middle" dominantBaseline="middle" className="dim-text">
          {formatLength(L)}
        </text>
      </g>
    </g>
  )
}

function WallDimensions({ walls, rooms, s }: { walls: Wall[]; rooms: Room[]; s: number }) {
  if (s < 0.15) return null
  return (
    <g className="wall-dims">
      {walls
        .filter((w) => w.exterior)
        .map((w) => {
          const d = norm(sub(w.b, w.a))
          const n = perp(d)
          const mid = mul(add(w.a, w.b), 0.5)
          const probe = add(mid, mul(n, w.thickness / 2 + 10))
          const outsideSign = rooms.some((r) => pointInPolygon(probe, r.points)) ? -1 : 1
          return <DimLine key={w.id} a={w.a} b={w.b} s={s} offset={outsideSign * (w.thickness / 2 + 34 / s)} />
        })}
    </g>
  )
}

function SelectionOverlay({ project, selection, s }: { project: Project; selection: Selection[]; s: number }) {
  const r = 5 / s
  return (
    <g className="selection">
      {selection.map((sel) => {
        if (sel.kind === "item") {
          const it = project.items.find((i) => i.id === sel.id)
          if (!it) return null
          const c = catalogItem(it.catalogId)
          const technical = c.layer !== "interior"
          const w = technical ? 30 : (it.w ?? c.w)
          const d = technical ? 30 : (it.d ?? c.d)
          const corners = rectCorners(it, w + 8 / s, d + 8 / s, it.rotation)
          const rad = (it.rotation * Math.PI) / 180
          const front = { x: it.x - Math.sin(rad) * (d / 2 + 26 / s), y: it.y + Math.cos(rad) * (d / 2 + 26 / s) }
          const edge = { x: it.x - Math.sin(rad) * (d / 2 + 4 / s), y: it.y + Math.cos(rad) * (d / 2 + 4 / s) }
          return (
            <g key={sel.id}>
              <polygon points={corners.map((p) => `${p.x},${p.y}`).join(" ")} className="sel-box" />
              {selection.length === 1 && (
                <>
                  <line x1={edge.x} y1={edge.y} x2={front.x} y2={front.y} className="sel-stem" />
                  <circle cx={front.x} cy={front.y} r={r * 1.2} className="handle handle-rotate" data-handle={`rotate:${it.id}`} />
                </>
              )}
            </g>
          )
        }
        if (sel.kind === "wall" && selection.length === 1) {
          const w = project.walls.find((x) => x.id === sel.id)
          if (!w) return null
          return (
            <g key={sel.id}>
              <DimLine a={w.a} b={w.b} s={s} offset={w.thickness / 2 + 22 / s} live />
              <circle cx={w.a.x} cy={w.a.y} r={r} className="handle" data-handle={`wall-a:${w.id}`} />
              <circle cx={w.b.x} cy={w.b.y} r={r} className="handle" data-handle={`wall-b:${w.id}`} />
            </g>
          )
        }
        if (sel.kind === "room" && selection.length === 1) {
          const room = project.rooms.find((x) => x.id === sel.id)
          if (!room) return null
          return (
            <g key={sel.id}>
              {room.points.map((p, i) => (
                <rect key={i} x={p.x - r} y={p.y - r} width={r * 2} height={r * 2} className="handle" data-handle={`room-v:${room.id}:${i}`} />
              ))}
            </g>
          )
        }
        if (sel.kind === "run" && selection.length === 1) {
          const run = project.runs.find((x) => x.id === sel.id)
          if (!run) return null
          return (
            <g key={sel.id}>
              {run.points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={r * 0.9} className="handle" data-handle={`run-v:${run.id}:${i}`} />
              ))}
            </g>
          )
        }
        return null
      })}
    </g>
  )
}

function CalibrateBox({ left, top, measured, onApply, onCancel }: { left: number; top: number; measured: number; onApply: (cm: number) => void; onCancel: () => void }) {
  const [text, setText] = useState("")
  const apply = () => {
    const raw = text.trim().toLowerCase().replace(",", ".")
    const n = parseFloat(raw)
    if (!(n > 0)) return
    // "11 m" or "11" metres when small, otherwise centimetres
    const cm = raw.endsWith("mm") ? n / 10 : raw.endsWith("m") && !raw.endsWith("cm") ? n * 100 : n < 50 ? n * 100 : n
    onApply(cm)
  }
  return (
    <form
      className="calib-box"
      style={{ left, top }}
      onSubmit={(e) => {
        e.preventDefault()
        apply()
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <label htmlFor="calib-length">Virkelig lengde</label>
      <input
        id="calib-length"
        autoFocus
        inputMode="decimal"
        placeholder="f.eks. 11 m eller 1100"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      />
      <span className="sub mono">Målt nå: {formatLength(measured)}</span>
      <div className="row-btns">
        <button type="button" className="btn ghost sm" onClick={onCancel}>
          Avbryt
        </button>
        <button type="submit" className="btn primary sm">
          Bruk målestokk
        </button>
      </div>
    </form>
  )
}
