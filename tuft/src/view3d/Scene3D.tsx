import { OrbitControls } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import type { ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

import { FLOORS, catalogItem, runSystem } from "../model/catalog"
import { add, bounds, mul, norm, perp, pointInPolygon, polygonCentroid, sub, wallAngle, wallJoints, wallSolidSpans } from "../model/geometry"
import type { Item, Level, Opening, Project, Room, Run, Wall } from "../model/types"
import { isSelected, useStore } from "../store/store"
import { ItemModel, mat } from "./models"
import { DEFAULT_FACADE, DEFAULT_ROOF, RoofMesh } from "./roof"
import { claddingTexture, floorTexture, noiseTexture } from "./textures"
import type { Facade } from "../model/types"

const CUT_HEIGHT = 115

// ---------- geometry helpers ----------

/** Box whose UVs are in metres, so tiled textures keep their real size. */
function sizedBox(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d)
  const uv = g.getAttribute("uv") as THREE.BufferAttribute
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ]
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / 100, (uv.getY(i) * dims[f][1]) / 100)
    }
  return g
}

function shapeOf(points: { x: number; y: number }[]) {
  const s = new THREE.Shape()
  points.forEach((p, i) => (i ? s.lineTo(p.x, -p.y) : s.moveTo(p.x, -p.y)))
  s.closePath()
  return s
}

function scaleUV(g: THREE.BufferGeometry) {
  const uv = g.getAttribute("uv") as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 100, uv.getY(i) / 100)
  return g
}

// ---------- pieces ----------

function Floor({ room, elevation, ceiling, height }: { room: Room; elevation: number; ceiling: boolean; height: number }) {
  const floor = FLOORS.find((f) => f.id === room.floor) ?? FLOORS[0]
  const geo = useMemo(() => scaleUV(new THREE.ExtrudeGeometry(shapeOf(room.points), { depth: 6, bevelEnabled: false })), [room.points])
  const ceilGeo = useMemo(() => scaleUV(new THREE.ShapeGeometry(shapeOf(room.points))), [room.points])
  const material = useMemo(() => {
    const tex = floorTexture(floor.id, floor.color)
    return new THREE.MeshStandardMaterial({ map: tex, roughness: floor.id.startsWith("flis") ? 0.35 : 0.7 })
  }, [floor.id, floor.color])
  const select = useStore((s) => s.setSelection)
  return (
    <>
      <mesh
        geometry={geo}
        material={material}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, elevation - 6, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          select([{ kind: "room", id: room.id }])
        }}
      />
      {ceiling && (
        <mesh geometry={ceilGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, elevation + height, 0]}>
          <meshStandardMaterial color="#fbfaf7" side={THREE.BackSide} roughness={0.95} />
        </mesh>
      )}
    </>
  )
}

function WallMesh({ wall, walls, openings, rooms, elevation, cut, cladding, facade, plinth, selected }: { wall: Wall; walls: Wall[]; openings: Opening[]; rooms: Room[]; elevation: number; cut: boolean; cladding: string; facade: Facade; plinth: boolean; selected: boolean }) {
  const select = useStore((s) => s.setSelection)
  const { ea, eb } = wallJoints(wall, walls)
  const ops = openings.filter((o) => o.wallId === wall.id)
  const spans = wallSolidSpans(wall, ops, ea, eb)
  const H = cut ? Math.min(wall.height, CUT_HEIGHT) : wall.height
  const t = wall.thickness
  const d = norm(sub(wall.b, wall.a))
  const n = perp(d)
  const mid = mul(add(wall.a, wall.b), 0.5)
  const roomOn = (sign: number) => rooms.find((r) => pointInPolygon(add(mid, mul(n, sign * (t / 2 + 10))), r.points))
  const plus = roomOn(1)
  const minus = roomOn(-1)

  const materials = useMemo(() => {
    const clad = new THREE.MeshStandardMaterial({ map: claddingTexture(cladding, facade.style), roughness: 0.85 })
    const side = (r: Room | undefined) => (r ? mat(r.wallColor, { rough: 0.92 }) : clad)
    const top = mat(selected ? "#8b7bff" : "#3a3b3f", { rough: 0.9 })
    const end = mat("#e8e5df", { rough: 0.9 })
    return [end, end, top, end, side(plus), side(minus)]
  }, [cladding, facade.style, plus, minus, selected])

  const pieces: { from: number; to: number; y0: number; y1: number }[] = []
  for (const sp of spans) {
    if (!sp.opening) pieces.push({ from: sp.from, to: sp.to, y0: 0, y1: H })
    else {
      const o = sp.opening
      if (o.sill > 0) pieces.push({ from: sp.from, to: sp.to, y0: 0, y1: Math.min(o.sill, H) })
      if (o.sill + o.height < H) pieces.push({ from: sp.from, to: sp.to, y0: o.sill + o.height, y1: H })
    }
  }
  const ang = -wallAngle(wall)
  return (
    <group position={[wall.a.x, elevation, wall.a.y]} rotation={[0, ang, 0]}>
      {pieces
        .filter((p) => p.to - p.from > 0.5 && p.y1 - p.y0 > 0.5)
        .map((p, i) => (
          <WallPiece key={i} len={p.to - p.from} h={p.y1 - p.y0} t={t} x={(p.from + p.to) / 2} y={(p.y0 + p.y1) / 2} materials={materials} onSelect={() => select([{ kind: "wall", id: wall.id }])} />
        ))}
      {ops.map((o) => (
        <OpeningModel key={o.id} o={o} t={t} cutH={H} trim={facade.trim} />
      ))}
      {plinth && wall.exterior && facade.plinth > 0 && (
        <mesh position={[(spans[0].from + spans[spans.length - 1].to) / 2, -facade.plinth / 2, 0]} scale={[spans[spans.length - 1].to - spans[0].from + 2, facade.plinth, t + 2]} material={mat("#9a9893", { rough: 0.95 })} castShadow receiveShadow>
          <boxGeometry />
        </mesh>
      )}
    </group>
  )
}

function WallPiece({ len, h, t, x, y, materials, onSelect }: { len: number; h: number; t: number; x: number; y: number; materials: THREE.Material[]; onSelect: () => void }) {
  const geo = useMemo(() => sizedBox(len, h, t), [len, h, t])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh
      geometry={geo}
      material={materials}
      position={[x, y, 0]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    />
  )
}

function OpeningModel({ o, t, cutH, trim }: { o: Opening; t: number; cutH: number; trim: string }) {
  const frame = mat(trim, { rough: 0.6 })
  const glass = mat("#bcd9e6", { opacity: 0.25, rough: 0.05, metal: 0.1 })
  const leafMat = mat("#f7f5f0", { rough: 0.55 })
  const handle = mat("#b9bcc0", { rough: 0.3, metal: 0.7 })
  const x0 = o.offset - o.width / 2
  const x1 = o.offset + o.width / 2
  const top = Math.min(o.sill + o.height, cutH)
  if (top <= o.sill) return null
  const fw = 5
  const side = o.flip ? -1 : 1
  const doorH = Math.min(o.height, cutH)

  const Leaf = ({ hx, sx, w }: { hx: number; sx: number; w: number }) => {
    const theta = (-sx * side * 80 * Math.PI) / 180
    return (
      <group position={[hx, 0, (side * t) / 2 - side * 2]} rotation={[0, theta, 0]}>
        <mesh material={leafMat} position={[(sx * w) / 2, doorH / 2, 0]} scale={[w - 2, doorH - 2, 4]} castShadow>
          <boxGeometry />
        </mesh>
        <mesh material={handle} position={[sx * (w - 8), 100, side * 3]} scale={[12, 2, 2]}>
          <boxGeometry />
        </mesh>
      </group>
    )
  }

  const isDoor = o.kind === "door" || o.kind === "doubleDoor" || o.kind === "slidingDoor"
  return (
    <group>
      {/* jambs and head */}
      <mesh material={frame} position={[x0 + fw / 2, (o.sill + top) / 2, 0]} scale={[fw, top - o.sill, t + 2]}>
        <boxGeometry />
      </mesh>
      <mesh material={frame} position={[x1 - fw / 2, (o.sill + top) / 2, 0]} scale={[fw, top - o.sill, t + 2]}>
        <boxGeometry />
      </mesh>
      {top === o.sill + o.height && (
        <mesh material={frame} position={[o.offset, top - fw / 2, 0]} scale={[o.width, fw, t + 2]}>
          <boxGeometry />
        </mesh>
      )}
      {!isDoor && (
        <>
          {o.sill > 0 && (
            <mesh material={frame} position={[o.offset, o.sill + fw / 2, 0]} scale={[o.width, fw, t + 2]}>
              <boxGeometry />
            </mesh>
          )}
          <mesh material={glass} position={[o.offset, (o.sill + top) / 2, 0]} scale={[o.width - fw * 2, top - o.sill - fw, 1.5]}>
            <boxGeometry />
          </mesh>
          {o.width > 100 && (
            <mesh material={frame} position={[o.offset, (o.sill + top) / 2, 0]} scale={[4, top - o.sill, 6]}>
              <boxGeometry />
            </mesh>
          )}
        </>
      )}
      {o.kind === "door" && <Leaf hx={o.hingeEnd ? x1 - fw : x0 + fw} sx={o.hingeEnd ? -1 : 1} w={o.width - fw * 2} />}
      {o.kind === "doubleDoor" && (
        <>
          <Leaf hx={x0 + fw} sx={1} w={o.width / 2 - fw} />
          <Leaf hx={x1 - fw} sx={-1} w={o.width / 2 - fw} />
        </>
      )}
      {o.kind === "slidingDoor" && (
        <mesh material={leafMat} position={[x0 + o.width * 0.3, doorH / 2, 2]} scale={[o.width * 0.55, doorH - 2, 3]}>
          <boxGeometry />
        </mesh>
      )}
    </group>
  )
}

function ItemMesh({ item, level, selected, lit }: { item: Item; level: Level; selected: boolean; lit: boolean }) {
  const c = catalogItem(item.catalogId)
  const select = useStore((s) => s.setSelection)
  const w = item.w ?? c.w
  const d = item.d ?? c.d
  const h = item.h ?? c.h
  const elev = item.elevation ?? c.elevation
  const y = c.mount === "ceiling" ? level.elevation + level.height - elev : level.elevation + elev
  const edges = useMemo(() => (selected ? new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 4, h + 4, d + 4)) : null), [selected, w, h, d])
  return (
    <group
      position={[item.x, y, item.y]}
      rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        select([{ kind: "item", id: item.id }])
      }}
    >
      <ItemModel c={c} w={w} d={d} h={h} color={item.color ?? c.color} lit={lit} />
      {edges && (
        <lineSegments geometry={edges} position={[0, c.mount === "ceiling" ? -h / 2 : h / 2, 0]}>
          <lineBasicMaterial color="#6c5cf6" depthTest={false} transparent />
        </lineSegments>
      )}
    </group>
  )
}

function RunMesh({ run, level, xray, selected }: { run: Run; level: Level; xray: boolean; selected: boolean }) {
  const sys = runSystem(run.system)
  const select = useStore((s) => s.setSelection)
  const geo = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>()
    const pts = run.points.map((p) => new THREE.Vector3(p.x, level.elevation + run.elevation, p.y))
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]))
    const r = Math.max(run.diameter / 20, 1.4)
    return new THREE.TubeGeometry(path, Math.max(8, pts.length * 6), r, 10, false)
  }, [run.points, run.elevation, run.diameter, level.elevation])
  useEffect(() => () => geo.dispose(), [geo])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: selected ? "#8b7bff" : sys.color,
        emissive: sys.color,
        emissiveIntensity: xray ? 0.45 : 0.1,
        roughness: 0.5,
        depthTest: !xray,
        transparent: xray,
        opacity: xray ? 0.92 : 1,
      }),
    [sys.color, xray, selected],
  )
  return (
    <mesh
      geometry={geo}
      material={material}
      renderOrder={xray ? 10 : 0}
      onClick={(e) => {
        e.stopPropagation()
        select([{ kind: "run", id: run.id }])
      }}
    />
  )
}

// ---------- lighting ----------

function sunFor(hour: number) {
  const a = ((hour - 6) / 14) * Math.PI // 06:00 east → 20:00 west
  const up = Math.sin(a)
  return { dir: new THREE.Vector3(Math.cos(a), Math.max(up, -0.2) * 0.9 + 0.05, 0.55), strength: Math.max(0, up) }
}

function Lighting({ center, radius, hour, dark }: { center: THREE.Vector3; radius: number; hour: number; dark: boolean }) {
  const sun = sunFor(hour)
  const light = useRef<THREE.DirectionalLight>(null)
  const { scene } = useThree()
  const day = sun.strength
  const sky = new THREE.Color(dark ? "#1b1d22" : "#dfe6ea").lerp(new THREE.Color(dark ? "#0d0e12" : "#25304a"), 1 - Math.min(1, day * 2.2))
  if (hour < 8 || hour > 18) sky.lerp(new THREE.Color("#f0a36b"), Math.max(0, 0.35 - Math.abs(day - 0.15)) * (dark ? 0.3 : 0.8))
  useEffect(() => {
    scene.background = sky
    scene.fog = new THREE.Fog(sky, radius * 3, radius * 9)
  })
  useEffect(() => {
    const l = light.current
    if (!l) return
    l.target.position.copy(center)
    l.target.updateMatrixWorld()
    const cam = l.shadow.camera as THREE.OrthographicCamera
    cam.left = cam.bottom = -radius * 1.2
    cam.right = cam.top = radius * 1.2
    cam.near = 0.5
    cam.far = radius * 6
    cam.updateProjectionMatrix()
  }, [center, radius])
  const pos = center.clone().add(sun.dir.clone().normalize().multiplyScalar(radius * 2.5))
  return (
    <>
      <hemisphereLight args={["#f4f6ff", "#8a7f6c", 0.35 + day * 0.9]} />
      <ambientLight intensity={0.08 + day * 0.15} />
      <directionalLight
        ref={light}
        position={pos}
        intensity={day * 2.6}
        color={hour < 8 || hour > 18 ? "#ffc58a" : "#fff6e8"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  )
}

function LampLights({ project, levels }: { project: Project; levels: Level[] }) {
  const lamps = project.items
    .filter((i) => levels.some((l) => l.id === i.level) && ["ceilingLamp", "spot", "wallLamp", "floorLamp"].includes(catalogItem(i.catalogId).model))
    .slice(0, 24)
  return (
    <>
      {lamps.map((i) => {
        const c = catalogItem(i.catalogId)
        const l = levels.find((x) => x.id === i.level)!
        const y = c.mount === "ceiling" ? l.elevation + l.height - (c.model === "ceilingLamp" ? 80 : 10) : l.elevation + (i.elevation ?? c.elevation) + c.h
        const strength = c.model === "spot" ? 1.2 : 3.2
        return <pointLight key={i.id} position={[i.x / 100, y / 100, i.y / 100]} intensity={strength} distance={6} decay={2} color="#ffd9a0" />
      })}
    </>
  )
}

// ---------- controls ----------

function WalkControls({ start, eye }: { start: THREE.Vector3; eye: number }) {
  const { camera, gl } = useThree()
  const keys = useRef(new Set<string>())
  const yaw = useRef(0)
  const pitch = useRef(0)
  useEffect(() => {
    camera.position.set(start.x, eye, start.z)
    yaw.current = 0
    pitch.current = -0.08
    const cam = camera as THREE.PerspectiveCamera
    const fov = cam.fov
    cam.fov = 72
    cam.updateProjectionMatrix()
    return () => {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  }, [start, eye, camera])
  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let lx = 0
    let ly = 0
    const down = (e: PointerEvent) => {
      dragging = true
      lx = e.clientX
      ly = e.clientY
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      yaw.current -= (e.clientX - lx) * 0.005
      pitch.current = Math.max(-1.2, Math.min(1.2, pitch.current - (e.clientY - ly) * 0.004))
      lx = e.clientX
      ly = e.clientY
    }
    const up = () => (dragging = false)
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea, select")) return
      keys.current.add(e.key.toLowerCase())
    }
    const ku = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    el.addEventListener("pointerdown", down)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("keydown", kd)
    window.addEventListener("keyup", ku)
    return () => {
      el.removeEventListener("pointerdown", down)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
    }
  }, [gl])
  useFrame((_, dt) => {
    const k = keys.current
    const speed = (k.has("shift") ? 3 : 1.4) * dt
    const f = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0)
    const r = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0)
    if (k.has("arrowleft")) yaw.current += dt * 1.6
    if (k.has("arrowright")) yaw.current -= dt * 1.6
    const fwd = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x)
    camera.position.addScaledVector(fwd, f * speed).addScaledVector(right, r * speed)
    camera.position.y = eye
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ")
  })
  return null
}

function CameraRig({ center, radius }: { center: THREE.Vector3; radius: number }) {
  const { camera, size } = useThree()
  const token = useStore((s) => s.fitToken)
  const aspect = size.width / Math.max(1, size.height)
  const narrow = aspect < 1.3
  useEffect(() => {
    // pull back on narrow viewports so the whole house stays in frame
    const k = Math.max(1, 1.15 / Math.max(aspect, 0.4))
    camera.position.set(center.x + radius * 0.45 * k, center.y + radius * 1.05 * k, center.z + radius * 1.25 * k)
    camera.lookAt(center)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, camera, center, radius, narrow])
  return null
}

function ScreenshotBridge() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    screenshot.take = () => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL("image/png")
    }
    return () => {
      screenshot.take = null
    }
  }, [gl, scene, camera])
  return null
}
export const screenshot: { take: (() => string) | null } = { take: null }

// ---------- scene ----------

function House() {
  const project = useStore((s) => s.project)
  const levelId = useStore((s) => s.levelId)
  const view3d = useStore((s) => s.view3d)
  const layers = useStore((s) => s.layers)
  const selection = useStore((s) => s.selection)
  const dark = useStore((s) => s.settings.theme === "dark")

  const curIdx = project.levels.findIndex((l) => l.id === levelId)
  const levels = view3d.allLevels ? project.levels : project.levels.slice(0, curIdx + 1)

  const { center, radius } = useMemo(() => {
    const pts = project.walls.flatMap((w) => [w.a, w.b])
    if (!pts.length) return { center: new THREE.Vector3(5, 0, 4), radius: 8 }
    const b = bounds(pts)
    const top = project.levels[project.levels.length - 1]
    return {
      center: new THREE.Vector3((b.minX + b.w / 2) / 100, (top.elevation / 2 + 50) / 100, (b.minY + b.h / 2) / 100),
      radius: Math.max(b.w, b.h, 600) / 100,
    }
  }, [project.walls, project.levels])

  const walkStart = useMemo(() => {
    const lvl = project.levels[Math.max(0, curIdx)]
    const selRoom = project.rooms.find((r) => selection.some((s) => s.id === r.id))
    const room = selRoom ?? project.rooms.find((r) => r.level === lvl.id && r.type === "stue") ?? project.rooms.find((r) => r.level === lvl.id)
    const c = room ? polygonCentroid(room.points) : { x: center.x * 100, y: center.z * 100 }
    return new THREE.Vector3(c.x / 100, 0, c.y / 100)
    // only recompute when entering walk mode or changing level
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view3d.walk, curIdx])

  const eye = ((project.levels[Math.max(0, curIdx)]?.elevation ?? 0) + 165) / 100
  const groundTex = useMemo(() => {
    const t = noiseTexture(dark ? "#3f4a3c" : "#a7b495", 0.1).clone()
    t.repeat.set(400, 400)
    t.needsUpdate = true
    return t
  }, [dark])
  const cladding = project.cladding ?? "#ebe8e1"
  const facade = project.facade ?? DEFAULT_FACADE
  const roof = project.roof ?? DEFAULT_ROOF
  const topLevel = project.levels[project.levels.length - 1]
  const showRoof = view3d.roof && !view3d.cutaway && !view3d.walk && levels[levels.length - 1]?.id === topLevel.id
  const groundY = -(facade.plinth + 2) / 100

  return (
    <>
      <Lighting center={center} radius={radius} hour={view3d.timeOfDay} dark={dark} />
      {view3d.lightsOn && <LampLights project={project} levels={levels} />}
      {view3d.walk ? (
        <WalkControls start={walkStart} eye={eye} />
      ) : (
        <>
          <CameraRig center={center} radius={radius} />
          <OrbitControls makeDefault target={center} maxPolarAngle={Math.PI * 0.49} minDistance={1.5} maxDistance={radius * 6} enableDamping dampingFactor={0.12} />
        </>
      )}
      <ScreenshotBridge />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center.x, groundY, center.z]} receiveShadow onClick={() => useStore.getState().setSelection([])}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial map={groundTex} roughness={1} />
      </mesh>
      <group scale={0.01}>
        {levels.map((l, i) => {
          const isTop = i === levels.length - 1
          const cut = view3d.cutaway && isTop
          const rooms = project.rooms.filter((r) => r.level === l.id)
          const walls = project.walls.filter((w) => w.level === l.id)
          return (
            <group key={l.id}>
              {rooms.map((r) => (
                <Floor key={r.id} room={r} elevation={l.elevation} ceiling={view3d.walk && !cut} height={l.height} />
              ))}
              {layers.konstruksjon &&
                walls.map((w) => (
                  <WallMesh key={w.id} wall={w} walls={walls} openings={project.openings} rooms={rooms} elevation={l.elevation} cut={cut} cladding={cladding} facade={facade} plinth={i === 0} selected={isSelected(selection, w.id)} />
                ))}
              {project.items
                .filter((it) => it.level === l.id)
                .filter((it) => {
                  const c = catalogItem(it.catalogId)
                  if (c.layer === "interior") return layers.interior
                  if (c.layer === "elektro") return layers.elektro
                  return layers.vann || layers.avlop
                })
                .filter((it) => !(cut && catalogItem(it.catalogId).mount === "ceiling" && !view3d.xray))
                .map((it) => (
                  <ItemMesh key={it.id} item={it} level={l} selected={isSelected(selection, it.id)} lit={view3d.lightsOn} />
                ))}
              {project.runs
                .filter((r) => r.level === l.id)
                .filter((r) => {
                  const lay = runSystem(r.system).layer
                  return lay === "elektro" ? layers.elektro : lay === "vann" ? layers.vann : layers.avlop
                })
                .map((r) => (
                  <RunMesh key={r.id} run={r} level={l} xray={view3d.xray && !showRoof} selected={isSelected(selection, r.id)} />
                ))}
            </group>
          )
        })}
        {showRoof && layers.konstruksjon && (
          <RoofMesh roof={roof} facade={facade} cladding={cladding} walls={project.walls.filter((w) => w.level === topLevel.id)} level={topLevel} />
        )}
      </group>
    </>
  )
}

export function Scene3D() {
  const walk = useStore((s) => s.view3d.walk)
  return (
    <div className={`scene3d ${walk ? "is-walk" : ""}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 40, near: 0.05, far: 2000, position: [12, 10, 16] }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
        }}
        onPointerMissed={() => useStore.getState().setSelection([])}
      >
        <House />
      </Canvas>
    </div>
  )
}
