// All lengths are in centimetres. Plan x grows right, plan y grows down.
// In 3D, plan x maps to x and plan y maps to z (metres), with y up.

export type Vec = { x: number; y: number }

export type Level = {
  id: string
  name: string
  /** Floor elevation above ground, cm. */
  elevation: number
  /** Wall height for new walls on this level, cm. */
  height: number
}

export type Wall = {
  id: string
  level: string
  a: Vec
  b: Vec
  thickness: number
  height: number
  exterior: boolean
}

export type OpeningKind = "door" | "doubleDoor" | "slidingDoor" | "window" | "patioDoor"

export type Opening = {
  id: string
  wallId: string
  kind: OpeningKind
  /** Distance from wall start (a) to the centre of the opening, cm. */
  offset: number
  width: number
  height: number
  /** Height above floor of the bottom edge, cm. 0 for doors. */
  sill: number
  /** Which side of the wall the door swings to. */
  flip: boolean
  /** Hinge at the end nearer to b instead of a. */
  hingeEnd: boolean
}

export type RoomType =
  | "stue"
  | "kjokken"
  | "soverom"
  | "bad"
  | "wc"
  | "vaskerom"
  | "gang"
  | "bod"
  | "kontor"
  | "teknisk"
  | "garasje"
  | "annet"

export type FloorMaterial = "eik" | "ask" | "valnott" | "flis-lys" | "flis-mork" | "betong" | "vinyl" | "teppe"

export type Room = {
  id: string
  level: string
  name: string
  type: RoomType
  points: Vec[]
  floor: FloorMaterial
  wallColor: string
  underfloorHeating: boolean
}

export type Item = {
  id: string
  level: string
  catalogId: string
  /** Centre of the footprint. */
  x: number
  y: number
  /** Degrees, clockwise in the plan. */
  rotation: number
  /** Overrides of the catalogue defaults. */
  w?: number
  d?: number
  h?: number
  elevation?: number
  color?: string
  circuitId?: string
  note?: string
}

export type RunSystem = "kaldt" | "varmt" | "avlop" | "el" | "data" | "gulvvarme"

export type Run = {
  id: string
  level: string
  system: RunSystem
  points: Vec[]
  /** Height above floor, cm. Negative is under the floor. */
  elevation: number
  /** Outer diameter, mm. */
  diameter: number
  circuitId?: string
}

export type Circuit = {
  id: string
  name: string
  amps: number
  /** "kurs" type helps the checks: lys/stikk, fast tilkoblet, varme. */
  kind: "generell" | "lys" | "kjokken" | "bad" | "varme" | "fast"
}

export type Dimension = {
  id: string
  level: string
  a: Vec
  b: Vec
}

export type Project = {
  version: 1
  name: string
  levels: Level[]
  walls: Wall[]
  openings: Opening[]
  rooms: Room[]
  items: Item[]
  runs: Run[]
  circuits: Circuit[]
  dimensions: Dimension[]
  /** Colour of the exterior cladding in 3D. */
  cladding?: string
}

export type EntityKind = "wall" | "opening" | "room" | "item" | "run" | "dimension"
export type Selection = { kind: EntityKind; id: string }

export type LayerKey = "konstruksjon" | "interior" | "elektro" | "vann" | "avlop" | "mal"

export type Tool =
  | { type: "select" }
  | { type: "pan" }
  | { type: "wall" }
  | { type: "room" }
  | { type: "opening"; kind: OpeningKind }
  | { type: "item"; catalogId: string }
  | { type: "run"; system: RunSystem }
  | { type: "measure" }

export type ViewMode = "2d" | "split" | "3d"
