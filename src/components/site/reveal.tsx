import { BlurFade } from "@/components/ui/blur-fade"

/** Content rises gently into place the first time it scrolls into view. */
export function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <BlurFade
      inView
      direction="up"
      offset={16}
      blur="4px"
      duration={0.6}
      delay={delay}
      className={className}
    >
      {children}
    </BlurFade>
  )
}
