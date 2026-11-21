// Procedural 3D models for the catalogue, built from boxes and cylinders.
// Units are cm. The origin is the centre of the footprint at the bottom of the
// item; the back is at -z. Ceiling items hang down from the origin.
import { useMemo } from "react"
import * as THREE from "three"

import type { CatalogItem } from "../model/catalog"

const matCache = new Map<string, THREE.Material>()
export function mat(color: string, opts: { rough?: number; metal?: number; emissive?: string; opacity?: number; intensity?: number } = {}) {
  const key = `${color}|${opts.rough ?? 0.75}|${opts.metal ?? 0}|${opts.emissive ?? ""}|${opts.opacity ?? 1}|${opts.intensity ?? 1}`
  let m = matCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.75,
      metalness: opts.metal ?? 0,
      emissive: new THREE.Color(opts.emissive ?? "#000000"),
      emissiveIntensity: opts.emissive ? (opts.intensity ?? 1) : 0,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      depthWrite: (opts.opacity ?? 1) >= 1,
    })
    matCache.set(key, m)
  }
  return m
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1)
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 24)
const sphereGeo = new THREE.IcosahedronGeometry(1, 2)
const coneGeo = new THREE.CylinderGeometry(0.45, 1, 1, 24, 1, true)

type BoxP = { x?: number; y?: number; z?: number; w: number; h: number; d: number; m: THREE.Material; rx?: number; ry?: number; rz?: number }
/** Box with its bottom at y. */
function B({ x = 0, y = 0, z = 0, w, h, d, m, rx = 0, ry = 0, rz = 0 }: BoxP) {
  return <mesh geometry={boxGeo} material={m} position={[x, y + h / 2, z]} scale={[Math.max(w, 0.1), Math.max(h, 0.1), Math.max(d, 0.1)]} rotation={[rx, ry, rz]} castShadow receiveShadow />
}
/** Vertical cylinder with its bottom at y. */
function C({ x = 0, y = 0, z = 0, r, h, m, rx = 0, rz = 0 }: { x?: number; y?: number; z?: number; r: number; h: number; m: THREE.Material; rx?: number; rz?: number }) {
  return <mesh geometry={cylGeo} material={m} position={[x, y + h / 2, z]} scale={[r, h, r]} rotation={[rx, 0, rz]} castShadow receiveShadow />
}
function Sph({ x = 0, y = 0, z = 0, r, m, sy = 1 }: { x?: number; y?: number; z?: number; r: number; m: THREE.Material; sy?: number }) {
  return <mesh geometry={sphereGeo} material={m} position={[x, y, z]} scale={[r, r * sy, r]} castShadow receiveShadow />
}

function Legs({ w, d, h, m, inset = 4, r = 2 }: { w: number; d: number; h: number; m: THREE.Material; inset?: number; r?: number }) {
  return (
    <>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <C key={`${sx}${sz}`} x={sx * (w / 2 - inset)} z={sz * (d / 2 - inset)} r={r} h={h} m={m} />
      ))}
    </>
  )
}

const WHITE = "#f4f3ef"
const STEEL = "#b9bcc0"
const DARK = "#2a2b2e"
const OAK = "#b08a5e"
const WORKTOP = "#3b3a38"

export function ItemModel({ c, w, d, h, color, lit }: { c: CatalogItem; w: number; d: number; h: number; color: string; lit: boolean }) {
  const body = mat(color)
  const steel = mat(STEEL, { rough: 0.35, metal: 0.6 })
  const dark = mat(DARK, { rough: 0.5 })
  const white = mat(WHITE, { rough: 0.6 })
  const glow = mat("#fff4d6", { emissive: lit ? "#ffd89a" : "#000000", intensity: lit ? 2.2 : 0, rough: 0.4 })
  const x0 = -w / 2
  const z0 = -d / 2
  const books = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ c: ["#7a4b3a", "#2f5a7a", "#c9a23f", "#3f6b4f", "#a64b4b", "#e8e1d4"][i % 6], h: 18 + ((i * 7) % 9), w: 3 + (i % 3) })), [])

  switch (c.model) {
    case "sofa":
    case "armchair": {
      const arm = c.model === "sofa" ? 16 : 13
      const cushions = c.model === "sofa" ? Math.max(1, Math.round((w - 2 * arm) / 65)) : 1
      const cw = (w - 2 * arm) / cushions
      return (
        <group>
          <B y={6} w={w} h={34} d={d} m={body} />
          <B y={6} z={z0 + 10} w={w} h={h - 6} d={20} m={body} />
          <B y={6} x={x0 + arm / 2} w={arm} h={58} d={d} m={body} />
          <B y={6} x={-x0 - arm / 2} w={arm} h={58} d={d} m={body} />
          {Array.from({ length: cushions }, (_, i) => (
            <B key={i} y={40} x={x0 + arm + cw * (i + 0.5)} z={5} w={cw - 2} h={8} d={d - 24} m={mat(color, { rough: 0.95 })} />
          ))}
          <Legs w={w} d={d} h={6} m={dark} inset={6} r={2} />
        </group>
      )
    }
    case "sofaCorner":
      return (
        <group>
          <B y={6} z={z0 + 46} w={w} h={36} d={92} m={body} />
          <B y={6} x={w / 2 - 46} z={z0 + 92 + (d - 92) / 2} w={92} h={36} d={d - 92} m={body} />
          <B y={6} z={z0 + 10} w={w} h={h - 6} d={20} m={body} />
          <B y={6} x={w / 2 - 10} z={0} w={20} h={h - 6} d={d} m={body} />
          <B y={6} x={x0 + 8} z={z0 + 46} w={16} h={56} d={92} m={body} />
          <Legs w={w} d={92} h={6} m={dark} inset={8} />
        </group>
      )
    case "coffeeTable":
    case "table":
    case "desk": {
      const wood = mat(color, { rough: 0.6 })
      return (
        <group>
          <B y={h - 4} w={w} h={4} d={d} m={wood} />
          <Legs w={w} d={d} h={h - 4} m={c.model === "desk" ? mat(DARK) : wood} inset={6} r={c.model === "coffeeTable" ? 2.5 : 2.2} />
        </group>
      )
    }
    case "roundTable":
      return (
        <group>
          <C y={h - 4} r={w / 2} h={4} m={body} />
          <C r={4} h={h - 4} m={body} />
          <C r={w / 4} h={2} m={body} />
        </group>
      )
    case "chair":
      return (
        <group>
          <B y={44} z={3} w={w} h={4} d={d - 6} m={body} />
          <B y={48} z={z0 + 2} w={w - 4} h={36} d={3} m={body} />
          <Legs w={w} d={d - 6} h={44} m={mat(OAK)} inset={3} r={1.5} />
        </group>
      )
    case "bench":
      return (
        <group>
          <B y={h - 4} w={w} h={4} d={d} m={body} />
          <B x={x0 + 10} w={4} h={h - 4} d={d - 6} m={body} />
          <B x={-x0 - 10} w={4} h={h - 4} d={d - 6} m={body} />
        </group>
      )
    case "bed":
    case "crib": {
      const pillows = w >= 140 ? 2 : 1
      const pw = (w - 16 - (pillows - 1) * 6) / pillows
      return (
        <group>
          <B y={8} w={w} h={c.model === "crib" ? 20 : 26} d={d} m={mat(OAK, { rough: 0.6 })} />
          <B y={34} z={4} w={w - 6} h={20} d={d - 14} m={mat("#f7f6f3", { rough: 0.95 })} />
          <B y={8} z={z0 + 4} w={w} h={h - 8} d={8} m={mat(c.model === "crib" ? WHITE : "#8f8a80", { rough: 0.9 })} />
          {Array.from({ length: pillows }, (_, i) => (
            <B key={i} y={54} x={x0 + 8 + pw * (i + 0.5) + i * 6} z={z0 + 30} w={pw} h={12} d={34} m={mat("#ffffff", { rough: 1 })} />
          ))}
          <B y={54} z={z0 + d * 0.62} w={w - 4} h={6} d={d * 0.64} m={mat(color === "#e8e3da" ? "#9fb0b8" : color, { rough: 1 })} />
          <Legs w={w} d={d} h={8} m={dark} inset={8} />
        </group>
      )
    }
    case "nightstand":
    case "dresser": {
      const rows = c.model === "dresser" ? 3 : 1
      return (
        <group>
          <B y={6} w={w} h={h - 6} d={d} m={body} />
          {Array.from({ length: rows }, (_, i) => (
            <B key={i} y={10 + ((h - 14) / rows) * i + (h - 14) / rows / 2} z={d / 2} w={w * 0.3} h={1.5} d={1.5} m={steel} />
          ))}
          <Legs w={w} d={d} h={6} m={dark} inset={4} r={1.5} />
        </group>
      )
    }
    case "wardrobe":
    case "tallCabinet":
      return (
        <group>
          <B w={w} h={h} d={d} m={body} />
          {w >= 80 && <B y={10} z={d / 2} w={0.6} h={h - 20} d={0.4} m={mat("#cfcac0")} />}
          <B y={h * 0.45} x={w >= 80 ? -3 : w / 2 - 6} z={d / 2 + 0.8} w={1.5} h={24} d={1.5} m={steel} />
          {w >= 80 && <B y={h * 0.45} x={3} z={d / 2 + 0.8} w={1.5} h={24} d={1.5} m={steel} />}
        </group>
      )
    case "shelf":
      return (
        <group>
          <B x={x0 + 1} w={2} h={h} d={d} m={body} />
          <B x={-x0 - 1} w={2} h={h} d={d} m={body} />
          <B z={z0 + 0.5} w={w} h={h} d={1} m={body} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <B key={i} y={(h - 2) * (i / 5)} w={w} h={2} d={d} m={body} />
          ))}
          {[0, 1, 2, 3, 4].map((row) => {
            let x = x0 + 4
            return books
              .filter((_, i) => (i + row) % 3 !== 0)
              .slice(0, 8)
              .map((b, i) => {
                const bx = x + b.w / 2
                x += b.w + 0.4
                return x < -x0 - 3 ? <B key={`${row}-${i}`} x={bx} y={((h - 2) * row) / 5 + 2} z={-2} w={b.w} h={b.h} d={d - 8} m={mat(b.c)} /> : null
              })
          })}
        </group>
      )
    case "rug":
      return <B w={w} h={1} d={d} m={mat(color, { rough: 1 })} />
    case "plant":
      return (
        <group>
          <C r={w * 0.28} h={h * 0.3} m={mat("#c9b8a2", { rough: 0.9 })} />
          <Sph y={h * 0.55} r={w * 0.45} m={mat(color, { rough: 0.9 })} sy={1.1} />
          <Sph y={h * 0.78} x={6} r={w * 0.32} m={mat("#4f8f5c", { rough: 0.9 })} />
          <Sph y={h * 0.7} x={-8} z={4} r={w * 0.3} m={mat("#2f6b40", { rough: 0.9 })} />
        </group>
      )
    case "floorLamp":
      return (
        <group>
          <C r={w * 0.35} h={2} m={dark} />
          <C r={1} h={h - 30} m={dark} />
          <mesh geometry={coneGeo} material={glow} position={[0, h - 15, 0]} scale={[w / 2, 30, w / 2]} />
        </group>
      )
    case "stove":
      return (
        <group>
          <B w={w} h={h} d={d} m={dark} />
          <B y={30} z={d / 2} w={w * 0.7} h={h * 0.45} d={1} m={mat("#ff8a3d", { emissive: lit ? "#ff6a1a" : "#3a1a08", intensity: lit ? 1.5 : 0.6 })} />
          <C y={h} r={8} h={120} m={dark} />
        </group>
      )
    case "tv":
      return (
        <group>
          <B w={w} h={h} d={4} m={dark} />
          <B y={2} z={2.1} w={w - 3} h={h - 4} d={0.2} m={mat("#101215", { rough: 0.2, emissive: lit ? "#22324a" : undefined, intensity: 0.4 })} />
        </group>
      )
    case "tvBench":
      return (
        <group>
          <B y={10} w={w} h={h - 10} d={d} m={body} />
          <B y={14} z={d / 2} w={w - 4} h={0.5} d={0.5} m={mat("#cfcac0")} />
          <Legs w={w} d={d} h={10} m={dark} inset={8} r={1.5} />
        </group>
      )
    case "baseCabinet":
    case "dishwasher":
    case "kitchenSink":
    case "range":
    case "island": {
      const front = c.model === "range" ? dark : body
      return (
        <group>
          <B z={-1} w={w} h={10} d={d - 6} m={dark} />
          <B y={10} z={-1} w={w} h={h - 14} d={d - 2} m={front} />
          <B y={h - 4} w={w + (c.model === "island" ? 0 : 0)} h={4} d={d + (c.model === "island" ? 0 : 0)} m={mat(c.model === "island" ? OAK : WORKTOP, { rough: 0.45 })} />
          {c.model !== "range" && <B y={h - 12} z={d / 2} w={Math.min(w - 10, 40)} h={1.5} d={1.5} m={steel} />}
          {c.model === "kitchenSink" && (
            <>
              <B y={h - 3.5} z={2} w={w - 26} h={0.2} d={d - 26} m={mat("#8f9398", { rough: 0.25, metal: 0.8 })} />
              <C y={h} z={z0 + 8} r={1.6} h={26} m={steel} />
              <B y={h + 22} z={z0 + 16} w={2.5} h={2.5} d={18} m={steel} />
            </>
          )}
          {c.model === "range" && (
            <>
              <B y={h - 0.2} w={w - 4} h={0.4} d={d - 8} m={mat("#111214", { rough: 0.15 })} />
              <B y={22} z={d / 2 - 0.5} w={w - 14} h={30} d={0.6} m={mat("#1d1f22", { rough: 0.1, emissive: lit ? "#3a2410" : undefined, intensity: 0.5 })} />
              <B y={60} z={d / 2} w={w - 14} h={1.5} d={2} m={steel} />
            </>
          )}
          {c.model === "dishwasher" && <B y={10} z={d / 2 - 0.5} w={w - 2} h={0.5} d={0.6} m={mat("#d6d2ca")} />}
        </group>
      )
    }
    case "wallCabinet":
      return (
        <group>
          <B w={w} h={h} d={d} m={body} />
          <B y={4} x={w / 2 - 6} z={d / 2} w={1.5} h={12} d={1.5} m={steel} />
        </group>
      )
    case "fridge":
      return (
        <group>
          <B w={w} h={h} d={d} m={mat(color, { rough: 0.35, metal: 0.3 })} />
          <B y={h * 0.62} z={d / 2} w={w} h={0.6} d={0.6} m={dark} />
          <B y={h * 0.7} x={w / 2 - 5} z={d / 2 + 1} w={1.5} h={30} d={2} m={steel} />
          <B y={h * 0.35} x={w / 2 - 5} z={d / 2 + 1} w={1.5} h={30} d={2} m={steel} />
        </group>
      )
    case "hood":
      return (
        <group>
          <B w={w} h={10} d={d} m={steel} />
          <B x={0} z={z0 + 12} y={10} w={26} h={h + 40} d={22} m={steel} />
        </group>
      )
    case "toilet":
      return (
        <group>
          <B y={25} z={z0 + 8} w={w} h={20} d={16} m={white} />
          <mesh geometry={sphereGeo} material={white} position={[0, 34, 4]} scale={[w / 2 - 1, 12, (d - 16) / 2]} castShadow />
          <B y={40} z={4} w={w - 2} h={2} d={d - 18} m={white} />
          <B y={90} z={z0 + 0.5} w={22} h={14} d={1} m={mat("#e9e9e9", { rough: 0.3 })} />
        </group>
      )
    case "vanity":
      return (
        <group>
          <B y={30} w={w} h={h - 42} d={d} m={body} />
          <B y={h - 12} w={w} h={12} d={d} m={white} />
          <B y={h - 1} z={2} w={w - 24} h={1} d={d - 20} m={mat("#e8edef", { rough: 0.2 })} />
          <C y={h} z={z0 + 6} r={1.5} h={18} m={steel} />
          <B y={h + 14} z={z0 + 12} w={2} h={2} d={12} m={steel} />
        </group>
      )
    case "shower": {
      const glass = mat("#cfe3ec", { opacity: 0.28, rough: 0.05 })
      return (
        <group>
          <B w={w} h={2} d={d} m={mat("#dfe3e4", { rough: 0.5 })} />
          <B y={2} z={d / 2 - 0.5} w={w} h={h - 2} d={1} m={glass} />
          <B y={2} x={-w / 2 + 0.5} w={1} h={h - 2} d={d} m={glass} />
          <C x={w / 2 - 8} z={z0 + 4} y={0} r={1.2} h={h} m={steel} />
          <C x={w / 2 - 8} z={z0 + 18} y={h - 8} r={10} h={1.2} m={steel} />
        </group>
      )
    }
    case "bathtub":
      return (
        <group>
          <B w={w} h={h} d={d} m={white} />
          <B y={h - 0.5} w={w - 14} h={1} d={d - 14} m={mat("#e7ecee", { rough: 0.25 })} />
          <C x={x0 + 10} y={h} r={1.5} h={14} m={steel} />
        </group>
      )
    case "washer":
    case "dryer":
      return (
        <group>
          <B w={w} h={h} d={d} m={white} />
          <C y={40} z={d / 2} r={17} h={2} rx={Math.PI / 2} m={mat("#9fb3bd", { rough: 0.2, metal: 0.2 })} />
          <B y={h - 12} z={d / 2} w={w - 6} h={8} d={0.6} m={mat("#e2e2e0")} />
        </group>
      )
    case "mirror":
      return <B w={w} h={h} d={d} m={mat("#dfe8ec", { rough: 0.02, metal: 0.95 })} />
    case "towelRail":
      return (
        <group>
          <B x={x0 + 1.5} w={3} h={h} d={3} m={steel} />
          <B x={-x0 - 1.5} w={3} h={h} d={3} m={steel} />
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((t) => (
            <B key={t} y={h * t} w={w} h={2} d={2} m={steel} />
          ))}
        </group>
      )
    case "officeChair":
      return (
        <group>
          <B y={2} w={w * 0.9} h={2} d={4} m={dark} />
          <B y={2} w={4} h={2} d={d * 0.9} m={dark} />
          <C r={2.5} h={44} m={steel} />
          <B y={44} w={w * 0.8} h={8} d={d * 0.75} m={body} />
          <B y={52} z={-d / 2 + 6} w={w * 0.75} h={50} d={6} m={body} />
        </group>
      )
    // ---- electrical ----
    case "outlet":
    case "outletDouble":
    case "switch":
    case "data":
    case "thermostat":
      return (
        <group>
          <B z={0} w={Math.max(w, 9)} h={h} d={d} m={mat("#fbfbfa", { rough: 0.4 })} />
          {(c.model === "outlet" || c.model === "outletDouble") &&
            (c.model === "outlet" ? [0] : [-4, 4]).map((x) => <C key={x} x={x} y={h / 2} z={d / 2} r={2.8} h={0.6} rx={Math.PI / 2} m={mat("#e3e1dc")} />)}
          {c.model === "switch" && <B y={1.5} z={d / 2} w={6} h={6} d={0.8} m={mat("#f0efeb")} />}
          {c.model === "thermostat" && <B y={2} z={d / 2} w={5} h={3} d={0.4} m={mat("#1d2a3a", { emissive: "#4aa3ff", intensity: 0.6 })} />}
        </group>
      )
    case "ceilingLamp":
      return (
        <group>
          <C y={-2} r={5} h={2} m={white} />
          <C y={-60} r={0.4} h={58} m={dark} />
          <mesh geometry={coneGeo} material={mat(color === "#f4efe4" ? "#e9e2d2" : color, { rough: 0.6 })} position={[0, -68, 0]} scale={[w / 2, 18, w / 2]} castShadow />
          <Sph y={-74} r={4} m={glow} />
        </group>
      )
    case "spot":
      return (
        <group>
          <C y={-1} r={w / 2} h={1} m={white} />
          <C y={-1.4} r={w / 3} h={0.5} m={glow} />
        </group>
      )
    case "wallLamp":
      return (
        <group>
          <B z={z0 + 1} w={8} h={12} d={2} m={dark} />
          <mesh geometry={coneGeo} material={glow} position={[0, 12, 2]} scale={[w / 2, h - 5, w / 2]} />
        </group>
      )
    case "smoke":
      return (
        <group>
          <C y={-h} r={w / 2} h={h} m={white} />
          <C y={-h - 0.3} r={1} h={0.3} m={mat("#d33", { emissive: "#f33", intensity: 0.6 })} />
        </group>
      )
    case "panel":
      return (
        <group>
          <B w={w} h={h} d={d} m={mat("#ecebe7", { rough: 0.5 })} />
          <B y={h * 0.35} x={w / 2 - 6} z={d / 2} w={2} h={10} d={1} m={dark} />
        </group>
      )
    case "panelHeater":
      return (
        <group>
          <B y={0} w={w} h={h} d={d} m={white} />
          {Array.from({ length: Math.floor(w / 6) }, (_, i) => (
            <B key={i} y={h - 4} x={x0 + 4 + i * 6} z={0} w={1} h={2} d={d - 2} m={mat("#d8d8d4")} />
          ))}
        </group>
      )
    case "heatPump":
      return (
        <group>
          <B w={w} h={h} d={d} m={mat("#f6f6f3", { rough: 0.4 })} />
          <B y={2} z={d / 2} w={w - 10} h={4} d={0.6} m={mat("#cfd0cc")} />
        </group>
      )
    case "evCharger":
      return (
        <group>
          <B w={w} h={h} d={d} m={dark} />
          <B y={h - 8} z={d / 2} w={6} h={2} d={0.4} m={mat("#2a2", { emissive: "#3f3", intensity: 0.8 })} />
        </group>
      )
    // ---- plumbing ----
    case "drain":
      return <B y={0.2} w={w} h={0.4} d={d} m={mat("#9aa0a9", { rough: 0.3, metal: 0.7 })} />
    case "tap":
      return (
        <group>
          <C x={-5} y={0} r={2} h={8} m={mat("#1f7ae0")} rz={0} />
          <C x={5} y={0} r={2} h={8} m={mat("#e0483e")} />
          <B y={3} z={0} w={w} h={3} d={d} m={steel} />
        </group>
      )
    case "waterHeater":
      return (
        <group>
          <C r={w / 2} h={h} m={mat("#f4f4f2", { rough: 0.4 })} />
          <C y={h} r={w / 2 - 2} h={2} m={mat("#dcdcd8")} />
          <C y={h + 2} x={-10} r={1.2} h={20} m={mat("#1f7ae0", { rough: 0.4 })} />
          <C y={h + 2} x={10} r={1.2} h={20} m={mat("#e0483e", { rough: 0.4 })} />
        </group>
      )
    case "manifold":
      return (
        <group>
          <B w={w} h={h} d={d} m={mat("#f4f4f2", { rough: 0.5 })} />
          <B y={h * 0.3} z={d / 2} w={w - 10} h={2} d={1} m={mat("#1f7ae0")} />
          <B y={h * 0.6} z={d / 2} w={w - 10} h={2} d={1} m={mat("#e0483e")} />
        </group>
      )
    case "stopValve":
    case "waterMeter":
      return (
        <group>
          <C r={w / 3} h={h} m={mat(color, { rough: 0.4 })} />
          <B y={h} w={w} h={2} d={3} m={dark} />
        </group>
      )
    default:
      return <B w={w} h={h} d={d} m={body} />
  }
}
