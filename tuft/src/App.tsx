import { X } from "lucide-react"
import { lazy, Suspense, useEffect } from "react"

import { Plan2D, planKeys } from "./editor/Plan2D"
import { useStore } from "./store/store"
import { LayerBar, RAIL, Rail, TopBar, View3DBar } from "./ui/Chrome"
import { Inspector } from "./ui/Inspector"
import { LibraryPanel } from "./ui/LibraryPanel"
import { ChecksPanel, ListsPanel } from "./ui/ListsPanel"
import { Toast } from "./ui/Projects"

const Scene3D = lazy(() => import("./view3d/Scene3D").then((m) => ({ default: m.Scene3D })))

const PANEL_TITLES = { catalog: "Bibliotek", lists: "Lister", checks: "Sjekk planen" } as const

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) {
        if (e.key === "Escape") el.blur()
        return
      }
      const st = useStore.getState()
      if (st.view !== "3d" && planKeys.handle?.(e)) {
        e.preventDefault()
        return
      }
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      if (mod && k === "z") {
        e.preventDefault()
        if (e.shiftKey) st.redo()
        else st.undo()
        return
      }
      if (mod && k === "y") {
        e.preventDefault()
        st.redo()
        return
      }
      if (mod && k === "d") {
        e.preventDefault()
        st.duplicateSelection()
        return
      }
      if (mod && k === "a") {
        e.preventDefault()
        st.setTool({ type: "select" })
        st.setSelection(st.project.items.filter((i) => i.level === st.levelId).map((i) => ({ kind: "item" as const, id: i.id })))
        return
      }
      if (mod) return
      if (st.view3d.walk && st.view === "3d" && ["w", "a", "s", "d"].includes(k)) return
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        st.deleteSelection()
        return
      }
      if (e.key === "Escape") {
        if (st.selection.length) st.setSelection([])
        else st.setTool({ type: "select" })
        return
      }
      if (k === "q") {
        st.rotateSelection(e.shiftKey ? 15 : 90)
        return
      }
      if (k === "1") return st.setView("2d")
      if (k === "2") return st.setView("split")
      if (k === "3") return st.setView("3d")
      if (k === "0") return st.fit()
      const r = RAIL.find((x) => x.short.toLowerCase() === k)
      if (r?.tool) {
        st.setTool(r.tool)
        if (["furniture", "el", "pipe", "door", "window"].includes(r.key)) st.setPanel("catalog")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}

export default function App() {
  const view = useStore((s) => s.view)
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  const theme = useStore((s) => s.settings.theme)
  const hasSelection = useStore((s) => s.selection.length > 0)
  useShortcuts()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  return (
    <div className="app" data-view={view}>
      <TopBar />
      <div className={`workspace ${panel ? "has-panel" : ""} ${hasSelection ? "has-selection" : ""}`}>
        <Rail />
        {panel && (
          <aside className="panel panel-left" aria-label={PANEL_TITLES[panel]}>
            <header className="panel-head">
              <h2>{PANEL_TITLES[panel]}</h2>
              <button className="icon-btn sm" onClick={() => setPanel(null)} aria-label="Lukk panelet">
                <X size={15} />
              </button>
            </header>
            {panel === "catalog" && <LibraryPanel />}
            {panel === "lists" && <ListsPanel />}
            {panel === "checks" && <ChecksPanel />}
          </aside>
        )}
        <main className="views">
          {view !== "3d" && (
            <section className="view view-2d" aria-label="Plantegning">
              <Plan2D />
              <LayerBar />
            </section>
          )}
          {view !== "2d" && (
            <section className="view view-3d" aria-label="3D-visning">
              <Suspense fallback={<div className="loading3d">Laster 3D …</div>}>
                <Scene3D />
              </Suspense>
              <View3DBar />
            </section>
          )}
        </main>
        <aside className="panel panel-right" aria-label="Egenskaper">
          <Inspector />
        </aside>
      </div>
      <Toast />
    </div>
  )
}
