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

// Fictional clients. `busy` lists the months (0 = January) when their site matters most.
const PROJECTS = [
  {
    client: "Fjellgnist Guiding",
    place: "Lyngen",
    work: "Booking av toppturer, med dagens snøskredvarsel ved siden av hver tur.",
    busy: [1, 2, 3, 4],
    season: "Travlest februar til mai",
    color: "#3e5683",
  },
  {
    client: "Havbris Sjømat",
    place: "Senja",
    work: "Nettbutikk for tørrfisk og klippfisk, med frakt til hele Europa.",
    busy: [9, 10, 11],
    season: "Travlest oktober til desember",
    color: "#2f5552",
  },
  {
    client: "Ishavsferja",
    place: "Tromsø",
    work: "Rutetider og billetter som virker selv med dårlig dekning ute på fjorden.",
    busy: [5, 6, 7],
    season: "Travlest juni til august",
    color: "#1f2f52",
  },
  {
    client: "Kulturhuset Isfjell",
    place: "Alta",
    work: "Program og billettsalg for rundt 200 arrangementer i året.",
    busy: [8, 9, 10, 11, 0, 1, 2],
    season: "Travlest september til mars",
    color: "#5a3d5c",
  },
  {
    client: "Nordnatt Camp",
    place: "Kvaløya",
    work: "Nordlysvarsel på forsiden, og SMS til gjestene når himmelen klarner.",
    busy: [8, 9, 10, 11, 0, 1, 2],
    season: "Travlest september til mars",
    color: "#24304f",
  },
]

const MONTH_INITIALS = ["j", "f", "m", "a", "m", "j", "j", "a", "s", "o", "n", "d"]

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
              className="text-sno relative mr-5 flex min-h-[22rem] w-[min(82vw,24rem)] shrink-0 flex-col rounded-[1.25rem] p-7 sm:min-h-[24rem]"
              style={{ backgroundColor: p.color }}
            >
              <div>
                <ol aria-hidden="true" className="grid grid-cols-12 gap-1">
                  {MONTH_INITIALS.map((m, month) => (
                    <li
                      key={month}
                      className={cn(
                        "type-small flex h-9 items-end justify-center rounded-sm pb-1 font-semibold",
                        p.busy.includes(month) ? "bg-lavsol text-morketid" : "bg-sno/10 text-sno/60"
                      )}
                    >
                      {m}
                    </li>
                  ))}
                </ol>
                <p className="type-small text-sno/80 mt-2">{p.season}</p>
              </div>
              <div className="mt-auto">
                <h3 translate="no" className="type-title">{p.client}</h3>
                <p className="type-small text-sno/75 mt-1">{p.place}</p>
                <p className="mt-4 max-w-[34ch] text-pretty">{p.work}</p>
              </div>
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
      className="press bg-foreground/[0.07] hover:bg-foreground/[0.12] focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-4 disabled:opacity-30 [&_svg]:size-5"
    >
      {children}
    </button>
  )
}
