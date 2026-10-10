import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "from-aurora-1 via-aurora-2 to-aurora-3 relative inline-block size-6 shrink-0 overflow-hidden rounded-lg bg-linear-to-br",
        className
      )}
    >
      <span className="absolute inset-x-[18%] bottom-[18%] h-[14%] rounded-full bg-white/70" />
    </span>
  )
}
