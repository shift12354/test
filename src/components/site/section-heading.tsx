import { cn } from "@/lib/utils"
import { Reveal } from "@/components/site/reveal"

export function SectionHeading({
  id,
  eyebrow,
  title,
  children,
  align = "center",
}: {
  id: string
  eyebrow?: string
  title: React.ReactNode
  children?: React.ReactNode
  align?: "center" | "start"
}) {
  return (
    <Reveal className={cn("mb-12 max-w-3xl sm:mb-16", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="text-muted-foreground type-subhead font-semibold">{eyebrow}</p>
      ) : null}
      <h2 id={id} className="type-headline mt-1 text-balance">
        {title}
      </h2>
      {children ? (
        <p className="text-muted-foreground type-subhead mt-5 font-normal text-pretty">{children}</p>
      ) : null}
    </Reveal>
  )
}
