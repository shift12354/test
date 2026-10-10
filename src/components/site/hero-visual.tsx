"use client"

import { useRef } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react"

// A browser window that settles into place as it scrolls into view.
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] })
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1])
  const y = useTransform(scrollYProgress, [0, 1], [48, 0])

  return (
    <div ref={ref} className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <motion.div
        style={reduceMotion ? undefined : { scale, y }}
        className="bg-tile overflow-hidden rounded-[1.75rem] border shadow-[0_40px_120px_-40px_rgb(0_0_0/0.35)] will-change-transform"
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <span className="bg-background text-muted-foreground type-caption mx-auto rounded-md px-12 py-1">
            fjordline.example
          </span>
          <span className="w-12" />
        </div>
        <div aria-hidden="true" className="relative aspect-[16/9] overflow-hidden bg-[#0b1020]">
          <div className="absolute -top-1/3 left-1/4 h-2/3 w-1/2 rounded-full bg-[#30d158]/50 blur-[80px]" />
          <div className="absolute -top-1/4 right-[10%] h-1/2 w-1/3 rounded-full bg-[#7d7aff]/50 blur-[80px]" />
          <div className="absolute top-[8%] right-[8%] left-[8%] flex items-center justify-between text-white/70">
            <span className="h-2 w-16 rounded-full bg-white/80" />
            <span className="flex gap-3">
              <span className="h-1.5 w-8 rounded-full bg-white/40" />
              <span className="h-1.5 w-8 rounded-full bg-white/40" />
              <span className="h-1.5 w-8 rounded-full bg-white/40" />
            </span>
          </div>
          <div className="absolute inset-x-0 top-[30%] flex flex-col items-center gap-2 px-[10%] text-center sm:gap-4">
            <span className="text-[clamp(1.25rem,5vw,3.5rem)] leading-none font-bold tracking-[-0.03em] text-white">
              Seil inn i høsten.
            </span>
            <span className="h-1.5 w-1/3 rounded-full bg-white/35" />
            <span className="mt-1 h-[clamp(1.25rem,4vw,2.5rem)] w-[clamp(6rem,16vw,10rem)] rounded-full bg-white" />
          </div>
          <div className="absolute inset-x-[8%] bottom-[8%] grid grid-cols-3 gap-[2%]">
            {["#30b0c7", "#5e5ce6", "#34c77b"].map((c) => (
              <div key={c} className="aspect-[4/3] rounded-xl border border-white/10 bg-white/[0.06] p-[6%]">
                <div className="h-1/2 rounded-lg" style={{ background: `linear-gradient(135deg, ${c}, transparent)` }} />
                <div className="mt-[8%] h-1.5 w-2/3 rounded-full bg-white/40" />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
