import { Search, X } from "lucide-react"
import { useMemo, useState } from "react"

import { OPENING_DEFAULTS } from "../model/build"
import { CATALOG, CATEGORIES, RUN_SYSTEMS } from "../model/catalog"
import type { CategoryId } from "../model/catalog"
import type { OpeningKind } from "../model/types"
import { CatalogThumb } from "../editor/symbols"
import { useStore } from "../store/store"

type Cat = CategoryId | "alle" | "bygg"

const OPENING_ICONS: Record<OpeningKind, string> = {
  door: "M4 20 V6 A14 14 0 0 1 18 20",
  doubleDoor: "M2 20 V10 A10 10 0 0 1 12 20 M22 20 V10 A10 10 0 0 0 12 20",
  slidingDoor: "M2 11 H14 M10 15 H22",
  patioDoor: "M2 13 H22 M2 11 H22 M4 13 V4 A9 9 0 0 1 13 13",
  window: "M2 10 H22 M2 14 H22 M2 12 H22",
}

export function LibraryPanel() {
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const [cat, setCat] = useState<Cat>(() => (tool.type === "item" ? "alle" : "bygg"))
  const [q, setQ] = useState("")

  const items = useMemo(() => {
    const query = q.trim().toLowerCase()
    return CATALOG.filter((c) => (query ? `${c.name} ${c.keywords ?? ""}`.toLowerCase().includes(query) : cat === "alle" || c.category === cat))
  }, [cat, q])

  const showBuild = !q && (cat === "bygg" || cat === "alle")

  return (
    <div className="library">
      <div className="search">
        <Search size={15} aria-hidden />
        <input placeholder="Søk: sofa, stikkontakt, sluk …" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Søk i biblioteket" />
        {q && (
          <button className="icon-btn sm" onClick={() => setQ("")} aria-label="Tøm søket">
            <X size={14} />
          </button>
        )}
      </div>
      {!q && (
        <div className="chips" role="tablist" aria-label="Kategorier">
          {(
            [
              { id: "bygg", name: "Bygg" },
              ...CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
              { id: "alle", name: "Alle" },
            ] as { id: Cat; name: string }[]
          ).map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} className={`chip ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="library-scroll">
        {showBuild && (
          <>
            <h4 className="lib-head">Dører og vinduer</h4>
            <div className="cards">
              {(Object.keys(OPENING_DEFAULTS) as OpeningKind[]).map((k) => {
                const on = tool.type === "opening" && tool.kind === k
                const d = OPENING_DEFAULTS[k]
                return (
                  <button key={k} className={`card ${on ? "on" : ""}`} onClick={() => setTool({ type: "opening", kind: k })}>
                    <svg viewBox="0 0 24 24" className="thumb" aria-hidden>
                      <path d={OPENING_ICONS[k]} fill="none" className="op-icon" />
                    </svg>
                    <span className="card-name">{d.name}</span>
                    <span className="card-size">{d.width} cm</span>
                  </button>
                )
              })}
            </div>
            <h4 className="lib-head">Rør og kabler</h4>
            <div className="cards">
              {RUN_SYSTEMS.map((r) => {
                const on = tool.type === "run" && tool.system === r.id
                return (
                  <button key={r.id} className={`card ${on ? "on" : ""}`} onClick={() => setTool({ type: "run", system: r.id })}>
                    <svg viewBox="0 0 24 24" className="thumb" aria-hidden>
                      <path d="M3 7 H12 a4 4 0 0 1 4 4 V21" fill="none" stroke={r.color} strokeWidth={r.id === "avlop" ? 4 : 2.2} strokeLinecap="round" strokeDasharray={r.id === "el" || r.id === "data" ? "3 2.5" : undefined} />
                    </svg>
                    <span className="card-name">{r.name}</span>
                    <span className="card-size">Ø{r.diameter} mm</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
        {(cat !== "bygg" || q) && (
          <div className="cards">
            {items.map((c) => {
              const on = tool.type === "item" && tool.catalogId === c.id
              return (
                <button
                  key={c.id}
                  className={`card ${on ? "on" : ""}`}
                  onClick={() => setTool({ type: "item", catalogId: c.id })}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-tuft-item", c.id)
                    e.dataTransfer.effectAllowed = "copy"
                  }}
                  title={`${c.name}, ${c.w} × ${c.d} × ${c.h} cm`}
                >
                  <CatalogThumb c={c} />
                  <span className="card-name">{c.name}</span>
                  <span className="card-size">
                    {c.w}×{c.d}
                  </span>
                </button>
              )
            })}
            {!items.length && <p className="empty">Fant ingenting som heter «{q}».</p>}
          </div>
        )}
      </div>
    </div>
  )
}
