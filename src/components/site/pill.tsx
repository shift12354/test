import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

export const pill = cva(
  "press inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap outline-none select-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        filled: "bg-accent text-accent-foreground hover:bg-accent-hover",
        tinted: "bg-tile text-foreground hover:bg-foreground/10",
        link: "text-link hover:underline underline-offset-4",
      },
      size: {
        sm: "h-8 px-3.5 text-sm",
        md: "h-11 px-5 text-[1.0625rem]",
        lg: "h-12 px-6 text-[1.0625rem]",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "filled", size: "md" },
  }
)

export type PillVariants = VariantProps<typeof pill>

export function PillLink({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"a"> & PillVariants) {
  return <a className={cn(pill({ variant, size }), className)} {...props} />
}
