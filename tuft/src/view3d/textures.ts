// Small procedural textures drawn on a canvas, so the app needs no image files.
// Each texture covers 100 × 100 cm; geometry UVs are in metres.
import * as THREE from "three"

const cache = new Map<string, THREE.Texture>()

function canvasTexture(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement("canvas")
  c.width = c.height = size
  const g = c.getContext("2d")!
  draw(g, size)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  cache.set(key, t)
  return t
}

function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)))
  return `#${c.getHexString()}`
}

// deterministic pseudo-random so textures look the same every load
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function woodTexture(color: string) {
  return canvasTexture(`wood${color}`, 512, (g, s) => {
    const r = rng(7)
    const plankW = s / 5 // 20 cm wide planks
    for (let i = 0; i < 5; i++) {
      let y = -r() * s
      while (y < s) {
        const len = s * (0.6 + r() * 0.9)
        g.fillStyle = shade(color, (r() - 0.5) * 0.12)
        g.fillRect(i * plankW, y, plankW, len)
        // grain
        g.globalAlpha = 0.12
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = shade(color, -0.18)
          g.lineWidth = 1
          g.beginPath()
          const x = i * plankW + r() * plankW
          g.moveTo(x, y)
          g.bezierCurveTo(x + (r() - 0.5) * 8, y + len * 0.3, x + (r() - 0.5) * 8, y + len * 0.7, x + (r() - 0.5) * 6, y + len)
          g.stroke()
        }
        g.globalAlpha = 1
        g.fillStyle = shade(color, -0.25)
        g.fillRect(i * plankW, y, plankW, 1.5)
        y += len
      }
      g.fillStyle = shade(color, -0.22)
      g.fillRect(i * plankW, 0, 1.5, s)
    }
  })
}

export function tileTexture(color: string, tile = 2) {
  return canvasTexture(`tile${color}${tile}`, 512, (g, s) => {
    const r = rng(3)
    const n = tile * 2 // 30 × 60 cm tiles in a 100 cm square, approximately
    const tw = s / tile
    const th = s / n
    for (let y = 0; y < n; y++)
      for (let x = 0; x < tile; x++) {
        g.fillStyle = shade(color, (r() - 0.5) * 0.05)
        g.fillRect(x * tw, y * th, tw, th)
      }
    g.strokeStyle = shade(color, -0.12)
    g.lineWidth = 2
    for (let i = 0; i <= tile; i++) {
      g.beginPath()
      g.moveTo(i * tw, 0)
      g.lineTo(i * tw, s)
      g.stroke()
    }
    for (let i = 0; i <= n; i++) {
      g.beginPath()
      g.moveTo(0, i * th)
      g.lineTo(s, i * th)
      g.stroke()
    }
  })
}

export function noiseTexture(color: string, strength = 0.08) {
  return canvasTexture(`noise${color}${strength}`, 256, (g, s) => {
    const r = rng(11)
    g.fillStyle = color
    g.fillRect(0, 0, s, s)
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = shade(color, (r() - 0.5) * strength * 2)
      g.globalAlpha = 0.5
      const z = 1 + r() * 3
      g.fillRect(r() * s, r() * s, z, z)
    }
    g.globalAlpha = 1
  })
}

/** Exterior cladding: vertical or horizontal boards (20 cm), render or brick. */
export function claddingTexture(color: string, style: "staende" | "liggende" | "puss" | "tegl" = "staende") {
  if (style === "puss") return noiseTexture(color, 0.05)
  return canvasTexture(`clad${color}${style}`, 512, (g, s) => {
    const r = rng(5)
    if (style === "tegl") {
      // 25 × 6.5 cm bricks with 1 cm joints: 4 across, ~13 rows per metre
      g.fillStyle = shade(color, 0.25)
      g.fillRect(0, 0, s, s)
      const rows = 13
      const rh = s / rows
      const bw = s / 4
      for (let y = 0; y < rows; y++)
        for (let x = -1; x < 5; x++) {
          g.fillStyle = shade(color, (r() - 0.5) * 0.14)
          const ox = (y % 2) * (bw / 2)
          g.fillRect(x * bw + ox + 2, y * rh + 2, bw - 4, rh - 4)
        }
      return
    }
    const n = 5
    const bw = s / n
    for (let i = 0; i < n; i++) {
      const tone = shade(color, (r() - 0.5) * 0.04)
      const dark = shade(color, -0.2)
      const light = shade(color, 0.06)
      if (style === "staende") {
        g.fillStyle = tone
        g.fillRect(i * bw, 0, bw, s)
        g.fillStyle = dark
        g.fillRect(i * bw, 0, 3, s)
        g.fillStyle = light
        g.fillRect(i * bw + 3, 0, 2, s)
      } else {
        g.fillStyle = tone
        g.fillRect(0, i * bw, s, bw)
        g.fillStyle = dark
        g.fillRect(0, i * bw + bw - 4, s, 4)
        g.fillStyle = light
        g.fillRect(0, i * bw, s, 2)
      }
    }
  })
}

/** Roofing, 1 × 1 m. v runs down the slope. */
export function roofTexture(material: "betong" | "tegl" | "shingel" | "stal" | "torv", color: string) {
  return canvasTexture(`roof${material}${color}`, 512, (g, s) => {
    const r = rng(9)
    g.fillStyle = color
    g.fillRect(0, 0, s, s)
    if (material === "stal") {
      // standing seams every 50 cm
      for (let i = 0; i < 2; i++) {
        g.fillStyle = shade(color, 0.12)
        g.fillRect(i * (s / 2), 0, 4, s)
        g.fillStyle = shade(color, -0.15)
        g.fillRect(i * (s / 2) + 4, 0, 3, s)
      }
      return
    }
    if (material === "torv") {
      for (let i = 0; i < 5000; i++) {
        g.fillStyle = shade(color, (r() - 0.5) * 0.3)
        g.fillRect(r() * s, r() * s, 2 + r() * 4, 2 + r() * 4)
      }
      return
    }
    const rows = material === "shingel" ? 7 : 3 // tile courses per metre
    const cols = material === "shingel" ? 3 : 3
    const rh = s / rows
    const cw = s / cols
    for (let y = 0; y < rows; y++)
      for (let x = -1; x <= cols; x++) {
        const ox = material === "shingel" ? (y % 2) * (cw / 2) : 0
        const grad = g.createLinearGradient(0, y * rh, 0, (y + 1) * rh)
        grad.addColorStop(0, shade(color, -0.08 + (r() - 0.5) * 0.05))
        grad.addColorStop(1, shade(color, 0.06 + (r() - 0.5) * 0.05))
        g.fillStyle = grad
        if (material === "shingel") g.fillRect(x * cw + ox + 1, y * rh, cw - 2, rh - 2)
        else {
          // rounded tile profile
          g.beginPath()
          g.moveTo(x * cw, y * rh)
          g.lineTo(x * cw + cw, y * rh)
          g.lineTo(x * cw + cw, (y + 1) * rh - 6)
          g.quadraticCurveTo(x * cw + cw / 2, (y + 1) * rh + 4, x * cw, (y + 1) * rh - 6)
          g.closePath()
          g.fill()
          g.fillStyle = shade(color, -0.25)
          g.fillRect(x * cw + cw - 2, y * rh, 2, rh)
        }
      }
  })
}

export function floorTexture(id: string, color: string) {
  if (id === "eik" || id === "ask" || id === "valnott" || id === "vinyl") return woodTexture(color)
  if (id === "flis-lys" || id === "flis-mork") return tileTexture(color)
  if (id === "betong") return noiseTexture(color, 0.06)
  return noiseTexture(color, 0.12)
}
