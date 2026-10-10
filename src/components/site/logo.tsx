import { cn } from "@/lib/utils"

/** A low sun resting on the horizon. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-6 shrink-0", className)}>
      <path d="M5 16a7 7 0 0 1 14 0Z" className="fill-lavsol" />
      <rect x="2" y="17.5" width="20" height="2" rx="1" className="fill-current" />
    </svg>
  )
}
