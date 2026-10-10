import type { AnimationOptions } from "motion/react"

// Spring presets. `visualDuration` plays the role of Apple's "response";
// `bounce: 0` is a critically damped spring (damping ratio 1.0).
export const spring = {
  /** Default for anything that moves without a preceding flick. */
  default: { type: "spring", bounce: 0, visualDuration: 0.4 },
  /** Opening a sheet from a tap: quick, no overshoot. */
  sheet: { type: "spring", bounce: 0, visualDuration: 0.35 },
  /** After a flick or throw the motion may overshoot a little (damping ≈ 0.8). */
  momentum: { type: "spring", bounce: 0.2, visualDuration: 0.35 },
} satisfies Record<string, AnimationOptions>

/** Release speed (px/s) above which a gesture counts as a flick. */
export const FLICK_VELOCITY = 400

/** Pixels a pointer must travel before a drag commits to an axis. */
export const DRAG_THRESHOLD = 10

/**
 * Where a flick would come to rest, using the exponential-decay projection
 * from Apple's "Designing Fluid Interfaces" sample code.
 */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/** Progressive resistance past a boundary instead of a hard stop. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

export type PointerSample = { value: number; time: number }

/** Velocity in px/s over the last ~100 ms of pointer samples. */
export function velocityFrom(samples: PointerSample[]) {
  const last = samples.at(-1)
  if (!last) return 0
  const first = samples.find((s) => last.time - s.time <= 100) ?? last
  const dt = last.time - first.time
  return dt > 0 ? ((last.value - first.value) / dt) * 1000 : 0
}

/** Keep only the samples the velocity estimate needs. */
export function pushSample(samples: PointerSample[], sample: PointerSample) {
  samples.push(sample)
  while (samples.length > 2 && sample.time - samples[0].time > 150) samples.shift()
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
