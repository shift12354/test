import { Eye, EyeOff, ImagePlus, Lock, Ruler, Trash, Unlock } from "lucide-react"
import { useRef, useState } from "react"

import { bounds } from "../model/geometry"
import type { Underlay } from "../model/types"
import { useStore } from "../store/store"
import { Section } from "./common"

const MAX_EDGE = 2200

function canvasToJpeg(c: HTMLCanvasElement, maxBytes = 900_000) {
  let q = 0.85
  let url = c.toDataURL("image/jpeg", q)
  while (url.length > maxBytes && q > 0.4) {
    q -= 0.1
    url = c.toDataURL("image/jpeg", q)
  }
  return url
}

async function imageFile(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error("Kunne ikke lese bildet."))
      i.src = url
    })
    const k = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement("canvas")
    c.width = Math.round(img.naturalWidth * k)
    c.height = Math.round(img.naturalHeight * k)
    const g = c.getContext("2d")!
    g.fillStyle = "#fff"
    g.fillRect(0, 0, c.width, c.height)
    g.drawImage(img, 0, 0, c.width, c.height)
    return { src: canvasToJpeg(c), w: c.width, h: c.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function pdfFile(file: File) {
  // pdf.js runs on the main thread here: importing the worker module registers it globally,
  // so no separate worker file is needed (the app ships as one HTML file).
  const pdfjs = await import("pdfjs-dist")
  await import("pdfjs-dist/build/pdf.worker.min.mjs")
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const doc = await task.promise
  const page = await doc.getPage(1)
  const base = page.getViewport({ scale: 1 })
  const scale = MAX_EDGE / Math.max(base.width, base.height)
  const vp = page.getViewport({ scale })
  const c = document.createElement("canvas")
  c.width = Math.round(vp.width)
  c.height = Math.round(vp.height)
  const g = c.getContext("2d")!
  g.fillStyle = "#fff"
  g.fillRect(0, 0, c.width, c.height)
  await page.render({ canvas: c, canvasContext: g, viewport: vp }).promise
  const pages = doc.numPages
  await task.destroy()
  return { src: canvasToJpeg(c), w: c.width, h: c.height, pages }
}

export async function loadUnderlay(file: File): Promise<{ src: string; w: number; h: number; pages?: number }> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return pdfFile(file)
  if (file.type.startsWith("image/")) return imageFile(file)
  throw new Error("Bruk et bilde (PNG eller JPG) eller en PDF.")
}

export function UnderlaySection() {
  const project = useStore((s) => s.project)
  const levelId = useStore((s) => s.levelId)
  const update = useStore((s) => s.update)
  const setTool = useStore((s) => s.setTool)
  const u = project.underlays?.[levelId]
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const patch = (p: Partial<Underlay>) =>
    update((pr) => {
      const cur = pr.underlays?.[levelId]
      if (!cur) return pr
      return { ...pr, underlays: { ...pr.underlays, [levelId]: { ...cur, ...p } } }
    })

  const onFile = async (file: File) => {
    setBusy(true)
    setMsg(null)
    try {
      const img = await loadUnderlay(file)
      // Start roughly the size of the house (or 12 m wide) so it is visible; calibration sets the real scale.
      const st = useStore.getState()
      const pts = st.project.walls.filter((w) => w.level === levelId).flatMap((w) => [w.a, w.b])
      const b = pts.length ? bounds(pts) : { minX: 0, minY: 0, w: 1200, h: 900 }
      const width = Math.max(600, b.w * 1.2)
      const height = (width * img.h) / img.w
      const und: Underlay = { src: img.src, name: file.name, x: b.minX - b.w * 0.1, y: b.minY - b.h * 0.1, width, height, opacity: 0.55, visible: true, locked: false }
      update((pr) => ({ ...pr, underlays: { ...pr.underlays, [levelId]: und } }))
      setTool({ type: "calibrate" })
      if (img.pages && img.pages > 1) setMsg(`PDF-en har ${img.pages} sider. Første side er lagt inn.`)
    } catch (e) {
      setMsg((e as Error).message || "Kunne ikke lese filen.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Plantegning under">
      <input
        ref={fileRef}
        id="underlay-file"
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
          e.target.value = ""
        }}
      />
      {!u ? (
        <>
          <p className="note">Har du en tegning fra arkitekt, megler eller kommunen? Legg den inn og tegn veggene oppå.</p>
          <button className="btn ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
            <ImagePlus size={15} /> {busy ? "Leser filen …" : "Legg inn bilde eller PDF"}
          </button>
        </>
      ) : (
        <div className="underlay">
          <div className="underlay-thumb" style={{ backgroundImage: `url(${u.src})` }} aria-hidden />
          <div className="underlay-meta">
            <span className="underlay-name">{u.name}</span>
            <span className="sub mono">
              {(u.width / 100).toFixed(2).replace(".", ",")} × {(u.height / 100).toFixed(2).replace(".", ",")} m
            </span>
          </div>
          <label className="slider">
            <span className="field-label">Gjennomsiktighet</span>
            <input id="underlay-opacity" type="range" min={0.1} max={1} step={0.05} value={u.opacity} onChange={(e) => patch({ opacity: Number(e.target.value) })} />
          </label>
          <div className="row-btns">
            <button className="btn ghost" onClick={() => setTool({ type: "calibrate" })}>
              <Ruler size={15} /> Sett målestokk
            </button>
            <button className="btn ghost" onClick={() => patch({ locked: !u.locked })} aria-pressed={!u.locked}>
              {u.locked ? <Unlock size={15} /> : <Lock size={15} />} {u.locked ? "Flytt bildet" : "Lås bildet"}
            </button>
            <button className="icon-btn" onClick={() => patch({ visible: !u.visible })} aria-label={u.visible ? "Skjul tegningen" : "Vis tegningen"} title={u.visible ? "Skjul" : "Vis"}>
              {u.visible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button
              className="icon-btn"
              aria-label="Fjern tegningen"
              title="Fjern"
              onClick={() =>
                update((pr) => {
                  const rest = { ...pr.underlays }
                  delete rest[levelId]
                  return { ...pr, underlays: rest }
                })
              }
            >
              <Trash size={16} />
            </button>
          </div>
          {!u.locked && <p className="note">Dra i bildet i planen for å flytte det. Lås det når det ligger riktig.</p>}
        </div>
      )}
      {msg && <p className="note warn-text">{msg}</p>}
    </Section>
  )
}
