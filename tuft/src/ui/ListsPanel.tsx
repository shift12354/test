import { AlertTriangle, CheckCircle2, Download, Info, Plus, Trash } from "lucide-react"
import { useMemo, useState } from "react"

import { runChecks, circuitLoads } from "../model/checks"
import type { CheckLevel } from "../model/checks"
import { uid } from "../model/geometry"
import { materialList, roomSummary } from "../model/lists"
import type { Circuit } from "../model/types"
import { useStore } from "../store/store"
import { NumField, Seg, TextField } from "./common"

import { saveFile } from "../cloud/files"
import { PRICES_CHECKED } from "../model/products"
import type { Store } from "../model/products"
import { StoreChip, kr } from "./Products"

export function ListsPanel() {
  const [tab, setTab] = useState<"rom" | "materialer" | "kurser">("materialer")
  return (
    <div className="lists">
      <Seg
        label="Liste"
        value={tab}
        onChange={setTab}
        options={[
          { value: "materialer", label: "Materialer" },
          { value: "kurser", label: "Kurser" },
          { value: "rom", label: "Rom" },
        ]}
      />
      <div className="lists-scroll">
        {tab === "rom" && <RoomList />}
        {tab === "materialer" && <MaterialList />}
        {tab === "kurser" && <CircuitList />}
      </div>
    </div>
  )
}

function RoomList() {
  const project = useStore((s) => s.project)
  const summary = roomSummary(project)
  return (
    <>
      {summary.map((l) => (
        <table key={l.level.id} className="table">
          <caption>{l.level.name}</caption>
          <tbody>
            {l.rooms.map(({ room, area }) => (
              <tr key={room.id} onClick={() => useStore.setState({ levelId: l.level.id, selection: [{ kind: "room", id: room.id }] })} className="clickable">
                <td>{room.name}</td>
                <td className="num-cell">{area.toLocaleString("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Sum</td>
              <td className="num-cell">{l.total.toLocaleString("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²</td>
            </tr>
          </tfoot>
        </table>
      ))}
      <p className="note">Arealet er målt til senterlinjen av veggene, så det ligger litt over netto gulvareal.</p>
    </>
  )
}

function MaterialList() {
  const project = useStore((s) => s.project)
  const rows = useMemo(() => materialList(project), [project])
  const groups = [...new Set(rows.map((r) => r.group))]
  const sum = rows.reduce((s, r) => s + (r.total ?? 0), 0)
  const byStore = new Map<string, number>()
  for (const r of rows) if (r.total) byStore.set(r.store ?? "Anslag", (byStore.get(r.store ?? "Anslag") ?? 0) + r.total)
  const csv = () => {
    const lines = [
      ["Gruppe", "Navn", "Butikk", "Mengde", "Enhetspris", "Sum", "Lenke"].join(";"),
      ...rows.map((r) => [r.group, r.name, r.store ?? "", r.qty, r.unit ?? "", r.total ?? "", r.url ?? ""].join(";")),
    ]
    void saveFile(`${project.name || "tuft"} – materialliste.csv`, new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }))
  }
  return (
    <>
      <div className="total-card">
        <span className="eyebrow">Grovt estimat, materiell</span>
        <span className="total">{kr(sum)}</span>
        <button className="btn ghost sm" onClick={csv}>
          <Download size={14} /> CSV
        </button>
        <ul className="store-sums">
          {[...byStore].map(([s, v]) => (
            <li key={s}>
              {s === "Anslag" ? <span className="store-chip neutral">Anslag</span> : <StoreChip store={s as Store} />}
              <span className="mono">{kr(v)}</span>
            </li>
          ))}
        </ul>
      </div>
      {groups.map((g) => (
        <table key={g} className="table">
          <caption>{g}</caption>
          <tbody>
            {rows
              .filter((r) => r.group === g)
              .map((r, i) => (
                <tr key={i}>
                  <td>
                    {r.store && <StoreChip store={r.store} />}{" "}
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="row-link">
                        {r.name}
                      </a>
                    ) : (
                      r.name
                    )}
                  </td>
                  <td className="num-cell muted">{r.qty}</td>
                  <td className="num-cell">{r.total != null ? `${r.approx ? "~" : ""}${kr(r.total)}` : ""}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ))}
      <p className="note">
        Velg produkter i egenskapspanelet for å bruke butikkens pris. «~» betyr anslag. Prisene er sjekket {PRICES_CHECKED} og kan ha endret seg. Arbeid, frakt og småmateriell er ikke med.
      </p>
    </>
  )
}

function CircuitList() {
  const project = useStore((s) => s.project)
  const update = useStore((s) => s.update)
  const loads = circuitLoads(project)
  const patch = (id: string, p: Partial<Circuit>) => update((pr) => ({ ...pr, circuits: pr.circuits.map((c) => (c.id === id ? { ...c, ...p } : c)) }))
  return (
    <>
      <ul className="circuits">
        {loads.map(({ circuit: c, watts, points, capacity, ratio }) => (
          <li key={c.id} className="circuit">
            <div className="circuit-top">
              <TextField value={c.name} onCommit={(v) => patch(c.id, { name: v || c.name })} />
              <span className="amp">
                <NumField value={c.amps} unit="A" min={6} max={63} onCommit={(v) => patch(c.id, { amps: v })} />
              </span>
              <button
                className="icon-btn sm"
                aria-label={`Slett ${c.name}`}
                onClick={() => update((p) => ({ ...p, circuits: p.circuits.filter((x) => x.id !== c.id), items: p.items.map((i) => (i.circuitId === c.id ? { ...i, circuitId: undefined } : i)) }))}
              >
                <Trash size={14} />
              </button>
            </div>
            <div className="meter" aria-label={`Belastning ${Math.round(ratio * 100)} prosent`}>
              <span style={{ width: `${Math.min(100, ratio * 100)}%` }} className={ratio > 1 ? "over" : ratio > 0.8 ? "high" : ""} />
            </div>
            <div className="circuit-meta">
              <span>{points} punkt</span>
              <span className="mono">
                {(watts / 1000).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} / {(capacity / 1000).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} kW
              </span>
            </div>
          </li>
        ))}
      </ul>
      <button
        className="btn ghost"
        onClick={() => {
          const n = project.circuits.length + 1
          update((p) => ({ ...p, circuits: [...p.circuits, { id: uid("k"), name: `K${n} Ny kurs`, amps: 16, kind: "generell" }] }))
        }}
      >
        <Plus size={15} /> Ny kurs
      </button>
      <p className="note">Belastningen regnes bare av fast utstyr med kjent effekt (komfyr, bereder, lys, gulvvarme). Stikkontakter teller som punkt.</p>
    </>
  )
}

const ICON: Record<CheckLevel, typeof Info> = { warn: AlertTriangle, info: Info, ok: CheckCircle2 }

export function ChecksPanel() {
  const project = useStore((s) => s.project)
  const checks = useMemo(() => runChecks(project), [project])
  const warn = checks.filter((c) => c.level === "warn").length
  const info = checks.filter((c) => c.level === "info").length
  return (
    <div className="checks">
      <p className="checks-sum">
        {warn ? `${warn} ting bør rettes` : "Ingen alvorlige funn"}
        {info ? `, ${info} råd` : ""}.
      </p>
      <ul>
        {checks.map((c) => {
          const I = ICON[c.level]
          return (
            <li key={c.id}>
              <button
                className={`check check-${c.level}`}
                onClick={() => {
                  if (!c.target) return
                  useStore.setState((s) => ({ selection: [c.target!], levelId: c.levelId ?? s.levelId }))
                }}
                disabled={!c.target}
              >
                <I size={16} aria-hidden />
                <span>
                  <strong>{c.title}</strong>
                  <span>{c.detail}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="note">Sjekkene er tommelfingerregler fra TEK17, brannforskriften og vanlig praksis etter NEK 400. Elektrisk anlegg skal prosjekteres og bygges av registrert elektroinstallatør, og våtrom bør bygges etter Byggebransjens våtromsnorm.</p>
    </div>
  )
}
