"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import type { COBEOptions } from "cobe"

// cobe + WebGL only run in the browser, so keep them out of the server bundle.
const Globe = dynamic(
  () => import("@/components/ui/globe").then((mod) => mod.Globe),
  { ssr: false }
)

const BASE: Omit<COBEOptions, "dark" | "baseColor" | "glowColor" | "mapBrightness"> = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  diffuse: 0.4,
  mapSamples: 16000,
  markerColor: [52 / 255, 211 / 255, 153 / 255],
  markers: [
    { location: [59.9139, 10.7522], size: 0.08 },
    { location: [69.6496, 18.956], size: 0.06 },
    { location: [60.3913, 5.3221], size: 0.05 },
    { location: [63.4305, 10.3951], size: 0.05 },
    { location: [55.6761, 12.5683], size: 0.05 },
    { location: [51.5072, -0.1276], size: 0.07 },
    { location: [40.7128, -74.006], size: 0.08 },
    { location: [35.6762, 139.6503], size: 0.07 },
    { location: [-33.8688, 151.2093], size: 0.05 },
    { location: [-23.5505, -46.6333], size: 0.06 },
  ],
}

const LIGHT_CONFIG: COBEOptions = {
  ...BASE,
  dark: 0,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  glowColor: [0.85, 0.95, 1],
}

const DARK_CONFIG: COBEOptions = {
  ...BASE,
  dark: 1,
  mapBrightness: 4,
  baseColor: [0.16, 0.2, 0.32],
  glowColor: [0.2, 0.55, 0.5],
}

export function LazyGlobe({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  return (
    <Globe
      className={className}
      config={resolvedTheme === "light" ? LIGHT_CONFIG : DARK_CONFIG}
    />
  )
}
