// Cloud projects on claude.ai: the page's `db` keeps each person's own projects
// (private, under data/users/<id>/) and shared projects everybody with access can open
// and edit. `room` shows who else has the same shared project open.
//
// Outside claude.ai (npm run dev, a saved copy of the file) none of this is available
// and the app keeps working with the project stored in the browser.
import { uid } from "../model/geometry"
import type { Project, Underlay } from "../model/types"
import type { ProjectMeta } from "../store/store"
import { useStore } from "../store/store"

/* ---------- minimal typings for the capabilities we use ---------- */
type Snap = { id: string; exists: boolean; data(): Record<string, unknown> | undefined; metadata: { hasPendingWrites: boolean; fromCache: boolean } }
type QSnap = { docs: Snap[] }
type DocRef = {
  get(): Promise<Snap>
  set(d: Record<string, unknown>): Promise<void>
  delete(): Promise<void>
  onSnapshot(n: (s: Snap) => void, e?: (err: { code: string }) => void): () => void
}
type Query = { where(f: string, op: string, v: unknown): Query; orderBy(f: string, d?: "asc" | "desc"): Query; limit(n: number): Query; get(): Promise<QSnap>; onSnapshot(n: (s: QSnap) => void, e?: (err: { code: string }) => void): () => void }
type Coll = Query & { doc(id?: string): DocRef }
type DB = { doc(p: string): DocRef; collection(p: string): Coll }
type Profile = { id: string; name: string; avatarUrl: string; color: string; isMe: boolean }
type User = {
  me(): Promise<{ id: string | null; name: string; avatarUrl: string; color: string }>
  can(n: string): Promise<boolean | null>
  profiles(ids: string[]): Promise<Record<string, Profile>>
}
type Peer = { peer: string; by: string | null; isMe: boolean; presence: Record<string, unknown> }
type NamedRoom = { presence(p: Record<string, unknown>): Promise<void>; onPeers(h: (c: { peers: readonly Peer[] }) => void): () => void; leave(): Promise<void> }
type Room = { join(name: string): Promise<NamedRoom> }
type ClaudeWindow = { claude?: { use: (name: string) => Promise<unknown> } }

let db: DB | null = null
let user: User | null = null
let room: Room | null = null
let myId = ""

export type ProjectSummary = { id: string; name: string; updatedAt: number; updatedBy?: string; ownerId?: string; rooms: number; area: number }

const UNDERLAY_SEP = "~u~"
const projectsColl = (where: "mine" | "shared") => (where === "mine" ? `data/users/${myId}` : "shared")
const underlayColl = (where: "mine" | "shared") => (where === "mine" ? `data/users/${myId}` : "sharedUnderlays")
const projectDoc = (m: ProjectMeta) => db!.doc(`${projectsColl(m.where as "mine" | "shared")}/${m.id}`)
const underlayDoc = (m: ProjectMeta, levelId: string) => db!.doc(`${underlayColl(m.where as "mine" | "shared")}/${m.id}${UNDERLAY_SEP}${levelId}`)

export const cloudAvailable = () => !!db && !!myId

function stripUnderlays(p: Project): Project {
  if (!p.underlays) return p
  const u: Record<string, Underlay> = {}
  for (const [k, v] of Object.entries(p.underlays)) u[k] = { ...v, src: "" }
  return { ...p, underlays: u }
}

function summary(p: Project) {
  let area = 0
  for (const r of p.rooms) {
    let s = 0
    for (let i = 0; i < r.points.length; i++) {
      const a = r.points[i]
      const b = r.points[(i + 1) % r.points.length]
      s += a.x * b.y - b.x * a.y
    }
    area += Math.abs(s) / 2 / 10000
  }
  return { rooms: p.rooms.length, area: Math.round(area) }
}

/* ---------- init ---------- */
export async function initCloud() {
  const c = (window as unknown as ClaudeWindow).claude
  if (!c?.use) return
  useStore.setState({ sync: "connecting" })
  try {
    const [d, u] = (await Promise.all([c.use("db"), c.use("user")])) as [DB | null, User | null]
    if (!d || !u) {
      useStore.setState({ sync: "local" })
      return
    }
    const me = await u.me()
    if (!me.id) {
      useStore.setState({ sync: "local" })
      return
    }
    db = d
    user = u
    myId = me.id
    const canWriteShared = await u.can("data.write")
    useStore.setState({ cloud: { me: { id: me.id, name: me.name, avatarUrl: me.avatarUrl, color: me.color }, canWriteShared } })
    room = ((await c.use("room").catch(() => null)) as Room | null) ?? null
    startSync()
  } catch {
    useStore.setState({ sync: "local" })
  }
}

/* ---------- listing, opening, creating ---------- */
export async function listProjects(where: "mine" | "shared"): Promise<ProjectSummary[]> {
  if (!db) return []
  const q = db.collection(projectsColl(where)).where("kind", "==", "project").orderBy("updatedAt", "desc").limit(200)
  const snap = await q.get()
  return snap.docs
    .filter((d) => d.exists)
    .map((d) => {
      const x = d.data() as Record<string, unknown>
      return {
        id: d.id,
        name: String(x.name ?? "Uten navn"),
        updatedAt: Number(x.updatedAt ?? 0),
        updatedBy: x.updatedBy as string | undefined,
        ownerId: x.ownerId as string | undefined,
        rooms: Number(x.rooms ?? 0),
        area: Number(x.area ?? 0),
      }
    })
}

export async function profiles(ids: string[]) {
  if (!user || !ids.length) return {} as Record<string, Profile>
  return user.profiles([...new Set(ids)])
}

export async function openProject(where: "mine" | "shared", id: string) {
  if (!db) return
  const meta: ProjectMeta = { id, where }
  const snap = await projectDoc(meta).get()
  if (!snap.exists) throw new Error("Fant ikke prosjektet. Det kan være slettet.")
  const x = snap.data() as { project: Project; ownerId?: string }
  const project = x.project
  // underlays live in their own documents
  const unds = await db
    .collection(underlayColl(where))
    .where("kind", "==", "underlay")
    .where("projectId", "==", id)
    .get()
    .catch(() => ({ docs: [] as Snap[] }))
  const underlays: Record<string, Underlay> = { ...(project.underlays ?? {}) }
  for (const d of unds.docs) {
    const u = d.data() as { levelId: string; src: string }
    if (underlays[u.levelId]) underlays[u.levelId] = { ...underlays[u.levelId], src: u.src }
  }
  for (const k of Object.keys(underlays)) if (!underlays[k].src) delete underlays[k]
  suppressSave = true
  useStore.getState().load({ ...project, underlays }, { ...meta, ownerId: x.ownerId })
  suppressSave = false
  lastUnderlaySrc = Object.fromEntries(Object.entries(underlays).map(([k, v]) => [k, v.src]))
}

/** Save the open project to the cloud as a new project ("mine" or "shared"). */
export async function saveAs(where: "mine" | "shared", name?: string) {
  if (!db) return
  const st = useStore.getState()
  const project = name ? { ...st.project, name } : st.project
  const meta: ProjectMeta = { id: uid("prj"), where, ownerId: myId }
  useStore.setState({ meta, project })
  lastUnderlaySrc = {}
  await flush(true)
}

/** Move a private project to the shared area (keeps the same content). */
export async function shareCurrent() {
  const st = useStore.getState()
  if (!db || st.meta.where === "shared") return
  const old = st.meta
  await saveAs("shared")
  if (old.where === "mine") {
    await projectDoc(old)
      .delete()
      .catch(() => undefined)
    for (const levelId of Object.keys(st.project.underlays ?? {}))
      await underlayDoc(old, levelId)
        .delete()
        .catch(() => undefined)
  }
}

export async function deleteProject(where: "mine" | "shared", id: string, levelIds: string[] = []) {
  if (!db) return
  const meta: ProjectMeta = { id, where }
  await projectDoc(meta).delete()
  const unds = await db
    .collection(underlayColl(where))
    .where("projectId", "==", id)
    .get()
    .catch(() => ({ docs: [] as Snap[] }))
  for (const d of unds.docs) await db.doc(`${underlayColl(where)}/${d.id}`).delete().catch(() => undefined)
  void levelIds
  const st = useStore.getState()
  if (st.meta.id === id) useStore.setState({ meta: { id: uid("prj"), where: "local" }, sync: "local" })
}

/** Stop syncing the open project; it stays in this browser only. */
export function detach() {
  useStore.setState({ meta: { id: uid("prj"), where: "local" }, sync: "local" })
}

/* ---------- sync engine ---------- */
let timer: ReturnType<typeof setTimeout> | undefined
let writing = false
let again = false
let suppressSave = false
const myTokens = new Set<string>()
let lastUnderlaySrc: Record<string, string> = {}
let unsubDoc: (() => void) | null = null
let unsubUnderlays: (() => void) | null = null
let currentRoom: NamedRoom | null = null
let unsubPeers: (() => void) | null = null
let subscribedKey = ""

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    timer = undefined
    void flush()
  }, 1200)
}

async function flush(force = false) {
  const st = useStore.getState()
  const meta = st.meta
  if (!db || meta.where === "local") return
  if (st.sync === "readonly" && !force) return
  if (writing) {
    again = true
    return
  }
  writing = true
  clearTimeout(timer)
  timer = undefined
  useStore.setState({ sync: "saving", syncMsg: null })
  const token = uid("t")
  myTokens.add(token)
  if (myTokens.size > 50) myTokens.delete(myTokens.values().next().value as string)
  const project = st.project
  try {
    const body = {
      kind: "project",
      name: project.name || "Uten navn",
      updatedAt: Date.now(),
      updatedBy: myId,
      ownerId: meta.ownerId ?? myId,
      token,
      ...summary(project),
      project: stripUnderlays(project) as unknown as Record<string, unknown>,
    }
    if (JSON.stringify(body).length > 250_000) throw { code: "too_big" }
    await projectDoc(meta).set(body)
    // underlays that changed
    const unds = project.underlays ?? {}
    for (const [levelId, u] of Object.entries(unds)) {
      if (lastUnderlaySrc[levelId] === u.src) continue
      if (u.src.length > 240_000) {
        useStore.setState({ syncMsg: "Tegningen under er for stor til å deles. Den ligger bare i denne nettleseren." })
        lastUnderlaySrc[levelId] = u.src
        continue
      }
      await underlayDoc(meta, levelId).set({ kind: "underlay", projectId: meta.id, levelId, src: u.src, token })
      lastUnderlaySrc[levelId] = u.src
    }
    for (const levelId of Object.keys(lastUnderlaySrc))
      if (!unds[levelId]) {
        await underlayDoc(meta, levelId)
          .delete()
          .catch(() => undefined)
        delete lastUnderlaySrc[levelId]
      }
    if (useStore.getState().meta.id === meta.id) useStore.setState({ sync: "saved" })
    ensureSubscribed()
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code === "invalid_argument" && meta.where === "shared")
      useStore.setState({ sync: "readonly", syncMsg: "Du kan se dette prosjektet, men ikke endre det. Be eieren gi deg tilgang som bidragsyter." })
    else if (code === "too_big") useStore.setState({ sync: "error", syncMsg: "Prosjektet er for stort til å lagres i skyen. Lagre det som fil i stedet." })
    else if (code === "quota_exceeded") useStore.setState({ sync: "error", syncMsg: "Lagringsplassen er full. Slett noen gamle prosjekter." })
    else useStore.setState({ sync: "error", syncMsg: "Kunne ikke lagre i skyen akkurat nå. Endringene ligger i nettleseren, og vi prøver igjen." })
    if (code === "unavailable" || !code) setTimeout(() => void flush(), 5000)
  } finally {
    writing = false
    if (again) {
      again = false
      void flush()
    }
  }
}

function applyRemote(data: Record<string, unknown>) {
  const remote = data.project as Project
  if (!remote) return
  const st = useStore.getState()
  // keep the images we already have; their documents update separately
  const underlays: Record<string, Underlay> = {}
  for (const [k, v] of Object.entries(remote.underlays ?? {})) {
    const src = st.project.underlays?.[k]?.src ?? ""
    if (src) underlays[k] = { ...v, src }
  }
  suppressSave = true
  useStore.setState({ project: { ...remote, underlays }, sync: st.sync === "readonly" ? "readonly" : "saved" })
  suppressSave = false
  const by = data.updatedBy as string | undefined
  if (by && by !== myId)
    void profiles([by]).then((ps) => {
      useStore.setState({ toast: `${ps[by]?.name || "Noen"} endret prosjektet` })
      setTimeout(() => useStore.setState({ toast: null }), 3500)
    })
}

function ensureSubscribed() {
  const meta = useStore.getState().meta
  const key = meta.where === "local" ? "" : `${meta.where}/${meta.id}`
  if (key === subscribedKey) return
  subscribedKey = key
  unsubDoc?.()
  unsubUnderlays?.()
  unsubPeers?.()
  unsubDoc = unsubUnderlays = unsubPeers = null
  void currentRoom?.leave().catch(() => undefined)
  currentRoom = null
  useStore.setState({ peers: [] })
  if (!db || !key) return

  unsubDoc = projectDoc(meta).onSnapshot(
    (snap) => {
      if (!snap.exists || snap.metadata.hasPendingWrites) return
      const data = snap.data() as Record<string, unknown>
      if (myTokens.has(String(data.token))) return
      // an edit of ours is about to be written over this one
      if (timer) return
      applyRemote(data)
    },
    () => undefined,
  )
  unsubUnderlays = db
    .collection(underlayColl(meta.where as "mine" | "shared"))
    .where("projectId", "==", meta.id)
    .onSnapshot(
      (q) => {
        const st = useStore.getState()
        let changed = false
        const underlays = { ...(st.project.underlays ?? {}) }
        for (const d of q.docs) {
          const u = d.data() as { levelId: string; src: string; token: string }
          if (myTokens.has(u.token)) continue
          if (underlays[u.levelId] && underlays[u.levelId].src !== u.src) {
            underlays[u.levelId] = { ...underlays[u.levelId], src: u.src }
            lastUnderlaySrc[u.levelId] = u.src
            changed = true
          }
        }
        if (changed) {
          suppressSave = true
          useStore.setState({ project: { ...st.project, underlays } })
          suppressSave = false
        }
      },
      () => undefined,
    )

  if (room && meta.where === "shared") {
    const name = `p-${meta.id}`.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 48)
    room
      .join(name)
      .then((r) => {
        if (subscribedKey !== key) {
          void r.leave()
          return
        }
        currentRoom = r
        void r.presence({ level: useStore.getState().levelId })
        unsubPeers = r.onPeers(({ peers }) => {
          useStore.setState({ peers: peers.map((p) => ({ peer: p.peer, by: p.by, isMe: p.isMe, level: p.presence?.level as string | undefined })) })
        })
      })
      .catch(() => undefined)
  }
}

function startSync() {
  const st = useStore.getState()
  if (st.meta.where !== "local") {
    // reopen the cloud project from last time so we see changes made elsewhere
    openProject(st.meta.where, st.meta.id)
      .then(() => {
        useStore.setState({ sync: "saved" })
        ensureSubscribed()
      })
      .catch(() => {
        useStore.setState({ meta: { id: uid("prj"), where: "local" }, sync: "local", syncMsg: "Fant ikke skyprosjektet fra sist. Du jobber nå bare i denne nettleseren." })
      })
  } else useStore.setState({ sync: "local" })

  useStore.subscribe((s, prev) => {
    if (s.meta !== prev.meta) {
      if (s.meta.where === "local") useStore.setState({ sync: "local" })
      ensureSubscribed()
    }
    if (s.project !== prev.project && !suppressSave && s.meta.where !== "local" && s.meta === prev.meta) schedule()
    if (s.levelId !== prev.levelId) void currentRoom?.presence({ level: s.levelId }).catch(() => undefined)
  })
}
