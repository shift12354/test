// Plan symbols, drawn in the item's local frame (cm). The back of the item is
// at -y, the front at +y. Electrical and plumbing symbols have a fixed size so
// they read like the symbols on a drawing, whatever the catalogue size.
import type { ReactNode } from "react"

import type { CatalogItem } from "../model/catalog"

const S = 26 // symbol size for technical points, cm

type P = { c: CatalogItem; w: number; d: number }

function R({ x, y, w, h, r = 0, cls, dash }: { x: number; y: number; w: number; h: number; r?: number; cls?: string; dash?: boolean }) {
  return <rect x={x} y={y} width={Math.max(0.5, w)} height={Math.max(0.5, h)} rx={r} className={cls} strokeDasharray={dash ? "6 4" : undefined} />
}

function Label({ text, size = 12, y = 0 }: { text: string; size?: number; y?: number }) {
  return (
    <text x={0} y={y} className="sym-text" fontSize={size} textAnchor="middle" dominantBaseline="central">
      {text}
    </text>
  )
}

function furniture({ c, w, d }: P): ReactNode {
  const x0 = -w / 2
  const y0 = -d / 2
  switch (c.model) {
    case "sofa":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={8} />
          <R x={x0} y={y0} w={w} h={20} r={6} />
          <R x={x0} y={y0} w={16} h={d} r={6} />
          <R x={w / 2 - 16} y={y0} w={16} h={d} r={6} />
          {Array.from({ length: Math.max(1, Math.round((w - 32) / 65)) - 1 }, (_, i) => {
            const n = Math.max(1, Math.round((w - 32) / 65))
            const x = x0 + 16 + ((w - 32) / n) * (i + 1)
            return <line key={i} x1={x} y1={y0 + 20} x2={x} y2={d / 2 - 4} />
          })}
        </>
      )
    case "sofaCorner":
      return (
        <>
          <path d={`M${x0} ${y0} H${w / 2} V${d / 2} H${w / 2 - 92} V${y0 + 92} H${x0} Z`} />
          <path d={`M${x0} ${y0 + 20} H${w / 2 - 20} V${d / 2}`} />
          <line x1={w / 2 - 92} y1={y0 + 92} x2={w / 2 - 20} y2={y0 + 92} />
        </>
      )
    case "armchair":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={10} />
          <R x={x0} y={y0} w={w} h={18} r={8} />
          <R x={x0} y={y0} w={13} h={d} r={6} />
          <R x={w / 2 - 13} y={y0} w={13} h={d} r={6} />
        </>
      )
    case "coffeeTable":
    case "table":
    case "desk":
    case "bench":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={c.model === "coffeeTable" ? 6 : 3} />
          {c.model === "desk" && <R x={x0 + 4} y={y0 + 4} w={w * 0.35} h={d - 8} r={2} cls="sym-faint" />}
        </>
      )
    case "roundTable":
      return <ellipse cx={0} cy={0} rx={w / 2} ry={d / 2} />
    case "chair":
      return (
        <>
          <R x={x0} y={y0 + 6} w={w} h={d - 6} r={6} />
          <R x={x0 + 2} y={y0} w={w - 4} h={8} r={3} />
        </>
      )
    case "officeChair":
      return (
        <>
          <circle r={Math.min(w, d) / 2 - 4} />
          <path d={`M${-w / 2 + 6} ${-d / 2 + 10} Q0 ${-d / 2 - 4} ${w / 2 - 6} ${-d / 2 + 10}`} />
        </>
      )
    case "bed":
    case "crib": {
      const pillows = w >= 140 ? 2 : 1
      const pw = (w - 16 - (pillows - 1) * 6) / pillows
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={4} />
          {c.model === "bed" && <R x={x0} y={y0} w={w} h={10} r={2} cls="sym-faint" />}
          {Array.from({ length: pillows }, (_, i) => (
            <R key={i} x={x0 + 8 + i * (pw + 6)} y={y0 + 16} w={pw} h={30} r={8} />
          ))}
          <path d={`M${x0} ${y0 + d * 0.38} H${w / 2}`} />
          <path d={`M${x0} ${y0 + d * 0.38} L${x0 + w * 0.25} ${y0 + d * 0.38 + 18} H${w / 2}`} className="sym-faint" />
        </>
      )
    }
    case "nightstand":
    case "dresser":
    case "tvBench":
    case "baseCabinet":
    case "island":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={2} />
          <line x1={x0} y1={d / 2 - 4} x2={w / 2} y2={d / 2 - 4} />
        </>
      )
    case "tallCabinet":
    case "wardrobe":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={1} />
          <line x1={x0} y1={y0} x2={w / 2} y2={d / 2} className="sym-faint" />
          <line x1={x0} y1={d / 2} x2={w / 2} y2={y0} className="sym-faint" />
        </>
      )
    case "wallCabinet":
    case "hood":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={1} dash />
          {c.model === "hood" && <line x1={x0} y1={y0} x2={w / 2} y2={d / 2} className="sym-faint" />}
        </>
      )
    case "shelf":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={1} />
          {[0.25, 0.5, 0.75].map((t) => (
            <line key={t} x1={x0 + w * t} y1={y0} x2={x0 + w * t} y2={d / 2} className="sym-faint" />
          ))}
        </>
      )
    case "rug":
      return <R x={x0} y={y0} w={w} h={d} r={2} dash />
    case "plant":
      return (
        <>
          <circle r={w / 2} className="sym-faint" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={0} cy={-w / 4} rx={w / 7} ry={w / 4} transform={`rotate(${a})`} />
          ))}
        </>
      )
    case "floorLamp":
      return (
        <>
          <circle r={w / 2} />
          <circle r={w / 6} />
        </>
      )
    case "stove":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={6} />
          <circle r={Math.min(w, d) / 3.5} />
        </>
      )
    case "tv":
    case "mirror":
      return <R x={x0} y={y0} w={w} h={Math.max(d, 4)} r={1} />
    case "fridge":
    case "dishwasher":
    case "washer":
    case "dryer":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={2} />
          {(c.model === "washer" || c.model === "dryer") && <circle r={Math.min(w, d) / 3} className="sym-faint" />}
          <Label text={{ fridge: "KJ", dishwasher: "OV", washer: "VM", dryer: "TT" }[c.model] ?? ""} size={14} />
        </>
      )
    case "range":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={2} />
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([sx, sy]) => (
            <circle key={`${sx}${sy}`} cx={(sx * w) / 4.5} cy={(sy * d) / 4.5} r={Math.min(w, d) / 7} />
          ))}
        </>
      )
    case "kitchenSink":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={2} />
          <R x={x0 + 10} y={y0 + 10} w={w - 20} h={d - 22} r={8} />
          <circle cx={0} cy={y0 + 6} r={2.5} />
        </>
      )
    case "toilet":
      return (
        <>
          <R x={x0} y={y0} w={w} h={16} r={3} />
          <ellipse cx={0} cy={y0 + 16 + (d - 16) / 2} rx={w / 2 - 2} ry={(d - 16) / 2} />
        </>
      )
    case "vanity":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={3} />
          <ellipse cx={0} cy={2} rx={w / 2 - 12} ry={d / 2 - 10} />
          <circle cx={0} cy={y0 + 6} r={2.5} />
        </>
      )
    case "shower":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={1} />
          <line x1={x0} y1={y0} x2={w / 2} y2={d / 2} className="sym-faint" />
          <line x1={x0} y1={d / 2} x2={w / 2} y2={y0} className="sym-faint" />
          <path d={`M${x0} ${d / 2} A ${Math.min(w, d) * 0.9} ${Math.min(w, d) * 0.9} 0 0 1 ${w / 2} ${d / 2 - Math.min(w, d) * 0.9}`} strokeDasharray="5 4" />
        </>
      )
    case "bathtub":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={4} />
          <R x={x0 + 8} y={y0 + 8} w={w - 16} h={d - 16} r={Math.min(w, d) / 2 - 8} />
        </>
      )
    case "towelRail":
      return (
        <>
          <R x={x0} y={y0} w={w} h={d} r={1} />
          <line x1={x0 + 6} y1={0} x2={w / 2 - 6} y2={0} />
        </>
      )
    default:
      return <R x={x0} y={y0} w={w} h={d} r={2} />
  }
}

function technical({ c }: P): ReactNode {
  const s = S / 2
  switch (c.model) {
    case "outlet":
    case "outletDouble":
      return (
        <>
          <line x1={-s} y1={-s + 2} x2={s} y2={-s + 2} />
          <path d={`M${-s * 0.62} ${-s + 2} A ${s * 0.62} ${s * 0.62} 0 0 0 ${s * 0.62} ${-s + 2}`} />
          {c.model === "outlet" ? (
            <line x1={0} y1={-s + 2 + s * 0.62} x2={0} y2={s} />
          ) : (
            <>
              <line x1={-4} y1={-s + 2 + s * 0.6} x2={-4} y2={s} />
              <line x1={4} y1={-s + 2 + s * 0.6} x2={4} y2={s} />
            </>
          )}
        </>
      )
    case "data":
      return <path d={`M0 ${-s + 2} L${s * 0.7} ${s * 0.5} H${-s * 0.7} Z`} />
    case "switch":
      return (
        <>
          <circle cx={0} cy={-s + 7} r={5} />
          <path d={`M3.5 ${-s + 10.5} L${s * 0.75} ${s * 0.5} l4 -4`} />
        </>
      )
    case "thermostat":
      return (
        <>
          <R x={-s * 0.7} y={-s + 2} w={s * 1.4} h={s * 1.1} r={2} />
          <Label text="T" size={11} y={-s + 2 + s * 0.55} />
        </>
      )
    case "ceilingLamp":
      return (
        <>
          <circle r={s} />
          <line x1={-s * 0.7} y1={-s * 0.7} x2={s * 0.7} y2={s * 0.7} />
          <line x1={s * 0.7} y1={-s * 0.7} x2={-s * 0.7} y2={s * 0.7} />
        </>
      )
    case "spot":
      return (
        <>
          <circle r={s * 0.7} />
          <circle r={s * 0.28} className="sym-fill" />
        </>
      )
    case "wallLamp":
      return (
        <>
          <line x1={-s} y1={-s + 2} x2={s} y2={-s + 2} />
          <path d={`M${-s * 0.7} ${-s + 2} A ${s * 0.7} ${s * 0.7} 0 0 0 ${s * 0.7} ${-s + 2}`} />
          <line x1={-s * 0.45} y1={-s + 4} x2={s * 0.45} y2={-s + 2 + s * 0.6} />
          <line x1={s * 0.45} y1={-s + 4} x2={-s * 0.45} y2={-s + 2 + s * 0.6} />
        </>
      )
    case "smoke":
      return (
        <>
          <circle r={s} />
          <Label text="R" size={14} />
        </>
      )
    case "panel":
      return (
        <>
          <R x={-30} y={-7.5} w={60} h={15} />
          <path d="M-30 7.5 L30 -7.5 V7.5 Z" className="sym-fill" />
        </>
      )
    case "panelHeater":
    case "heatPump":
    case "towelRail":
      return (
        <>
          <R x={-50} y={-4} w={100} h={8} />
          <path d="M-40 0 l6 -3 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 3" />
        </>
      )
    case "evCharger":
      return (
        <>
          <R x={-s * 0.8} y={-s + 2} w={s * 1.6} h={s * 1.4} r={3} />
          <path d={`M2 ${-s + 6} L-4 ${-1} H3 L-2 ${s * 0.6}`} />
        </>
      )
    case "drain":
      return (
        <>
          <R x={-10} y={-10} w={20} h={20} />
          <circle r={6} />
          <line x1={-6} y1={0} x2={6} y2={0} />
          <line x1={0} y1={-6} x2={0} y2={6} />
        </>
      )
    case "tap":
      return (
        <>
          <circle cx={-6} cy={-s + 9} r={5} className="sym-cold" />
          <circle cx={6} cy={-s + 9} r={5} className="sym-hot" />
        </>
      )
    case "waterHeater":
      return (
        <>
          <circle r={28} />
          <Label text="VVB" size={14} />
        </>
      )
    case "manifold":
      return (
        <>
          <R x={-30} y={-7.5} w={60} h={15} r={2} />
          {[-15, 0, 15].map((x) => (
            <line key={x} x1={x} y1={-7.5} x2={x} y2={7.5} />
          ))}
        </>
      )
    case "stopValve":
      return <path d={`M${-s * 0.6} ${-s * 0.4} L${s * 0.6} ${s * 0.4} V${-s * 0.4} L${-s * 0.6} ${s * 0.4} Z`} />
    case "waterMeter":
      return (
        <>
          <circle r={s * 0.7} />
          <Label text="M" size={12} />
        </>
      )
    default:
      return <circle r={s * 0.6} />
  }
}

export function ItemSymbol({ c, w, d }: P) {
  const isTechnical = c.layer !== "interior"
  return <g className={`sym sym-${c.layer}`}>{isTechnical ? technical({ c, w, d }) : furniture({ c, w, d })}</g>
}

/** Small preview used in the catalogue grid. */
export function CatalogThumb({ c }: { c: CatalogItem }) {
  const technicalItem = c.layer !== "interior"
  const size = technicalItem ? 34 : Math.max(c.w, c.d) * 1.12
  return (
    <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className="thumb" aria-hidden>
      <ItemSymbol c={c} w={c.w} d={c.d} />
    </svg>
  )
}
