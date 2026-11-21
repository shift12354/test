import { create } from "zustand"

import { reclassifyWalls } from "../model/build"
import { uid } from "../model/geometry"
import { sampleProject } from "../model/sample"
import type { LayerKey, Level, Project, Selection, Tool, ViewMode } from "../model/types"

const STORAGE_KEY = "tuft.project.v1"
const HISTORY_LIMIT = 120

export type Settings = {
  snapGrid: number
  wallThickness: number
  angleSnap: boolean
  showDimensions: boolean
  theme: "light" | "dark"
}

export type View3D = {
  cutaway: boolean
  xray: boolean
  lightsOn: boolean
  timeOfDay: number
  walk: boolean
  allLevels: boolean
}

type State = {
  project: Project
  past: Project[]
  future: Project[]
  selection: Selection[]
  tool: Tool
  view: ViewMode
  levelId: string
  layers: Record<LayerKey, boolean>
  settings: Settings
  view3d: View3D
  panel: "catalog" | "lists" | "checks" | null
  /** Bumps when the plan should re-fit the view. */
  fitToken: number

  update: (fn: (p: Project) => Project, record?: boolean) => void
  checkpoint: () => void
  undo: () => void
  redo: () => void
  load: (p: Project) => void
  setSelection: (s: Selection[]) => void
  setTool: (t: Tool) => void
  setView: (v: ViewMode) => void
  setLevel: (id: string) => void
  toggleLayer: (k: LayerKey) => void
  setSettings: (s: Partial<Settings>) => void
  setView3d: (s: Partial<View3D>) => void
  setPanel: (p: State["panel"]) => void
  deleteSelection: () => void
  duplicateSelection: () => void
  rotateSelection: (deg: number) => void
  addLevel: () => void
  fit: () => void
}

function loadInitial(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Project
      if (p && p.version === 1 && Array.isArray(p.walls)) return p
    }
  } catch {
    // storage unavailable or corrupt: start from the sample
  }
  return sampleProject()
}

function loadSettings(): Settings {
  const base: Settings = { snapGrid: 5, wallThickness: 12, angleSnap: true, showDimensions: true, theme: "light" }
  // A host page (e.g. the claude.ai viewer) may already have picked a theme on <html>.
  const host = typeof document !== "undefined" ? document.documentElement.dataset.theme : undefined
  try {
    if (matchMedia("(prefers-color-scheme: dark)").matches) base.theme = "dark"
    const raw = localStorage.getItem("tuft.settings")
    if (raw) Object.assign(base, JSON.parse(raw))
  } catch {
    // storage blocked: fall back to defaults
  }
  if (host === "light" || host === "dark") base.theme = host
  return base
}

const initial = loadInitial()
const narrowScreen = typeof window !== "undefined" && window.innerWidth < 720

export const useStore = create<State>((set, get) => ({
  project: initial,
  past: [],
  future: [],
  selection: [],
  tool: { type: "select" },
  view: "split",
  levelId: initial.levels[0].id,
  layers: { konstruksjon: true, interior: true, elektro: true, vann: true, avlop: true, mal: true },
  settings: loadSettings(),
  view3d: { cutaway: false, xray: true, lightsOn: false, timeOfDay: 14, walk: false, allLevels: true },
  panel: narrowScreen ? null : "catalog",
  fitToken: 0,

  update: (fn, record = true) =>
    set((s) => {
      const next = fn(s.project)
      if (next === s.project) return {}
      return record
        ? { project: next, past: [...s.past, s.project].slice(-HISTORY_LIMIT), future: [] }
        : { project: next }
    }),
  checkpoint: () => set((s) => ({ past: [...s.past, s.project].slice(-HISTORY_LIMIT), future: [] })),
  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1]
      if (!prev) return {}
      return { project: prev, past: s.past.slice(0, -1), future: [s.project, ...s.future], selection: [] }
    }),
  redo: () =>
    set((s) => {
      const next = s.future[0]
      if (!next) return {}
      return { project: next, future: s.future.slice(1), past: [...s.past, s.project], selection: [] }
    }),
  load: (p) => set((s) => ({ project: p, past: [...s.past, s.project], future: [], selection: [], levelId: p.levels[0].id, fitToken: s.fitToken + 1 })),
  setSelection: (selection) => set({ selection }),
  setTool: (tool) => set({ tool, selection: tool.type === "select" ? get().selection : [] }),
  setView: (view) => set({ view }),
  setLevel: (levelId) => set({ levelId, selection: [] }),
  toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  setView3d: (p) => set((s) => ({ view3d: { ...s.view3d, ...p } })),
  setPanel: (panel) => set({ panel }),
  fit: () => set((s) => ({ fitToken: s.fitToken + 1 })),

  deleteSelection: () => {
    const { selection } = get()
    if (!selection.length) return
    const ids = new Set(selection.map((s) => s.id))
    get().update((p) => {
      const walls = p.walls.filter((w) => !ids.has(w.id))
      const wallIds = new Set(walls.map((w) => w.id))
      const rooms = p.rooms.filter((r) => !ids.has(r.id))
      const removedRoom = p.rooms.find((r) => ids.has(r.id))
      return {
        ...p,
        walls: removedRoom ? reclassifyWalls(walls, rooms, removedRoom.level) : walls,
        openings: p.openings.filter((o) => !ids.has(o.id) && wallIds.has(o.wallId)),
        rooms,
        items: p.items.filter((i) => !ids.has(i.id)),
        runs: p.runs.filter((r) => !ids.has(r.id)),
        dimensions: p.dimensions.filter((d) => !ids.has(d.id)),
      }
    })
    set({ selection: [] })
  },

  duplicateSelection: () => {
    const { selection, project } = get()
    const newSel: Selection[] = []
    const shift = 40
    const items = project.items.filter((i) => selection.some((s) => s.id === i.id)).map((i) => {
      const n = { ...i, id: uid("i"), x: i.x + shift, y: i.y + shift }
      newSel.push({ kind: "item", id: n.id })
      return n
    })
    const runs = project.runs.filter((r) => selection.some((s) => s.id === r.id)).map((r) => {
      const n = { ...r, id: uid("p"), points: r.points.map((q) => ({ x: q.x + shift, y: q.y + shift })) }
      newSel.push({ kind: "run", id: n.id })
      return n
    })
    if (!newSel.length) return
    get().update((p) => ({ ...p, items: [...p.items, ...items], runs: [...p.runs, ...runs] }))
    set({ selection: newSel })
  },

  rotateSelection: (deg) => {
    const ids = new Set(get().selection.filter((s) => s.kind === "item").map((s) => s.id))
    if (!ids.size) return
    get().update((p) => ({
      ...p,
      items: p.items.map((i) => (ids.has(i.id) ? { ...i, rotation: (((i.rotation + deg) % 360) + 360) % 360 } : i)),
    }))
  },

  addLevel: () => {
    const { project } = get()
    const top = project.levels[project.levels.length - 1]
    const lvl: Level = {
      id: uid("l"),
      name: `${project.levels.length + 1}. etasje`,
      elevation: top.elevation + top.height + 25,
      height: 240,
    }
    // Copy the exterior walls of the level below so the new floor starts with the house outline.
    const outline = project.walls
      .filter((w) => w.level === top.id && w.exterior)
      .map((w) => ({ ...w, id: uid("w"), level: lvl.id }))
    get().update((p) => ({ ...p, levels: [...p.levels, lvl], walls: [...p.walls, ...outline] }))
    set({ levelId: lvl.id, selection: [] })
  },
}))

// Autosave. Writes are throttled so dragging does not hammer storage.
let saveTimer: ReturnType<typeof setTimeout> | undefined
useStore.subscribe((s, prev) => {
  if (s.project !== prev.project) {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(useStore.getState().project))
      } catch {
        // storage full or blocked: the project still lives in memory and can be exported
      }
    }, 400)
  }
  if (s.settings !== prev.settings) {
    try {
      localStorage.setItem("tuft.settings", JSON.stringify(s.settings))
    } catch {
      // ignore
    }
  }
})

export const isSelected = (sel: Selection[], id: string) => sel.some((s) => s.id === id)

/** Cursor position in plan coordinates, kept apart so moving the mouse only re-renders the readout. */
export const useCursor = create<{ p: { x: number; y: number } | null; set: (p: { x: number; y: number } | null) => void }>((set) => ({
  p: null,
  set: (p) => set({ p }),
}))
