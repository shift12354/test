import { useEffect, useState } from "react"
import type { ReactNode } from "react"

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <span className="field-hint">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

/** Number input that commits on Enter or blur, so typing does not flood the undo history. */
export function NumField({
  value,
  onCommit,
  unit = "cm",
  step = 1,
  min,
  max,
  decimals = 0,
  scale = 1,
}: {
  value: number
  onCommit: (v: number) => void
  unit?: string
  step?: number
  min?: number
  max?: number
  decimals?: number
  /** Shown value = value / scale (e.g. 100 to show metres for cm). */
  scale?: number
}) {
  const fmt = (v: number) => (v / scale).toFixed(decimals).replace(".", ",")
  const [text, setText] = useState(fmt(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(fmt(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused])
  const commit = () => {
    const n = parseFloat(text.replace(",", ".").replace(/\s/g, ""))
    if (Number.isFinite(n)) {
      let v = n * scale
      if (min != null) v = Math.max(min, v)
      if (max != null) v = Math.min(max, v)
      if (Math.abs(v - value) > 1e-6) onCommit(v)
      setText(fmt(v))
    } else setText(fmt(value))
  }
  return (
    <span className="num">
      <input
        inputMode="decimal"
        value={text}
        onFocus={(e) => {
          setFocused(true)
          e.currentTarget.select()
        }}
        onBlur={() => {
          setFocused(false)
          commit()
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          if (e.key === "Escape") {
            setText(fmt(value))
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault()
            const d = (e.key === "ArrowUp" ? step : -step) * (e.shiftKey ? 10 : 1)
            const n = parseFloat(text.replace(",", ".")) * scale + d * scale
            let v = n
            if (min != null) v = Math.max(min, v)
            if (max != null) v = Math.min(max, v)
            onCommit(v)
            setText(fmt(v))
          }
        }}
      />
      <span className="num-unit">{unit}</span>
    </span>
  )
}

export function TextField({ value, onCommit, placeholder }: { value: string; onCommit: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <input
      className="text"
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onCommit(text)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  )
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)} title={o.title}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Swatches({ value, colors, onChange, label }: { value: string; colors: { color: string; name: string }[]; onChange: (c: string) => void; label: string }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {colors.map((c) => (
        <button
          key={c.color}
          role="radio"
          aria-checked={value.toLowerCase() === c.color.toLowerCase()}
          title={c.name}
          aria-label={c.name}
          className="swatch"
          style={{ background: c.color }}
          onClick={() => onChange(c.color)}
        />
      ))}
    </div>
  )
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  )
}
