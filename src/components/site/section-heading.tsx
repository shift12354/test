import { BlurFade } from "@/components/ui/blur-fade"

export function SectionHeading({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string
  eyebrow: string
  title: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <BlurFade inView className="mx-auto mb-14 max-w-2xl text-center">
      <p className="text-aurora-1 font-mono text-xs font-medium tracking-widest uppercase">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-3 text-4xl font-semibold tracking-tighter text-balance sm:text-5xl"
      >
        {title}
      </h2>
      {children ? (
        <p className="text-muted-foreground mt-4 text-lg text-pretty">{children}</p>
      ) : null}
    </BlurFade>
  )
}
