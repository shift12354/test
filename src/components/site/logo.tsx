import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "from-aurora-1 via-aurora-2 to-aurora-3 relative size-6 shrink-0 overflow-hidden rounded-lg bg-linear-to-br shadow-[0_0_24px_-4px_var(--aurora-1)]",
        className
      )}
    >
      <span className="bg-background/70 absolute inset-x-1 bottom-1 h-1.5 rounded-full blur-[1px]" />
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      translate="no"
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className
      )}
    >
      <LogoMark />
      Nordlys
    </span>
  )
}
