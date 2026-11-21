import { Cloud, CloudOff, FilePlus, FolderOpen, House, RefreshCw, Share2, Trash, Users, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { deleteProject, detach, listProjects, openProject, profiles, saveAs, shareCurrent } from "../cloud/cloud"
import type { ProjectSummary } from "../cloud/cloud"
import { emptyProject, sampleProject } from "../model/sample"
import { useStore } from "../store/store"
import { Seg } from "./common"

export function timeAgo(ms: number) {
  if (!ms) return ""
  const d = Date.now() - ms
  if (d < 60_000) return "akkurat nå"
  if (d < 3_600_000) return `for ${Math.round(d / 60_000)} min siden`
  const date = new Date(ms)
  const today = new Date()
  const hm = date.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })
  if (date.toDateString() === today.toDateString()) return `i dag ${hm}`
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  if (date.toDateString() === y.toDateString()) return `i går ${hm}`
  return date.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" })
}

type Tab = "mine" | "shared" | "local"

export function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const cloud = useStore((s) => s.cloud)
  const meta = useStore((s) => s.meta)
  const project = useStore((s) => s.project)
  const [tab, setTab] = useState<Tab>(meta.where === "local" ? (cloud ? "mine" : "local") : meta.where)
  const [list, setList] = useState<ProjectSummary[] | null>(null)
  const [names, setNames] = useState<Record<string, { name: string; avatarUrl: string }>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!cloud || tab === "local") return
    setList(null)
    setErr(null)
    const timeout = setTimeout(() => setErr("Får ikke kontakt med lagringen akkurat nå. Prøv igjen om litt."), 10_000)
    try {
      const l = await listProjects(tab)
      clearTimeout(timeout)
      setErr(null)
      setList(l)
      const ids = l.flatMap((p) => [p.ownerId, p.updatedBy]).filter((x): x is string => !!x)
      const ps = await profiles(ids)
      setNames(Object.fromEntries(Object.entries(ps).map(([k, v]) => [k, { name: v.name, avatarUrl: v.avatarUrl }])))
    } catch {
      clearTimeout(timeout)
      setErr("Kunne ikke hente prosjektene. Prøv igjen.")
      setList([])
    }
  }, [cloud, tab])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = async (key: string, fn: () => Promise<void>, close = false) => {
    setBusy(key)
    setErr(null)
    try {
      await fn()
      if (close) onClose()
      else await refresh()
    } catch (e) {
      setErr((e as Error)?.message || "Noe gikk galt. Prøv igjen.")
    } finally {
      setBusy(null)
    }
  }

  const person = (id?: string) => (id ? names[id] : undefined)

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog projects" role="dialog" aria-modal="true" aria-labelledby="pj-title">
        <header className="dialog-head">
          <div>
            <span className="eyebrow">Prosjekter</span>
            <h2 id="pj-title">Dine hus</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Lukk">
            <X size={16} />
          </button>
        </header>
        <Seg<Tab>
          label="Hvor"
          value={tab}
          onChange={setTab}
          options={[
            { value: "mine", label: "Mine" },
            { value: "shared", label: "Delt med andre" },
            { value: "local", label: "Denne nettleseren" },
          ]}
        />

        {tab !== "local" && !cloud && (
          <div className="empty-box">
            <CloudOff size={20} aria-hidden />
            <p>
              Lagring i skyen og deling virker når Tuft er åpnet på claude.ai og du er logget inn. Her lagres prosjektet bare i denne nettleseren, men du kan lagre det
              som fil.
            </p>
          </div>
        )}

        {tab !== "local" && cloud && (
          <>
            {list === null && !err && <p className="note">Henter prosjekter …</p>}
            {list && list.length === 0 && (
              <div className="empty-box">
                {tab === "mine" ? <Cloud size={20} aria-hidden /> : <Users size={20} aria-hidden />}
                <p>
                  {tab === "mine"
                    ? "Ingen prosjekter lagret ennå. Lagre det du har oppe nå, så finner du det igjen på alle enhetene dine."
                    : "Ingen delte prosjekter ennå. Del et prosjekt, så kan alle som har tilgang til Tuft åpne og endre det sammen med deg."}
                </p>
              </div>
            )}
            {list && list.length > 0 && (
              <ul className="project-list">
                {list.map((p) => {
                  const open = meta.where === tab && meta.id === p.id
                  const owner = person(p.ownerId)
                  const by = person(p.updatedBy)
                  const mineToDelete = tab === "mine" || p.ownerId === cloud.me.id
                  return (
                    <li key={p.id} className={`project-row ${open ? "on" : ""}`}>
                      {tab === "shared" && (
                        <span className="avatars" aria-hidden>
                          {[owner, p.updatedBy !== p.ownerId ? by : undefined].filter(Boolean).map((x, i) => (
                            <img key={i} src={x!.avatarUrl} alt="" />
                          ))}
                        </span>
                      )}
                      <span className="project-info">
                        <strong>{p.name}</strong>
                        <span className="sub">
                          {p.rooms} rom · {p.area} m² · {timeAgo(p.updatedAt)}
                          {tab === "shared" && by ? ` av ${p.updatedBy === cloud.me.id ? "deg" : by.name || "noen"}` : ""}
                        </span>
                      </span>
                      {confirm === p.id ? (
                        <span className="row-btns">
                          <button className="btn danger sm" onClick={() => void run("del" + p.id, () => deleteProject(tab, p.id))}>
                            Slett
                          </button>
                          <button className="btn ghost sm" onClick={() => setConfirm(null)}>
                            Avbryt
                          </button>
                        </span>
                      ) : (
                        <span className="row-btns">
                          {open ? (
                            <span className="open-tag">Åpen</span>
                          ) : (
                            <button className="btn ghost sm" disabled={!!busy} onClick={() => void run("open" + p.id, () => openProject(tab, p.id), true)}>
                              {busy === "open" + p.id ? "Åpner …" : "Åpne"}
                            </button>
                          )}
                          {mineToDelete && (
                            <button className="icon-btn sm" onClick={() => setConfirm(p.id)} aria-label={`Slett ${p.name}`}>
                              <Trash size={14} />
                            </button>
                          )}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="row-btns">
              {meta.where !== tab && (
                <button className="btn primary" disabled={!!busy} onClick={() => void run("save", () => saveAs(tab), true)}>
                  <Cloud size={15} /> {tab === "mine" ? `Lagre «${project.name}» her` : `Del «${project.name}»`}
                </button>
              )}
              {tab === "shared" && meta.where === "mine" && (
                <button className="btn ghost" disabled={!!busy} onClick={() => void run("share", shareCurrent, true)}>
                  <Share2 size={15} /> Flytt til delt
                </button>
              )}
              <button
                className="btn ghost"
                disabled={!!busy}
                onClick={() =>
                  void run(
                    "new",
                    async () => {
                      useStore.getState().load(emptyProject())
                      await saveAs(tab)
                    },
                    true,
                  )
                }
              >
                <FilePlus size={15} /> Nytt prosjekt her
              </button>
              <button className="icon-btn" onClick={() => void refresh()} aria-label="Oppdater listen" title="Oppdater">
                <RefreshCw size={15} />
              </button>
            </div>
            {tab === "shared" && (
              <p className="note">
                Alle du har delt Tuft med som bidragsyter eller redaktør (Del-menyen øverst på claude.ai) kan åpne og endre delte prosjekter. Endringer vises hos de andre
                med en gang, og du ser hvem som er inne.
                {cloud.canWriteShared === false && " Du har bare lesetilgang til delte prosjekter."}
              </p>
            )}
          </>
        )}

        {tab === "local" && (
          <>
            <p className="note">
              {meta.where === "local"
                ? "Prosjektet du har oppe lagres automatisk i denne nettleseren. Det forsvinner hvis nettleserdata slettes, så lagre det i skyen eller som fil."
                : "Prosjektet du har oppe lagres i skyen. En kopi ligger også i denne nettleseren."}
            </p>
            <div className="row-btns">
              <button
                className="btn ghost"
                onClick={() => {
                  useStore.getState().load(emptyProject())
                  onClose()
                }}
              >
                <FilePlus size={15} /> Nytt, tomt prosjekt
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  useStore.getState().load(sampleProject())
                  onClose()
                }}
              >
                <House size={15} /> Åpne eksempelhuset
              </button>
              {meta.where !== "local" && (
                <button
                  className="btn ghost"
                  onClick={() => {
                    detach()
                    onClose()
                  }}
                >
                  <FolderOpen size={15} /> Fortsett bare i nettleseren
                </button>
              )}
            </div>
          </>
        )}
        {err && <p className="dialog-msg">{err}</p>}
      </div>
    </div>
  )
}

/** Sync status and the people who have the same shared project open. */
export function SyncBadge({ onOpen }: { onOpen: () => void }) {
  const sync = useStore((s) => s.sync)
  const meta = useStore((s) => s.meta)
  const syncMsg = useStore((s) => s.syncMsg)
  const peers = useStore((s) => s.peers)
  const [people, setPeople] = useState<Record<string, { name: string; avatarUrl: string }>>({})
  const others = peers.filter((p) => !p.isMe && p.by)
  const key = others.map((p) => p.by).join(",")
  useEffect(() => {
    if (!key) return
    void profiles(key.split(",")).then((ps) => setPeople(Object.fromEntries(Object.entries(ps).map(([k, v]) => [k, { name: v.name, avatarUrl: v.avatarUrl }]))))
  }, [key])
  const label =
    sync === "connecting"
      ? "Kobler til …"
      : meta.where === "local"
        ? "Bare i nettleseren"
        : sync === "saving"
          ? "Lagrer …"
          : sync === "readonly"
            ? "Bare lesetilgang"
            : sync === "error"
              ? "Ikke lagret"
              : meta.where === "shared"
                ? "Delt, lagret"
                : "Lagret i skyen"
  const unique = [...new Map(others.map((p) => [p.by, p])).values()]
  return (
    <div className="sync">
      {unique.length > 0 && (
        <span className="avatars" title={unique.map((p) => people[p.by!]?.name || "Noen").join(", ") + " er inne nå"}>
          {unique.slice(0, 4).map((p) => (
            <img key={p.by} src={people[p.by!]?.avatarUrl ?? ""} alt={people[p.by!]?.name || "Noen"} />
          ))}
        </span>
      )}
      <button className={`btn ghost sync-btn sync-${meta.where === "local" ? "local" : sync}`} onClick={onOpen} title={syncMsg ?? "Prosjekter og deling"}>
        {meta.where === "local" ? <CloudOff size={15} /> : meta.where === "shared" ? <Users size={15} /> : <Cloud size={15} />}
        <span className="lbl">{label}</span>
      </button>
    </div>
  )
}

export function Toast() {
  const toast = useStore((s) => s.toast)
  const syncMsg = useStore((s) => s.syncMsg)
  const text = toast ?? syncMsg
  if (!text) return null
  return (
    <div className="toast" role="status">
      {text}
      {!toast && syncMsg && (
        <button className="icon-btn sm" onClick={() => useStore.setState({ syncMsg: null })} aria-label="Lukk meldingen">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
