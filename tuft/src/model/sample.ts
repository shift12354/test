// A one-storey house (11 × 9 m, about 85 m² BRA) used as the starting project.
import { makeItem, makeOpening, wallsForRoom } from "./build"
import { uid } from "./geometry"
import type { Circuit, FloorMaterial, Item, Opening, Project, Room, RoomType, Run, RunSystem, Vec } from "./types"

const L1 = "l1"

function rect(x0: number, y0: number, x1: number, y1: number): Vec[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ]
}

function room(name: string, type: RoomType, pts: Vec[], floor: FloorMaterial, extra: Partial<Room> = {}): Room {
  return { id: uid("r"), level: L1, name, type, points: pts, floor, wallColor: "#f4f2ee", underfloorHeating: false, ...extra }
}

export function emptyProject(name = "Nytt hus"): Project {
  return {
    version: 1,
    name,
    levels: [{ id: L1, name: "1. etasje", elevation: 0, height: 240 }],
    walls: [],
    openings: [],
    rooms: [],
    items: [],
    runs: [],
    circuits: [
      { id: "k1", name: "K1 Lys", amps: 10, kind: "lys" },
      { id: "k2", name: "K2 Stikk", amps: 16, kind: "generell" },
    ],
    dimensions: [],
  }
}

export function sampleProject(): Project {
  const rooms: Room[] = [
    room("Stue og kjøkken", "stue", rect(0, 0, 700, 500), "eik"),
    room("Soverom 1", "soverom", rect(700, 0, 1100, 500), "ask"),
    room("Gang", "gang", rect(0, 500, 1100, 640), "betong"),
    room("Soverom 2", "soverom", rect(0, 640, 350, 900), "ask"),
    room("Bad", "bad", rect(350, 640, 600, 900), "flis-lys", { underfloorHeating: true, wallColor: "#eef0f1" }),
    room("Vaskerom", "vaskerom", rect(600, 640, 750, 900), "flis-lys", { underfloorHeating: true }),
    room("Soverom 3", "soverom", rect(750, 640, 1100, 900), "ask"),
  ]
  let walls = [] as ReturnType<typeof wallsForRoom>
  for (const r of rooms) walls = [...walls, ...wallsForRoom(r, walls, rooms, 240)]

  const op = (x: number, y: number, kind: Opening["kind"], over: Partial<Opening> = {}) => {
    const o = makeOpening(walls, { x, y }, kind, over)
    if (!o) throw new Error(`no wall at ${x},${y}`)
    return o
  }
  const openings: Opening[] = [
    op(0, 570, "door", { width: 100, flip: true }),
    op(200, 0, "patioDoor", { width: 180 }),
    op(470, 0, "window", { width: 100, height: 100, sill: 110 }),
    op(0, 250, "window", { width: 180, height: 150, sill: 60 }),
    op(1100, 250, "window", { width: 120 }),
    op(175, 900, "window", { width: 120 }),
    op(925, 900, "window", { width: 120 }),
    op(475, 900, "window", { width: 60, height: 60, sill: 150 }),
    op(560, 500, "doubleDoor", { width: 150 }),
    op(780, 500, "door", { flip: false }),
    op(280, 640, "door", { flip: true }),
    op(420, 640, "door", { width: 80, flip: true }),
    op(675, 640, "door", { width: 80, flip: true, hingeEnd: true }),
    op(820, 640, "door", { flip: true }),
  ]

  const circuits: Circuit[] = [
    { id: "k1", name: "K1 Lys", amps: 10, kind: "lys" },
    { id: "k2", name: "K2 Stikk stue", amps: 16, kind: "generell" },
    { id: "k3", name: "K3 Komfyr", amps: 32, kind: "fast" },
    { id: "k4", name: "K4 Kjøkken", amps: 16, kind: "kjokken" },
    { id: "k5", name: "K5 Soverom", amps: 16, kind: "generell" },
    { id: "k6", name: "K6 Bad og vask", amps: 16, kind: "bad" },
    { id: "k7", name: "K7 Varmtvann", amps: 16, kind: "fast" },
    { id: "k8", name: "K8 Gulvvarme", amps: 16, kind: "varme" },
  ]

  const it = (catalogId: string, x: number, y: number, rotation = 0, extra: Partial<Item> = {}) => makeItem(L1, catalogId, x, y, rotation, extra)
  const items: Item[] = [
    // Stue
    it("sofa3", 61, 300, 270),
    it("teppe", 200, 300, 90),
    it("salongbord", 200, 300, 90),
    it("lenestol", 200, 450, 180),
    it("gulvlampe", 45, 160),
    it("plante", 45, 450),
    it("bokhylle", 330, 30, 0),
    it("spisebord6", 500, 320, 0),
    it("stol", 440, 255, 0),
    it("stol", 500, 255, 0),
    it("stol", 560, 255, 0),
    it("stol", 440, 385, 180),
    it("stol", 500, 385, 180),
    it("stol", 560, 385, 180),
    // Kjøkken langs toppveggen
    it("benkeskap60", 400, 46),
    it("kjokkenvask", 470, 46),
    it("oppvask", 540, 46, 0, { circuitId: "k4" }),
    it("komfyr", 600, 46, 0, { circuitId: "k3" }),
    it("kjoleskap", 661, 48, 0, { circuitId: "k4" }),
    it("overskap60", 400, 33.5),
    it("ventilator", 600, 40, 0, { circuitId: "k4" }),
    // Soverom 1
    it("seng180", 880, 120),
    it("nattbord", 767, 35),
    it("nattbord", 993, 35),
    it("garderobe100", 935, 464, 180),
    it("garderobe100", 1035, 464, 180),
    // Soverom 2
    it("seng90", 118, 840, 90),
    it("skrivebord", 309, 790, 90),
    it("kontorstol", 255, 790, 270),
    // Soverom 3
    it("seng160", 980, 795, 90),
    it("nattbord", 1063, 690, 90),
    // Bad
    it("dusj90", 549, 840),
    it("sluk", 549, 840),
    it("servant80", 379, 740, 270),
    it("speil", 357.5, 740, 270),
    it("wc", 450, 857, 180),
    it("handkle", 470, 651, 0, { circuitId: "k6" }),
    it("termostat", 592, 690, 90, { circuitId: "k8" }),
    // Vaskerom
    it("vaskemaskin", 640, 855, 180, { circuitId: "k6" }),
    it("vvb", 708, 852, 0, { circuitId: "k7" }),
    it("sluk", 660, 760),
    it("fordeler", 700, 653.5, 0),
    it("stoppekran", 735, 652, 0),
    // Gang
    it("sikringsskap", 120, 513.5, 0),
    it("roykvarsler", 550, 570),
    it("roykvarsler", 350, 250),
    it("roykvarsler", 900, 250),
    // Elektro: stue og kjøkken
    it("taklampe", 200, 300, 0, { circuitId: "k1" }),
    it("taklampe", 500, 320, 0, { circuitId: "k1" }),
    it("spot", 410, 100, 0, { circuitId: "k1" }),
    it("spot", 500, 100, 0, { circuitId: "k1" }),
    it("spot", 590, 100, 0, { circuitId: "k1" }),
    it("stikk2", 17, 150, 270, { circuitId: "k2" }),
    it("stikk2", 17, 450, 270, { circuitId: "k2" }),
    it("stikk2", 330, 492, 180, { circuitId: "k2" }),
    it("data", 280, 492, 180),
    it("stikk2", 440, 17, 0, { circuitId: "k4", elevation: 105 }),
    it("stikk2", 640, 17, 0, { circuitId: "k4", elevation: 105 }),
    it("bryter", 650, 492, 180, { circuitId: "k1" }),
    // Elektro: soverom
    it("taklampe", 900, 260, 0, { circuitId: "k1" }),
    it("stikk2", 745, 17, 0, { circuitId: "k5" }),
    it("stikk2", 1015, 17, 0, { circuitId: "k5" }),
    it("stikk2", 1083, 400, 90, { circuitId: "k5" }),
    it("bryter", 840, 492, 180, { circuitId: "k1" }),
    it("taklampe", 175, 770, 0, { circuitId: "k1" }),
    it("stikk2", 17, 720, 270, { circuitId: "k5" }),
    it("stikk2", 342, 860, 90, { circuitId: "k5" }),
    it("bryter", 220, 648, 0, { circuitId: "k1" }),
    it("taklampe", 925, 770, 0, { circuitId: "k1" }),
    it("stikk2", 1083, 700, 90, { circuitId: "k5" }),
    it("stikk2", 860, 883, 180, { circuitId: "k5" }),
    it("bryter", 870, 648, 0, { circuitId: "k1" }),
    // Elektro: bad, vask, gang
    it("spot", 420, 720, 0, { circuitId: "k1" }),
    it("spot", 520, 720, 0, { circuitId: "k1" }),
    it("stikk1", 358, 690, 270, { circuitId: "k6", elevation: 110 }),
    it("stikk2", 640, 883, 180, { circuitId: "k6", elevation: 110 }),
    it("spot", 675, 760, 0, { circuitId: "k1" }),
    it("taklampe", 200, 570, 0, { circuitId: "k1" }),
    it("taklampe", 800, 570, 0, { circuitId: "k1" }),
    it("bryter", 17, 620, 270, { circuitId: "k1" }),
  ]

  const run = (system: RunSystem, pts: [number, number][], elevation: number, diameter: number, circuitId?: string): Run => ({
    id: uid("p"),
    level: L1,
    system,
    points: pts.map(([x, y]) => ({ x, y })),
    elevation,
    diameter,
    circuitId,
  })
  const runs: Run[] = [
    // Rør-i-rør fra fordelerskapet i vaskerommet
    run("kaldt", [[690, 656], [690, 700], [560, 700], [560, 800]], 5, 15),
    run("varmt", [[710, 656], [710, 712], [572, 712], [572, 800]], 5, 15),
    run("kaldt", [[685, 656], [685, 690], [400, 690], [400, 720]], 5, 15),
    run("varmt", [[715, 656], [715, 682], [410, 682], [410, 720]], 5, 15),
    run("kaldt", [[695, 656], [695, 570], [470, 570], [470, 60]], 5, 15),
    run("varmt", [[705, 656], [705, 580], [480, 580], [480, 60]], 5, 15),
    run("kaldt", [[690, 660], [690, 800], [708, 800], [708, 830]], 5, 15),
    run("varmt", [[716, 830], [716, 760], [725, 760], [725, 656]], 5, 15),
    run("kaldt", [[680, 656], [680, 676], [450, 676], [450, 830]], 5, 15),
    // Avløp: sluk i dusj → sluk i vaskerom → ut
    run("avlop", [[549, 840], [549, 760], [660, 760], [760, 760], [760, 940]], -20, 110),
    run("avlop", [[450, 870], [450, 760], [549, 760]], -20, 110),
    run("avlop", [[640, 830], [640, 760]], -20, 50),
    run("avlop", [[470, 60], [470, 610], [760, 610], [760, 760]], -20, 75),
    // Elkabel fra sikringsskapet til komfyren
    run("el", [[120, 513], [120, 470], [600, 470], [600, 60]], 235, 10, "k3"),
  ]

  return {
    version: 1,
    name: "Enebolig, 1 etasje",
    levels: [{ id: L1, name: "1. etasje", elevation: 0, height: 240 }],
    walls,
    openings,
    rooms,
    items,
    runs,
    circuits,
    dimensions: [],
  }
}
