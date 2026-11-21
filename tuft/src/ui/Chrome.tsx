// Top bar, tool rail, layer bar and 3D controls.
import {
  AppWindow,
  BrickWall,
  Camera,
  ChevronDown,
  ClipboardList,
  ClipboardPaste,
  Copy,
  DoorOpen,
  Download,
  FileBraces,
  FolderOpen,
  FilePlus,
  Footprints,
  Hand,
  House,
  ImageDown,
  Library,
  Lightbulb,
  ListChecks,
  Magnet,
  Maximize,
  Moon,
  MousePointer2,
  Orbit,
  Plus,
  Redo2,
  Ruler,
  ScanEye,
  Scissors,
  Sofa,
  Square,
  Sun,
  Undo2,
  Upload,
  Zap,
  Droplets,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"

import { saveFile } from "../cloud/files"
import { CATALOG_BY_ID } from "../model/catalog"
import { runChecks } from "../model/checks"
import { emptyProject, sampleProject } from "../model/sample"
import type { LayerKey, Project, Tool, ViewMode } from "../model/types"
import { useCursor, useStore } from "../store/store"
import { screenshot } from "../view3d/Scene3D"
import { Seg } from "./common"
import { ProjectsDialog, SyncBadge } from "./Projects"

function download(name: string, href: string) {
  void saveFile(name, href, { dataUrl: href.startsWith("data:") })
}
function saveJson(project: Project) {
  void saveFile(`${project.name || "tuft"}.tuft.json`, JSON.stringify(project, null, 2))
}

export function exportPlanPng(name: string) {
  const svg = document.querySelector("svg.plan") as SVGSVGElement | null
  if (!svg) return
  const clone = svg.cloneNode(true) as SVGSVGElement
  const { width, height } = svg.getBoundingClientRect()
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))
  // inline the computed colours so the image looks like the screen
  const css = [...document.styleSheets]
    .flatMap((s) => {
      try {
        return [...s.cssRules].map((r) => r.cssText)
      } catch {
        return []
      }
    })
    .join("\n")
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style")
  style.textContent = css
  clone.insertBefore(style, clone.firstChild)
  const root = getComputedStyle(document.documentElement)
  const bg = root.getPropertyValue("--canvas").trim() || "#fbfaf7"
  clone.style.background = bg
  for (const v of ["--ink", "--canvas", "--wall", "--wall-int", "--room", "--accent", "--line", "--grid", "--grid-major", "--muted", "--interior", "--elektro", "--surface"])
    clone.style.setProperty(v, root.getPropertyValue(v))
  const data = new XMLSerializer().serializeToString(clone)
  const img = new Image()
  img.onload = () => {
    const c = document.createElement("canvas")
    const k = 2
    c.width = width * k
    c.height = height * k
    const g = c.getContext("2d")!
    g.fillStyle = bg
    g.fillRect(0, 0, c.width, c.height)
    g.scale(k, k)
    g.drawImage(img, 0, 0)
    download(`${name} – plan.png`, c.toDataURL("image/png"))
  }
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data)
}

function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const h = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut()
    }
    window.addEventListener("pointerdown", h)
    return () => window.removeEventListener("pointerdown", h)
  }, [ref, onOut, active])
}

function Menu({ label, children, icon }: { label: ReactNode; children: (close: () => void) => ReactNode; icon?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(false), open)
  return (
    <div className="menu" ref={ref}>
      <button className="btn ghost" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {icon}
        {label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function TopBar() {
  const project = useStore((s) => s.project)
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const levelId = useStore((s) => s.levelId)
  const setLevel = useStore((s) => s.setLevel)
  const addLevel = useStore((s) => s.addLevel)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const theme = useStore((s) => s.settings.theme)
  const panel = useStore((s) => s.panel)
  const checks = useMemo(() => runChecks(project), [project])
  const warn = checks.filter((c) => c.level === "warn").length
  const info = checks.filter((c) => c.level === "info").length
  const fileRef = useRef<HTMLInputElement>(null)
  const st = useStore.getState
  const [textDialog, setTextDialog] = useState<{ mode: "import" | "export"; error?: string } | null>(null)
  const [projectsOpen, setProjectsOpen] = useState(false)

  return (
    <header className="topbar">
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path d="M3 11L12 4l9 7v9H3z" className="brand-roof" />
          <path d="M9 20v-6h6v6" className="brand-door" />
        </svg>
        <span>Tuft</span>
      </div>
      <span className="divider" />
      <input
        className="project-name"
        value={project.name}
        aria-label="Prosjektnavn"
        onChange={(e) => st().update((p) => ({ ...p, name: e.target.value }), false)}
        onBlur={() => st().checkpoint()}
      />
      <SyncBadge onOpen={() => setProjectsOpen(true)} />
      {projectsOpen && <ProjectsDialog onClose={() => setProjectsOpen(false)} />}
      <Menu label="Fil" icon={null}>
        {(close) => (
          <>
            <button
              role="menuitem"
              onClick={() => {
                setProjectsOpen(true)
                close()
              }}
            >
              <FolderOpen size={15} /> Prosjekter og deling …
            </button>
            <hr />
            <button
              role="menuitem"
              onClick={() => {
                st().load(emptyProject())
                close()
              }}
            >
              <FilePlus size={15} /> Nytt, tomt prosjekt
            </button>
            <button
              role="menuitem"
              onClick={() => {
                st().load(sampleProject())
                close()
              }}
            >
              <House size={15} /> Åpne eksempelhuset
            </button>
            <hr />
            <button role="menuitem" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> Åpne fil (.json)
            </button>
            <button
              role="menuitem"
              onClick={() => {
                saveJson(project)
                close()
              }}
            >
              <FileBraces size={15} /> Lagre som fil
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setTextDialog({ mode: "export" })
                close()
              }}
            >
              <Copy size={15} /> Kopier prosjektet som tekst
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setTextDialog({ mode: "import" })
                close()
              }}
            >
              <ClipboardPaste size={15} /> Lim inn prosjekt fra tekst
            </button>
            <hr />
            <button
              role="menuitem"
              onClick={() => {
                exportPlanPng(project.name || "tuft")
                close()
              }}
            >
              <ImageDown size={15} /> Plantegning som bilde
            </button>
            <button
              role="menuitem"
              disabled={view === "2d"}
              onClick={() => {
                const url = screenshot.take?.()
                if (url) download(`${project.name || "tuft"} – 3D.png`, url)
                close()
              }}
            >
              <Camera size={15} /> 3D-visning som bilde
            </button>
          </>
        )}
      </Menu>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          try {
            const p = JSON.parse(await f.text()) as Project
            if (p.version !== 1 || !Array.isArray(p.walls)) throw new Error()
            st().load(p)
          } catch {
            setTextDialog({ mode: "import", error: "Filen ser ikke ut som et Tuft-prosjekt." })
          }
          e.target.value = ""
        }}
      />

      {textDialog && <ProjectTextDialog {...textDialog} onClose={() => setTextDialog(null)} />}
      <div className="level-picker">
        <select value={levelId} onChange={(e) => setLevel(e.target.value)} aria-label="Etasje">
          {project.levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <button className="icon-btn" onClick={addLevel} title="Legg til etasje over" aria-label="Legg til etasje">
          <Plus size={16} />
        </button>
      </div>

      <div className="spacer" />
      <Seg<ViewMode>
        label="Visning"
        value={view}
        onChange={setView}
        options={[
          { value: "2d", label: "2D", title: "Bare plantegning (1)" },
          { value: "split", label: "Delt", title: "Plan og 3D side om side (2)" },
          { value: "3d", label: "3D", title: "Bare 3D (3)" },
        ]}
      />
      <div className="spacer" />

      <div className="tb-group">
        <button className="icon-btn" disabled={!canUndo} onClick={() => st().undo()} title="Angre (Ctrl+Z)" aria-label="Angre">
          <Undo2 size={17} />
        </button>
        <button className="icon-btn" disabled={!canRedo} onClick={() => st().redo()} title="Gjør om (Ctrl+Shift+Z)" aria-label="Gjør om">
          <Redo2 size={17} />
        </button>
      </div>
      <button className={`btn ghost check-btn ${panel === "checks" ? "on" : ""}`} onClick={() => st().setPanel(panel === "checks" ? "catalog" : "checks")}>
        <span className={`dot ${warn ? "warn" : info ? "info" : "ok"}`} />
        {warn ? `${warn} å rette` : info ? `${info} råd` : "Alt ser bra ut"}
      </button>
      <button
        className="icon-btn"
        onClick={() => st().setSettings({ theme: theme === "dark" ? "light" : "dark" })}
        aria-label={theme === "dark" ? "Lyst tema" : "Mørkt tema"}
        title={theme === "dark" ? "Lyst tema" : "Mørkt tema"}
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <button
        className="btn primary"
        onClick={() => saveJson(project)}
      >
        <Download size={15} /> Lagre
      </button>
    </header>
  )
}

type RailItem = { key: string; label: string; short: string; icon: ReactNode; tool?: Tool; panel?: "catalog" | "lists" | "checks"; match: (t: Tool) => boolean }

export const RAIL: RailItem[] = [
  { key: "select", label: "Velg og flytt", short: "V", icon: <MousePointer2 size={18} />, tool: { type: "select" }, match: (t) => t.type === "select" },
  { key: "pan", label: "Panorer", short: "H", icon: <Hand size={18} />, tool: { type: "pan" }, match: (t) => t.type === "pan" },
  { key: "room", label: "Rom", short: "R", icon: <Square size={18} />, tool: { type: "room" }, match: (t) => t.type === "room" },
  { key: "wall", label: "Vegg", short: "W", icon: <BrickWall size={18} />, tool: { type: "wall" }, match: (t) => t.type === "wall" },
  { key: "door", label: "Dør", short: "D", icon: <DoorOpen size={18} />, tool: { type: "opening", kind: "door" }, match: (t) => t.type === "opening" && t.kind !== "window" },
  { key: "window", label: "Vindu", short: "N", icon: <AppWindow size={18} />, tool: { type: "opening", kind: "window" }, match: (t) => t.type === "opening" && t.kind === "window" },
  { key: "furniture", label: "Møbler", short: "F", icon: <Sofa size={18} />, tool: { type: "item", catalogId: "sofa3" }, match: (t) => t.type === "item" && !["elektro", "vvs"].includes(itemLayer(t.catalogId)) },
  { key: "el", label: "Elektro", short: "E", icon: <Zap size={18} />, tool: { type: "item", catalogId: "stikk2" }, match: (t) => (t.type === "item" && itemLayer(t.catalogId) === "elektro") || (t.type === "run" && (t.system === "el" || t.system === "data")) },
  { key: "pipe", label: "Rør", short: "P", icon: <Droplets size={18} />, tool: { type: "run", system: "kaldt" }, match: (t) => (t.type === "run" && t.system !== "el" && t.system !== "data") || (t.type === "item" && itemLayer(t.catalogId) === "vvs") },
  { key: "measure", label: "Mål", short: "M", icon: <Ruler size={18} />, tool: { type: "measure" }, match: (t) => t.type === "measure" },
]

function itemLayer(id: string) {
  return CATALOG_BY_ID[id]?.layer ?? "interior"
}

export function Rail() {
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  return (
    <nav className="rail" aria-label="Verktøy">
      {RAIL.map((r) => (
        <button
          key={r.key}
          className={`rail-btn ${r.match(tool) ? "on" : ""}`}
          onClick={() => {
            setTool(r.tool!)
            if (["furniture", "el", "pipe", "door", "window"].includes(r.key)) setPanel("catalog")
          }}
          aria-label={`${r.label} (${r.short})`}
          aria-pressed={r.match(tool)}
        >
          {r.icon}
          <span className="tip">
            {r.label} <kbd>{r.short}</kbd>
          </span>
        </button>
      ))}
      <span className="rail-sep" />
      <button className={`rail-btn ${panel === "catalog" ? "sel" : ""}`} onClick={() => setPanel(panel === "catalog" ? null : "catalog")} aria-label="Bibliotek" aria-pressed={panel === "catalog"}>
        <Library size={18} />
        <span className="tip">Bibliotek</span>
      </button>
      <button className={`rail-btn ${panel === "lists" ? "sel" : ""}`} onClick={() => setPanel(panel === "lists" ? null : "lists")} aria-label="Lister" aria-pressed={panel === "lists"}>
        <ClipboardList size={18} />
        <span className="tip">Materialer, kurser og rom</span>
      </button>
      <button className={`rail-btn ${panel === "checks" ? "sel" : ""}`} onClick={() => setPanel(panel === "checks" ? null : "checks")} aria-label="Sjekk" aria-pressed={panel === "checks"}>
        <ListChecks size={18} />
        <span className="tip">Sjekk planen</span>
      </button>
    </nav>
  )
}

const LAYERS: { key: LayerKey; label: string; color: string }[] = [
  { key: "konstruksjon", label: "Vegger", color: "var(--wall)" },
  { key: "interior", label: "Interiør", color: "var(--interior)" },
  { key: "elektro", label: "Elektro", color: "var(--elektro)" },
  { key: "vann", label: "Vann", color: "var(--kaldt)" },
  { key: "avlop", label: "Avløp", color: "var(--avlop)" },
  { key: "mal", label: "Mål", color: "var(--muted)" },
]

export function LayerBar() {
  const layers = useStore((s) => s.layers)
  const toggle = useStore((s) => s.toggleLayer)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const cursor = useCursor((s) => s.p)
  return (
    <div className="layerbar">
      <div className="layer-chips" role="group" aria-label="Lag">
        {LAYERS.map((l) => (
          <button key={l.key} className={`layer-chip ${layers[l.key] ? "on" : ""}`} onClick={() => toggle(l.key)} aria-pressed={layers[l.key]}>
            <span className="dot" style={{ background: l.color }} />
            {l.label}
          </button>
        ))}
      </div>
      <span className="divider" />
      <label className="snap" title="Festeavstand">
        <Magnet size={14} aria-hidden />
        <select value={settings.snapGrid} onChange={(e) => setSettings({ snapGrid: Number(e.target.value) })} aria-label="Festeavstand">
          {[1, 5, 10, 25, 50].map((n) => (
            <option key={n} value={n}>
              {n} cm
            </option>
          ))}
        </select>
      </label>
      <button className={`chip-btn ${settings.angleSnap ? "on" : ""}`} onClick={() => setSettings({ angleSnap: !settings.angleSnap })} title="Lås vinkler (hold Shift for å skru av midlertidig)" aria-pressed={settings.angleSnap}>
        15°
      </button>
      <span className="divider hide-sm" />
      <span className="coords mono hide-sm" aria-live="off">
        {cursor ? `x ${(cursor.x / 100).toFixed(2).replace(".", ",")}  y ${(cursor.y / 100).toFixed(2).replace(".", ",")}` : "x –  y –"}
      </span>
    </div>
  )
}

export function View3DBar() {
  const v = useStore((s) => s.view3d)
  const set = useStore((s) => s.setView3d)
  const fit = useStore((s) => s.fit)
  const hour = v.timeOfDay
  const label = `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`
  return (
    <div className="bar3d">
      <Seg
        label="Kamera"
        value={v.walk ? "walk" : "orbit"}
        onChange={(m) => set({ walk: m === "walk" })}
        options={[
          { value: "orbit", label: <><Orbit size={14} /> <span className="lbl">Bane</span></>, title: "Dra for å rotere, rull for å zoome" },
          { value: "walk", label: <><Footprints size={14} /> <span className="lbl">Gå</span></>, title: "WASD eller piltaster, dra for å se rundt" },
        ]}
      />
      <button className={`chip-btn ${v.roof && !v.cutaway ? "on" : ""}`} onClick={() => set({ roof: !v.roof, cutaway: false })} aria-pressed={v.roof && !v.cutaway} title="Vis taket">
        <House size={14} /> <span className="lbl">Tak</span>
      </button>
      <button className={`chip-btn ${v.cutaway ? "on" : ""}`} onClick={() => set({ cutaway: !v.cutaway })} aria-pressed={v.cutaway} title="Kutt veggene i brysthøyde">
        <Scissors size={14} /> <span className="lbl">Snitt</span>
      </button>
      <button className={`chip-btn ${v.xray ? "on" : ""}`} onClick={() => set({ xray: !v.xray })} aria-pressed={v.xray} title="Vis rør og kabler gjennom vegger og gulv">
        <ScanEye size={14} /> <span className="lbl">Røntgen</span>
      </button>
      <button className={`chip-btn ${v.lightsOn ? "on" : ""}`} onClick={() => set({ lightsOn: !v.lightsOn })} aria-pressed={v.lightsOn} title="Slå på lampene">
        <Lightbulb size={14} /> <span className="lbl">Lys</span>
      </button>
      <label className="time" title="Tid på døgnet (solens bane)">
        <Sun size={14} aria-hidden />
        <input type="range" min={4} max={23} step={0.25} value={hour} onChange={(e) => set({ timeOfDay: Number(e.target.value) })} aria-label="Tid på døgnet" />
        <span className="mono">{label}</span>
      </label>
      {!v.walk && (
        <button className="icon-btn" onClick={fit} aria-label="Tilpass kamera" title="Tilpass kamera">
          <Maximize size={15} />
        </button>
      )}
      <button
        className="icon-btn"
        aria-label="Ta bilde"
        title="Lagre bilde av 3D-visningen"
        onClick={() => {
          const url = screenshot.take?.()
          if (url) download(`${useStore.getState().project.name || "tuft"} – 3D.png`, url)
        }}
      >
        <Camera size={15} />
      </button>
    </div>
  )
}

/** Copy/paste the project as JSON text. Works where file downloads are blocked (for example inside an embedded viewer). */
function ProjectTextDialog({ mode, error: initialError, onClose }: { mode: "import" | "export"; error?: string; onClose: () => void }) {
  const project = useStore((s) => s.project)
  const json = useMemo(() => JSON.stringify(project), [project])
  const [text, setText] = useState(mode === "export" ? json : "")
  const [msg, setMsg] = useState<string | undefined>(initialError)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus()
    if (mode === "export") ref.current?.select()
  }, [mode])
  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pt-title">
        <h2 id="pt-title">{mode === "export" ? "Kopier prosjektet" : "Lim inn et prosjekt"}</h2>
        <p className="note">
          {mode === "export"
            ? "Teksten under er hele prosjektet. Lagre den i et notat eller en fil, og lim den inn igjen her senere."
            : "Lim inn teksten du kopierte fra Tuft tidligere. Prosjektet du har oppe nå kan hentes tilbake med Angre."}
        </p>
        <textarea id="project-text" ref={ref} value={text} onChange={(e) => setText(e.target.value)} readOnly={mode === "export"} spellCheck={false} />
        {msg && <p className={`dialog-msg ${msg.startsWith("Kopiert") ? "ok" : ""}`}>{msg}</p>}
        <div className="dialog-actions">
          <button className="btn ghost" onClick={onClose}>
            Lukk
          </button>
          {mode === "export" ? (
            <button
              className="btn primary"
              onClick={() => {
                navigator.clipboard
                  .writeText(json)
                  .then(() => setMsg("Kopiert til utklippstavlen."))
                  .catch(() => {
                    ref.current?.select()
                    setMsg("Kunne ikke kopiere automatisk. Teksten er merket, trykk Ctrl+C.")
                  })
              }}
            >
              <Copy size={15} /> Kopier
            </button>
          ) : (
            <button
              className="btn primary"
              onClick={() => {
                try {
                  const p = JSON.parse(text) as Project
                  if (p.version !== 1 || !Array.isArray(p.walls)) throw new Error()
                  useStore.getState().load(p)
                  onClose()
                } catch {
                  setMsg("Teksten er ikke et gyldig Tuft-prosjekt. Sjekk at du fikk med alt.")
                }
              }}
            >
              Åpne
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
