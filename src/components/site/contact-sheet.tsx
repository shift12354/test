"use client"

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DRAG_THRESHOLD,
  FLICK_VELOCITY,
  project,
  pushSample,
  rubberband,
  spring,
  velocityFrom,
  type PointerSample,
} from "@/lib/motion"
import { pill, type PillVariants } from "@/components/site/pill"

type ContactSheetContextValue = {
  open: (trigger: HTMLElement | null) => void
}

const ContactSheetContext = createContext<ContactSheetContextValue | null>(null)

export function ContactSheetProvider({ children }: { children: React.ReactNode }) {
  const [present, setPresent] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)

  const open = useCallback((trigger: HTMLElement | null) => {
    triggerRef.current = trigger
    setPresent(true)
  }, [])

  const restoreFocusRef = useRef(false)

  const handleClosed = useCallback(() => {
    restoreFocusRef.current = true
    setPresent(false)
  }, [])

  // Hand focus back to whatever opened the sheet, once the page is no longer inert.
  useEffect(() => {
    if (present || !restoreFocusRef.current) return
    restoreFocusRef.current = false
    triggerRef.current?.focus({ preventScroll: true })
  }, [present])

  return (
    <ContactSheetContext value={{ open }}>
      {/* Everything behind the sheet is inert while it is up. */}
      <div inert={present} className="flex min-h-full flex-1 flex-col">
        {children}
      </div>
      {present ? <ContactSheet onClosed={handleClosed} /> : null}
    </ContactSheetContext>
  )
}

function useContactSheet() {
  const ctx = use(ContactSheetContext)
  if (!ctx) throw new Error("useContactSheet must be used inside ContactSheetProvider")
  return ctx
}

export function OpenSheetButton({
  className,
  variant,
  size,
  children,
}: PillVariants & { className?: string; children: React.ReactNode }) {
  const { open } = useContactSheet()
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={(e) => open(e.currentTarget)}
      className={cn(pill({ variant, size }), className)}
    >
      {children}
    </button>
  )
}

type DragState = {
  pointerId: number
  startY: number
  origin: number
  samples: PointerSample[]
  committed: boolean
}

function ContactSheet({ onClosed }: { onClosed: () => void }) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const heightRef = useRef(800)
  const intentRef = useRef<"open" | "closed" | "dragging">("open")
  const dragRef = useRef<DragState | null>(null)
  const reduceMotion = useReducedMotion()

  // y is the sheet's live offset from its resting place; 0 = fully up.
  const y = useMotionValue(10_000)
  // Reduced motion swaps the slide for a cross-fade.
  const fade = useMotionValue(reduceMotion ? 0 : 1)
  const scrimOpacity = useTransform(() => {
    const progress = 1 - Math.min(1, Math.max(0, y.get() / heightRef.current))
    return progress * fade.get()
  })

  const settle = useCallback(
    (to: "open" | "closed", velocity = 0) => {
      intentRef.current = to
      const target = to === "open" ? 0 : heightRef.current
      const onComplete =
        to === "closed"
          ? () => {
              if (intentRef.current === "closed") onClosed()
            }
          : undefined

      if (reduceMotion) {
        y.jump(to === "open" ? 0 : y.get())
        animate(fade, to === "open" ? 1 : 0, { duration: 0.2, ease: "easeOut", onComplete })
        return
      }
      const flicked = Math.abs(velocity) > FLICK_VELOCITY
      // Starts from the live value, so a grab mid-flight never jumps.
      animate(y, target, {
        ...(flicked ? spring.momentum : spring.sheet),
        velocity,
        onComplete,
      })
    },
    [fade, onClosed, reduceMotion, y]
  )

  // Measure, park off-screen and slide up before the first paint.
  useLayoutEffect(() => {
    const el = sheetRef.current
    if (!el) return
    heightRef.current = el.offsetHeight + 16
    y.jump(reduceMotion ? 0 : heightRef.current)
    settle("open")
    firstFieldRef.current?.focus({ preventScroll: true })
  }, [reduceMotion, settle, y])

  // Escape closes; the page underneath does not scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle("closed")
    }
    document.addEventListener("keydown", onKey)
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      root.style.overflow = previous
    }
  }, [settle])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    y.stop() // catch it mid-flight
    intentRef.current = "dragging"
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      origin: y.get(),
      samples: [{ value: e.clientY, time: e.timeStamp }],
      committed: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dy = e.clientY - drag.startY
    if (!drag.committed) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return
      drag.committed = true
      drag.startY = e.clientY // track 1:1 from here, no jump
      drag.origin = y.get()
    }
    pushSample(drag.samples, { value: e.clientY, time: e.timeStamp })
    const raw = drag.origin + (e.clientY - drag.startY)
    // Downwards is free; upwards past the top resists progressively.
    y.set(raw >= 0 ? raw : -rubberband(-raw, heightRef.current))
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    const velocity = drag.committed ? velocityFrom(drag.samples) : 0
    // Decide from where the gesture is heading, not where it let go.
    const restingPoint = y.get() + project(velocity)
    settle(restingPoint > heightRef.current * 0.4 ? "closed" : "open", velocity)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:p-4">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-(--scrim)"
        style={{ opacity: scrimOpacity }}
        onClick={() => settle("closed")}
      />
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ y, opacity: fade }}
        className="material-thick relative flex max-h-[calc(100svh-0.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-b-0 pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.35)] sm:rounded-[2rem] sm:border-b"
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="shrink-0 cursor-grab touch-none px-6 pt-3 pb-2 select-none active:cursor-grabbing"
        >
          <div aria-hidden="true" className="bg-muted-foreground/40 mx-auto h-1.5 w-10 rounded-full" />
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="type-title">
                Book en prat
              </h2>
              <p className="text-muted-foreground mt-1">
                Fortell litt om prosjektet, så svarer vi innen én arbeidsdag.
              </p>
            </div>
            <button
              type="button"
              aria-label="Lukk"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => settle("closed")}
              className="press bg-tile text-muted-foreground hover:text-foreground focus-visible:ring-ring -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-4"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <ContactForm firstFieldRef={firstFieldRef} onDone={() => settle("closed")} />
        </div>
      </motion.div>
    </div>
  )
}

type Status = "idle" | "sending" | "sent"
type Errors = Partial<Record<"name" | "email", string>>

function ContactForm({
  firstFieldRef,
  onDone,
}: {
  firstFieldRef: React.RefObject<HTMLInputElement | null>
  onDone: () => void
}) {
  const [status, setStatus] = useState<Status>("idle")
  const [errors, setErrors] = useState<Errors>({})
  const doneRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (status === "sent") doneRef.current?.focus({ preventScroll: true })
  }, [status])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const next: Errors = {}
    if (!String(data.get("name") ?? "").trim()) next.name = "Skriv inn navnet ditt."
    const email = String(data.get("email") ?? "").trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Skriv inn en gyldig e-postadresse, for eksempel ola@firma.no."
    setErrors(next)
    const firstInvalid = Object.keys(next)[0]
    if (firstInvalid) {
      form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus()
      return
    }
    setStatus("sending")
    // Demo only: there is no backend, so pretend the request took a moment.
    setTimeout(() => setStatus("sent"), 700)
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center px-6 pt-6 pb-8 text-center" aria-live="polite">
        <span className="bg-aurora-1/15 text-aurora-1 flex size-14 items-center justify-center rounded-full">
          <Check aria-hidden="true" className="size-7" strokeWidth={2.5} />
        </span>
        <p className="type-subhead mt-4">Takk! Vi hører fra oss snart.</p>
        <button ref={doneRef} type="button" onClick={onDone} className={cn(pill({ size: "lg" }), "mt-6 w-full")}>
          Ferdig
        </button>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 pt-4 pb-6">
      <Field
        ref={firstFieldRef}
        label="Navn"
        name="name"
        autoComplete="name"
        placeholder="Ola Nordmann…"
        error={errors.name}
      />
      <Field
        label="E-post"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        placeholder="ola@firma.no…"
        error={errors.email}
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          Prosjektet <span className="text-muted-foreground font-normal">(valgfritt)</span>
        </span>
        <textarea
          name="message"
          rows={3}
          autoComplete="off"
          placeholder="Ny nettbutikk, lansering i mars…"
          className="bg-tile placeholder:text-muted-foreground focus-visible:ring-ring resize-none rounded-xl px-4 py-3 outline-none focus-visible:ring-4"
        />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className={cn(pill({ size: "lg" }), "mt-2 w-full")}
      >
        {status === "sending" ? "Sender…" : "Send forespørsel"}
      </button>
      <p aria-live="polite" className="sr-only">
        {status === "sending" ? "Sender…" : ""}
      </p>
    </form>
  )
}

function Field({
  label,
  error,
  ref,
  ...props
}: React.ComponentProps<"input"> & { label: string; error?: string }) {
  const errorId = useId()
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "bg-tile placeholder:text-muted-foreground focus-visible:ring-ring h-12 rounded-xl px-4 outline-none focus-visible:ring-4",
          error && "ring-2 ring-red-500/70"
        )}
        {...props}
      />
      {error ? (
        <span id={errorId} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </label>
  )
}
