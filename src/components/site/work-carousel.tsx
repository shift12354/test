"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  clamp,
  DRAG_THRESHOLD,
  FLICK_VELOCITY,
  project,
  pushSample,
  rubberband,
  spring,
  velocityFrom,
  type PointerSample,
} from "@/lib/motion"

// Fictional client work for the demo.
const PROJECTS = [
  { client: "Fjordline", kind: "Nettbutikk", line: "Billetter på tre trykk, også offline på fergen.", from: "#30b0c7", to: "#0a3d62" },
  { client: "Isbre", kind: "Programvare", line: "Et dashbord som laster før du rekker å blunke.", from: "#7d7aff", to: "#1c1b4d" },
  { client: "Midnattsol", kind: "Magasin", line: "Lange lesestykker med typografi som puster.", from: "#ff9f0a", to: "#5c2a00" },
  { client: "Vidde", kind: "Turapp", line: "Kart du kan dra, klype og kaste med fingeren.", from: "#34c77b", to: "#0d3b24" },
  { client: "Skjærgård", kind: "Booking", line: "Ledige hytter, betalt og bekreftet på ett minutt.", from: "#bf5af2", to: "#3a0f4d" },
]

const GAP = 20

type DragState = {
  pointerId: number
  startX: number
  startY: number
  origin: number
  samples: PointerSample[]
  axis: "x" | "y" | null
}

export function WorkCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef(0)
  const widthRef = useRef(0)
  const indexRef = useRef(0)
  const dragRef = useRef<DragState | null>(null)
  const [index, setIndex] = useState(0)
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const last = PROJECTS.length - 1

  const goTo = useCallback(
    (next: number, velocity = 0) => {
      const i = clamp(next, 0, last)
      indexRef.current = i
      setIndex(i)
      const target = -i * stepRef.current
      if (reduceMotion) return x.jump(target)
      const flicked = Math.abs(velocity) > FLICK_VELOCITY
      // Always animates from the live position and inherits the finger's speed.
      animate(x, target, { ...(flicked ? spring.momentum : spring.default), velocity })
    },
    [last, reduceMotion, x]
  )

  // Card width comes from CSS; measure it outside render and keep the snap aligned.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      const card = track.firstElementChild as HTMLElement | null
      if (!card) return
      stepRef.current = card.offsetWidth + GAP
      widthRef.current = track.parentElement?.offsetWidth ?? card.offsetWidth
      x.jump(-indexRef.current * stepRef.current)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [x])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    x.stop() // grab it mid-flight
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: x.get(),
      samples: [{ value: e.clientX, time: e.timeStamp }],
      axis: null,
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId || drag.axis === "y") return
    if (drag.axis === null) {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
      if (drag.axis === "y") return // let the page scroll
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.startX = e.clientX // track 1:1 from here, no jump
      drag.origin = x.get()
    }
    pushSample(drag.samples, { value: e.clientX, time: e.timeStamp })
    const raw = drag.origin + (e.clientX - drag.startX)
    const min = -last * stepRef.current
    const width = widthRef.current
    if (raw > 0) x.set(rubberband(raw, width))
    else if (raw < min) x.set(min - rubberband(min - raw, width))
    else x.set(raw)
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    const velocity = drag.axis === "x" ? velocityFrom(drag.samples) : 0
    // Snap to where the flick is heading, not to where the finger lifted.
    const resting = x.get() + project(velocity)
    goTo(Math.round(-resting / (stepRef.current || 1)), velocity)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") goTo(index + 1)
    else if (e.key === "ArrowLeft") goTo(index - 1)
    else if (e.key === "Home") goTo(0)
    else if (e.key === "End") goTo(last)
    else return
    e.preventDefault()
  }

  return (
    <div>
      <div
        role="region"
        aria-roledescription="karusell"
        aria-label="Utvalgte prosjekter"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="focus-visible:ring-ring rounded-[2rem] outline-none focus-visible:ring-4"
      >
        <motion.div
          ref={trackRef}
          style={{ x }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="flex cursor-grab touch-pan-y select-none active:cursor-grabbing"
        >
          {PROJECTS.map((p, i) => (
            <article
              key={p.client}
              aria-roledescription="lysbilde"
              aria-label={`${i + 1} av ${PROJECTS.length}: ${p.client}`}
              aria-hidden={i !== index}
              // mr-5 is GAP (20px), so the measured step matches the layout.
              className="relative mr-5 flex aspect-[4/5] w-[min(78vw,26rem)] shrink-0 flex-col justify-end overflow-hidden rounded-[2rem] p-7 text-white sm:aspect-[5/6]"
              style={{ background: `linear-gradient(160deg, ${p.from}, ${p.to})` }}
            >
              <div aria-hidden="true" className="absolute inset-x-7 top-7 flex flex-col gap-3 opacity-70">
                <span className="h-2 w-1/3 rounded-full bg-white/70" />
                <span className="h-2 w-1/2 rounded-full bg-white/40" />
                <span className="mt-4 aspect-[16/10] rounded-2xl border border-white/15 bg-white/10" />
              </div>
              <p className="type-caption font-semibold tracking-[0.06em] text-white/70 uppercase">{p.kind}</p>
              <h3 translate="no" className="type-title mt-1">{p.client}</h3>
              <p className="mt-2 text-white/80">{p.line}</p>
            </article>
          ))}
        </motion.div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2" aria-hidden="true">
          {PROJECTS.map((p, i) => (
            <span
              key={p.client}
              className={cn(
                "h-2 rounded-full transition-[width,background-color] duration-300 ease-out",
                i === index ? "bg-foreground w-6" : "bg-foreground/25 w-2"
              )}
            />
          ))}
        </div>
        <p aria-live="polite" className="sr-only">
          Prosjekt {index + 1} av {PROJECTS.length}: {PROJECTS[index].client}
        </p>
        <div className="flex gap-3">
          <CarouselButton label="Forrige prosjekt" disabled={index === 0} onClick={() => goTo(index - 1)}>
            <ChevronLeft aria-hidden="true" />
          </CarouselButton>
          <CarouselButton label="Neste prosjekt" disabled={index === last} onClick={() => goTo(index + 1)}>
            <ChevronRight aria-hidden="true" />
          </CarouselButton>
        </div>
      </div>
    </div>
  )
}

function CarouselButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press bg-tile hover:bg-foreground/10 focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-4 disabled:opacity-30 [&_svg]:size-5"
    >
      {children}
    </button>
  )
}
