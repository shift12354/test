/**
 * scene.js — procedural 3D scene for the Moen Trebåtbyggeri concept site.
 *
 * Everything is built in code (no addons, no remote assets):
 *   - a clinker-built (klinkbygd) double-ended Sørlandet snekke, plank by plank
 *   - slipway with cradle, naust, winter-storage hall, fjord, granite & pine hills
 *   - custom sky + water shaders, light / blue-hour themes
 *
 * API:
 *   const s = createScene(canvas, { reducedMotion, theme });
 *   s.setProgress(t)   // t in [0, 4] (five stages)
 *   s.setTheme('light' | 'dark')
 *   s.setPointer(x, y) // -1..1
 *   s.dispose()
 */
import * as THREE from '../vendor/three.module.min.js';

/** Number of strakes (bordganger) per side. main.js mirrors this for its build meter. */
export const STRAKES = 10;
/**
 * Scroll window (in t) of the plank-by-plank build. The boat is complete outside it.
 * start..cleared: strakes removed top-first (linearly), cleared..end: added back bottom-up, one per (end-cleared)/STRAKES.
 */
export const BUILD = { start: 1.0, cleared: 1.2, end: 1.75 };

const V3 = THREE.Vector3;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* Noise & random                                                       */
/* ------------------------------------------------------------------ */
function hash2(ix, iy, seed) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
function fbm(x, y, seed, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f, y * f, seed + i * 17);
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                     */
/* ------------------------------------------------------------------ */
class MeshBuilder {
  constructor(withInfo = false) {
    this.p = []; this.n = []; this.uv = []; this.idx = [];
    this.info = withInfo ? [] : null;
    this.count = 0;
  }
  vert(x, y, z, nx, ny, nz, u = 0, v = 0, info = null) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, v);
    if (this.info) {
      if (info) this.info.push(info[0], info[1], info[2], info[3]);
      else this.info.push(1, 1, 0, 0);
    }
    return this.count++;
  }
  vv(p, n, u, v, info) { return this.vert(p.x, p.y, p.z, n.x, n.y, n.z, u, v, info); }
  /** Quad a-b-c-d; winding is chosen automatically so the face agrees with the vertex normals. */
  quad(a, b, c, d) {
    const P = this.p, N = this.n;
    const acx = P[c * 3] - P[a * 3], acy = P[c * 3 + 1] - P[a * 3 + 1], acz = P[c * 3 + 2] - P[a * 3 + 2];
    const bdx = P[d * 3] - P[b * 3], bdy = P[d * 3 + 1] - P[b * 3 + 1], bdz = P[d * 3 + 2] - P[b * 3 + 2];
    const cx = acy * bdz - acz * bdy, cy = acz * bdx - acx * bdz, cz = acx * bdy - acy * bdx;
    const nx = N[a * 3] + N[b * 3] + N[c * 3] + N[d * 3];
    const ny = N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1] + N[d * 3 + 1];
    const nz = N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2] + N[d * 3 + 2];
    if (cx * nx + cy * ny + cz * nz >= 0) this.idx.push(a, b, c, a, c, d);
    else this.idx.push(a, c, b, a, d, c);
  }
  strip(rowA, rowB) {
    for (let j = 0; j < rowA.length - 1; j++) this.quad(rowA[j], rowA[j + 1], rowB[j + 1], rowB[j]);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.info) g.setAttribute('aInfo', new THREE.Float32BufferAttribute(this.info, 4));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

/** Merge indexed / non-indexed geometries sharing the first geometry's attribute set. */
function mergeGeometries(geos) {
  const names = Object.keys(geos[0].attributes);
  let vCount = 0, iCount = 0;
  for (const g of geos) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const size = geos[0].attributes[name].itemSize;
    const arr = new Float32Array(vCount * size);
    let o = 0;
    for (const g of geos) {
      const a = g.attributes[name];
      const n = g.attributes.position.count;
      if (a) {
        for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) arr[o + i * size + k] = a.getComponent(i, k);
      } else if (name === 'color') arr.fill(1, o, o + n * size);
      o += n * size;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
  let io = 0, vo = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    if (g.index) {
      const ia = g.index.array;
      for (let k = 0; k < ia.length; k++) idx[io + k] = ia[k] + vo;
      io += ia.length;
    } else {
      for (let k = 0; k < n; k++) idx[io + k] = vo + k;
      io += n;
    }
    vo += n;
  }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

const _m4 = new THREE.Matrix4();
const _eu = new THREE.Euler();
function boxGeo(w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx || ry || rz) g.applyMatrix4(_m4.makeRotationFromEuler(_eu.set(rx, ry, rz)));
  g.translate(x, y, z);
  return g;
}
/** Box beam spanning from A to B. */
function beamGeo(A, B, w, h) {
  const dir = new V3().subVectors(B, A);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, h, len);
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), dir.normalize());
  g.applyQuaternion(q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}
function cylGeo(rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
/** Planar UVs in world metres, picking the projection from the dominant normal axis. */
function worldUV(geo, scale) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / scale; uv[i * 2 + 1] = v / scale;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
function gableGeo(w, rh, T, yBase, z0) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, rh); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, steps: 1, curveSegments: 1 });
  g.translate(0, yBase, z0);
  return g;
}
/**
 * Sweep a rectangle along a path. Each path entry: {p, a, b, a0, a1, b0, b1}
 * where a/b are the cross-section axes and [a0,a1]x[b0,b1] the extents.
 */
function sweepRect(mb, path, caps = true, uvScale = 1 / 1.5) {
  const corners = path.map((q) => [
    q.p.clone().addScaledVector(q.a, q.a0).addScaledVector(q.b, q.b0),
    q.p.clone().addScaledVector(q.a, q.a1).addScaledVector(q.b, q.b0),
    q.p.clone().addScaledVector(q.a, q.a1).addScaledVector(q.b, q.b1),
    q.p.clone().addScaledVector(q.a, q.a0).addScaledVector(q.b, q.b1),
  ]);
  const along = [0];
  for (let k = 1; k < path.length; k++) along.push(along[k - 1] + path[k].p.distanceTo(path[k - 1].p));
  const faces = [
    [0, 1, (q) => q.b.clone().negate()],
    [1, 2, (q) => q.a.clone()],
    [2, 3, (q) => q.b.clone()],
    [3, 0, (q) => q.a.clone().negate()],
  ];
  for (const [c0, c1, nf] of faces) {
    const r0 = [], r1 = [];
    path.forEach((q, k) => {
      const n = nf(q);
      r0.push(mb.vv(corners[k][c0], n, along[k] * uvScale, 0.1));
      r1.push(mb.vv(corners[k][c1], n, along[k] * uvScale, 0.3));
    });
    mb.strip(r0, r1);
  }
  if (caps && path.length > 1) {
    for (const [k, k2] of [[0, 1], [path.length - 1, path.length - 2]]) {
      const n = new V3().subVectors(path[k].p, path[k2].p).normalize();
      const ids = corners[k].map((c) => mb.vv(c, n, 0, 0));
      mb.quad(ids[0], ids[1], ids[2], ids[3]);
    }
  }
}

/** Collects geometries per material and merges them into a few meshes. */
class Batch {
  constructor() { this.map = new Map(); }
  add(mat, geo) {
    if (mat.userData.uvScale) worldUV(geo, mat.userData.uvScale);
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  build(parent, cast = true, receive = true) {
    for (const [mat, list] of this.map) {
      const g = mergeGeometries(list);
      list.forEach((x) => x.dispose());
      const m = new THREE.Mesh(g, mat);
      m.castShadow = cast;
      m.receiveShadow = receive;
      parent.add(m);
    }
    this.map.clear();
  }
}

/* ------------------------------------------------------------------ */
/* Canvas textures                                                      */
/* ------------------------------------------------------------------ */
function makeGrainTexture() {
  const W = 512, Hh = 128;
  const c = document.createElement('canvas');
  c.width = W; c.height = Hh;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(232,232,232)';
  g.fillRect(0, 0, W, Hh);
  const rnd = mulberry32(7);
  for (let i = 0; i < 90; i++) {
    const y0 = rnd() * Hh;
    const a = 0.04 + rnd() * 0.13;
    const lw = 0.6 + rnd() * 2.2;
    const k1 = 1 + Math.floor(rnd() * 3), k2 = 2 + Math.floor(rnd() * 5);
    const ph = rnd() * 6.28;
    g.strokeStyle = `rgba(70,55,40,${a.toFixed(3)})`;
    g.lineWidth = lw;
    for (const off of [-Hh, 0, Hh]) {
      g.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = y0 + off + Math.sin((x / W) * Math.PI * 2 * k1 + ph) * 3 + Math.sin((x / W) * Math.PI * 2 * k2 + i) * 1.2;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function makeBoardTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(236,236,236)';
  g.fillRect(0, 0, S, S);
  const rnd = mulberry32(3);
  for (let b = 0; b < 4; b++) {
    const x0 = b * 32;
    const shade = 225 + Math.floor(rnd() * 25);
    g.fillStyle = `rgb(${shade},${shade},${shade})`;
    g.fillRect(x0 + 2, 0, 29, S);
    g.fillStyle = 'rgba(0,0,0,0.42)';
    g.fillRect(x0, 0, 2, S);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x0 + 2, 0, 1, S);
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(0,0,0,${(rnd() * 0.05).toFixed(3)})`;
    g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 4 + rnd() * 14);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Landscape layout                                                     */
/* ------------------------------------------------------------------ */
const SLIP_GRADE = 0.15;
const SLIP_ANGLE = Math.atan(SLIP_GRADE);

function shoreZ(x) {
  const k = smoothstep(16, 55, Math.abs(x));
  let z = -4 + k * (4.5 * Math.sin(x * 0.043 + 0.9) + 2.2 * Math.sin(x * 0.117 + 2.1) - 1.0);
  z -= 0.0032 * Math.max(0, x - 75) ** 2;
  z -= 0.001 * Math.max(0, -x - 95) ** 2;
  return z;
}
function farShoreZ(x) {
  return -138 + 16 * Math.sin(x * 0.017 + 1.3) + 7 * Math.sin(x * 0.059 + 0.4) + 0.0022 * Math.max(0, x - 60) ** 2;
}
function yardMask(x, dN) {
  return smoothstep(-84, -70, x) * (1 - smoothstep(56, 68, x)) * (1 - smoothstep(20, 32, dN));
}
const ISLANDS = [
  { x: -38, z: -50, r: 10, h: 3.0 },
  { x: 24, z: -72, r: 15, h: 5.5 },
  { x: -98, z: -84, r: 22, h: 10 },
  { x: 64, z: -38, r: 6, h: 1.8 },
  { x: -14, z: -96, r: 7, h: 2.4 },
];
function landProfile(d, x, z, tall, seed) {
  const n = fbm(x * 0.016, z * 0.016, seed, 4) * 2 - 1;
  const n2 = fbm(x * 0.05, z * 0.05, seed + 5, 3) * 2 - 1;
  const h = 1.6 * (1 - Math.exp(-d / 2.5)) + tall * smoothstep(6, 120, d) + n * (1.0 + 0.16 * Math.min(d, 90)) + n2 * 0.6;
  return Math.max(h, Math.min(d * 0.3, 0.6));
}
function baseHeight(x, z) {
  const dN = z - shoreZ(x), dF = farShoreZ(x) - z;
  let h;
  if (dN >= 0 || dF >= 0) {
    if (dN >= dF) {
      const hills = landProfile(dN, x, z, 30, 11);
      const ym = yardMask(x, dN);
      const hy = Math.min(1.05, 0.15 + dN * 0.3) + 0.015 * Math.max(0, dN - 4) + (fbm(x * 0.08, z * 0.08, 3, 2) - 0.5) * 0.25;
      h = ym > 0 ? lerp(hills, hy, ym) : hills;
    } else {
      h = landProfile(dF, x, z, 40, 23);
    }
  } else {
    const dd = Math.max(dN, dF);
    h = -Math.min(9, 0.6 + -dd * 0.45) + (fbm(x * 0.03, z * 0.03, 9, 2) - 0.5) * 1.5;
  }
  for (const is of ISLANDS) {
    const r = Math.hypot(x - is.x, z - is.z) / is.r;
    if (r < 1.6) {
      const ih = is.h * (1 - r * r) + (fbm(x * 0.1, z * 0.1, 31, 2) - 0.5) * is.h * 0.5;
      if (ih > h) h = ih;
    }
  }
  return h;
}

const HERO_SLIP = { x: 0, zShore: -4, zTop: 8.5, zBot: -13.5 };
const railY = (slip, z) => (z - slip.zShore) * SLIP_GRADE;

const LAYOUT = (() => {
  const sheds = [], pads = [], slips = [HERO_SLIP], piers = [];
  const addShed = (o) => {
    const s = Object.assign({ ry: 0, y: 1.0 }, o);
    if (s.z === undefined) {
      s.zShore = shoreZ(s.x);
      s.zFront = s.zShore + (s.setback ?? 1.5);
      s.z = s.zFront + s.d / 2;
    }
    const rotated = Math.abs(Math.sin(s.ry)) > 0.5;
    pads.push({ x: s.x, z: s.z, hw: (rotated ? s.d : s.w) / 2 + 0.4, hd: (rotated ? s.w : s.d) / 2 + 0.4, y: s.y - 0.3 });
    if (s.slip) slips.push({ x: s.x, zShore: s.zShore, zTop: s.zFront, zBot: s.zShore - 8 });
    sheds.push(s);
    return s;
  };
  const red = '#9b3324', white = '#ece8df', ochre = '#cfa54e';
  const darkRoof = '#3a3634', tileRoof = '#8e3a2a';
  addShed({ id: 'naust', x: 9, w: 6.5, d: 10.5, h: 2.7, roofH: 2.1, wall: red, roof: darkRoof, door: 'open', doorW: 3.4, doorH: 2.55, win: 2, gableWin: true });
  addShed({ id: 'hall', x: 17, z: 16, ry: Math.PI / 2, y: 1.15, w: 10, d: 16, h: 4.2, roofH: 3.2, wall: white, roof: tileRoof, door: 'anim', doorW: 4.4, doorH: 3.7, win: 3, gableWin: true });
  addShed({ id: 'c', x: -27, setback: 3, w: 7, d: 11, h: 2.8, roofH: 2.2, wall: white, roof: tileRoof, door: 'openStatic', doorW: 3.6, doorH: 2.6, win: 2, slip: true });
  addShed({ id: 'd', x: -40, w: 6, d: 9, h: 2.5, roofH: 2.0, wall: red, roof: darkRoof, door: 'closed', doorW: 3.0, doorH: 2.3, win: 1, slip: true });
  addShed({ id: 'e', x: -55, w: 9, d: 13, h: 3.2, roofH: 2.6, wall: ochre, roof: darkRoof, door: 'closed', doorW: 4.0, doorH: 2.9, win: 2, slip: true });
  addShed({ id: 'f', x: 33, w: 7, d: 10, h: 2.7, roofH: 2.1, wall: red, roof: darkRoof, door: 'closed', doorW: 3.4, doorH: 2.5, win: 2 });
  addShed({ id: 'g', x: 46, w: 6, d: 9, h: 2.5, roofH: 2.0, wall: white, roof: darkRoof, door: 'closed', doorW: 3.0, doorH: 2.3, win: 1, slip: true });
  // White houses ("den hvite by") on the slopes behind the yard.
  const houses = [[-19, 37], [-4, 46], [12, 41], [31, 31], [-37, 31], [45, 43], [-61, 35], [24, 55]];
  for (const [x, z] of houses) {
    addShed({ id: 'house', x, z, y: baseHeight(x, z) + 0.2, w: 6, d: 8, h: 4.4, roofH: 2.4, wall: '#f3f0ea', roof: tileRoof, door: null, win: 2, frontWin: 2, house: true });
  }
  const shedF = sheds.find((s) => s.id === 'f');
  piers.push({ x: 4.3, z0: -2.6, z1: -16.5, y: 0.62, w: 1.8 });
  piers.push({ x: shedF.x - 5.2, z0: shedF.zShore + 1.0, z1: shedF.zShore - 11, y: 0.62, w: 1.6 });
  return { sheds, pads, slips, piers };
})();

function terrainHeight(x, z) {
  let h = baseHeight(x, z);
  for (const p of LAYOUT.pads) {
    const dx = Math.abs(x - p.x), dz = Math.abs(z - p.z);
    if (dx > p.hw + 2.5 || dz > p.hd + 2.5) continue;
    const m = (1 - smoothstep(p.hw, p.hw + 2.5, dx)) * (1 - smoothstep(p.hd, p.hd + 2.5, dz));
    h = lerp(h, p.y, m);
  }
  for (const s of LAYOUT.slips) {
    const dx = Math.abs(x - s.x);
    if (dx > 3.4 || z > s.zTop + 3 || z < s.zBot - 3) continue;
    const m = (1 - smoothstep(1.4, 3.2, dx)) * smoothstep(s.zBot - 3, s.zBot, z) * (1 - smoothstep(s.zTop, s.zTop + 3, z));
    const target = railY(s, z) - 0.32;
    if (h > target) h = lerp(h, target, m);
  }
  return h;
}

/* ------------------------------------------------------------------ */
/* Hull                                                                 */
/* ------------------------------------------------------------------ */
/**
 * Hull surface of a double-ended clinker boat, in boat-local coordinates:
 * x along the length (u=0 bow at -x, u=1 stern at +x), y up (0 = keel rabbet), z to starboard.
 * (u, s): u = position along length, s = girth fraction from keel (0) to sheer (1), arc-length uniform.
 */
function makeHullShape(opts = {}) {
  const P = Object.assign({ L: 8.0, Lk: 6.2, B: 1.28, Hmid: 1.05, Hend: 1.5 }, opts);
  const SAMP = 64;
  const cache = new Map();
  const halfBeam = (u) => P.B * Math.pow(Math.max(Math.sin(Math.PI * u), 0), 0.78) * (1 + 0.06 * (u - 0.5));
  const sheer = (u) => P.Hmid + (P.Hend - P.Hmid) * Math.pow(Math.abs(2 * u - 1), 2.3);
  const lenAt = (s) => P.Lk + (P.L - P.Lk) * (0.82 * Math.pow(Math.sin((s * Math.PI) / 2), 0.85) + 0.18 * s);
  function station(u) {
    const key = Math.round(u * 1e7);
    let st = cache.get(key);
    if (st) return st;
    const hb = halfBeam(u), D = sheer(u);
    const full = Math.pow(Math.max(Math.sin(Math.PI * u), 0), 0.5);
    const e = 2 / (1.15 + 0.62 * full);
    const zs = new Float64Array(SAMP + 1), ys = new Float64Array(SAMP + 1), acc = new Float64Array(SAMP + 1);
    for (let i = 0; i <= SAMP; i++) {
      const th = (i / SAMP) * (Math.PI / 2);
      const f = Math.pow(Math.sin(th), e);
      const y = D * (1 - Math.pow(Math.max(Math.cos(th), 0), e));
      const yr = y / D;
      zs[i] = hb * (0.92 * f + 0.08 * yr * yr);
      ys[i] = y;
      if (i > 0) acc[i] = acc[i - 1] + Math.hypot(zs[i] - zs[i - 1], ys[i] - ys[i - 1]);
    }
    st = { zs, ys, acc, total: acc[SAMP] };
    if (cache.size > 30000) cache.clear();
    cache.set(key, st);
    return st;
  }
  function point(u, s, out) {
    const st = station(u);
    const target = clamp(s, 0, 1) * st.total;
    let lo = 0, hi = SAMP;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (st.acc[mid] < target) lo = mid; else hi = mid;
    }
    const seg = st.acc[hi] - st.acc[lo];
    const f = seg > 1e-12 ? (target - st.acc[lo]) / seg : 0;
    return out.set((u - 0.5) * lenAt(s), lerp(st.ys[lo], st.ys[hi], f), lerp(st.zs[lo], st.zs[hi], f));
  }
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3();
  /** Fills f.p (point), f.n (outward normal, starboard side) and f.ts (girth tangent). */
  function frame(u, s, f) {
    point(u, s, f.p);
    const du = 0.006, ds = 0.012;
    point(Math.min(1, u + du), s, _a);
    point(Math.max(0, u - du), s, _b);
    _a.sub(_b);
    point(u, Math.min(1, s + ds), _c);
    point(u, Math.max(0, s - ds), _d);
    _c.sub(_d);
    f.n.crossVectors(_a, _c).normalize();
    f.ts.copy(_c).normalize();
    return f;
  }
  const _q = new V3();
  /** Half-width of the moulded surface at boat-local (x, y). */
  function halfWidthAt(xl, yl) {
    let lo = 0, hi = 1;
    for (let it = 0; it < 24; it++) {
      const m = (lo + hi) / 2;
      point(clamp(0.5 + xl / lenAt(m), 0, 1), m, _q);
      if (_q.y < yl) lo = m; else hi = m;
    }
    const m = (lo + hi) / 2;
    point(clamp(0.5 + xl / lenAt(m), 0, 1), m, _q);
    return _q.z;
  }
  return { P, point, frame, lenAt, sheer, halfWidthAt };
}

const newFrame = () => ({ p: new V3(), n: new V3(), ts: new V3() });

/** Strake i (0 = garboard) for both sides. Returns [starboardGeo, portGeo]. */
function buildStrakeGeos(H, i, cfg) {
  const { N, t, lapS, us, low } = cfg;
  const a = i === 0 ? 0 : i / N - lapS;
  const b = (i + 1) / N;
  const top = i === N - 1;
  const rv = top ? 1 : 1 - lapS / (b - a);
  const rowsOut = low ? (top ? [0, 0.5, 1] : [0, 0.5, rv, 1]) : top ? [0, 0.35, 0.7, 1] : [0, 0.4, rv - 0.14, rv, 1];
  const rowsIn = [0, 0.5, 1];
  const sMid = (a + b) / 2;
  const nU = us.length;
  const frames = new Map();
  const getRow = (r) => {
    if (!frames.has(r)) frames.set(r, us.map((u) => H.frame(u, a + r * (b - a), newFrame())));
    return frames.get(r);
  };
  const mids = us.map((u) => H.frame(u, sMid, newFrame()));
  const aoOut = (r) => (top ? 1 : r <= rv - 0.14 + 1e-6 ? 1 : r <= rv + 1e-6 ? 0.55 : 0.5);
  const geos = [];
  const P = new V3(), Nn = new V3();
  for (const sigma of [1, -1]) {
    const mb = new MeshBuilder(true);
    const mk = (f, off, nrm, u, v, info) => {
      P.copy(f.p).addScaledVector(f.n, off);
      P.z *= sigma;
      Nn.copy(nrm); Nn.z *= sigma;
      return mb.vv(P, Nn, u, v, info);
    };
    // outer face — per-strake "flat" shading across the width so each plank reads as a facet
    const outer = rowsOut.map((r) => {
      const fr = getRow(r);
      return fr.map((f, j) => {
        const ns = new V3().copy(f.n).multiplyScalar(0.3).addScaledVector(mids[j].n, 0.7).addScaledVector(f.ts, -0.26).normalize();
        const s = a + r * (b - a);
        return mk(f, t * (1 - r) + t, ns, f.p.x / 1.7 + i * 0.37, r * 0.25 + i * 0.17, [1, aoOut(r), s, 0]);
      });
    });
    for (let k = 0; k < outer.length - 1; k++) mb.strip(outer[k], outer[k + 1]);
    // lower edge (the visible lap step)
    {
      const fr = getRow(0);
      const nrm = (f) => f.ts.clone().negate();
      const r0 = fr.map((f) => mk(f, t, nrm(f), f.p.x / 1.7, 0, [1, 0.42, a, 0]));
      const r1 = fr.map((f) => mk(f, 2 * t, nrm(f), f.p.x / 1.7, 0.02, [1, 0.42, a, 0]));
      mb.strip(r0, r1);
    }
    if (!low) {
      const inner = rowsIn.map((r) => {
        const fr = getRow(r);
        return fr.map((f) => mk(f, t * (1 - r), f.n.clone().negate(), f.p.x / 1.7 + i * 0.37, r * 0.25, [0, 0.9, a + r * (b - a), 0]));
      });
      for (let k = 0; k < inner.length - 1; k++) mb.strip(inner[k], inner[k + 1]);
      const fr = getRow(1);
      const r0 = fr.map((f) => mk(f, 0, f.ts, f.p.x / 1.7, 0, [1, 0.85, b, 0]));
      const r1 = fr.map((f) => mk(f, t, f.ts, f.p.x / 1.7, 0.02, [1, 0.85, b, 0]));
      mb.strip(r0, r1);
    }
    geos.push(mb.build());
  }
  void nU;
  return geos;
}

function buildFramesGeo(H, xs, S = 12) {
  const mb = new MeshBuilder();
  const w = 0.05, dep = 0.042, sTop = 0.975;
  const f = newFrame();
  const X = new V3(1, 0, 0);
  for (const xf of xs) {
    const path = [];
    const sample = (s, sigma) => {
      H.frame(clamp(0.5 + xf / H.lenAt(s), 0, 1), s, f);
      const p = f.p.clone();
      p.z *= sigma;
      p.x = xf;
      const m = new V3(0, f.n.y, f.n.z * sigma).normalize();
      return { p, a: X, b: m, a0: -w / 2, a1: w / 2, b0: -0.003 - dep, b1: -0.003 };
    };
    for (let k = S; k >= 0; k--) path.push(sample((k / S) * sTop, -1));
    for (let k = 1; k <= S; k++) path.push(sample((k / S) * sTop, 1));
    sweepRect(mb, path, true, 1 / 1.2);
  }
  return mb.build();
}

function buildBackboneGeo(H) {
  const pts = [];
  const tmp = new V3();
  const NS = 14, NK = 8;
  for (let k = NS; k >= 0; k--) { H.point(1, k / NS, tmp); pts.push(new V3(tmp.x, tmp.y, 0)); }
  for (let k = 1; k < NK; k++) pts.push(new V3(lerp(H.P.Lk / 2, -H.P.Lk / 2, k / NK), 0, 0));
  for (let k = 0; k <= NS; k++) { H.point(0, k / NS, tmp); pts.push(new V3(tmp.x, tmp.y, 0)); }
  // extend stem & stern heads above the sheer
  const ext = (p0, p1, d) => p0.clone().add(p0.clone().sub(p1).normalize().multiplyScalar(d));
  pts.unshift(ext(pts[0], pts[1], 0.07));
  pts.push(ext(pts[pts.length - 1], pts[pts.length - 2], 0.1));
  const c = new V3(0, 0.75, 0);
  const Z = new V3(0, 0, 1);
  const path = pts.map((p, k) => {
    const p0 = pts[Math.max(0, k - 1)], p1 = pts[Math.min(pts.length - 1, k + 1)];
    const T = p1.clone().sub(p0);
    const m = new V3(T.y, -T.x, 0).normalize();
    if (m.dot(p.clone().sub(c)) < 0) m.negate();
    const fr = smoothstep(0.0, 0.5, p.y);
    const depth = lerp(0.18, 0.115, fr), side = lerp(0.13, 0.1, fr);
    return { p, a: Z, b: m, a0: -side / 2, a1: side / 2, b0: -0.05, b1: depth };
  });
  const mb = new MeshBuilder();
  sweepRect(mb, path, true, 1 / 1.4);
  return mb.build();
}

function buildGunwaleGeo(H, t, nG) {
  const mb = new MeshBuilder();
  const f = newFrame();
  const Y = new V3(0, 1, 0);
  for (const sigma of [1, -1]) {
    const path = [];
    for (let j = 0; j < nG; j++) {
      const u = lerp(0.014, 0.986, 0.5 - 0.5 * Math.cos((Math.PI * j) / (nG - 1)));
      H.frame(u, 1, f);
      const p = f.p.clone(); p.z *= sigma;
      const h = new V3(f.n.x, 0, f.n.z * sigma).normalize();
      path.push({ p, a: h, b: Y, a0: -0.05, a1: t + 0.045, b0: -0.065, b1: 0.028 });
    }
    sweepRect(mb, path, true);
  }
  return mb.build();
}

/** Flat deck/floor strip between port and starboard edge functions. */
function buildDeckGeo(xs, edge /* x -> {y, z} */, camber = 0) {
  const mb = new MeshBuilder();
  const up = new V3(0, 1, 0);
  const rows = [[], [], []];
  for (const x of xs) {
    const e = edge(x);
    rows[0].push(mb.vv(new V3(x, e.y, -e.z), up, x / 1.4, -e.z / 1.4));
    rows[1].push(mb.vv(new V3(x, e.y + camber, 0), up, x / 1.4, 0));
    rows[2].push(mb.vv(new V3(x, e.y, e.z), up, x / 1.4, e.z / 1.4));
  }
  mb.strip(rows[0], rows[1]);
  mb.strip(rows[1], rows[2]);
  return mb.build();
}

function buildRudderGeo(H) {
  const tmp = new V3();
  const lead = [], trail = [];
  for (let k = 0; k <= 6; k++) {
    const s = lerp(0.05, 0.8, k / 6);
    H.point(1, s, tmp);
    const chord = lerp(0.62, 0.2, k / 6);
    lead.push([tmp.x + 0.12, tmp.y]);
    trail.push([tmp.x + 0.12 + chord, tmp.y + 0.03]);
  }
  const shape = new THREE.Shape();
  shape.moveTo(lead[0][0], lead[0][1]);
  for (const p of lead.slice(1)) shape.lineTo(p[0], p[1]);
  for (const p of trail.reverse()) shape.lineTo(p[0], p[1]);
  shape.lineTo(lead[0][0], lead[0][1]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -0.025);
  const top = lead[lead.length - 1];
  const tiller = beamGeo(new V3(top[0] + 0.1, top[1] + 0.12, 0), new V3(top[0] - 1.1, top[1] + 0.32, 0), 0.05, 0.05);
  const head = boxGeo(0.12, 0.2, 0.08, top[0] + 0.1, top[1] + 0.06, 0);
  const merged = mergeGeometries([g.toNonIndexed ? g : g, tiller, head].map((x) => {
    if (!x.attributes.uv) x.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2));
    return x;
  }));
  return merged;
}

/** Custom hull material: paint scheme / bare wood / interior, lap AO, centre-out reveal. */
function makeHullMaterial(shared, grain, side = THREE.FrontSide) {
  const uniforms = Object.assign({}, shared, { uReveal: { value: 99 } });
  const mat = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.6, metalness: 0, side });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aInfo;\nvarying vec4 vHullInfo;\nvarying vec3 vHullPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHullInfo = aInfo;\nvHullPos = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uPaint, uWL, uStripeS, uReveal;
uniform vec3 uTop, uStripe, uBottom, uBare, uInterior;
varying vec4 vHullInfo;
varying vec3 vHullPos;`
      )
      .replace('void main() {', 'void main() {\n  if ( abs( vHullPos.x ) > uReveal ) discard;')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
  float grain = texture2D( map, vMapUv ).r;
#else
  float grain = 0.8;
#endif
  float outerF = gl_FrontFacing ? vHullInfo.x : 0.0;
  vec3 paintC = uTop;
  if ( vHullInfo.z > uStripeS ) paintC = uStripe;
  if ( vHullPos.y < uWL + 0.045 ) paintC = uStripe;
  if ( vHullPos.y < uWL ) paintC = uBottom;
  vec3 bareC = uBare * mix( 0.62, 1.1, grain );
  vec3 intC = uInterior * mix( 0.66, 1.08, grain );
  vec3 outC = mix( bareC, paintC * mix( 0.9, 1.02, grain ), uPaint );
  diffuseColor.rgb *= mix( intC, outC, outerF ) * vHullInfo.y;`
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix( 0.62, mix( 0.78, 0.4, uPaint ), outerF );');
  };
  mat.userData.u = uniforms;
  return mat;
}
function hullUniforms(o = {}) {
  return {
    uPaint: { value: o.paint ?? 1 },
    uTop: { value: new THREE.Color(o.top || '#f3efe6') },
    uStripe: { value: new THREE.Color(o.stripe || '#1d4a42') },
    uBottom: { value: new THREE.Color(o.bottom || '#5e2a21') },
    uBare: { value: new THREE.Color(o.bare || '#d6a66e') },
    uInterior: { value: new THREE.Color(o.interior || '#c08850') },
    uWL: { value: o.wl ?? 0.47 },
    uStripeS: { value: o.stripeS ?? 0.958 },
  };
}

/* ------------------------------------------------------------------ */
/* Themes                                                               */
/* ------------------------------------------------------------------ */
const THEME_DEFS = {
  light: {
    skyTop: '#5f96d0', skyHorizon: '#dce7ed', skyBottom: '#c8d6de', glow: '#fff0d2', glowStrength: 0.4,
    glowDir: [-0.55, 0.5, -0.6],
    fog: '#d7e2e8', fogNear: 45, fogFar: 620,
    hemiSky: '#d8e9f7', hemiGround: '#7d6c58', hemiI: 1.35,
    sun: '#fff1dd', sunI: 2.6, sunDir: [-0.55, 0.62, -0.5],
    deep: '#1d4454', shallow: '#3f7682', hill: '#4a5c50', sunSpec: 5.0,
    lamp: 0.0, lampGlass: 0.25, windows: 0.0, interior: 9.0, exposure: 1.0,
    warmSun: '#ffd09a', warmHorizon: '#f1dcc2',
  },
  dark: {
    skyTop: '#0b1533', skyHorizon: '#4a5384', skyBottom: '#283057', glow: '#ff9a5a', glowStrength: 1.0,
    glowDir: [0.62, 0.04, -0.78],
    fog: '#2e365e', fogNear: 30, fogFar: 430,
    hemiSky: '#5469a8', hemiGround: '#1c1b22', hemiI: 0.75,
    sun: '#a9b9ea', sunI: 0.6, sunDir: [0.42, 0.6, -0.68],
    deep: '#0a1429', shallow: '#17284c', hill: '#0d131f', sunSpec: 0.5,
    lamp: 1.0, lampGlass: 5.0, windows: 2.6, interior: 26.0, exposure: 1.12,
    warmSun: '#c9a0a0', warmHorizon: '#7a5a78',
  },
};
function prepTheme(def) {
  const o = {};
  for (const k in def) {
    const v = def[k];
    if (typeof v === 'string') o[k] = new THREE.Color(v);
    else if (Array.isArray(v)) o[k] = new V3(...v).normalize();
    else o[k] = v;
  }
  return o;
}

/* ------------------------------------------------------------------ */
/* Camera keyframes                                                     */
/* ------------------------------------------------------------------ */
// at: scroll position, target, azimuth (deg, 0 = +z, 90 = +x), elevation (deg), distance, vertical fov,
// ox: horizontal view offset (fraction of width) that pushes the subject right of the text column.
const KEYS = [
  { at: 0, tgt: [0.3, 2.3, 0.6], az: -48, el: 11, dist: 15, fov: 38, ox: 0.2 }, // 0 Hero
  { at: 1, tgt: [-0.2, 2.05, 1.6], az: -20, el: 11, dist: 9.5, fov: 34, ox: 0.14 }, // 1 Håndverket (close-up)
  { at: BUILD.end, tgt: [-0.2, 2.0, 1.4], az: -25, el: 13, dist: 9.2, fov: 34, ox: 0.14 }, // hold + slow drift during the build
  { at: 2, tgt: [11.5, 2.6, 16.5], az: -96, el: 15, dist: 23, fov: 38, ox: 0.2 }, // 2 Tjenester
  { at: 3, tgt: [-6, 3, 8], az: -146, el: 29, dist: 128, fov: 40, ox: 0.18 }, // 3 Historien
  { at: 4, tgt: [0.6, 0.85, -14], az: -162, el: 4.5, dist: 13.5, fov: 36, ox: 0.2 }, // 4 Kontakt
];

/* ------------------------------------------------------------------ */
/* createScene                                                          */
/* ------------------------------------------------------------------ */
export function createScene(canvas, { reducedMotion = false, theme = 'light' } = {}) {
  // --- WebGL availability ---
  {
    let ok = false;
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      ok = !!gl;
      if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch (e) {
      ok = false;
    }
    if (!ok) throw new Error('WebGL2 is not available');
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    throw new Error('Could not create WebGL renderer: ' + (e && e.message ? e.message : e));
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd7e2e8, 45, 620);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.3, 4000);

  const grainTex = makeGrainTexture();
  const boardTex = makeBoardTexture();

  // --- Materials ---
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0 }, o));
  const M = {
    tar: std({ color: '#3a2c22', map: grainTex, roughness: 0.6 }),
    oak: std({ color: '#b07a46', map: grainTex, roughness: 0.7 }),
    varnish: std({ color: '#c08445', map: grainTex, roughness: 0.38 }),
    floorWood: std({ color: '#9a7048', map: grainTex, roughness: 0.85 }),
    iron: std({ color: '#3b3a38', roughness: 0.5, metalness: 0.6 }),
    sleeper: std({ color: '#5a4636', map: grainTex, roughness: 0.9 }),
    pier: std({ color: '#8a7660', map: boardTex, roughness: 0.9 }),
    granite: std({ color: '#9a918b', roughness: 0.95, flatShading: true }),
    trim: std({ color: '#f2efe8', roughness: 0.7 }),
    shedFloor: std({ color: '#6e5a46', roughness: 0.95 }),
    window: std({ color: '#2b3440', roughness: 0.25, metalness: 0.1, emissive: '#ffb15c', emissiveIntensity: 0 }),
    lamp: std({ color: '#ffe2b0', emissive: '#ffb04d', emissiveIntensity: 0.2, roughness: 0.4 }),
    drumBlue: std({ color: '#2f5f8a', roughness: 0.55, metalness: 0.3 }),
    drumRed: std({ color: '#a53a2a', roughness: 0.55, metalness: 0.3 }),
    rope: std({ color: '#c9b48a', roughness: 0.9 }),
  };
  M.pier.userData.uvScale = 1.6;
  const wallMats = new Map();
  const boardMat = (color) => {
    if (!wallMats.has(color)) {
      const m = std({ color, map: boardTex, roughness: 0.85 });
      m.userData.uvScale = 0.8;
      wallMats.set(color, m);
    }
    return wallMats.get(color);
  };

  const nearBatch = new Batch();
  const farBatch = new Batch();
  const world = new THREE.Group();
  scene.add(world);

  /* ---------------- Sky ---------------- */
  const skyU = {
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() }, uGlowDir: { value: new V3(0, 0.3, -1) }, uGlowStrength: { value: 0.5 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 24, 12),
    new THREE.ShaderMaterial({
      uniforms: skyU,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      vertexShader: `varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,
      fragmentShader: `uniform vec3 uTop, uHorizon, uBottom, uGlow, uGlowDir;
uniform float uGlowStrength;
varying vec3 vDir;
void main() {
  vec3 d = normalize( vDir );
  float h = d.y;
  vec3 col = h > 0.0 ? mix( uHorizon, uTop, pow( smoothstep( 0.0, 0.62, h ), 0.75 ) ) : mix( uHorizon, uBottom, smoothstep( 0.0, 0.08, -h ) );
  float g = max( dot( d, normalize( uGlowDir ) ), 0.0 );
  float band = 1.0 - smoothstep( 0.0, 0.35, abs( h - 0.02 ) );
  col += uGlow * ( pow( g, 10.0 ) * 0.6 + pow( g, 2.5 ) * 0.35 * band ) * uGlowStrength;
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    })
  );
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  /* ---------------- Lights ---------------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x666655, 1.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const SH = 23;
  Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 220 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.035;
  const shadowCenter = new V3(3, 0, 0);
  sun.target.position.copy(shadowCenter);
  scene.add(sun, sun.target);

  /* ---------------- Terrain ---------------- */
  {
    const NX = 92, NZ = 60;
    const xs = [], zs = [];
    for (let i = 0; i <= NX; i++) { const a = (i / NX) * 2 - 1; xs.push(Math.sign(a) * Math.pow(Math.abs(a), 1.6) * 270); }
    for (let j = 0; j <= NZ; j++) { const b = (j / NZ) * 2 - 1; zs.push(-1 + Math.sign(b) * Math.pow(Math.abs(b), 1.6) * (b < 0 ? 270 : 232)); }
    const hgt = [];
    for (let j = 0; j <= NZ; j++) { const row = []; for (let i = 0; i <= NX; i++) row.push(terrainHeight(xs[i], zs[j])); hgt.push(row); }
    const pos = [], col = [];
    const C = (h) => new THREE.Color(h);
    const pal = {
      under: C('#4d5848'), underDeep: C('#2f3d3a'),
      gravel: C('#9a9282'), grass: C('#7c8656'), granite: C('#a3978e'), granite2: C('#8c8580'), granite3: C('#b2a59a'),
      forest: C('#3e5a3a'), forest2: C('#4a6440'), forest3: C('#33503a'),
    };
    const tmpC = new THREE.Color();
    const pA = new V3(), pB = new V3(), pC = new V3(), e1 = new V3(), e2 = new V3();
    const pushTri = (a, b, c) => {
      pA.set(...a); pB.set(...b); pC.set(...c);
      e1.subVectors(pB, pA); e2.subVectors(pC, pA);
      const n = new V3().crossVectors(e1, e2).normalize();
      if (n.y < 0) { const t2 = pB.clone(); pB.copy(pC); pC.copy(t2); n.negate(); }
      pos.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z, pC.x, pC.y, pC.z);
      const cx = (pA.x + pB.x + pC.x) / 3, cz = (pA.z + pB.z + pC.z) / 3, ch = (pA.y + pB.y + pC.y) / 3;
      const dN = cz - shoreZ(cx);
      const ym = yardMask(cx, dN);
      const rock = fbm(cx * 0.045, cz * 0.045, 77, 3);
      const v = fbm(cx * 0.3, cz * 0.3, 5, 2);
      if (ch < -0.12) tmpC.copy(pal.under).lerp(pal.underDeep, smoothstep(0.5, 5, -ch));
      else if (ym > 0.5 && ch < 3.2 && n.y > 0.86 && dN > 4.5 + 2 * v) tmpC.copy(pal.gravel).lerp(pal.grass, smoothstep(0.35, 0.65, v));
      else if (ch < 2.6 || n.y < 0.8 || rock > 0.62 || (ch > 38 && rock > 0.5)) tmpC.copy(v > 0.5 ? pal.granite : pal.granite2).lerp(pal.granite3, smoothstep(0.55, 0.8, rock) * 0.6);
      else tmpC.copy(v > 0.6 ? pal.forest2 : v < 0.38 ? pal.forest3 : pal.forest);
      const j = 0.94 + hash2(Math.floor(cx * 7), Math.floor(cz * 7), 4) * 0.12;
      for (let k = 0; k < 3; k++) col.push(tmpC.r * j, tmpC.g * j, tmpC.b * j);
    };
    for (let j = 0; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const v00 = [xs[i], hgt[j][i], zs[j]], v10 = [xs[i + 1], hgt[j][i + 1], zs[j]];
        const v01 = [xs[i], hgt[j + 1][i], zs[j + 1]], v11 = [xs[i + 1], hgt[j + 1][i + 1], zs[j + 1]];
        if ((i + j) & 1) { pushTri(v00, v01, v11); pushTri(v00, v11, v10); }
        else { pushTri(v00, v01, v10); pushTri(v10, v01, v11); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const terrain = new THREE.Mesh(g, std({ vertexColors: true, flatShading: true, roughness: 0.96 }));
    terrain.receiveShadow = true;
    world.add(terrain);
  }

  /* ---------------- Trees ---------------- */
  {
    const trunk = new THREE.CylinderGeometry(0.035, 0.06, 0.62, 3, 1, true);
    trunk.translate(0, 0.31, 0);
    const crown = new THREE.IcosahedronGeometry(0.5, 0);
    crown.scale(0.6, 0.44, 0.6);
    crown.translate(0, 0.74, 0);
    const paint = (geo, hex) => {
      const c = new THREE.Color(hex);
      const arr = new Float32Array(geo.attributes.position.count * 3);
      for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      return geo;
    };
    const treeGeo = mergeGeometries([paint(trunk.toNonIndexed(), '#5a4132'), paint(crown, '#2e4a2c')]);
    treeGeo.computeVertexNormals();
    const rnd = mulberry32(42);
    const mats = [];
    const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), ps = new V3();
    const colors = [];
    const inPad = (x, z) => LAYOUT.pads.some((p) => Math.abs(x - p.x) < p.hw + 3 && Math.abs(z - p.z) < p.hd + 3);
    for (let tries = 0; tries < 12000 && mats.length < 290; tries++) {
      const x = (rnd() * 2 - 1) * 255;
      const z = -255 + rnd() * 470;
      const h = terrainHeight(x, z);
      if (h < 3.0) continue;
      const dN = z - shoreZ(x);
      if (yardMask(x, dN) > 0.25) continue;
      const rock = fbm(x * 0.045, z * 0.045, 77, 3);
      if (rock > 0.6) continue;
      if (fbm(x * 0.02, z * 0.02, 99, 2) < 0.36 && rnd() < 0.7) continue;
      const sx = terrainHeight(x + 2, z) - h, sz = terrainHeight(x, z + 2) - h;
      if (Math.hypot(sx, sz) / 2 > 0.75) continue;
      if (inPad(x, z)) continue;
      const far = smoothstep(40, 140, Math.hypot(x, z));
      const H = (5 + rnd() * 4.5) * (1 + far * 0.6);
      const W = H * (0.75 + rnd() * 0.4);
      ps.set(x, h - 0.3, z);
      q.setFromAxisAngle(new V3(0, 1, 0), rnd() * 6.28);
      sc.set(W, H, W);
      mats.push(tmpM.compose(ps, q, sc).clone());
      colors.push(0.8 + rnd() * 0.35);
    }
    const trees = new THREE.InstancedMesh(treeGeo, std({ vertexColors: true, flatShading: true, roughness: 0.9 }), mats.length);
    const c = new THREE.Color();
    mats.forEach((m, i) => {
      trees.setMatrixAt(i, m);
      c.setRGB(colors[i], colors[i] * (0.95 + (i % 5) * 0.02), colors[i] * 0.9);
      trees.setColorAt(i, c);
    });
    trees.instanceMatrix.needsUpdate = true;
    if (trees.instanceColor) trees.instanceColor.needsUpdate = true;
    trees.computeBoundingSphere();
    world.add(trees);
  }

  /* ---------------- Water ---------------- */
  const waterU = {
    uTime: { value: 0 }, uAmp: { value: 1 }, uCenter: { value: new THREE.Vector2(2, -8) },
    uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() },
    uSkyTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uHill: { value: new THREE.Color() },
    uSunColor: { value: new THREE.Color() }, uSunDir: { value: new V3(0, 1, 0) }, uSunSpec: { value: 4 },
    uGlow: { value: new THREE.Color() }, uGlowDir: { value: new V3(0, 0.2, -1) }, uGlowStrength: { value: 0.5 },
    uLampColor: { value: new THREE.Color('#ffb25a') }, uLampPos: { value: new V3(-1.8, 2.7, -2.6) }, uLamp: { value: 0 },
    uFogColor: { value: new THREE.Color() }, uFogNear: { value: 45 }, uFogFar: { value: 600 },
  };
  {
    const N = 48;
    const coords = [];
    for (let i = 0; i <= N; i++) { const a = (i / N) * 2 - 1; coords.push(Math.sign(a) * a * a * 1400); }
    const pos = [], idx = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) pos.push(coords[i] + 2, 0, coords[j] - 8);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const wm = new THREE.ShaderMaterial({
      uniforms: waterU,
      transparent: true,
      vertexShader: `uniform float uTime, uAmp;
uniform vec2 uCenter;
varying vec3 vWorld;
float waveH( vec2 p, float t ) {
  return sin( dot( p, vec2( 0.62, 0.78 ) ) * 0.85 + t * 1.05 ) * 0.035
       + sin( dot( p, vec2( -0.74, 0.35 ) ) * 1.55 + t * 1.45 ) * 0.02
       + sin( dot( p, vec2( 0.18, -0.98 ) ) * 2.9 + t * 2.2 ) * 0.008;
}
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  float fade = 1.0 - smoothstep( 30.0, 140.0, length( wp.xz - uCenter ) );
  wp.y += waveH( wp.xz, uTime ) * uAmp * fade;
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,
      fragmentShader: `uniform float uTime, uSunSpec, uGlowStrength, uLamp, uFogNear, uFogFar;
uniform vec3 uDeep, uShallow, uSkyTop, uHorizon, uHill, uSunColor, uSunDir, uGlow, uGlowDir, uLampColor, uLampPos, uFogColor;
varying vec3 vWorld;
vec2 wg( vec2 p, vec2 d, float k, float a, float w, float t ) {
  return d * ( k * a * cos( dot( p, d ) * k + t * w ) );
}
void main() {
  vec3 toCam = cameraPosition - vWorld;
  float dist = length( toCam );
  vec3 V = toCam / dist;
  vec2 p = vWorld.xz;
  float t = uTime;
  float rip = 1.0 / ( 1.0 + dist * 0.03 );
  float paws = 0.55 + 0.45 * sin( p.x * 0.07 + t * 0.11 ) * sin( p.y * 0.09 - t * 0.08 );
  vec2 g = vec2( 0.0 );
  g += wg( p, vec2( 0.62, 0.78 ), 0.85, 0.035, 1.05, t );
  g += wg( p, vec2( -0.74, 0.35 ), 1.55, 0.02, 1.45, t );
  g += wg( p, vec2( 0.18, -0.98 ), 2.9, 0.008, 2.2, t );
  g += wg( p, normalize( vec2( 0.9, 0.43 ) ), 6.3, 0.006 * rip * paws, 3.1, t );
  g += wg( p, normalize( vec2( -0.3, 0.95 ) ), 9.7, 0.0042 * rip * paws, 3.9, t );
  g += wg( p, normalize( vec2( -0.85, -0.52 ) ), 14.1, 0.0026 * rip * paws, 4.6, t );
  g += wg( p, normalize( vec2( 0.55, -0.83 ) ), 21.0, 0.0016 * rip * paws, 5.5, t );
  g *= 1.0 / ( 1.0 + dist * 0.008 );
  vec3 N = normalize( vec3( -g.x, 1.0, -g.y ) );
  float ndv = max( dot( N, V ), 0.0 );
  float F = 0.02 + 0.98 * pow( 1.0 - ndv, 5.0 );
  vec3 R = reflect( -V, N );
  float ry = max( R.y, 0.0 );
  vec3 skyC = mix( uHorizon, uSkyTop, pow( smoothstep( 0.0, 0.62, ry ), 0.75 ) );
  float gd = max( dot( R, normalize( uGlowDir ) ), 0.0 );
  skyC += uGlow * ( pow( gd, 10.0 ) * 0.6 + pow( gd, 2.5 ) * 0.2 ) * uGlowStrength;
  float hillM = 1.0 - smoothstep( 0.015, 0.14, ry );
  skyC = mix( skyC, uHill, hillM * 0.78 );
  vec3 body = mix( uDeep, uShallow, 0.3 * ndv + 0.15 );
  vec3 col = mix( body, skyC, clamp( F + 0.06, 0.0, 1.0 ) );
  col += uSunColor * pow( max( dot( R, normalize( uSunDir ) ), 0.0 ), 240.0 ) * uSunSpec;
  vec3 Lp = uLampPos - vWorld;
  float ld = length( Lp );
  Lp /= ld;
  float lr = max( dot( R, Lp ), 0.0 );
  col += uLampColor * ( pow( lr, 60.0 ) * 3.0 + pow( lr, 8.0 ) * 0.25 ) * uLamp / ( 1.0 + ld * ld * 0.006 );
  float alpha = mix( 0.8, 1.0, F );
  alpha = max( alpha, smoothstep( 25.0, 110.0, dist ) );
  gl_FragColor = vec4( col, alpha );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  float fogF = clamp( ( dist - uFogNear ) / ( uFogFar - uFogNear ), 0.0, 1.0 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, uFogColor, fogF );
}`,
    });
    const water = new THREE.Mesh(g, wm);
    water.frustumCulled = false;
    water.renderOrder = 5;
    world.add(water);
  }

  /* ---------------- Sheds & houses ---------------- */
  const doorPivots = { naust: [], hall: [] };
  const interiorLights = [];
  function buildShed(s) {
    const { w, d, h, roofH } = s;
    const wall = boardMat(s.wall), roof = boardMat(s.roof);
    const T = 0.14;
    const batch = s.house || Math.abs(s.x) > 22 ? farBatch : nearBatch;
    const mat4 = new THREE.Matrix4().compose(new V3(s.x, s.y, s.z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), s.ry), new V3(1, 1, 1));
    const add = (mat, geo) => { geo.applyMatrix4(mat4); batch.add(mat, geo); };
    add(M.granite, boxGeo(w + 0.4, 2.6, d + 0.4, 0, -1.28, 0));
    add(M.shedFloor, boxGeo(w - 0.2, 0.06, d - 0.2, 0, 0.04, 0));
    add(wall, boxGeo(T, h, d, -w / 2 + T / 2, h / 2, 0));
    add(wall, boxGeo(T, h, d, w / 2 - T / 2, h / 2, 0));
    add(wall, boxGeo(w - 2 * T, h, T, 0, h / 2, d / 2 - T / 2));
    add(wall, gableGeo(w, roofH, T, h, d / 2 - T));
    const zf = -d / 2;
    if (s.door) {
      const dw = s.doorW, dh = s.doorH, sideW = (w - dw) / 2;
      add(wall, boxGeo(sideW, h, T, -w / 2 + sideW / 2, h / 2, zf + T / 2));
      add(wall, boxGeo(sideW, h, T, w / 2 - sideW / 2, h / 2, zf + T / 2));
      add(wall, boxGeo(dw, h - dh, T, 0, dh + (h - dh) / 2, zf + T / 2));
      // door frame trim
      add(M.trim, boxGeo(0.12, dh, 0.06, -dw / 2 - 0.06, dh / 2, zf - 0.02));
      add(M.trim, boxGeo(0.12, dh, 0.06, dw / 2 + 0.06, dh / 2, zf - 0.02));
      add(M.trim, boxGeo(dw + 0.36, 0.14, 0.06, 0, dh + 0.07, zf - 0.02));
      if (s.door === 'closed') {
        add(wall, boxGeo(dw, dh, 0.06, 0, dh / 2, zf - 0.01));
        for (const sx of [-1, 1]) {
          const cx = (sx * dw) / 4;
          add(M.trim, boxGeo(dw / 2 - 0.1, 0.1, 0.05, cx, dh * 0.15, zf - 0.05));
          add(M.trim, boxGeo(dw / 2 - 0.1, 0.1, 0.05, cx, dh * 0.85, zf - 0.05));
          add(M.trim, boxGeo(Math.hypot(dw / 2 - 0.1, dh * 0.7), 0.1, 0.05, cx, dh / 2, zf - 0.05, 0, 0, Math.atan2(dh * 0.7, dw / 2 - 0.1) * sx));
        }
      } else {
        // open door leaves on pivots
        const grp = new THREE.Group();
        grp.position.set(s.x, s.y, s.z);
        grp.rotation.y = s.ry;
        world.add(grp);
        for (const sx of [-1, 1]) {
          const pivot = new THREE.Group();
          pivot.position.set((sx * dw) / 2, 0, zf - 0.03);
          const leafGeo = boxGeo(dw / 2, dh - 0.04, 0.06, (-sx * dw) / 4, dh / 2, 0);
          worldUV(leafGeo, 0.8);
          const leaf = new THREE.Mesh(leafGeo, wall);
          const braceGeo = mergeGeometries([
            boxGeo(dw / 2 - 0.12, 0.1, 0.05, (-sx * dw) / 4, dh * 0.15, -0.05),
            boxGeo(dw / 2 - 0.12, 0.1, 0.05, (-sx * dw) / 4, dh * 0.85, -0.05),
            boxGeo(Math.hypot(dw / 2 - 0.12, dh * 0.7), 0.1, 0.05, (-sx * dw) / 4, dh / 2, -0.05, 0, 0, Math.atan2(dh * 0.7, dw / 2 - 0.12) * sx),
          ]);
          const brace = new THREE.Mesh(braceGeo, M.trim);
          for (const m of [leaf, brace]) { m.castShadow = true; m.receiveShadow = true; pivot.add(m); }
          pivot.userData.sx = sx;
          grp.add(pivot);
          if (s.id === 'naust' || s.id === 'hall') doorPivots[s.id].push(pivot);
          else pivot.rotation.y = sx * -1.55;
        }
        // warm interior light
        if (s.id === 'naust' || s.id === 'hall') {
          const L = new THREE.PointLight('#ffbf7a', 0, s.id === 'hall' ? 22 : 15, 2);
          L.position.set(0, h * 0.82, 0.5);
          grp.add(L);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M.lamp);
          bulb.position.copy(L.position);
          grp.add(bulb);
          interiorLights.push(L);
        }
      }
    } else {
      add(wall, boxGeo(w - 2 * T, h, T, 0, h / 2, zf + T / 2));
    }
    add(wall, gableGeo(w, roofH, T, h, zf));
    // roof slabs
    const pitch = Math.atan2(roofH, w / 2);
    const ov = 0.42, thick = 0.12;
    const len = Math.hypot(w / 2, roofH) + ov;
    for (const sx of [-1, 1]) {
      const u = new V3(sx * Math.cos(pitch), -Math.sin(pitch), 0);
      const nrm = new V3(sx * Math.sin(pitch), Math.cos(pitch), 0);
      const R = new V3(0, h + roofH, 0);
      const c = R.clone().addScaledVector(u, len / 2).addScaledVector(nrm, thick / 2 + 0.02);
      add(roof, boxGeo(len, thick, d + 0.7, c.x, c.y, c.z, 0, 0, -sx * pitch));
      for (const zz of [-1, 1]) {
        const cb = R.clone().addScaledVector(u, len / 2).addScaledVector(nrm, -0.04);
        add(M.trim, boxGeo(len, 0.2, 0.06, cb.x, cb.y, zz * (d / 2 + 0.33), 0, 0, -sx * pitch));
      }
    }
    add(roof, boxGeo(0.26, 0.14, d + 0.75, 0, h + roofH + 0.1, 0));
    // corner boards
    for (const cx of [-1, 1]) for (const cz of [-1, 1]) add(M.trim, boxGeo(0.17, h, 0.17, (cx * w) / 2, h / 2, (cz * d) / 2));
    // windows
    const addWin = (x, y, z, ww, wh, axis) => {
      if (axis === 'x') {
        add(M.trim, boxGeo(0.05, wh + 0.18, ww + 0.18, x, y, z));
        add(M.window, boxGeo(0.05, wh, ww, x + Math.sign(x) * 0.02, y, z));
      } else {
        add(M.trim, boxGeo(ww + 0.18, wh + 0.18, 0.05, x, y, z));
        add(M.window, boxGeo(ww, wh, 0.05, x, y, z + (z < 0 ? -0.02 : 0.02)));
      }
    };
    for (let k = 0; k < (s.win || 0); k++) {
      const z = -d / 2 + ((k + 1) * d) / ((s.win || 0) + 1);
      for (const sx of [-1, 1]) addWin(sx * (w / 2 + 0.04), h * (s.house ? 0.55 : 0.6), z, s.house ? 1.0 : 0.85, s.house ? 1.1 : 0.7, 'x');
    }
    if (s.frontWin) {
      for (let k = 0; k < s.frontWin; k++) {
        const x = s.frontWin === 1 ? 0 : -w / 4 + (k * w) / 2;
        addWin(x, h * 0.55, zf - 0.04, 0.9, s.house ? 1.1 : 0.6, 'z');
      }
    }
    if (s.gableWin) addWin(0, h + roofH * 0.35, zf - 0.04, 0.7, 0.55, 'z');
    if (s.house) add(M.trim, boxGeo(0.5, 0.9, 0.5, w / 4, h + roofH * 0.6, 0.6)); // chimney (white-washed)
  }
  LAYOUT.sheds.forEach(buildShed);

  /* ---------------- Slipways & piers ---------------- */
  function buildSlip(slip, batch) {
    const gx = [-0.5, 0.5];
    const A = (x, z) => new V3(slip.x + x, railY(slip, z) - 0.035, z);
    for (const x of gx) batch.add(M.iron, beamGeo(A(x, slip.zBot), A(x, slip.zTop), 0.09, 0.07));
    for (const x of [-0.72, 0.72]) {
      batch.add(M.sleeper, beamGeo(new V3(slip.x + x, railY(slip, slip.zBot) - 0.3, slip.zBot), new V3(slip.x + x, railY(slip, slip.zTop) - 0.3, slip.zTop), 0.18, 0.2));
    }
    for (let z = slip.zBot + 0.3; z <= slip.zTop - 0.2; z += 0.9) {
      const y = railY(slip, z);
      batch.add(M.sleeper, boxGeo(1.75, 0.1, 0.2, slip.x, y - 0.13, z, -SLIP_ANGLE, 0, 0));
      if (Math.round((z - slip.zBot) / 0.9) % 2 === 0) {
        for (const x of [-0.72, 0.72]) {
          const g = Math.max(terrainHeight(slip.x + x, z), -6);
          const top = y - 0.4;
          if (top - g > 0.15) batch.add(M.sleeper, boxGeo(0.14, top - g + 0.3, 0.14, slip.x + x, (top + g - 0.3) / 2, z));
        }
      }
    }
  }
  LAYOUT.slips.forEach((s) => buildSlip(s, s === HERO_SLIP ? nearBatch : farBatch));
  // winch drum at the top of the hero slip
  {
    nearBatch.add(M.sleeper, boxGeo(1.7, 0.3, 0.3, 0, railY(HERO_SLIP, 8.6) - 0.05, 8.6));
  }
  for (const p of LAYOUT.piers) {
    const len = Math.abs(p.z1 - p.z0), zc = (p.z0 + p.z1) / 2;
    const b = Math.abs(p.x) < 20 ? nearBatch : farBatch;
    b.add(M.pier, boxGeo(p.w, 0.12, len, p.x, p.y, zc));
    for (let z = p.z0 - 0.3; z >= p.z1; z -= 2.2) {
      for (const sx of [-1, 1]) {
        b.add(M.sleeper, cylGeo(0.11, 0.11, p.y + 3.2, 6, p.x + sx * (p.w / 2 - 0.05), (p.y - 3.2) / 2 + 0.12, z));
      }
    }
    for (const sx of [-1, 1]) b.add(M.sleeper, boxGeo(0.1, 0.16, len, p.x + sx * (p.w / 2 + 0.03), p.y - 0.02, zc));
    for (let z = p.z0 - 3; z >= p.z1 + 1; z -= 4.5) b.add(M.iron, cylGeo(0.07, 0.09, 0.35, 8, p.x - p.w / 2 + 0.2, p.y + 0.23, z));
  }
  // props: oil drums, workbench, plank stack, lantern
  {
    const gy = (x, z) => terrainHeight(x, z);
    nearBatch.add(M.drumBlue, cylGeo(0.3, 0.3, 0.9, 12, 13.1, gy(13.1, -1.4) + 0.45, -1.4));
    nearBatch.add(M.drumRed, cylGeo(0.3, 0.3, 0.9, 12, 13.0, gy(13.0, -0.6) + 0.45, -0.7));
    nearBatch.add(M.drumBlue, cylGeo(0.3, 0.3, 0.9, 12, 13.7, gy(13.7, -0.9) + 0.45, -1.0));
    // workbench in front of the hall door
    const bx = 5.6, bz = 12.6, by = gy(bx, bz);
    nearBatch.add(M.varnish, boxGeo(0.8, 0.09, 2.3, bx, by + 0.9, bz));
    for (const dx of [-0.32, 0.32]) for (const dz of [-1.0, 1.0]) nearBatch.add(M.sleeper, boxGeo(0.09, 0.88, 0.09, bx + dx, by + 0.44, bz + dz));
    nearBatch.add(M.sleeper, boxGeo(0.7, 0.06, 2.0, bx, by + 0.25, bz));
    nearBatch.add(M.iron, boxGeo(0.2, 0.16, 0.18, bx - 0.25, by + 1.02, bz + 0.9));
    // plank stack on bearers
    const px = 4.2, pz = 17.6, py = gy(px, pz);
    for (const dz of [-1.2, 0, 1.2]) nearBatch.add(M.sleeper, boxGeo(1.3, 0.14, 0.14, px, py + 0.07, pz + dz));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4 - (r >> 1); c++) {
      nearBatch.add(M.oak, boxGeo(0.24, 0.045, 3.6 - r * 0.15, px - 0.42 + c * 0.27, py + 0.17 + r * 0.05, pz + (r % 2) * 0.1));
    }
    // sawhorse
    const sx0 = 6.8, sz0 = 15.4, sy0 = gy(sx0, sz0);
    nearBatch.add(M.sleeper, boxGeo(0.1, 0.1, 1.1, sx0, sy0 + 0.7, sz0));
    for (const dz of [-0.45, 0.45]) for (const dx of [-1, 1]) {
      nearBatch.add(M.sleeper, beamGeo(new V3(sx0, sy0 + 0.7, sz0 + dz), new V3(sx0 + dx * 0.3, sy0, sz0 + dz), 0.06, 0.06));
    }
  }
  const lanternPos = new V3(1.85, 0, -2.9);
  lanternPos.y = terrainHeight(lanternPos.x, lanternPos.z);
  {
    const x = lanternPos.x, z = lanternPos.z, y = lanternPos.y;
    nearBatch.add(M.sleeper, boxGeo(0.14, 2.9, 0.14, x, y + 1.3, z));
    nearBatch.add(M.sleeper, boxGeo(0.5, 0.08, 0.08, x + 0.2, y + 2.7, z));
    nearBatch.add(M.iron, boxGeo(0.3, 0.06, 0.3, x + 0.4, y + 2.62, z));
    nearBatch.add(M.lamp, boxGeo(0.2, 0.26, 0.2, x + 0.4, y + 2.45, z));
    lanternPos.set(x + 0.4, y + 2.45, z);
  }
  const lantern = new THREE.PointLight('#ffb25e', 0, 24, 2);
  lantern.position.copy(lanternPos);
  scene.add(lantern);
  waterU.uLampPos.value.copy(lanternPos);

  /* ---------------- Boats ---------------- */
  const heroShape = makeHullShape();
  const N_STRAKES = STRAKES;
  const T_PLANK = 0.022;
  const LAP_S = 0.018;

  // Hero snekke
  const heroShared = hullUniforms({ paint: 1 });
  const hero = { strakes: [], top: [], interior: [] };
  const boatRoot = new THREE.Group();
  const boatYaw = new THREE.Group();
  boatYaw.rotation.y = Math.PI / 2; // local +x (stern) -> world -z (towards the water)
  boatRoot.add(boatYaw);
  world.add(boatRoot);
  {
    const nU = 37;
    const us = [];
    for (let j = 0; j < nU; j++) us.push(0.5 - 0.5 * Math.cos((Math.PI * j) / (nU - 1)));
    for (let i = 0; i < N_STRAKES; i++) {
      const geos = buildStrakeGeos(heroShape, i, { N: N_STRAKES, t: T_PLANK, lapS: LAP_S, us, low: false });
      const mat = makeHullMaterial(heroShared, grainTex);
      const meshes = geos.map((g, k) => {
        const m = new THREE.Mesh(g, mat);
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.sigma = k === 0 ? 1 : -1;
        boatYaw.add(m);
        return m;
      });
      hero.strakes.push({ meshes, mat });
    }
    const add = (geo, mat, list, cast = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = cast;
      m.receiveShadow = true;
      boatYaw.add(m);
      if (list) list.push(m);
      return m;
    };
    const frameXs = [];
    for (let k = 0; k < 13; k++) frameXs.push(lerp(-2.72, 2.72, k / 12));
    add(buildFramesGeo(heroShape, frameXs, 12), M.oak);
    add(buildBackboneGeo(heroShape), M.tar);
    add(buildRudderGeo(heroShape), M.tar);
    add(buildGunwaleGeo(heroShape, T_PLANK, 41), M.varnish, hero.top);
    // foredeck
    const fxs = [];
    for (let k = 0; k <= 8; k++) fxs.push(lerp(-3.93, -2.85, k / 8));
    const tmpP = new V3();
    add(
      buildDeckGeo(fxs, (x) => { heroShape.point(clamp(0.5 + x / heroShape.lenAt(1), 0, 1), 1, tmpP); return { y: tmpP.y + 0.03, z: tmpP.z + 0.01 }; }, 0.05),
      M.varnish, hero.top
    );
    add(boxGeo(0.06, 0.08, 1.6, -2.85, heroShape.sheer(0.5 - 2.85 / 8) - 0.0, 0), M.varnish, hero.top);
    // floorboards, thwarts, engine box
    const flx = [];
    for (let k = 0; k <= 12; k++) flx.push(lerp(-2.5, 2.6, k / 12));
    add(buildDeckGeo(flx, (x) => ({ y: 0.3, z: Math.max(0.05, heroShape.halfWidthAt(x, 0.3) - 0.04) }), 0), M.floorWood, hero.interior);
    for (const xt of [-2.05, -0.55, 2.55]) {
      const yt = 0.66 + (xt > 2 ? 0.08 : 0);
      const hw = heroShape.halfWidthAt(xt, yt) - 0.01;
      add(boxGeo(0.24, 0.045, 2 * hw, xt, yt, 0), M.varnish, hero.interior);
      add(boxGeo(0.06, yt - 0.3, 0.06, xt, (yt + 0.3) / 2, 0), M.oak, hero.interior);
    }
    add(boxGeo(0.95, 0.5, 0.72, 1.2, 0.55, 0), M.varnish, hero.interior);
    add(boxGeo(1.03, 0.05, 0.8, 1.2, 0.825, 0), M.varnish, hero.interior);
    add(cylGeo(0.035, 0.035, 0.75, 8, 1.58, 1.2, 0.24), M.iron, hero.interior);
  }

  // Cradle (slipvogn) for the hero boat — local frame: origin on rail-top centreline, +z up-slope.
  const CRADLE_TOP = 0.42; // keel block top
  const KEEL_DEPTH = 0.18;
  function buildCradleGeos(H, scale, batch) {
    const parts = [];
    for (const x of [-0.5, 0.5]) parts.push([M.sleeper, boxGeo(0.16, 0.16, 5.4 * scale + 0.4, x, 0.08, 0)]);
    for (const z of [-1.9, 0, 1.9]) {
      const zz = z * scale;
      parts.push([M.sleeper, boxGeo(2.1 * scale + 0.2, 0.16, 0.22, 0, 0.24, zz)]);
      parts.push([M.oak, boxGeo(0.24, 0.1, 0.45, 0, CRADLE_TOP - 0.05, zz)]);
      if (z !== 0) {
        const xl = -z; // boat local x at this cradle z (yaw maps local x -> -z)
        const yl = 0.5;
        const hw = H.halfWidthAt(xl, yl) * scale;
        const cy = CRADLE_TOP + KEEL_DEPTH * scale;
        for (const sx of [-1, 1]) {
          parts.push([M.sleeper, beamGeo(new V3(sx * (1.05 * scale + 0.05), 0.3, zz), new V3(sx * (hw + 0.07), cy + yl * scale, zz), 0.09, 0.09)]);
        }
      }
    }
    for (const [m, g] of parts) batch.add(m, g);
  }
  const cradle = new THREE.Group();
  {
    const b = new Batch();
    buildCradleGeos(heroShape, 1, b);
    b.build(cradle, true, true);
    world.add(cradle);
  }

  // Simplified hulls (overview & services)
  const lowShape = makeHullShape();
  const lowGeos = (() => {
    const nU = 17;
    const us = [];
    for (let j = 0; j < nU; j++) us.push(0.5 - 0.5 * Math.cos((Math.PI * j) / (nU - 1)));
    const N = 7;
    const list = [];
    for (let i = 0; i < N; i++) list.push(...buildStrakeGeos(lowShape, i, { N, t: 0.024, lapS: 0.02, us, low: true }));
    return {
      strakes: mergeGeometries(list),
      backbone: buildBackboneGeo(lowShape),
      gunwale: buildGunwaleGeo(lowShape, 0.024, 21),
      frames: buildFramesGeo(lowShape, [-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4], 6),
      thwarts: mergeGeometries([-1.4, 0.6].map((xt) => boxGeo(0.24, 0.05, 2 * lowShape.halfWidthAt(xt, 0.66), xt, 0.66, 0))),
    };
  })();
  const extraBoats = [];
  function makeLowBoat(opts) {
    const root = new THREE.Group();
    const yaw = new THREE.Group();
    root.add(yaw);
    const u = hullUniforms(opts);
    const mat = makeHullMaterial(u, grainTex, THREE.DoubleSide);
    const parts = [[lowGeos.strakes, mat], [lowGeos.backbone, M.tar], [lowGeos.gunwale, M.varnish], [lowGeos.thwarts, M.varnish]];
    if (opts.frames) parts.push([lowGeos.frames, M.oak]);
    for (const [g, m] of parts) {
      const mesh = new THREE.Mesh(g, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      yaw.add(mesh);
    }
    yaw.scale.setScalar(opts.scale || 1);
    world.add(root);
    return { root, yaw };
  }
  // 1) boat on bukker beside the hall (services stage) — under restoration, bare wood
  {
    const s = 0.8;
    const b = makeLowBoat({ paint: 0, frames: true, scale: s, bare: '#cf9c62' });
    const x = 4.0, z = 19.5, gy = terrainHeight(x, z);
    b.yaw.rotation.y = Math.PI / 2;
    const keelY = gy + 0.62;
    b.root.position.set(x, keelY + KEEL_DEPTH * s, z);
    for (const dz of [-1.8, 0, 1.8]) farBatch.add(M.sleeper, boxGeo(0.4, 0.62, 0.5, x, gy + 0.31, z + dz));
    for (const dz of [-1.3, 1.3]) for (const sx of [-1, 1]) {
      const hw = lowShape.halfWidthAt(-dz / s, 0.6) * s;
      farBatch.add(M.sleeper, beamGeo(new V3(x + sx * (hw + 0.7), gy, z + dz), new V3(x + sx * (hw + 0.04), keelY + KEEL_DEPTH * s + 0.6 * s, z + dz), 0.08, 0.08));
    }
  }
  // 2) inside the hall, on blocks, white
  {
    const hall = LAYOUT.sheds.find((s) => s.id === 'hall');
    const s = 0.82;
    const b = makeLowBoat({ paint: 1, scale: s });
    b.root.position.set(hall.x - 3.4, hall.y + 0.45 + KEEL_DEPTH * s, hall.z + 0.6);
    for (const dx of [-1.8, 0, 1.8]) farBatch.add(M.sleeper, boxGeo(0.5, 0.45, 0.4, hall.x - 3.4 + dx, hall.y + 0.22, hall.z + 0.6));
  }
  // 3) on the slip at shed C, white with oxblood stripe
  {
    const sc = LAYOUT.sheds.find((s) => s.id === 'c');
    const slip = LAYOUT.slips.find((s) => s.x === sc.x);
    const s = 0.75;
    const b = makeLowBoat({ paint: 1, scale: s, stripe: '#7a2a20' });
    const zc = sc.zFront - 1.0;
    const grp = new THREE.Group();
    grp.position.set(sc.x, railY(slip, zc), zc);
    grp.rotation.x = -SLIP_ANGLE;
    const cb = new Batch();
    buildCradleGeos(lowShape, s, cb);
    cb.build(grp, false, true);
    world.add(grp);
    grp.add(b.root);
    b.root.position.set(0, CRADLE_TOP + KEEL_DEPTH * s, 0);
    b.yaw.rotation.y = Math.PI / 2;
  }
  // 4) moored at the pier by shed F, varnished
  {
    const p = LAYOUT.piers[1];
    const s = 0.72;
    const b = makeLowBoat({ paint: 0, scale: s, bare: '#b77a40' });
    b.yaw.rotation.y = Math.PI / 2;
    b.root.position.set(p.x - 2.0, -0.47 * s, (p.z0 + p.z1) / 2 - 1);
    extraBoats.push({ root: b.root, baseY: -0.47 * s, phase: 1.7 });
  }

  nearBatch.build(world, true, true);
  farBatch.build(world, false, true);

  /* ---------------- State ---------------- */
  const themes = { light: prepTheme(THEME_DEFS.light), dark: prepTheme(THEME_DEFS.dark) };
  const cur = prepTheme(THEME_DEFS.light);
  let themeTarget = theme === 'dark' ? 1 : 0;
  let themeK = themeTarget;
  let tTarget = 0, tCur = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let time = 0;
  let width = 1, height = 1;
  let viewOX = 0.2;
  let rafId = 0, last = 0, running = false, disposed = false;
  let dirty = true;

  function applyAtmosphere(k, warm) {
    const A = themes.light, B = themes.dark;
    for (const key in cur) {
      const a = A[key], b = B[key];
      if (a instanceof THREE.Color) cur[key].lerpColors(a, b, k);
      else if (a instanceof V3) cur[key].lerpVectors(a, b, k).normalize();
      else cur[key] = lerp(a, b, k);
    }
    // a little extra warmth for the final "launch" shot
    cur.sun.lerp(cur.warmSun, 0.45 * warm);
    cur.skyHorizon.lerp(cur.warmHorizon, 0.35 * warm);
    cur.fog.lerp(cur.warmHorizon, 0.3 * warm);
    cur.glowStrength *= 1 + 0.6 * warm;

    skyU.uTop.value.copy(cur.skyTop);
    skyU.uHorizon.value.copy(cur.fog);
    skyU.uBottom.value.copy(cur.skyBottom).lerp(cur.fog, 0.5);
    skyU.uGlow.value.copy(cur.glow);
    skyU.uGlowDir.value.copy(cur.glowDir);
    skyU.uGlowStrength.value = cur.glowStrength;
    scene.fog.color.copy(cur.fog);
    scene.fog.near = cur.fogNear;
    scene.fog.far = cur.fogFar;
    renderer.setClearColor(cur.fog);
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.hemiI;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI;
    sun.position.copy(shadowCenter).addScaledVector(cur.sunDir, 90);
    waterU.uDeep.value.copy(cur.deep);
    waterU.uShallow.value.copy(cur.shallow);
    waterU.uSkyTop.value.copy(cur.skyTop);
    waterU.uHorizon.value.copy(cur.fog);
    waterU.uHill.value.copy(cur.hill);
    waterU.uSunColor.value.copy(cur.sun);
    waterU.uSunDir.value.copy(cur.sunDir);
    waterU.uSunSpec.value = cur.sunSpec;
    waterU.uGlow.value.copy(cur.glow);
    waterU.uGlowDir.value.copy(cur.glowDir);
    waterU.uGlowStrength.value = cur.glowStrength;
    waterU.uLamp.value = cur.lamp;
    waterU.uFogColor.value.copy(cur.fog).convertLinearToSRGB();
    waterU.uFogNear.value = cur.fogNear;
    waterU.uFogFar.value = cur.fogFar;
    M.window.emissiveIntensity = cur.windows;
    M.lamp.emissiveIntensity = cur.lampGlass;
    lantern.intensity = cur.lamp * 40;
    for (const L of interiorLights) L.intensity = cur.interior;
    renderer.toneMappingExposure = cur.exposure;
  }

  /* ---------------- Build animation ---------------- */
  // See BUILD: complete outside [start, end]; removed top-first over start..cleared,
  // then added back bottom-up, one strake per (end - cleared) / STRAKES.
  function strakeProgress(i, t) {
    if (t <= BUILD.start || t >= BUILD.end) return 1;
    if (t < BUILD.cleared) {
      const w = (BUILD.cleared - BUILD.start) / N_STRAKES;
      const a = BUILD.start + w * (N_STRAKES - 1 - i); // top strake first
      return 1 - smoothstep(a, a + w, t);
    }
    const w = (BUILD.end - BUILD.cleared) / N_STRAKES;
    const a = BUILD.cleared + w * i;
    return smoothstep(a, a + w, t);
  }
  let lastBuildT = -1;
  function updateBuild(t) {
    const tb = clamp(t, BUILD.start - 0.001, BUILD.end + 0.001);
    if (Math.abs(tb - lastBuildT) < 1e-5) return;
    lastBuildT = tb;
    hero.strakes.forEach((s, i) => {
      const e = strakeProgress(i, t);
      const vis = e > 0.001;
      s.mat.userData.u.uReveal.value = e >= 0.999 ? 99 : 0.15 + e * 4.4;
      for (const m of s.meshes) {
        m.visible = vis;
        m.castShadow = e > 0.95;
        const k = 1 - e;
        m.position.set(0, -k * 0.1, m.userData.sigma * k * 0.22);
      }
    });
    const eTop = strakeProgress(N_STRAKES - 1, t);
    hero.top.forEach((m) => { m.visible = eTop > 0.97; });
    const span = BUILD.end - BUILD.start;
    const interiorVis = t <= BUILD.start + 0.01 * span || t >= BUILD.end - 0.04 * span;
    hero.interior.forEach((m) => { m.visible = interiorVis; });
    const mid = (BUILD.start + BUILD.end) / 2;
    heroShared.uPaint.value = t < mid
      ? 1 - smoothstep(BUILD.start, BUILD.start + 0.1 * span, t)
      : smoothstep(BUILD.end - 0.12 * span, BUILD.end, t);
  }

  /* ---------------- Launch ---------------- */
  const FLOAT_Y = -0.47;
  const CY = CRADLE_TOP + KEEL_DEPTH;
  function updateLaunch(t) {
    const p = smoothstep(3.3, 4.0, t);
    const zPath = lerp(2.0, -14.0, p);
    const zc = Math.max(zPath, -12.2);
    const cyRail = railY(HERO_SLIP, zc);
    cradle.position.set(0, cyRail, zc);
    cradle.rotation.x = -SLIP_ANGLE;
    const onY = cyRail + CY * Math.cos(SLIP_ANGLE);
    const floatAmt = smoothstep(0.0, 0.3, FLOAT_Y - onY + 0.15);
    const bobK = reducedMotion ? 0 : floatAmt;
    const bob = (Math.sin(time * 1.1) * 0.03 + Math.sin(time * 0.67 + 1) * 0.018) * bobK;
    const y = Math.max(onY, FLOAT_Y) + bob;
    const wOn = 1 - floatAmt;
    boatRoot.position.set(0, y, zPath - CY * Math.sin(SLIP_ANGLE) * wOn);
    boatRoot.rotation.set(-SLIP_ANGLE * wOn + Math.sin(time * 0.6) * 0.008 * bobK, 0, Math.sin(time * 0.9) * 0.02 * bobK);
  }

  /* ---------------- Camera ---------------- */
  const camTarget = new V3();
  const camPos = new V3();
  const tmpA = new V3(), tmpB = new V3();
  function cameraFor(t) {
    let k = 0;
    while (k < KEYS.length - 2 && t > KEYS[k + 1].at) k++;
    const f = clamp((t - KEYS[k].at) / (KEYS[k + 1].at - KEYS[k].at), 0, 1);
    // the build hold drifts linearly; every other segment eases in and out
    const e = k === 1 ? f : f * f * (3 - 2 * f);
    const A = KEYS[k], B = KEYS[k + 1];
    tmpA.fromArray(A.tgt); tmpB.fromArray(B.tgt);
    camTarget.lerpVectors(tmpA, tmpB, e);
    const az = lerp(A.az, B.az, e) * DEG;
    const el = lerp(A.el, B.el, e) * DEG;
    let dist = Math.exp(lerp(Math.log(A.dist), Math.log(B.dist), e));
    const fov = lerp(A.fov, B.fov, e);
    viewOX = lerp(A.ox, B.ox, e);
    const aspect = width / height;
    const portrait = aspect < 1.2 ? 1 + (1.2 - aspect) * 1.25 : 1;
    dist *= portrait;
    camPos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(camTarget);
    // keep the camera above water/ground
    const gh = Math.max(0, terrainHeight(camPos.x, camPos.z));
    if (camPos.y < gh + 0.6) camPos.y = gh + 0.6;
    // pointer parallax (small)
    const sd = clamp(dist / 15, 0.4, 3);
    const fwd = tmpA.subVectors(camTarget, camPos).normalize();
    const right = tmpB.crossVectors(fwd, camera.up).normalize();
    camPos.addScaledVector(right, pointer.x * 0.45 * sd);
    camPos.y += -pointer.y * 0.25 * sd;
    camera.position.copy(camPos);
    camera.fov = fov;
    camera.lookAt(camTarget);
    applyViewOffset();
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w === width && h === height) return;
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    applyViewOffset();
    dirty = true;
  }
  function applyViewOffset() {
    // Desktop: subject in the right half (text on the left). Portrait: centred, lifted.
    const kx = smoothstep(0.8, 1.3, width / height);
    const offX = -width * viewOX * kx;
    const offY = height * 0.16 * (1 - kx);
    camera.setViewOffset(width, height, offX, offY, width, height); // also updates the projection
  }

  function update(dt) {
    // progress
    if (reducedMotion) tCur = tTarget;
    else {
      tCur += (tTarget - tCur) * (1 - Math.exp(-dt * 4.5));
      if (Math.abs(tTarget - tCur) < 1e-4) tCur = tTarget;
    }
    // theme
    const rate = dt / (reducedMotion ? 0.2 : 0.6);
    if (themeK !== themeTarget) {
      themeK = themeTarget > themeK ? Math.min(themeTarget, themeK + rate) : Math.max(themeTarget, themeK - rate);
    }
    // pointer
    const pk = 1 - Math.exp(-dt * 3);
    pointer.x += (pointer.tx - pointer.x) * pk;
    pointer.y += (pointer.ty - pointer.y) * pk;

    const kS = themeK * themeK * (3 - 2 * themeK);
    applyAtmosphere(kS, smoothstep(3.2, 4.0, tCur));
    updateBuild(tCur);
    updateLaunch(tCur);
    // doors
    const hallOpen = smoothstep(BUILD.end, 2.0, tCur);
    for (const p of doorPivots.hall) p.rotation.y = -p.userData.sx * lerp(0.0, 1.6, hallOpen);
    for (const p of doorPivots.naust) p.rotation.y = -p.userData.sx * (p.userData.sx < 0 ? 1.5 : 0.9);
    for (const b of extraBoats) {
      const k = reducedMotion ? 0 : 1;
      b.root.position.y = b.baseY + Math.sin(time * 1.0 + b.phase) * 0.03 * k;
      b.root.rotation.z = Math.sin(time * 0.8 + b.phase) * 0.02 * k;
    }
    waterU.uTime.value = time;
    waterU.uAmp.value = reducedMotion ? 0.5 : 1;
    cameraFor(tCur);
    sky.position.copy(camera.position);
  }

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!reducedMotion) time += dt;
    const settled = reducedMotion && !dirty && tCur === tTarget && themeK === themeTarget;
    if (settled) return;
    update(dt);
    renderer.render(scene, camera);
    dirty = false;
  }
  function start() {
    if (running || disposed) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }
  const onVisibility = () => { if (document.hidden) stop(); else { dirty = true; start(); } };
  document.addEventListener('visibilitychange', onVisibility);
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
  }
  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  resize();
  applyAtmosphere(themeK, 0);
  update(0);
  renderer.render(scene, camera);
  if (!document.hidden) start();
  if (globalThis.__SCENE_DEBUG) globalThis.__SCENE_DEBUG.scene = scene; // TEMP

  return {
    setProgress(t) {
      const v = Number(t);
      if (!Number.isFinite(v)) return;
      tTarget = clamp(v, 0, 4);
      dirty = true;
    },
    setTheme(name) {
      themeTarget = name === 'dark' ? 1 : 0;
      dirty = true;
    },
    setPointer(x, y) {
      pointer.tx = clamp(Number(x) || 0, -1, 1);
      pointer.ty = clamp(Number(y) || 0, -1, 1);
      if (reducedMotion) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
      dirty = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      const mats = new Set();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
      });
      mats.forEach((m) => m.dispose());
      grainTex.dispose();
      boardTex.dispose();
      renderer.dispose();
    },
  };
}
