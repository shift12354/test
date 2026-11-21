// Roof over the top level's outline, built as a few sloped planes.
// Units are cm, in 3D coordinates (x, y up, z = plan y).
import { useEffect, useMemo } from "react"
import * as THREE from "three"

import { bounds, wallJoints, wallPolygon } from "../model/geometry"
import type { Facade, Level, Roof, Wall } from "../model/types"
import { mat } from "./models"
import { claddingTexture, roofTexture } from "./textures"

export const DEFAULT_ROOF: Roof = { type: "saltak", pitch: 30, overhang: 50, material: "betong", color: "#3a3b3f", ridge: "auto" }
export const DEFAULT_FACADE: Facade = { style: "staende", trim: "#ffffff", plinth: 40 }

/** Outer footprint of a level's walls (exterior walls if any). */
export function footprint(walls: Wall[]) {
  const ext = walls.filter((w) => w.exterior)
  const use = ext.length ? ext : walls
  if (!use.length) return null
  const pts = use.flatMap((w) => {
    const { ea, eb } = wallJoints(w, use)
    return wallPolygon(w, ea, eb)
  })
  return bounds(pts)
}

type V3 = [number, number, number]

class Builder {
  pos: number[] = []
  uv: number[] = []
  tri(a: V3, b: V3, c: V3, ua: [number, number], ub: [number, number], uc: [number, number]) {
    this.pos.push(...a, ...b, ...c)
    this.uv.push(...ua, ...ub, ...uc)
  }
  quad(a: V3, b: V3, c: V3, d: V3, uv: (p: V3) => [number, number]) {
    this.tri(a, b, c, uv(a), uv(b), uv(c))
    this.tri(a, c, d, uv(a), uv(c), uv(d))
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2))
    g.computeVertexNormals()
    return g
  }
}

/**
 * Builds the roof surfaces and the wall infill under them (gables).
 * The roof plane passes through the outer wall line at the top of the walls.
 */
export function buildRoof(roof: Roof, b: NonNullable<ReturnType<typeof footprint>>, eaveY: number) {
  const tan = Math.tan((Math.max(3, Math.min(60, roof.pitch)) * Math.PI) / 180)
  const o = roof.overhang
  const alongX = roof.ridge === "x" ? true : roof.ridge === "y" ? false : b.w >= b.h
  // work in (u, v): u along the ridge, v across it
  const u0 = alongX ? b.minX : b.minY
  const u1 = alongX ? b.maxX : b.maxY
  const v0 = alongX ? b.minY : b.minX
  const v1 = alongX ? b.maxY : b.maxX
  const P = (u: number, y: number, v: number): V3 => (alongX ? [u, y, v] : [v, y, u])
  const roofB = new Builder()
  const gable = new Builder()
  const cos = Math.cos(Math.atan(tan))
  // uv: u along ridge (m), v along slope (m)
  const uvSlope = (vRef: number) => (p: V3): [number, number] => {
    const u = alongX ? p[0] : p[2]
    const v = alongX ? p[2] : p[0]
    return [u / 100, Math.abs(v - vRef) / cos / 100]
  }
  const uvWall = (p: V3): [number, number] => [(alongX ? p[2] : p[0]) / 100, p[1] / 100]
  const uvWallU = (p: V3): [number, number] => [(alongX ? p[0] : p[2]) / 100, p[1] / 100]

  const vc = (v0 + v1) / 2
  const half = (v1 - v0) / 2
  const yAt = (dv: number) => eaveY + dv * tan // dv = distance in from the wall line
  const yE = yAt(-o)

  if (roof.type === "saltak") {
    const yR = yAt(half)
    roofB.quad(P(u0 - o, yE, v0 - o), P(u1 + o, yE, v0 - o), P(u1 + o, yR, vc), P(u0 - o, yR, vc), uvSlope(v0 - o))
    roofB.quad(P(u0 - o, yE, v1 + o), P(u0 - o, yR, vc), P(u1 + o, yR, vc), P(u1 + o, yE, v1 + o), uvSlope(v1 + o))
    for (const u of [u0, u1]) gable.tri(P(u, eaveY, v0), P(u, eaveY, v1), P(u, yR, vc), uvWall(P(u, eaveY, v0)), uvWall(P(u, eaveY, v1)), uvWall(P(u, yR, vc)))
  } else if (roof.type === "valmtak") {
    const hv = half + o
    const yR = yE + hv * tan
    let r0 = u0 - o + hv
    let r1 = u1 + o - hv
    if (r0 > r1) r0 = r1 = (u0 + u1) / 2
    const A = P(u0 - o, yE, v0 - o)
    const B = P(u1 + o, yE, v0 - o)
    const C = P(u1 + o, yE, v1 + o)
    const D = P(u0 - o, yE, v1 + o)
    const R0 = P(r0, yR, vc)
    const R1 = P(r1, yR, vc)
    roofB.quad(A, B, R1, R0, uvSlope(v0 - o))
    roofB.quad(C, D, R0, R1, uvSlope(v1 + o))
    const uvEnd = (uRef: number) => (p: V3): [number, number] => [(alongX ? p[2] : p[0]) / 100, Math.abs((alongX ? p[0] : p[2]) - uRef) / cos / 100]
    roofB.tri(D, A, R0, uvEnd(u0 - o)(D), uvEnd(u0 - o)(A), uvEnd(u0 - o)(R0))
    roofB.tri(B, C, R1, uvEnd(u1 + o)(B), uvEnd(u1 + o)(C), uvEnd(u1 + o)(R1))
  } else if (roof.type === "pulttak") {
    const span = v1 - v0
    const yLow = yAt(-o)
    const yHigh = yAt(span + o)
    roofB.quad(P(u0 - o, yLow, v0 - o), P(u1 + o, yLow, v0 - o), P(u1 + o, yHigh, v1 + o), P(u0 - o, yHigh, v1 + o), uvSlope(v0 - o))
    const yTop = yAt(span)
    for (const u of [u0, u1]) gable.tri(P(u, eaveY, v0), P(u, eaveY, v1), P(u, yTop, v1), uvWall(P(u, eaveY, v0)), uvWall(P(u, eaveY, v1)), uvWall(P(u, yTop, v1)))
    gable.quad(P(u0, eaveY, v1), P(u1, eaveY, v1), P(u1, yTop, v1), P(u0, yTop, v1), uvWallU)
  }
  return { roof: roofB.pos.length ? roofB.geometry() : null, gables: gable.pos.length ? gable.geometry() : null }
}

export function RoofMesh({ roof, facade, cladding, walls, level }: { roof: Roof; facade: Facade; cladding: string; walls: Wall[]; level: Level }) {
  const fp = useMemo(() => footprint(walls), [walls])
  const eaveY = level.elevation + level.height
  const geo = useMemo(() => (fp && roof.type !== "flatt" && roof.type !== "ingen" ? buildRoof(roof, fp, eaveY) : null), [fp, roof, eaveY])
  useEffect(
    () => () => {
      geo?.roof?.dispose()
      geo?.gables?.dispose()
    },
    [geo],
  )
  const roofMat = useMemo(() => {
    const t = roofTexture(roof.material, roof.color)
    return new THREE.MeshStandardMaterial({ map: t, roughness: roof.material === "stal" ? 0.45 : 0.85, metalness: roof.material === "stal" ? 0.25 : 0, side: THREE.DoubleSide })
  }, [roof.material, roof.color])
  const gableMat = useMemo(() => new THREE.MeshStandardMaterial({ map: claddingTexture(cladding, facade.style), roughness: 0.85, side: THREE.DoubleSide }), [cladding, facade.style])
  if (!fp || roof.type === "ingen") return null
  if (roof.type === "flatt") {
    const o = roof.overhang
    return (
      <group>
        <mesh position={[(fp.minX + fp.maxX) / 2, eaveY + 12, (fp.minY + fp.maxY) / 2]} scale={[fp.w + o * 2, 24, fp.h + o * 2]} material={mat(roof.color, { rough: 0.9 })} castShadow receiveShadow>
          <boxGeometry />
        </mesh>
        <mesh position={[(fp.minX + fp.maxX) / 2, eaveY + 4, (fp.minY + fp.maxY) / 2]} scale={[fp.w + o * 2 + 2, 10, fp.h + o * 2 + 2]} material={mat(facade.trim, { rough: 0.7 })}>
          <boxGeometry />
        </mesh>
      </group>
    )
  }
  return (
    <group>
      {geo?.roof && <mesh geometry={geo.roof} material={roofMat} castShadow receiveShadow />}
      {geo?.gables && <mesh geometry={geo.gables} material={gableMat} castShadow receiveShadow />}
    </group>
  )
}
