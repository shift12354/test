"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import {
  animate,
  motion,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react"

import { cn } from "@/lib/utils"
import {
  DAYS_IN_YEAR,
  dayOfYear,
  formatClock,
  formatDate,
  formatDuration,
  MONTH_STARTS,
  WINTER_SOLSTICE,
  YEAR_OF_LIGHT,
} from "@/lib/daylight"
import { clamp, DRAG_THRESHOLD, spring } from "@/lib/motion"
import { OpenSheetButton } from "@/components/site/contact-sheet"

const MONTH_SHORT = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"]
const MONTH_LENGTHS = MONTH_STARTS.map((start, i) => (MONTH_STARTS[i + 1] ?? DAYS_IN_YEAR + 1) - start)

// ---- Sky -----------------------------------------------------------------

type RGB = [number, number, number]
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB

// The band stays dark until the days pass about 11 hours, then turns quickly, so
// the bars keep at least 3:1 against it on every day of the year.
const SKY: { at: number; top: RGB; mid: RGB; horizon: RGB }[] = [
  { at: 0, top: hex("#0b1124"), mid: hex("#1b2547"), horizon: hex("#3b416c") },
  { at: 0.3, top: hex("#121c3a"), mid: hex("#25335e"), horizon: hex("#5e4a68") },
  { at: 0.46, top: hex("#1c2a52"), mid: hex("#2f4274"), horizon: hex("#7a5a70") },
  { at: 0.54, top: hex("#9db5d6"), mid: hex("#c3d2e5"), horizon: hex("#f1d6b2") },
  { at: 1, top: hex("#a9c3e0"), mid: hex("#d3e0ee"), horizon: hex("#f7ead0") },
]
const SNOW = hex("#eef1f4")
const INK = hex("#172038")

const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB
const css = ([r, g, b]: RGB) => `rgb(${r} ${g} ${b})`

function skyAt(share: number) {
  const i = Math.max(0, SKY.findIndex((s) => s.at >= share) - 1)
  const a = SKY[i]
  const b = SKY[Math.min(i + 1, SKY.length - 1)]
  const t = b.at === a.at ? 0 : (share - a.at) / (b.at - a.at)
  return { top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), horizon: mix(a.horizon, b.horizon, t) }
}

function luminance(rgb: RGB) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: RGB, b: RGB) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const shareOf = (day: number) =>
  YEAR_OF_LIGHT[clamp(Math.round(day), 1, DAYS_IN_YEAR) - 1].daylightMinutes / 1440

/** Snow or ink, whichever reads better on the given patch of sky. */
function inkOn(behind: RGB) {
  return contrast(SNOW, behind) >= contrast(INK, behind) ? "snow" : "ink"
}

// ---- Copy ------------------------------------------------------------------

function nextDayOfKind(from: number, kind: "normal") {
  for (let step = 1; step <= DAYS_IN_YEAR; step++) {
    const d = ((from - 1 + step) % DAYS_IN_YEAR) + 1
    if (YEAR_OF_LIGHT[d - 1].kind === kind) return d
  }
  return from
}

/** Digits keep a fixed width while dragging; the separator does not. */
function Clock({ value }: { value: string }) {
  const [h, m] = value.split(".")
  return (
    <>
      <span className="tabular-nums">{h}</span>.<span className="tabular-nums">{m}</span>
    </>
  )
}

function sunLines(day: number): [React.ReactNode, React.ReactNode] {
  const sun = YEAR_OF_LIGHT[day - 1]
  if (sun.kind === "polar-night") {
    return ["Sola står ikke opp.", `Den er tilbake ${formatDate(nextDayOfKind(day, "normal"))}.`]
  }
  if (sun.kind === "midnight-sun") {
    return ["Sola går ikke ned.", `Den går ned igjen ${formatDate(nextDayOfKind(day, "normal"))}.`]
  }
  return [
    <>
      Sola står opp kl.{"\u00a0"}
      <Clock value={formatClock(day, sun.riseUtc!)} />
    </>,
    <>
      og går ned kl.{"\u00a0"}
      <Clock value={formatClock(day, sun.setUtc!)} />.
    </>,
  ]
}

// The longest text each line can hold. Rendered invisibly underneath, so the
// block keeps one height and the bars never jump under a dragging finger.
const LONGEST_VARIANTS = [
  ["Tromsø, 30.\u00a0september.", "Sola står opp kl.\u00a010.46", "og går ned kl.\u00a012.18."],
  ["Tromsø, 21.\u00a0desember.", "Sola står ikke opp.", "Den er tilbake 16.\u00a0januar."],
  ["Tromsø, 30.\u00a0juni.", "Sola går ikke ned.", "Den går ned igjen 27.\u00a0juli."],
]

// ---- Today, read on the client only ---------------------------------------

const noopSubscribe = () => () => {}
function useToday() {
  return useSyncExternalStore(
    noopSubscribe,
    () => dayOfYear(new Date()),
    () => null,
  )
}

// ---- Component -------------------------------------------------------------

export function DaylightHero() {
  // The server renders midwinter; the client then glides to today.
  const day = useMotionValue(WINTER_SOLSTICE)
  const [shown, setShown] = useState(WINTER_SOLSTICE)
  const today = useToday()
  const reduceMotion = useReducedMotion()
  const introPlayed = useRef(false)
  const [introDone, setIntroDone] = useState(false)

  useMotionValueEvent(day, "change", (v) => {
    const rounded = clamp(Math.round(v), 1, DAYS_IN_YEAR)
    setShown((prev) => (prev === rounded ? prev : rounded))
  })

  // "Back to today" appears once the intro has finished or been interrupted.
  useMotionValueEvent(day, "animationComplete", () => setIntroDone(true))
  useMotionValueEvent(day, "animationCancel", () => setIntroDone(true))

  // The page's one unprompted motion: midwinter to today, once.
  useEffect(() => {
    if (today === null || introPlayed.current) return
    introPlayed.current = true
    if (reduceMotion) {
      day.jump(today)
      return
    }
    const controls = animate(day, today, {
      type: "spring",
      bounce: 0,
      visualDuration: 1.6,
      delay: 0.5,
    })
    return () => controls.stop()
  }, [day, reduceMotion, today])

  const [line1, line2] = sunLines(shown)

  return (
    <section id="top" aria-labelledby="hero-title" className="overflow-x-clip">
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-8 sm:pt-20">
        <div className="type-display grid">
          {LONGEST_VARIANTS.map((lines) => (
            <p key={lines[0]} aria-hidden="true" className="invisible [grid-area:1/1]">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          ))}
          <p className="[grid-area:1/1]">
            <span className="text-muted-foreground block font-medium">Tromsø, {formatDate(shown)}.</span>
            <span className="block">{line1}</span>
            <span className="block">{line2}</span>
          </p>
        </div>
      </div>

      <DaylightScrubber
        day={day}
        shown={shown}
        today={introDone || reduceMotion ? today : null}
        reduceMotion={!!reduceMotion}
      />

      <div className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-8 sm:pt-16 sm:pb-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end">
          <div>
            <h1 id="hero-title" className="type-lead max-w-[28ch] text-balance">
              Nordlys lager nettsider for bedrifter i Nord-Norge.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-[58ch] text-pretty">
              Mange av kundene våre lever av lyset. Guidene selger nordlysturer når sola er borte, og
              fjellturer når den aldri går ned. Vi er to personer i Tromsø som lager nettsidene de selger fra.
            </p>
          </div>
          <div className="lg:justify-self-end">
            <OpenSheetButton size="lg">Book en prat</OpenSheetButton>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---- Scrubber --------------------------------------------------------------

// The year as one filled outline, used where bars would be thinner than a pixel.
const YEAR_AREA_PATH =
  `M0 100 ` +
  YEAR_OF_LIGHT.map(
    (d) =>
      `L${d.day - 1} ${(100 - Math.max(1.5, (d.daylightMinutes / 1440) * 100)).toFixed(2)} L${d.day} ${(100 - Math.max(1.5, (d.daylightMinutes / 1440) * 100)).toFixed(2)}`,
  ).join(" ") +
  ` L${DAYS_IN_YEAR} 100 Z`

// One bar per day, height by hours of daylight. Static, so it is built once.
const YEAR_BARS = (
  <>
    <svg
      viewBox={`0 0 ${DAYS_IN_YEAR} 100`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 size-full sm:hidden"
    >
      <path d={YEAR_AREA_PATH} className="fill-current" />
    </svg>
    <svg
      viewBox={`0 0 ${DAYS_IN_YEAR} 100`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 hidden size-full sm:block"
    >
      {YEAR_OF_LIGHT.map((d) => {
        const h = Math.max(1.5, (d.daylightMinutes / 1440) * 100)
        return (
          <rect
            key={d.day}
            x={d.day - 1 + 0.15}
            y={100 - h}
            width={0.7}
            height={h}
            className={cn("fill-current", d.kind === "polar-night" && "opacity-60")}
          />
        )
      })}
    </svg>
  </>
)

type Press = { pointerId: number; startX: number; startY: number; dragging: boolean }

function DaylightScrubber({
  day,
  shown,
  today,
  reduceMotion,
}: {
  day: MotionValue<number>
  shown: number
  today: number | null
  reduceMotion: boolean
}) {
  const pressRef = useRef<Press | null>(null)
  const markerX = useTransform(day, (v) => `${((clamp(v, 1, DAYS_IN_YEAR) - 0.5) / DAYS_IN_YEAR) * 100}%`)
  const sunY = useTransform(day, (v) => `${(1 - shareOf(v)) * 100}%`)
  const sun = YEAR_OF_LIGHT[shown - 1]

  function dayAt(clientX: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect()
    return 1 + clamp((clientX - rect.left) / rect.width, 0, 1) * (DAYS_IN_YEAR - 1)
  }

  function glideTo(target: number) {
    const t = clamp(Math.round(target), 1, DAYS_IN_YEAR)
    if (reduceMotion) day.jump(t)
    else animate(day, t, spring.default)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    day.stop() // a press interrupts the intro or a glide
    pressRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, dragging: false }
    // With a mouse there is no scroll to disambiguate, so answer on press.
    if (e.pointerType === "mouse") {
      pressRef.current.dragging = true
      e.currentTarget.setPointerCapture(e.pointerId)
      glideTo(dayAt(e.clientX, e.currentTarget))
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const press = pressRef.current
    if (!press || press.pointerId !== e.pointerId) return
    if (!press.dragging) {
      const dx = Math.abs(e.clientX - press.startX)
      const dy = Math.abs(e.clientY - press.startY)
      if (Math.max(dx, dy) < DRAG_THRESHOLD) return
      if (dy > dx) {
        pressRef.current = null // a vertical swipe scrolls the page
        return
      }
      press.dragging = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    day.stop()
    day.set(dayAt(e.clientX, e.currentTarget)) // follows the finger 1:1
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const press = pressRef.current
    if (!press || press.pointerId !== e.pointerId) return
    pressRef.current = null
    // A tap seeks; a drag settles on the whole day under the finger.
    glideTo(press.dragging ? day.get() : dayAt(e.clientX, e.currentTarget))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const current = Math.round(day.get())
    const nextMonthStart = MONTH_STARTS.find((s) => s > current) ?? DAYS_IN_YEAR
    const prevMonthStart = [...MONTH_STARTS].reverse().find((s) => s < current) ?? 1
    const keys: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowUp: current + 1,
      ArrowLeft: current - 1,
      ArrowDown: current - 1,
      PageUp: nextMonthStart,
      PageDown: prevMonthStart,
      Home: 1,
      End: DAYS_IN_YEAR,
    }
    if (!(e.key in keys)) return
    e.preventDefault()
    const target = clamp(keys[e.key], 1, DAYS_IN_YEAR)
    day.stop()
    if (e.key.startsWith("Arrow")) day.jump(target)
    else glideTo(target)
  }

  const sky = skyAt(shareOf(shown))
  const barInk = inkOn(mix(sky.mid, sky.horizon, 0.5))

  return (
    <div className="mt-10 sm:mt-14">
      {/* The sky for the chosen day, edge to edge, with the year standing in it. */}
      <div
        className={cn("transition-colors duration-500", barInk === "snow" ? "text-sno" : "text-morketid")}
        style={{
          background: `linear-gradient(to bottom, ${css(sky.top)}, ${css(sky.mid)} 45%, ${css(sky.horizon)})`,
        }}
      >
        <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-8 sm:pt-14">
          <div
            role="slider"
            tabIndex={0}
            aria-label="Dato i året"
            aria-valuemin={1}
            aria-valuemax={DAYS_IN_YEAR}
            aria-valuenow={shown}
            aria-valuetext={`${formatDate(shown)}, ${formatDuration(sun.daylightMinutes)}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (pressRef.current = null)}
            onKeyDown={onKeyDown}
            className="focus-visible:ring-lavsol relative h-32 cursor-ew-resize touch-pan-y outline-none select-none focus-visible:ring-4 sm:h-44"
          >
            {YEAR_BARS}
            {/* Full-width layers, so a percentage translate maps onto the year. */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ x: markerX }}
            >
              <div className="bg-lavsol absolute inset-y-0 left-0 w-0.5 -translate-x-1/2" />
              <motion.div className="absolute inset-0" style={{ y: sunY }}>
                <div className="bg-lavsol absolute top-0 left-0 size-4 -translate-1/2 rounded-full shadow-[0_0_24px_4px_rgb(242_184_75/0.55)]" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div
          aria-hidden="true"
          className="type-small text-muted-foreground mt-3 grid"
          style={{ gridTemplateColumns: MONTH_LENGTHS.map((n) => `${n}fr`).join(" ") }}
        >
          {MONTH_SHORT.map((m) => (
            <span key={m}>
              <span className="sm:hidden">{m[0]}</span>
              <span className="hidden sm:inline">{m}</span>
            </span>
          ))}
        </div>

        <div className="type-small mt-5 flex min-h-8 flex-wrap items-center gap-x-5 gap-y-2">
          <p>
            <span className="font-semibold">{capitalize(formatDuration(sun.daylightMinutes))}.</span>{" "}
            <span className="text-muted-foreground">Dra i søylene for å se resten av året.</span>
          </p>
          {today !== null && shown !== today ? (
            <button
              type="button"
              onClick={() => glideTo(today)}
              className="press focus-visible:ring-ring bg-foreground/[0.07] hover:bg-foreground/[0.12] rounded-full px-3 py-1 font-semibold outline-none focus-visible:ring-4"
            >
              Tilbake til i dag
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
